import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCartAnimation } from '../contexts/CartAnimationContext';
import { shoppingAPI, suggestionsAPI, inventoryAPI, categoriesAPI } from '../services/api';
import { 
  ShoppingCart, LogOut, Plus, Search, Trash2, Check, 
  AlertCircle, TrendingUp, Package, DollarSign, Lightbulb, ChefHat, Settings, ArrowUpDown, Calendar, BarChart3, Scan, Share2, Mic
} from 'lucide-react';
import ItemList from '../components/ItemList';
import SmartSuggestions from '../components/SmartSuggestions';
import PantryQuickView from '../components/PantryQuickView';
import ShoppingListRecipes from '../components/ShoppingListRecipes';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import AnimatedCart from '../components/AnimatedCart';
import BudgetTracker from '../components/BudgetTracker';
import BarcodeScanner from '../components/BarcodeScanner';
import ShareList from '../components/ShareList';
import LevelingSystem, { XP_REWARDS } from '../components/LevelingSystem';
import VoiceInput, { parseVoiceInput } from '../components/VoiceInput';
import NotificationCenter from '../components/NotificationCenter';
import Onboarding from '../components/Onboarding';
import Sidebar from '../components/Sidebar';
import AutocompleteInput from '../components/AutocompleteInput';
import { detectCategory, estimatePrice, detectIcon } from '../utils/categoryDetector';
import { sortItemsByStoreLayout, calculateEfficiency } from '../utils/cartPacking';
import { learnIcon, getLearnedIcon, learnPrice, getLearnedPrice } from '../utils/userPreferences';
import { getAutocompleteSuggestions } from '../utils/autocomplete';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { triggerFlyingAnimation } = useCartAnimation();
  const addButtonRef = useRef(null);
  const [activeList, setActiveList] = useState(null);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [smartSort, setSmartSort] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLists();
    loadSuggestions();
    loadInventory();
    loadCategories();

    // Listen for sidebar tool clicks
    const handleSidebarTool = (event) => {
      const { action } = event.detail;
      if (action === 'voice') setShowVoice(true);
      if (action === 'scan') setShowScanner(true);
      if (action === 'share') setShowShare(true);
    };

    window.addEventListener('sidebar-tool-click', handleSidebarTool);
    return () => window.removeEventListener('sidebar-tool-click', handleSidebarTool);
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

  // Auto-detect category, icon, and estimate price when item name changes
  // Only auto-detect if user hasn't already set values (from history or manually)
  useEffect(() => {
    // Only auto-detect if field is empty (not set from search results)
    if (newItemName && !newItemCategory) {
      const detectedCategory = detectCategory(newItemName);
      if (detectedCategory) {
        setNewItemCategory(detectedCategory);
      }
    }
    
    // Only auto-detect icon if not already set from user history
    if (newItemName && !newItemIcon) {
      const detectedIcon = detectIcon(newItemName);
      if (detectedIcon) {
        setNewItemIcon(detectedIcon);
      }
    }
    
    // Only estimate price if not already set from user history
    if (newItemName && !newItemPrice && newItemCategory) {
      const estimatedPrice = estimatePrice(newItemName, newItemCategory);
      setNewItemPrice(estimatedPrice.toFixed(2));
    }
  }, [newItemName, newItemCategory, newItemIcon, newItemPrice]);

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
      // Load pantry items instead of inventory
      const response = await inventoryAPI.getInventory();
      setInventory(response.data);
    } catch (error) {
      console.error('Error loading pantry:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Set default categories if API fails
      setCategories([
        { id: 1, name: 'Produce', icon: '🥬' },
        { id: 2, name: 'Meat', icon: '🥩' },
        { id: 3, name: 'Dairy', icon: '🥛' },
        { id: 4, name: 'Bakery', icon: '🍞' },
        { id: 5, name: 'Frozen', icon: '🧊' },
        { id: 6, name: 'Pantry', icon: '🥫' },
        { id: 7, name: 'Snacks', icon: '🍿' },
        { id: 8, name: 'Beverages', icon: '🥤' },
        { id: 9, name: 'Other', icon: '📦' },
      ]);
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

  const deleteItemHistory = async (itemId) => {
    try {
      await suggestionsAPI.deleteItem(itemId);
      // Refresh search results
      if (searchQuery.length >= 2) {
        await searchItems();
      }
    } catch (error) {
      console.error('Error deleting item history:', error);
      alert('Failed to delete item from history');
    }
  };

  const createNewList = async () => {
    const listName = prompt('Enter a name for the new shopping list:', `Shopping List ${lists.length + 1}`);
    if (!listName) return;

    try {
      const response = await shoppingAPI.createList({ name: listName });
      setActiveList(response.data);
      await loadLists();
      await loadListItems(response.data.id);
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Failed to create shopping list');
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    
    if (!activeList || !newItemName.trim()) return;

    try {
      const itemName = newItemName.trim();
      const itemPrice = parseFloat(newItemPrice) || 0;
      const itemIcon = newItemIcon;
      
      await shoppingAPI.addItem(activeList.id, {
        itemName: itemName,
        quantity: parseInt(newItemQuantity) || 1,
        unit: newItemSize,
        price: itemPrice,
        category: newItemCategory,
        icon: itemIcon,
      });

      // Learn user preferences if they set custom values
      if (itemIcon) {
        learnIcon(itemName, itemIcon);
      }
      if (newItemPrice && itemPrice > 0) {
        learnPrice(itemName, itemPrice);
      }

      // Trigger flying animation
      if (addButtonRef.current) {
        triggerFlyingAnimation({
          item_name: itemName,
          item_icon: itemIcon || detectIcon(itemName),
        }, addButtonRef.current);
      }

      setNewItemName('');
      setNewItemQuantity('');
      setNewItemSize('');
      setNewItemPrice('');
      setNewItemCategory('');
      setNewItemIcon('');
      setSearchQuery('');
      setSearchResults([]);
      
      await loadListItems(activeList.id);
      await loadSuggestions();
      
      // Award XP
      if (window.addXP) {
        window.addXP(XP_REWARDS.ADD_ITEM, 'Added item to list');
      }
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
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Simple Top Bar for Notifications */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-end space-x-4">
            <NotificationCenter />
          </div>

          <main className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shopping List</h2>
                  {lists.length > 0 && (
                    <select
                      value={activeList?.id || ''}
                      onChange={(e) => {
                        const list = lists.find(l => l.id === parseInt(e.target.value));
                        setActiveList(list);
                        if (list) loadListItems(list.id);
                      }}
                      className="input-field text-sm min-w-[250px]"
                    >
                      {lists.map(list => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.item_count || 0} items)
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={createNewList}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New List
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowVoice(true)}
                    className="btn-secondary text-sm flex items-center min-w-[100px] justify-center"
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Voice
                  </button>
                  <button
                    onClick={() => setShowShare(true)}
                    className="btn-secondary text-sm flex items-center min-w-[100px] justify-center"
                    title="Share list"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </button>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="btn-secondary text-sm flex items-center min-w-[100px] justify-center"
                    title="Scan barcode"
                  >
                    <Scan className="w-4 h-4 mr-1" />
                    Scan
                  </button>
                  <button
                    onClick={() => setSmartSort(!smartSort)}
                    className={`btn-secondary text-sm flex items-center min-w-[120px] justify-center ${smartSort ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : ''}`}
                    title={smartSort ? 'Sorted by store layout' : 'Sort by store layout'}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-1" />
                    {smartSort ? `${calculateEfficiency(items)}%` : 'Smart Sort'}
                  </button>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {checkedCount} / {items.length} items
                  </div>
                </div>
              </div>

              <form onSubmit={addItem} className="mb-6">
                <div className="mb-4">
                  <AutocompleteInput
                    value={newItemName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewItemName(value);
                      setSearchQuery(value);
                      
                      // Auto-fill learned preferences when user types
                      if (value.length >= 3) {
                        const learnedIconValue = getLearnedIcon(value);
                        const learnedPriceValue = getLearnedPrice(value);
                        const detectedCat = detectCategory(value);
                        const detectedIconValue = detectIcon(value);
                        
                        if (learnedIconValue && !newItemIcon) {
                          setNewItemIcon(learnedIconValue);
                        } else if (!newItemIcon && detectedIconValue) {
                          setNewItemIcon(detectedIconValue);
                        }
                        
                        if (learnedPriceValue !== null && !newItemPrice) {
                          setNewItemPrice(learnedPriceValue.toString());
                        }
                        
                        if (!newItemCategory && detectedCat) {
                          setNewItemCategory(detectedCat);
                        }
                      }
                    }}
                    onSelect={(value) => {
                      setNewItemName(value);
                      setSearchQuery(value);
                      
                      // Auto-fill everything for selected item
                      const learnedIconValue = getLearnedIcon(value);
                      const learnedPriceValue = getLearnedPrice(value);
                      const detectedCat = detectCategory(value);
                      const detectedIconValue = detectIcon(value);
                      
                      setNewItemIcon(learnedIconValue || detectedIconValue || '');
                      if (learnedPriceValue !== null) {
                        setNewItemPrice(learnedPriceValue.toString());
                      }
                      setNewItemCategory(detectedCat || '');
                    }}
                    previousItems={searchResults.map(r => r.name)}
                    placeholder="Type item name..."
                    className="input-field pl-10"
                  />
                </div>

                {searchResults.length > 0 && false && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                    {searchResults.slice(0, 5).map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded hover:bg-primary-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div
                          onClick={() => {
                            const itemName = result.name;
                            setNewItemName(itemName);
                            setNewItemQuantity(result.preferred_quantity || result.typical_quantity || '1');
                            setNewItemSize(result.preferred_unit || result.typical_unit || '');
                            setNewItemCategory(result.category || '');
                            
                            // Check learned preferences first, then fallback to result data
                            const learnedIconValue = getLearnedIcon(itemName);
                            const learnedPriceValue = getLearnedPrice(itemName);
                            
                            setNewItemIcon(learnedIconValue || result.icon || '');
                            setNewItemPrice(learnedPriceValue !== null ? learnedPriceValue.toString() : (result.average_price || ''));
                            
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">
                            {result.icon && <span className="mr-2">{result.icon}</span>}
                            {result.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {result.total_purchases ? `Bought ${result.total_purchases}x` : 'New'}
                          </span>
                          {result.total_purchases > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete "${result.name}" from history?`)) {
                                  deleteItemHistory(result.id);
                                }
                              }}
                              className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                              title="Delete from history"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="Qty"
                    className="input-field"
                  />
                  <select
                    value={newItemSize}
                    onChange={(e) => setNewItemSize(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Size</option>
                    <option value="oz">oz (ounces)</option>
                    <option value="lb">lb (pounds)</option>
                    <option value="g">g (grams)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="ml">ml (milliliters)</option>
                    <option value="L">L (liters)</option>
                    <option value="pt">pt (pints)</option>
                    <option value="qt">qt (quarts)</option>
                    <option value="gal">gal (gallons)</option>
                    <option value="ct">ct (count)</option>
                    <option value="pkg">pkg (package)</option>
                    <option value="box">box</option>
                    <option value="can">can</option>
                    <option value="bag">bag</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Price"
                    className="input-field"
                  />
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    ref={addButtonRef}
                    type="submit" 
                    className="btn-primary flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 mr-1" />
                    Add
                  </button>
                </div>
              </form>

              {/* Show recipes associated with this shopping list */}
              {activeList && (
                <div className="mb-6">
                  <ShoppingListRecipes listId={activeList.id} />
                </div>
              )}

              <ItemList
                items={smartSort ? sortItemsByStoreLayout(items) : items}
                onToggleCheck={toggleItemCheck}
                onDelete={deleteItem}
                onEdit={async (updatedItem) => {
                  try {
                    await shoppingAPI.updateItem(updatedItem.id, {
                      item_icon: updatedItem.item_icon,
                    });
                    
                    // Learn the user's icon choice
                    if (updatedItem.item_icon && updatedItem.item_name) {
                      learnIcon(updatedItem.item_name, updatedItem.item_icon);
                    }
                    
                    await loadListItems(activeList.id);
                  } catch (error) {
                    console.error('Error updating item:', error);
                  }
                }}
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
            {/* Animated Shopping Cart */}
            <AnimatedCart 
              items={smartSort ? sortItemsByStoreLayout(items) : items}
              sortedByZone={smartSort}
            />

            {/* Budget Tracker */}
            <BudgetTracker 
              items={items}
              totalCost={totalCost}
            />

            {/* Leveling System */}
            <LevelingSystem userId={user?.id || user?.username} />

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
              <PantryQuickView
                pantryItems={inventory}
                onAddToList={async (itemData) => {
                  if (!activeList) {
                    alert('Please create or select a shopping list first');
                    return;
                  }
                  try {
                    await shoppingAPI.addItem(activeList.id, itemData);
                    await loadListItems(activeList.id);
                    if (window.addXP) {
                      window.addXP(XP_REWARDS.ADD_ITEM, 'Added item from pantry');
                    }
                  } catch (error) {
                    console.error('Error adding item from pantry:', error);
                  }
                }}
                onViewPantry={() => navigate('/pantry')}
              />
            </div>
          </div>
              </div>
            </div>
          </main>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(product) => {
          setNewItemName(product.name);
          if (product.brand) {
            setNewItemName(`${product.brand} ${product.name}`);
          }
          setShowScanner(false);
        }}
      />

      {/* Share List Modal */}
      <ShareList
        list={activeList}
        items={items}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      {/* Voice Input Modal */}
      <VoiceInput
        isOpen={showVoice}
        onClose={() => setShowVoice(false)}
        onResult={(text) => {
          const parsedItems = parseVoiceInput(text);
          parsedItems.forEach(async (item) => {
            if (activeList) {
              try {
                await shoppingAPI.addItem(activeList.id, {
                  itemName: item.name,
                  quantity: item.quantity,
                  unit: item.unit,
                });
              } catch (error) {
                console.error('Error adding voice item:', error);
              }
            }
          });
          loadListItems(activeList?.id);
          if (window.addXP) {
            window.addXP(XP_REWARDS.ADD_ITEM * parsedItems.length, `Added ${parsedItems.length} items by voice`);
          }
        }}
      />

        {/* Onboarding Tutorial */}
        <Onboarding userId={user?.id || user?.username} />
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
