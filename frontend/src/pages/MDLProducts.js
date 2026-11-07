import React, { useState } from 'react';
import { Database, Plus, Download, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import MDLProductsPanel from '../components/admin/MDLProductsPanel';
import { createProduct, searchProducts } from '../api/mdl';

/**
 * MDLProducts — standalone admin product database page.
 * Wraps MDLProductsPanel and adds tools the admin tabs don't have:
 * quick add-product and one-click JSON export.
 */
const MDLProducts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState(null);
  const [newProduct, setNewProduct] = useState({
    product_name: '', category: '', average_price: '', icon_emoji: '', common_size: '', common_unit: ''
  });

  if (!user?.isAdmin) {
    navigate('/');
    return null;
  }

  const flash = (msg, isError = false) => {
    setNotice({ msg, isError });
    setTimeout(() => setNotice(null), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const result = await createProduct({
      ...newProduct,
      average_price: newProduct.average_price ? parseFloat(newProduct.average_price) : null
    });
    if (result) {
      flash(`Added "${newProduct.product_name}" to product database`);
      setNewProduct({ product_name: '', category: '', average_price: '', icon_emoji: '', common_size: '', common_unit: '' });
      setShowAddForm(false);
      window.dispatchEvent(new CustomEvent('mdl-products-refresh'));
    } else {
      flash('Failed to add product (name may already exist)', true);
    }
  };

  const handleExport = async () => {
    const products = await searchProducts('', '', 5000);
    if (!products.length) {
      flash('Nothing to export', true);
      return;
    }
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdl-products-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Exported ${products.length} products`);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="lg:ml-64 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    MDL Products
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Sort, add, and manage the product catalog the MDL system learns from
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Export JSON
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 font-medium shadow-md transition-all"
                >
                  {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showAddForm ? 'Close' : 'Add Product'}
                </button>
              </div>
            </div>

            {notice && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                notice.isError
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}>
                {notice.msg}
              </div>
            )}

            {/* Quick Add form — feature not available in the admin tab panels */}
            {showAddForm && (
              <form onSubmit={handleAdd} className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
                <input
                  type="text" required placeholder="Product name *"
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  className="input-field col-span-2" autoFocus
                />
                <input
                  type="text" placeholder="Category"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number" step="0.01" min="0" placeholder="Avg price"
                  value={newProduct.average_price}
                  onChange={(e) => setNewProduct({ ...newProduct, average_price: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text" placeholder="Icon (emoji)"
                  value={newProduct.icon_emoji}
                  onChange={(e) => setNewProduct({ ...newProduct, icon_emoji: e.target.value })}
                  className="input-field"
                />
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Size"
                    value={newProduct.common_size}
                    onChange={(e) => setNewProduct({ ...newProduct, common_size: e.target.value })}
                    className="input-field w-1/2"
                  />
                  <button type="submit" className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors">
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Shared panel: stats, search, filter, table, edit, prices, backup */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <MDLProductsPanel />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default MDLProducts;
