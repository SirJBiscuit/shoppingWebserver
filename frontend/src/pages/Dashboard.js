import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shoppingAPI, suggestionsAPI, inventoryAPI } from '../services/api';
import { 
  ShoppingCart, LogOut, Plus, Search, Trash2, Check, 
  AlertCircle, TrendingUp, Package, DollarSign, Lightbulb, ChefHat, Settings
} from 'lucide-react';
import ItemList from '../components/ItemList';
import SmartSuggestions from '../components/SmartSuggestions';
import InventoryPanel from '../components/InventoryPanel';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeList, setActiveList] = useState(null);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLists();
    loadSuggestions();
    loadInventory();
  }, []);

  useEffect(() => {
    if (activeList) {
      loadListItems(activeList.id);
    }
  }, [activeList]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchItems();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadLists = async () => {
    try {
      const response = await shoppingAPI.getLists();
      setLists(response.data);
      
      const activeLists = response.data.filter(l => l.status === 'active');
      if (activeLists.length > 0) {
        setActiveList(activeLists[0]);
      } else if (response.data.length === 0) {
        await createNewList();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading lists:', error);
      setLoading(false);
    }
  };

  const loadListItems = async (listId) => {
    try {
      const response = await shoppingAPI.getList(listId);
      setItems(response.data.items);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await suggestionsAPI.getSmartSuggestions();
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const response = await inventoryAPI.getInventory();
      setInventory(response.data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const searchItems = async () => {
    try {
      const response = await suggestionsAPI.searchItems(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching items:', error);
    }
  };

  const createNewList = async () => {
    try {
      const response = await shoppingAPI.createList({ name: 'Shopping List' });
      setActiveList(response.data);
      await loadLists();
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    
    if (!activeList || !newItemName.trim()) return;

    try {
      await shoppingAPI.addItem(activeList.id, {
        itemName: newItemName,
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit,
        price: parseFloat(newItemPrice) || 0,
        category: newItemCategory,
      });

      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setNewItemPrice('');
      setNewItemCategory('');
      setSearchQuery('');
      setSearchResults([]);
      
      await loadListItems(activeList.id);
      await loadSuggestions();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const addSuggestion = async (suggestion) => {
    if (!activeList) return;

    try {
      await shoppingAPI.addItem(activeList.id, {
        itemName: suggestion.item,
        quantity: suggestion.quantity || 1,
        unit: suggestion.unit || '',
        price: 0,
        category: '',
      });

      await loadListItems(activeList.id);
      await loadSuggestions();
    } catch (error) {
      console.error('Error adding suggestion:', error);
    }
  };

  const toggleItemCheck = async (item) => {
    try {
      await shoppingAPI.updateItem(activeList.id, item.id, {
        isChecked: !item.is_checked,
      });
      await loadListItems(activeList.id);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await shoppingAPI.deleteItem(activeList.id, itemId);
      await loadListItems(activeList.id);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const completeList = async () => {
    if (!activeList) return;

    try {
      await shoppingAPI.completeList(activeList.id);
      await createNewList();
      await loadInventory();
      await loadSuggestions();
    } catch (error) {
      console.error('Error completing list:', error);
    }
  };

  const totalCost = items.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
  const checkedCount = items.filter(item => item.is_checked).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CloudMC Shop</h1>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <ShoppingCart className="w-5 h-5 mr-1" />
                Shopping
              </button>
              <button
                onClick={() => navigate('/recipes')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <ChefHat className="w-5 h-5 mr-1" />
                Recipes
              </button>
              <button
                onClick={() => navigate('/pantry')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <Package className="w-5 h-5 mr-1" />
                Pantry
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <Settings className="w-5 h-5 mr-1" />
                Admin
              </button>
              <span className="text-gray-600 dark:text-gray-300">Welcome, {user?.username}</span>
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Current Shopping List</h2>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    {checkedCount} / {items.length} items
                  </div>
                  <div className="flex items-center text-primary-600 font-semibold">
                    <DollarSign className="w-5 h-5" />
                    {totalCost.toFixed(2)}
                  </div>
                </div>
              </div>

              <form onSubmit={addItem} className="mb-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setNewItemName(e.target.value);
                    }}
                    placeholder="Search or add item..."
                    className="input-field pl-10"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                    {searchResults.slice(0, 5).map((result) => (
                      <div
                        key={result.id}
                        onClick={() => {
                          setNewItemName(result.name);
                          setNewItemQuantity(result.preferred_quantity || result.typical_quantity || '');
                          setNewItemUnit(result.preferred_unit || result.typical_unit || '');
                          setNewItemCategory(result.category || '');
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded hover:bg-primary-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <span className="font-medium">{result.name}</span>
                        <span className="text-sm text-gray-500">
                          {result.total_purchases ? `Bought ${result.total_purchases}x` : 'New'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="Qty"
                    className="input-field"
                  />
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="Unit"
                    className="input-field"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Price"
                    className="input-field"
                  />
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="Category"
                    className="input-field"
                  />
                  <button type="submit" className="btn-primary flex items-center justify-center">
                    <Plus className="w-5 h-5 mr-1" />
                    Add
                  </button>
                </div>
              </form>

              <ItemList
                items={items}
                onToggleCheck={toggleItemCheck}
                onDelete={deleteItem}
              />

              {items.length > 0 && (
                <button
                  onClick={completeList}
                  className="w-full mt-6 btn-primary flex items-center justify-center"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Complete Shopping Trip
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  Smart Suggestions
                </h3>
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showSuggestions ? 'Hide' : 'Show'}
                </button>
              </div>
              {showSuggestions && (
                <SmartSuggestions
                  suggestions={suggestions}
                  onAddSuggestion={addSuggestion}
                />
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Package className="w-5 h-5 mr-2 text-primary-600" />
                  Inventory
                </h3>
                <button
                  onClick={() => setShowInventory(!showInventory)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showInventory ? 'Hide' : 'Show'}
                </button>
              </div>
              {showInventory && (
                <InventoryPanel
                  inventory={inventory}
                  onUpdate={loadInventory}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
