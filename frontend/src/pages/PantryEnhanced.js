import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Package, Refrigerator, AlertTriangle, Trash2, Edit2, 
  ShoppingCart, Clock, Calendar, ArrowRight 
} from 'lucide-react';
import { pantryAPI, categoriesAPI, shoppingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import PantryModal from '../components/PantryModal';

const PantryEnhanced = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pantry'); // 'pantry' or 'fridge'
  const [pantryItems, setPantryItems] = useState([]);
  const [fridgeItems, setFridgeItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeList, setActiveList] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchExpiring();
    fetchCategories();
    loadActiveList();
  }, []);

  const loadActiveList = async () => {
    try {
      const response = await shoppingAPI.getLists();
      const lists = response.data;
      if (lists.length > 0) {
        setActiveList(lists[0]);
      }
    } catch (error) {
      console.error('Error loading lists:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await pantryAPI.getPantry();
      const allItems = response.data;
      
      // Split items by storage location
      setPantryItems(allItems.filter(item => item.storage_location === 'pantry' || !item.storage_location));
      setFridgeItems(allItems.filter(item => item.storage_location === 'fridge'));
    } catch (error) {
      console.error('Failed to fetch items:', error);
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
    if (window.confirm('Remove this item?')) {
      try {
        await pantryAPI.deleteItem(id);
        fetchItems();
        fetchExpiring();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      await pantryAPI.addItem({
        ...itemData,
        storage_location: activeTab
      });
      fetchItems();
      fetchExpiring();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    }
  };

  const handleEditItem = async (itemData) => {
    try {
      await pantryAPI.updateItem(selectedItem.id, itemData);
      fetchItems();
      fetchExpiring();
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleAddToShoppingList = async (item) => {
    if (!activeList) {
      alert('No active shopping list found');
      return;
    }

    if (window.confirm(`Add "${item.item_name}" to shopping list?`)) {
      try {
        await shoppingAPI.addItem(activeList.id, {
          item_name: item.item_name,
          quantity: item.quantity || 1,
          unit: item.unit || '',
          category: item.category_name || 'Other',
          item_icon: item.item_icon || '📦'
        });
        alert(`Added "${item.item_name}" to shopping list!`);
      } catch (error) {
        console.error('Failed to add to shopping list:', error);
        alert('Failed to add to shopping list');
      }
    }
  };

  const currentItems = activeTab === 'pantry' ? pantryItems : fridgeItems;
  const groupedItems = currentItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) {
      acc[category] = { items: [], icon: '📦' };
    }
    acc[category].items.push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kitchen Inventory</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Track your pantry and fridge items</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Item
              </button>
            </div>
          </div>

          {/* Expiring Items Alert */}
          {expiringItems.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    {expiringItems.length} Item{expiringItems.length > 1 ? 's' : ''} Expiring Soon!
                  </h3>
                  <div className="space-y-2">
                    {expiringItems.map((item) => {
                      const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{item.item_icon || '📦'}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{item.item_name}</p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddToShoppingList(item)}
                            className="btn-secondary text-sm flex items-center"
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Add to List
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('pantry')}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all ${
                activeTab === 'pantry'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Pantry</span>
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                {pantryItems.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('fridge')}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all ${
                activeTab === 'fridge'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Refrigerator className="w-5 h-5" />
              <span>Fridge</span>
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                {fridgeItems.length}
              </span>
            </button>
          </div>

          {/* Items Grid */}
          <div className="space-y-8">
            {currentItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {activeTab === 'pantry' ? (
                  <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                ) : (
                  <Refrigerator className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                )}
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Your {activeTab} is empty
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Add items to start tracking
                </p>
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, data]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <span className="mr-2">{data.icon}</span>
                    {category}
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({data.items.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onEdit={() => setSelectedItem(item)}
                        onAddToList={handleAddToShoppingList}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PantryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddItem}
        categories={categories}
        storageLocation={activeTab}
      />
      
      <PantryModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleEditItem}
        item={selectedItem}
        categories={categories}
      />
    </PageTransition>
  );
};

const ItemCard = ({ item, onDelete, onEdit, onAddToList }) => {
  const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
  const daysUntilExpiry = expiryDate 
    ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <div className={`card hover:shadow-lg transition-shadow ${
      isExpired ? 'border-2 border-red-500' :
      isExpiringSoon ? 'border-2 border-yellow-500' : ''
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{item.item_icon || '📦'}</span>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{item.item_name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {item.quantity} {item.unit}
            </p>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expiryDate && (
        <div className={`flex items-center space-x-2 text-sm mb-3 ${
          isExpired ? 'text-red-600 dark:text-red-400' :
          isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          <Calendar className="w-4 h-4" />
          <span>
            {isExpired ? 'Expired' : isExpiringSoon ? `Expires in ${daysUntilExpiry}d` : `Expires ${expiryDate.toLocaleDateString()}`}
          </span>
        </div>
      )}

      {(isExpired || isExpiringSoon) && (
        <button
          onClick={() => onAddToList(item)}
          className="w-full btn-secondary text-sm flex items-center justify-center"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Shopping List
        </button>
      )}
    </div>
  );
};

export default PantryEnhanced;
