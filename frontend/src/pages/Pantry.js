import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, AlertTriangle, Trash2, Edit2, ShoppingCart, ChefHat, LogOut, Settings } from 'lucide-react';
import { pantryAPI, categoriesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import PantryModal from '../components/PantryModal';

const Pantry = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pantryItems, setPantryItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchPantry();
    fetchExpiring();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchPantry = async () => {
    try {
      const response = await pantryAPI.getPantry();
      setPantryItems(response.data);
    } catch (error) {
      console.error('Failed to fetch pantry:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiring = async () => {
    try {
      const response = await pantryAPI.getExpiring(7);
      setExpiringItems(response.data);
    } catch (error) {
      console.error('Failed to fetch expiring items:', error);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Remove this item from pantry?')) {
      try {
        await pantryAPI.deleteItem(id);
        fetchPantry();
        fetchExpiring();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleUpdateQuantity = async (id, newQuantity) => {
    try {
      await pantryAPI.updateItem(id, { quantity: newQuantity });
      fetchPantry();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      await pantryAPI.addItem(itemData);
      fetchPantry();
      fetchExpiring();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item to pantry');
    }
  };

  const handleEditItem = async (itemData) => {
    try {
      await pantryAPI.updateItem(selectedItem.id, itemData);
      fetchPantry();
      fetchExpiring();
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item');
    }
  };

  // Group items by category
  const groupedItems = pantryItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) {
      acc[category] = {
        items: [],
        icon: item.category_icon || '📦'
      };
    }
    acc[category].items.push(item);
    return acc;
  }, {});

  const categoryKeys = Object.keys(groupedItems).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading pantry...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="lg:ml-72">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-primary-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Pantry</h1>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Item
              </button>
            </div>

      {/* Expiring Soon Alert */}
      {expiringItems.length > 0 && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-red-900">
              Expiring Soon ({expiringItems.length} items)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiringItems.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg border border-red-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.item_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Expires: {new Date(item.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pantry Items by Category */}
      <div className="space-y-8">
        {pantryItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 text-lg">Your pantry is empty</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Add items to start tracking your inventory</p>
          </div>
        ) : (
          categoryKeys.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <span className="text-2xl mr-2">{groupedItems[category].icon}</span>
                {category}
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
                  ({groupedItems[category].items.length} items)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedItems[category].items.map((item) => (
                  <PantryItemCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteItem}
                    onUpdateQuantity={handleUpdateQuantity}
                    onEdit={setSelectedItem}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <PantryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddItem}
        categories={categories}
      />
      
      <PantryModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleEditItem}
        item={selectedItem}
        categories={categories}
      />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const PantryItemCard = ({ item, onDelete, onUpdateQuantity, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);

  const handleSave = () => {
    onUpdateQuantity(item.id, parseFloat(quantity));
    setEditing(false);
  };

  const isExpiringSoon = item.expiry_date && 
    new Date(item.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className={`card ${isExpiringSoon ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 flex-1">{item.item_name}</h4>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(item)}
            className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
            title="Edit item"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field flex-1"
            step="0.1"
          />
          <span className="text-sm text-gray-600">{item.unit}</span>
          <button onClick={handleSave} className="btn-primary text-sm px-3 py-1">
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            {item.quantity} {item.unit}
          </p>
          <button
            onClick={() => setEditing(true)}
            className="text-primary-600 hover:text-primary-700"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {item.expiry_date && (
        <p className={`text-xs ${isExpiringSoon ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {isExpiringSoon && '⚠️ '}
          Expires: {new Date(item.expiry_date).toLocaleDateString()}
        </p>
      )}

      {item.added_date && (
        <p className="text-xs text-gray-400 mt-1">
          Added: {new Date(item.added_date).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default Pantry;
