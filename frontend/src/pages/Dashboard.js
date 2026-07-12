import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCartAnimation } from '../contexts/CartAnimationContext';
import { shoppingAPI, itemsAPI, suggestionsAPI, inventoryAPI, categoriesAPI } from '../services/api';
import { 
  ShoppingCart, LogOut, Plus, Search, Trash2, Check, 
  AlertCircle, TrendingUp, Package, DollarSign, Lightbulb, ChefHat, Settings, ArrowUpDown, Calendar, BarChart3, Scan, Share2, Mic, History, X, Eye, EyeOff, StickyNote, Store, Edit2, ChevronDown, ChevronUp, Save, ArrowRight
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
import LevelUpModal from '../components/LevelUpModal';
import VoiceInput, { parseVoiceInput } from '../components/VoiceInput';
import NotificationCenter from '../components/NotificationCenter';
import Onboarding from '../components/Onboarding';
import Sidebar from '../components/Sidebar';
import AutocompleteInput from '../components/AutocompleteInput';
import TemplatesModal from '../components/TemplatesModal';
import NewListModal from '../components/NewListModal';
import PriceLearningModal from '../components/PriceLearningModal';
import AisleConfigModal from '../components/AisleConfigModal';
import StoreManager from '../components/StoreManager';
import CopyItemModal from '../components/CopyItemModal';
import SaveTemplateModal from '../components/SaveTemplateModal';
import NextItemSuggestion from '../components/NextItemSuggestion';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { XPNotificationContainer, showXPNotification } from '../components/XPNotification';
import { detectCategory, estimatePrice, detectIcon } from '../utils/categoryDetector';
import { sortItemsByStoreLayout, calculateEfficiency } from '../utils/cartPacking';
import { sortItemsByStoreAisle } from '../data/storeLayouts';
import { smartSortItems, getShoppingEfficiency } from '../utils/storeSorting';
import { learnIcon, getLearnedIcon, learnPrice, getLearnedPrice } from '../utils/userPreferences';
import { getAutocompleteSuggestions } from '../utils/autocomplete';
import { playSound } from '../utils/soundEffects';
import useScrollSound from '../hooks/useScrollSound';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { triggerFlyingAnimation } = useCartAnimation();
  const addButtonRef = useRef(null);
  const { toasts, hideToast, success, error, warning, info } = useToast();
  
  // Disable scroll sounds (too annoying)
  useScrollSound(false);
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
  const [itemPreferences, setItemPreferences] = useState([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [completedLists, setCompletedLists] = useState([]);
  const [hideCategories, setHideCategories] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showPriceLearning, setShowPriceLearning] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListStore, setNewListStore] = useState('');
  const [showAisleConfig, setShowAisleConfig] = useState(false);
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [addItemsMinimized, setAddItemsMinimized] = useState(false);
  const [customStores, setCustomStores] = useState([]);
  const [showCopyItemModal, setShowCopyItemModal] = useState(false);
  const [itemToCopy, setItemToCopy] = useState(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [checkOffCounter, setCheckOffCounter] = useState(0);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [hideNextItem, setHideNextItem] = useState(false);
  const [skippedItems, setSkippedItems] = useState([]);

  // Load item preferences for autocomplete
  const loadItemPreferences = async () => {
    try {
      const response = await itemsAPI.getPreferences();
      setItemPreferences(response.data || []);
    } catch (error) {
      console.error('Error loading item preferences:', error);
    }
  };

  // Load custom stores from database
  const loadCustomStores = async () => {
    try {
      const response = await fetch('/api/stores/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const stores = await response.json();
        setCustomStores(stores);
      }
    } catch (error) {
      console.error('Error loading custom stores:', error);
    }
  };

  useEffect(() => {
    loadLists();
    loadSuggestions();
    loadItemPreferences();
    loadInventory();
    loadCategories();
    loadCustomStores();

    // Listen for sidebar tool clicks
    const handleSidebarTool = (event) => {
      const { action } = event.detail;
      if (action === 'voice') setShowVoice(true);
      if (action === 'scan') setShowScanner(true);
      if (action === 'share') setShowShare(true);
    };

    // Reload inventory when page becomes visible (e.g., returning from Pantry page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadInventory();
      }
    };

    window.addEventListener('sidebar-tool-click', handleSidebarTool);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('sidebar-tool-click', handleSidebarTool);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeList) {
      loadListItems(activeList.id);
      // Remember last used list
      localStorage.setItem('lastActiveListId', activeList.id.toString());
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
      
      // Try to restore last used list from localStorage
      const lastListId = localStorage.getItem('lastActiveListId');
      let listToActivate = null;
      
      if (lastListId) {
        listToActivate = response.data.find(l => l.id.toString() === lastListId && l.status === 'active');
      }
      
      // Fallback to first active list if last list not found
      if (!listToActivate) {
        const activeLists = response.data.filter(l => l.status === 'active');
        if (activeLists.length > 0) {
          listToActivate = activeLists[0];
        }
      }
      
      if (listToActivate) {
        setActiveList(listToActivate);
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
      error('Failed to delete item from history');
    }
  };

  const createNewList = async (listData = null) => {
    // If no data provided, open the modal
    if (!listData) {
      setShowNewListModal(true);
      return;
    }

    try {
      const response = await shoppingAPI.createList(listData);
      setActiveList(response.data);
      await loadLists();
      await loadListItems(response.data.id);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const deleteList = async (listId) => {
    if (lists.length <= 1) {
      warning('You must have at least one shopping list');
      return;
    }
    
    setListToDelete(listId);
  };

  const confirmDeleteList = async () => {
    if (!listToDelete) return;
    
    try {
      const wasActiveList = activeList?.id === listToDelete;
      
      await shoppingAPI.deleteList(listToDelete);
      success('Shopping list deleted');
      const response = await shoppingAPI.getLists();
      setLists(response.data);
      
      // If we deleted the active list, switch to the first available list
      if (wasActiveList && response.data.length > 0) {
        const newActiveList = response.data[0];
        setActiveList(newActiveList);
        await loadListItems(newActiveList.id);
      } else if (response.data.length === 0) {
        // If no lists left, create a new one
        await createNewList();
      }
    } catch (err) {
      console.error('Error deleting list:', err);
      error('Failed to delete shopping list');
    } finally {
      setListToDelete(null);
    }
  };

  const loadCompletedLists = async () => {
    try {
      const response = await shoppingAPI.getCompletedLists();
      setCompletedLists(response.data);
      setShowRecovery(true);
    } catch (error) {
      console.error('Error loading completed lists:', error);
      error('Failed to load completed lists');
    }
  };

  const restoreList = async (listId) => {
    try {
      const response = await shoppingAPI.restoreList(listId);
      setActiveList(response.data);
      await loadLists();
      await loadListItems(response.data.id);
      setShowRecovery(false);
      success('Shopping list restored successfully!');
    } catch (error) {
      console.error('Error restoring list:', error);
      error('Failed to restore shopping list');
    }
  };

  const handlePriceLearningSubmit = async (priceData) => {
    try {
      // TODO: Send to backend API when stores route is ready
      // For now, just show success
      success('Price data saved! Thank you for contributing.');
      setShowPriceLearning(false);
    } catch (err) {
      console.error('Error saving price data:', err);
      error('Failed to save price data');
    }
  };

  const updateListName = async () => {
    if (!newListName.trim() || !activeList) return;
    
    try {
      const updateData = { 
        name: newListName.trim(),
        store_name: newListStore || null
      };
      await shoppingAPI.updateList(activeList.id, updateData);
      setActiveList({ ...activeList, ...updateData });
      await loadLists();
      
      // Auto-enable smart sort when store is set for efficient shopping
      if (newListStore && !smartSort) {
        setSmartSort(true);
        info('🏪 List sorted by store aisles for fastest shopping!');
      }
      
      success('List updated!');
      setEditingListName(false);
      setNewListName('');
      setNewListStore('');
    } catch (err) {
      console.error('Error updating list:', err);
      error('Failed to update list');
    }
  };

  // Get sorted items based on store selection
  const getSortedItems = () => {
    if (!smartSort) return items;
    
    // Use new smart sorting with temperature zones and fragility rules
    // This ensures: produce first, frozen last, fragile items on top
    return smartSortItems(items, null); // TODO: Pass store template when available
  };

  // Get next unchecked item for "Looking for Next" feature
  const getNextItem = () => {
    const sortedItems = getSortedItems();
    return sortedItems.find(item => !item.is_checked && !skippedItems.includes(item.id));
  };
  
  // Skip current item and move to next
  const skipNextItem = () => {
    const nextItem = getNextItem();
    if (nextItem) {
      setSkippedItems(prev => [...prev, nextItem.id]);
    }
  };
  
  // Filter items by search query
  const getFilteredItems = () => {
    const sorted = getSortedItems();
    if (!itemSearchQuery.trim()) return sorted;
    
    const query = itemSearchQuery.toLowerCase();
    return sorted.filter(item => 
      item.item_name.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.aisle_name && item.aisle_name.toLowerCase().includes(query))
    );
  };

  // Get items in the same aisle as the next item
  const getSameAisleItems = (nextItem) => {
    if (!nextItem || !nextItem.aisle) return [];
    
    const sortedItems = getSortedItems();
    return sortedItems
      .filter(item => 
        !item.is_checked && 
        item.id !== nextItem.id && 
        item.aisle === nextItem.aisle
      )
      .slice(0, 3); // Show max 3 same-aisle items
  };

  const addItem = async (e) => {
    e.preventDefault();
    
    if (!newItemName.trim()) return;
    
    if (!activeList) {
      alert('No shopping list selected. Creating a new list...');
      await createNewList();
      return;
    }

    try {
      const itemName = newItemName.trim();
      const itemPrice = parseFloat(newItemPrice) || 0;
      const itemIcon = newItemIcon;
      
      await shoppingAPI.addItem(activeList.id, {
        itemName: itemName,
        quantity: newItemQuantity ? parseFloat(newItemQuantity) : 1,
        unit: newItemSize || '',
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
        showXPNotification(XP_REWARDS.ADD_ITEM, 'Item added!');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const addTemplateItems = async (templateItems) => {
    if (!activeList) {
      info('Creating a new shopping list...');
      await createNewList();
      return;
    }

    try {
      // Add all template items
      for (const item of templateItems) {
        await shoppingAPI.addItem(activeList.id, {
          itemName: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || '',
          price: 0,
          category: item.category || '',
          icon: item.icon || '',
        });
      }

      await loadListItems(activeList.id);
      
      // Award XP for bulk add
      if (window.addXP) {
        const xpAmount = XP_REWARDS.ADD_ITEM * templateItems.length;
        window.addXP(xpAmount, `Added ${templateItems.length} items from template`);
        showXPNotification(xpAmount, `${templateItems.length} items added!`);
      }
    } catch (error) {
      console.error('Error adding template items:', error);
      error('Failed to add some items');
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
    const newCheckedState = !item.is_checked;
    
    // Play sound immediately
    playSound(newCheckedState ? 'check' : 'uncheck');
    
    // Optimistic update - update UI immediately
    setItems(prevItems => 
      prevItems.map(i => 
        i.id === item.id ? { ...i, is_checked: newCheckedState } : i
      )
    );
    
    try {
      // Update backend
      await shoppingAPI.updateItem(activeList.id, item.id, {
        isChecked: newCheckedState,
      });
      
      // Record check-off order for learning (only when checking, not unchecking)
      if (newCheckedState && activeList) {
        const nextOrder = checkOffCounter + 1;
        setCheckOffCounter(nextOrder);
        
        // Send to backend for learning (non-blocking)
        fetch(`/api/shopping/lists/${activeList.id}/items/${item.id}/check`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ checkOffOrder: nextOrder })
        }).catch(err => console.error('Error recording check-off:', err));
      }
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert optimistic update on error
      setItems(prevItems => 
        prevItems.map(i => 
          i.id === item.id ? { ...i, is_checked: !newCheckedState } : i
        )
      );
      playSound('error');
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

  const handleCopyMove = (item) => {
    setItemToCopy(item);
    setShowCopyItemModal(true);
  };

  const copyItemToList = async (item, targetListId) => {
    try {
      // Add item to target list
      for (const id of item.ids) {
        const itemData = items.find(i => i.id === id);
        await shoppingAPI.addItem(targetListId, {
          itemName: itemData.item_name,
          quantity: itemData.quantity,
          unit: itemData.unit,
          price: itemData.price,
          category: itemData.category,
          icon: itemData.item_icon,
          notes: itemData.notes,
          aisleNumber: itemData.aisle_number,
          aisleName: itemData.aisle_name,
          upc: itemData.upc,
          isOnSale: itemData.is_on_sale,
          originalPrice: itemData.original_price
        });
      }
      success(`Copied "${item.item_name}" to list`);
    } catch (error) {
      console.error('Error copying item:', error);
      error('Failed to copy item');
    }
  };

  const moveItemToList = async (item, targetListId) => {
    try {
      console.log('Moving item:', item);
      console.log('Target list ID:', targetListId);
      console.log('Item IDs:', item.ids);
      
      // Add to target list
      for (const id of item.ids) {
        const itemData = items.find(i => i.id === id);
        console.log('Found item data:', itemData);
        
        if (!itemData) {
          console.error('Item data not found for ID:', id);
          continue;
        }
        
        const addResponse = await shoppingAPI.addItem(targetListId, {
          itemName: itemData.item_name,
          quantity: itemData.quantity,
          unit: itemData.unit,
          price: itemData.price,
          category: itemData.category,
          icon: itemData.item_icon,
          notes: itemData.notes,
          aisleNumber: itemData.aisle_number,
          aisleName: itemData.aisle_name,
          upc: itemData.upc,
          isOnSale: itemData.is_on_sale,
          originalPrice: itemData.original_price
        });
        console.log('Added to target list:', addResponse);
      }
      
      // Delete from current list
      for (const id of item.ids) {
        console.log('Deleting item ID:', id, 'from list:', activeList.id);
        const deleteResponse = await shoppingAPI.deleteItem(activeList.id, id);
        console.log('Delete response:', deleteResponse);
      }
      
      // Refresh the current list to show updated items
      console.log('Refreshing list items...');
      const response = await shoppingAPI.getList(activeList.id);
      console.log('Got fresh list data:', response.data);
      setItems([...response.data.items]); // Force new array reference to trigger re-render
      console.log('List refreshed, new items count:', response.data.items.length);
      
      success(`Moved "${item.item_name}" to another list`);
    } catch (error) {
      console.error('Error moving item:', error);
      console.error('Error details:', error.response?.data);
      error(`Failed to move item: ${error.message}`);
    }
  };

  const saveListAsTemplate = () => {
    if (!activeList || items.length === 0) {
      error('Cannot save empty list as template');
      return;
    }
    setShowSaveTemplateModal(true);
  };

  const saveTemplateWithName = async (templateName) => {
    try {
      const response = await fetch('/api/shopping/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName,
          items: items.map(item => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            item_icon: item.item_icon
          }))
        })
      });

      const data = await response.json();

      if (response.ok) {
        success(`Saved "${templateName}" as template!`);
        setShowSaveTemplateModal(false);
      } else {
        throw new Error(data.error || 'Failed to save template');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      error(err.message || 'Failed to save template. Please try again.');
    }
  };

  const completeList = async () => {
    if (!activeList) return;

    try {
      // Play success sound
      playSound('success');
      
      // Show celebration animation
      setShowCelebration(true);
      
      // Complete the shopping trip
      await shoppingAPI.completeList(activeList.id);
      
      // Award XP for completing trip
      const tripData = {
        items: items,
        actualCost: totalCost,
        allItemsChecked: checkedCount === items.length,
        duration: null
      };
      
      // Call XP API to award points
      try {
        const xpResponse = await fetch('/api/xp/complete-trip', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tripData })
        });
        
        const xpResult = await xpResponse.json();
        
        // Show level up modal if user leveled up (faster)
        if (xpResult.levelUp) {
          setTimeout(() => {
            setLevelUpData(xpResult);
            setShowLevelUp(true);
            playSound('coin');
          }, 800); // Reduced from 1500ms to 800ms
        }
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
      }
      
      // Auto-categorize items to pantry/fridge/freezer
      for (const item of items) {
        const storageLocation = getStorageLocation(item.category || item.category_name);
        
        try {
          await fetch('/api/pantry', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              item_name: item.item_name,
              quantity: item.quantity,
              unit: item.unit,
              storage_location: storageLocation,
              category: item.category || item.category_name,
              expiry_date: getDefaultExpiryDate(storageLocation)
            })
          });
        } catch (pantryError) {
          console.error('Error adding to pantry:', pantryError);
        }
      }
      
      await createNewList();
      await loadInventory();
      await loadSuggestions();
      
      // Hide celebration after 3 seconds
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (error) {
      console.error('Error completing list:', error);
      setShowCelebration(false);
    }
  };
  
  // Helper function to determine storage location based on category
  const getStorageLocation = (category) => {
    const fridgeCategories = ['Dairy', 'Meat', 'Deli', 'Produce', 'Fruits'];
    const freezerCategories = ['Frozen'];
    
    if (!category) return 'pantry';
    
    if (freezerCategories.some(cat => category.toLowerCase().includes(cat.toLowerCase()))) {
      return 'freezer';
    }
    if (fridgeCategories.some(cat => category.toLowerCase().includes(cat.toLowerCase()))) {
      return 'fridge';
    }
    return 'pantry';
  };
  
  // Helper function to get default expiry date based on storage
  const getDefaultExpiryDate = (storageLocation) => {
    const now = new Date();
    switch(storageLocation) {
      case 'fridge':
        now.setDate(now.getDate() + 7); // 1 week
        break;
      case 'freezer':
        now.setMonth(now.getMonth() + 3); // 3 months
        break;
      case 'pantry':
      default:
        now.setMonth(now.getMonth() + 6); // 6 months
        break;
    }
    return now.toISOString().split('T')[0];
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
        <Sidebar onAction={(action) => {
          if (action === 'stores') setShowStoreManager(true);
          else if (action === 'voice') setShowVoice(true);
          else if (action === 'scan') setShowScanner(true);
          else if (action === 'share') setShowShare(true);
        }} />

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
              {/* Shopping List Header */}
              <div className="mb-6">
                {/* Title and Dropdown Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shopping List</h2>
                    {lists.length > 0 && (
                      <select
                        value={activeList?.id || ''}
                        onChange={(e) => {
                          const list = lists.find(l => l.id === parseInt(e.target.value));
                          setActiveList(list);
                          if (list) loadListItems(list.id);
                        }}
                        className="input-field text-sm flex-1 max-w-xs"
                      >
                        {lists.map(list => (
                          <option key={list.id} value={list.id}>
                            {list.name} ({list.item_count || 0} items)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Item Counter - Top Right */}
                {activeList && (
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                        📋 {activeList.name}
                        <button
                          onClick={() => {
                            setNewListName(activeList.name);
                            setNewListStore(activeList.store_name || '');
                            setEditingListName(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit list name"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Item Counter */}
                    <div className={`text-lg font-bold px-4 py-2 rounded-lg shadow-md border-2 transition-all ${
                      checkedCount === items.length && items.length > 0
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-500'
                        : checkedCount > 0
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-500'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-400'
                    }`}>
                      <span className="text-2xl font-extrabold">{checkedCount}</span>
                      <span className="mx-1">/</span>
                      <span className="text-xl">{items.length}</span>
                      <span className="ml-2 text-sm font-normal">items</span>
                    </div>
                  </div>
                )}
                
                {/* Store Info */}
                {activeList && (
                  <div className="mb-4">
                    <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Store className="w-4 h-4 mr-2" />
                      {activeList.store_name ? (
                        <>
                          <span className="font-medium">Shopping at: </span>
                          <span className="ml-1 text-blue-600 dark:text-blue-400 font-semibold">{activeList.store_name}</span>
                          <button
                            onClick={() => {
                              setNewListName(activeList.name);
                              setNewListStore(activeList.store_name || '');
                              setEditingListName(true);
                            }}
                            className="ml-2 text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            (change)
                          </button>
                          <button
                            onClick={() => setShowAisleConfig(true)}
                            className="ml-2 text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                          >
                            ⚙️ Configure Aisles
                          </button>
                          {activeList.list_type && activeList.list_type !== 'general' && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                              {activeList.list_type}
                            </span>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setNewListName(activeList.name);
                            setNewListStore('');
                            setEditingListName(true);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                        >
                          + Set store location
                        </button>
                      )}
                    </div>
                    {activeList.notes && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                        {activeList.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createNewList()}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="btn-secondary text-sm flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Add common items from templates"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPriceLearning(true)}
                    className="btn-secondary text-sm flex items-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                    title="Learn prices and earn XP"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Learn Prices
                  </button>
                  <button
                    type="button"
                    onClick={loadCompletedLists}
                    className="btn-secondary text-sm flex items-center"
                    title="Recover completed lists"
                  >
                    <History className="w-4 h-4 mr-1" />
                    Recover
                  </button>
                  {lists.length > 1 && activeList && (
                    <button
                      type="button"
                      onClick={() => deleteList(activeList.id)}
                      className="btn-secondary text-sm flex items-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete this list"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  )}
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  <button
                    onClick={() => setSmartSort(!smartSort)}
                    className={`btn-secondary text-sm flex items-center ${smartSort ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : ''}`}
                    title={smartSort 
                      ? (activeList?.store_name ? `Sorted by ${activeList.store_name} aisles` : 'Sorted by store layout')
                      : (activeList?.store_name ? `Sort by ${activeList.store_name} aisles` : 'Sort by store layout')
                    }
                  >
                    <ArrowUpDown className="w-4 h-4 mr-1" />
                    {smartSort ? (activeList?.store_name ? '🏪' : `${calculateEfficiency(items)}%`) : 'Sort'}
                  </button>
                  <button
                    onClick={() => setHideCategories(!hideCategories)}
                    className={`btn-secondary text-sm flex items-center ${hideCategories ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                    title={hideCategories ? 'Show categories' : 'Hide categories'}
                  >
                    {hideCategories ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {hideCategories ? 'Show' : 'Hide'}
                  </button>
                </div>
              </div>

              {/* Add Item Section - Highlighted */}
              <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-primary-300 dark:border-primary-600 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center mr-3">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Items to Your List</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Start typing to add items with smart suggestions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddItemsMinimized(!addItemsMinimized)}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition-colors"
                    title={addItemsMinimized ? "Expand" : "Minimize"}
                  >
                    {addItemsMinimized ? (
                      <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              
              {!addItemsMinimized && (
              <form onSubmit={addItem}>
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
                      
                      // Find item in preferences
                      const preference = itemPreferences.find(
                        p => p.name.toLowerCase() === value.toLowerCase()
                      );
                      
                      if (preference) {
                        // Use saved preferences
                        console.log('Found preference:', preference);
                        if (preference.preferred_icon) setNewItemIcon(preference.preferred_icon);
                        if (preference.average_price) setNewItemPrice(preference.average_price.toString());
                        if (preference.category) setNewItemCategory(preference.category);
                        // Set quantity as integer
                        const qty = preference.preferred_quantity ? Math.floor(preference.preferred_quantity) : 1;
                        setNewItemQuantity(qty.toString());
                        if (preference.preferred_unit) setNewItemSize(preference.preferred_unit);
                      } else {
                        // Fallback to local learning and detection
                        const learnedIconValue = getLearnedIcon(value);
                        const learnedPriceValue = getLearnedPrice(value);
                        const detectedCat = detectCategory(value);
                        const detectedIconValue = detectIcon(value);
                      
                        setNewItemIcon(learnedIconValue || detectedIconValue || '');
                        if (learnedPriceValue !== null) {
                          setNewItemPrice(learnedPriceValue.toString());
                        }
                        setNewItemCategory(detectedCat || '');
                      }
                    }}
                    onAutoFill={() => {
                      // Set quantity to 1 when autofilling from dropdown
                      if (!newItemQuantity) {
                        setNewItemQuantity('1');
                      }
                    }}
                    previousItems={[
                      ...itemPreferences.map(p => p.name),
                      ...searchResults.map(r => r.name)
                    ]}
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
                    type="text"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="Qty (e.g., 2, 1.5)"
                    className="input-field"
                  />
                  <input
                    type="text"
                    value={newItemSize}
                    onChange={(e) => setNewItemSize(e.target.value)}
                    placeholder="Size (e.g., 1lb, 16oz)"
                    className="input-field"
                  />
                  <input
                    type="text"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Price (e.g., 3.99)"
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
              )}
              </div>
              {/* End Add Item Section */}

              {/* Show recipes associated with this shopping list */}
              {activeList && (
                <div className="mb-6">
                  <ShoppingListRecipes listId={activeList.id} />
                </div>
              )}

              {/* Item Search Bar */}
              {items.length > 0 && (
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder="Search items in your list..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all"
                    />
                    {itemSearchQuery && (
                      <button
                        onClick={() => setItemSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {itemSearchQuery && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Found {getFilteredItems().length} of {items.length} items
                    </p>
                  )}
                </div>
              )}

              {/* Next Item Suggestion - Smart aisle-based */}
              {!hideNextItem && items.length > 0 && (() => {
                const nextItem = getNextItem();
                const sameAisleItems = nextItem ? getSameAisleItems(nextItem) : [];
                return nextItem ? (
                  <NextItemSuggestion 
                    nextItem={nextItem} 
                    sameAisleItems={sameAisleItems}
                    onCheck={() => toggleItemCheck(nextItem)}
                    onCopyMove={() => handleCopyMove(nextItem)}
                    onSkip={skipNextItem}
                    onHide={() => setHideNextItem(true)}
                  />
                ) : null;
              })()}
              
              {/* Show button to re-enable Looking for Next if hidden */}
              {hideNextItem && items.length > 0 && getNextItem() && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      setHideNextItem(false);
                      setSkippedItems([]);
                    }}
                    className="w-full py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-500 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Show Looking for Next Feature
                  </button>
                </div>
              )}

              <ItemList
                items={getFilteredItems()}
                onToggleCheck={toggleItemCheck}
                onDelete={deleteItem}
                onCopyMove={handleCopyMove}
                triggerAnimation={triggerFlyingAnimation}
                nextItemId={getNextItem()?.id}
                hideCategories={hideCategories}
                storeName={activeList?.store_name}
                onEdit={async (updatedItem) => {
                  try {
                    console.log('Updating item:', updatedItem);
                    console.log('Icon being sent:', updatedItem.item_icon);
                    
                    const updateData = {
                      item_name: updatedItem.item_name,
                      quantity: updatedItem.quantity,
                      unit: updatedItem.unit,
                      price: updatedItem.price,
                      category: updatedItem.category,
                      item_icon: updatedItem.item_icon,
                      notes: updatedItem.notes
                    };
                    
                    console.log('Update payload:', updateData);
                    
                    const response = await shoppingAPI.updateItem(activeList.id, updatedItem.id, updateData);
                    console.log('Update response:', response.data);
                    
                    // Learn the user's icon choice
                    if (updatedItem.item_icon && updatedItem.item_name) {
                      learnIcon(updatedItem.item_name, updatedItem.item_icon);
                    }
                    
                    // Learn the price
                    if (updatedItem.price && updatedItem.item_name) {
                      learnPrice(updatedItem.item_name, parseFloat(updatedItem.price));
                    }
                    
                    // Force reload list items to show updated icon
                    await loadListItems(activeList.id);
                    await loadItemPreferences();
                    
                    // Force a re-render by updating state
                    setItems(prevItems => [...prevItems]);
                  } catch (error) {
                    console.error('Error updating item:', error);
                    error('Failed to update item. Please try again.');
                  }
                }}
              />

              {items.length > 0 && (
                <div className="mt-6 space-y-2">
                  <button
                    onClick={completeList}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Complete Shopping Trip
                  </button>
                  <button
                    onClick={saveListAsTemplate}
                    className="w-full btn-secondary flex items-center justify-center text-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Animated Shopping Cart */}
            <AnimatedCart 
              items={getSortedItems()}
              sortedByZone={smartSort}
            />

            {/* Budget Tracker */}
            <BudgetTracker 
              items={items}
              totalCost={totalCost}
              listId={activeList?.id}
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
                    warning('Please create or select a shopping list first');
                    return;
                  }
                  try {
                    await shoppingAPI.addItem(activeList.id, itemData);
                    await loadListItems(activeList.id);
                    if (window.addXP) {
                      window.addXP(XP_REWARDS.ADD_ITEM, 'Added item from pantry');
                      showXPNotification(XP_REWARDS.ADD_ITEM, 'Added from pantry!');
                    }
                  } catch (error) {
                    console.error('Error adding item from pantry:', error);
                  }
                }}
                onViewPantry={() => navigate('/pantry')}
                onDeleteItem={async (itemId) => {
                  try {
                    await inventoryAPI.deleteItem(itemId);
                    await loadInventory();
                    success('Item removed from inventory');
                  } catch (error) {
                    console.error('Error deleting item:', error);
                    error('Failed to delete item');
                  }
                }}
                onClearAll={async () => {
                  if (window.confirm('Are you sure you want to clear all items from your inventory?')) {
                    try {
                      for (const item of inventory) {
                        await inventoryAPI.deleteItem(item.id);
                      }
                      await loadInventory();
                      success('All items cleared from inventory');
                    } catch (error) {
                      console.error('Error clearing inventory:', error);
                      error('Failed to clear inventory');
                    }
                  }
                }}
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
            const xpAmount = XP_REWARDS.ADD_ITEM * parsedItems.length;
            window.addXP(xpAmount, `Added ${parsedItems.length} items by voice`);
            showXPNotification(xpAmount, `Voice: ${parsedItems.length} items!`);
          }
        }}
      />

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onAddItems={addTemplateItems}
      />

      {/* New List Modal */}
      <NewListModal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        onCreateList={createNewList}
        existingLists={lists}
      />

      {/* Price Learning Modal */}
      <PriceLearningModal
        isOpen={showPriceLearning}
        onClose={() => setShowPriceLearning(false)}
        onSubmit={handlePriceLearningSubmit}
        storeLocation={activeList?.store_name ? { name: activeList.store_name } : null}
        onAddToList={activeList ? async (itemData) => {
          try {
            await shoppingAPI.addItem(activeList.id, itemData);
            await loadListItems(activeList.id);
            success('Item added to shopping list!');
          } catch (err) {
            console.error('Error adding item to list:', err);
            error('Failed to add item to list');
          }
        } : null}
      />

        {/* Onboarding Tutorial */}
        <Onboarding userId={user?.id || user?.username} />
        
        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
            <div className="text-center animate-bounce">
              <div className="text-8xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-white mb-2">Shopping Complete!</h2>
              <p className="text-xl text-white">+{Math.floor(totalCost * 10)} XP Earned!</p>
            </div>
          </div>
        )}
        
        {/* Level Up Modal */}
        {showLevelUp && levelUpData && (
          <LevelUpModal
            isOpen={showLevelUp}
            onClose={() => setShowLevelUp(false)}
            levelData={levelUpData}
          />
        )}
        
        {/* Recovery Modal */}
        {showRecovery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔄 Recover Completed Lists
                </h2>
                <button
                  onClick={() => setShowRecovery(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                {completedLists.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                      No completed lists found
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                      Completed lists will appear here for recovery
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedLists.map((list) => (
                      <div
                        key={list.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              📋 {list.name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>{list.item_count} items</span>
                              <span>${parseFloat(list.total_cost || 0).toFixed(2)}</span>
                              <span>
                                Completed: {new Date(list.completed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => restoreList(list.id)}
                            className="btn-primary flex items-center"
                          >
                            <History className="w-4 h-4 mr-2" />
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
          duration={toast.duration}
        />
      ))}

      {/* XP Notifications */}
      <XPNotificationContainer />

      {/* Delete List Confirmation */}
      <ConfirmDialog
        isOpen={listToDelete !== null}
        title="Delete Shopping List"
        message="Are you sure you want to delete this shopping list? All items will be removed permanently."
        onConfirm={confirmDeleteList}
        onCancel={() => setListToDelete(null)}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Edit List Name Modal */}
      {editingListName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Shopping List
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="input-field"
                  placeholder="Enter list name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateListName();
                    if (e.key === 'Escape') {
                      setEditingListName(false);
                      setNewListName('');
                      setNewListStore('');
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store Location
                </label>
                <select
                  value={newListStore}
                  onChange={(e) => setNewListStore(e.target.value)}
                  className="input-field"
                >
                  <option value="">No store selected</option>
                  
                  {/* Default store chains */}
                  <optgroup label="Store Chains">
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Kroger">Kroger</option>
                    <option value="Aldi">Aldi</option>
                    <option value="Costco">Costco</option>
                    <option value="Amazon">Amazon Fresh</option>
                    <option value="Whole Foods">Whole Foods Market</option>
                    <option value="Safeway">Safeway</option>
                    <option value="Publix">Publix</option>
                  </optgroup>
                  
                  {/* Custom stores */}
                  {customStores.length > 0 && (
                    <optgroup label="My Custom Stores">
                      {customStores.map((store) => (
                        <option key={store.id} value={store.name}>
                          {store.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={() => {
                    setEditingListName(false);
                    setShowStoreManager(true);
                  }}
                  className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                >
                  🏪 Create custom store or manage aisles →
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={updateListName}
                disabled={!newListName.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingListName(false);
                  setNewListName('');
                  setNewListStore('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Manager */}
      <StoreManager
        isOpen={showStoreManager}
        onClose={() => {
          setShowStoreManager(false);
          loadCustomStores(); // Reload stores when manager closes
        }}
        onStoreCreated={(store) => {
          // Optionally set the new store as the active list's store
          console.log('Store created:', store);
          loadCustomStores(); // Reload stores when new store is created
        }}
      />

      {/* Copy/Move Item Modal */}
      <CopyItemModal
        isOpen={showCopyItemModal}
        onClose={() => {
          setShowCopyItemModal(false);
          setItemToCopy(null);
        }}
        item={itemToCopy}
        lists={lists.filter(list => list.id !== activeList?.id)}
        onCopy={copyItemToList}
        onMove={moveItemToList}
      />

      {/* Aisle Configuration Modal */}
      <AisleConfigModal
        isOpen={showAisleConfig}
        onClose={() => setShowAisleConfig(false)}
        storeName={activeList?.store_name}
        onSave={async (aisles) => {
          console.log('Saving aisles:', aisles);
          setShowAisleConfig(false);
          // Reload items to see aisle updates
          if (activeList) {
            await loadListItems(activeList.id);
          }
        }}
      />

      {/* Save Template Modal */}
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        onSave={saveTemplateWithName}
        defaultName={activeList?.name}
      />
    </PageTransition>
  );
};

export default Dashboard;
