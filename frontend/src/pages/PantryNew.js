import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3, Download, Trash2 } from 'lucide-react';
import inventoryAPI from '../services/inventoryAPI';
import { shoppingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { enrichItemsWithExpirationStatus } from '../utils/expirationHelper';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import Toast from '../components/Toast';

// New Inventory Components
import StorageLocationTabs from '../components/inventory/StorageLocationTabs';
import InventoryCard from '../components/inventory/InventoryCard';
import AddItemModal from '../components/inventory/AddItemModal';
import InventoryFilters from '../components/inventory/InventoryFilters';
import InventoryStats from '../components/inventory/InventoryStats';
import ViewModeSelector from '../components/inventory/ViewModeSelector';
import ShelfView from '../components/inventory/ShelfView';
import CategoryBoxView from '../components/inventory/CategoryBoxView';
import ListView from '../components/inventory/ListView';

/**
 * PantryNew - Complete rewrite of Pantry page with Kitchen Inventory features
 * - Custom storage locations
 * - Smart expiration tracking
 * - Tablet-optimized UI
 * - Advanced filters and search
 * - Analytics dashboard
 */
const PantryNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, toasts, hideToast } = useToast();

  // State
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState({ default: [], custom: [] });
  const [stats, setStats] = useState(null);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeLocation, setActiveLocation] = useState(null); // null = all items
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid, shelf, list, category
  const [cardSize, setCardSize] = useState('medium'); // small, medium, large

  // Load data on mount
  useEffect(() => {
    loadAll();
  }, []);

  // Reload items when filters change
  useEffect(() => {
    loadItems();
  }, [activeLocation, filters, sortBy, sortOrder, searchTerm]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLocations(),
        loadItems(),
        loadStats(),
        loadExpiringSoon()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      showError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await inventoryAPI.getLocations();
      setLocations(data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadItems = async () => {
    try {
      const filterParams = {
        ...filters,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      // Handle location filter
      if (activeLocation) {
        if (activeLocation.startsWith('custom_')) {
          filterParams.custom_location_id = activeLocation.replace('custom_', '');
        } else {
          filterParams.storage_location = activeLocation;
        }
      }

      const data = await inventoryAPI.getItems(filterParams);
      // Enrich items with expiration status
      const enrichedItems = enrichItemsWithExpirationStatus(data);
      setItems(enrichedItems);
    } catch (error) {
      console.error('Failed to load items:', error);
      showError('Failed to load items');
    }
  };

  const loadStats = async () => {
    try {
      const data = await inventoryAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadExpiringSoon = async () => {
    try {
      const data = await inventoryAPI.getExpiringSoon(7);
      const enrichedItems = enrichItemsWithExpirationStatus(data);
      setExpiringSoon(enrichedItems);
    } catch (error) {
      console.error('Failed to load expiring items:', error);
    }
  };

  // ============================================
  // ITEM ACTIONS
  // ============================================

  const handleAddItem = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSaveItem = async (itemData) => {
    try {
      if (editingItem) {
        await inventoryAPI.updateItem(editingItem.id, itemData);
        success('Item updated successfully');
      } else {
        await inventoryAPI.addItem(itemData);
        success('Item added to inventory');
      }
      setShowAddModal(false);
      setEditingItem(null);
      loadAll();
    } catch (error) {
      console.error('Failed to save item:', error);
      showError('Failed to save item');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}"?`)) return;

    try {
      await inventoryAPI.deleteItem(item.id);
      success('Item deleted');
      loadAll();
    } catch (error) {
      console.error('Failed to delete item:', error);
      showError('Failed to delete item');
    }
  };

  const handleAddToShoppingList = async (item) => {
    try {
      // Get user's active shopping list
      const lists = await shoppingAPI.getLists();
      const activeList = lists.data.find(list => list.status === 'active');
      
      if (!activeList) {
        showError('No active shopping list found');
        return;
      }

      await shoppingAPI.addItem(activeList.id, {
        item_name: item.item_name,
        quantity: item.current_quantity || 1,
        category: item.category
      });

      success(`Added "${item.item_name}" to shopping list`);
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      showError('Failed to add to shopping list');
    }
  };

  const handleStillGood = async (item) => {
    try {
      await inventoryAPI.markStillGood(item.id, 3);
      success(`Extended expiration for "${item.item_name}" by 3 days`);
      loadAll();
    } catch (error) {
      console.error('Failed to mark as still good:', error);
      showError('Failed to update expiration');
    }
  };

  const handleWentBad = async (item) => {
    if (!window.confirm(`Mark "${item.item_name}" as went bad? This will help improve expiration estimates.`)) {
      return;
    }

    try {
      const result = await inventoryAPI.markWentBad(item.id);
      success(result.message || 'Item marked as went bad. Learning from this data.');
      loadAll();
    } catch (error) {
      console.error('Failed to mark as went bad:', error);
      showError('Failed to mark as went bad');
    }
  };

  const handleMarkOpened = async (item) => {
    try {
      await inventoryAPI.markOpened(item.id);
      success(`Marked "${item.item_name}" as opened`);
      loadAll();
    } catch (error) {
      console.error('Failed to mark as opened:', error);
      showError('Failed to mark as opened');
    }
  };

  // ============================================
  // LOCATION ACTIONS
  // ============================================

  const handleAddLocation = async (locationData) => {
    try {
      await inventoryAPI.createLocation(locationData);
      success('Custom location added');
      loadLocations();
    } catch (error) {
      console.error('Failed to add location:', error);
      showError('Failed to add location');
    }
  };

  const handleEditLocation = async (id, locationData) => {
    try {
      await inventoryAPI.updateLocation(id, locationData);
      success('Location updated');
      loadLocations();
    } catch (error) {
      console.error('Failed to update location:', error);
      showError('Failed to update location');
    }
  };

  const handleDeleteLocation = async (id) => {
    try {
      await inventoryAPI.deleteLocation(id);
      success('Location deleted');
      loadLocations();
      if (activeLocation === `custom_${id}`) {
        setActiveLocation(null);
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      if (error.response?.data?.itemCount) {
        showError(`Cannot delete location with ${error.response.data.itemCount} items`);
      } else {
        showError('Failed to delete location');
      }
    }
  };

  // ============================================
  // FILTER ACTIONS
  // ============================================

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // ============================================
  // CLEAR ACTIONS
  // ============================================

  const handleClearLocation = async (location) => {
    const locationName = location === 'pantry' ? 'Pantry' : location === 'fridge' ? 'Fridge' : 'Freezer';
    const itemCount = items.filter(item => item.storage_location === location).length;
    
    if (!window.confirm(`Are you sure you want to clear all ${itemCount} items from ${locationName}? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await inventoryAPI.clearByLocation(location);
      success(result.message || `Cleared ${locationName}`);
      loadAll();
    } catch (error) {
      console.error('Failed to clear location:', error);
      showError('Failed to clear location');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Are you sure you want to clear ALL ${items.length} items from your inventory? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await inventoryAPI.clearAll();
      success(result.message || 'Cleared all inventory');
      loadAll();
    } catch (error) {
      console.error('Failed to clear all:', error);
      showError('Failed to clear all items');
    }
  };

  // Calculate item counts per location
  const getItemCounts = () => {
    const counts = { total: items.length };
    
    items.forEach(item => {
      if (item.custom_location_id) {
        const key = `custom_${item.custom_location_id}`;
        counts[key] = (counts[key] || 0) + 1;
      } else if (item.storage_location) {
        counts[item.storage_location] = (counts[item.storage_location] || 0) + 1;
      }
    });

    return counts;
  };

  const categories = [
    'Dairy & Eggs',
    'Meat & Seafood',
    'Produce',
    'Bakery & Bread',
    'Canned & Jarred',
    'Grains & Pasta',
    'Spices & Seasonings',
    'Snacks & Sweets',
    'Beverages',
    'Condiments & Sauces',
    'Frozen Foods',
    'Leftovers',
    'Other'
  ];

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1800px] mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Kitchen Inventory
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your pantry, fridge, and freezer items with smart expiration tracking
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <BarChart3 size={20} />
                  <span>{showStats ? 'Hide' : 'Show'} Stats</span>
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Stats Dashboard */}
            {showStats && (
              <InventoryStats 
                stats={stats} 
                expiringSoon={expiringSoon}
              />
            )}

            {/* Storage Location Tabs */}
            <StorageLocationTabs
              locations={locations}
              activeLocation={activeLocation}
              onLocationChange={setActiveLocation}
              onAddLocation={handleAddLocation}
              onEditLocation={handleEditLocation}
              onDeleteLocation={handleDeleteLocation}
              itemCounts={getItemCounts()}
            />

            {/* Filters */}
            <InventoryFilters
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              categories={categories}
              activeFilters={filters}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />

            {/* View Mode Selector */}
            <ViewModeSelector
              viewMode={viewMode}
              setViewMode={setViewMode}
              cardSize={cardSize}
              setCardSize={setCardSize}
            />

            {/* Clear Buttons */}
            {items.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 size={18} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Quick Clear:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleClearLocation('pantry')}
                      className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm font-medium flex items-center gap-2"
                      disabled={!items.some(item => item.storage_location === 'pantry')}
                    >
                      <span>🥫</span>
                      Clear Pantry ({items.filter(item => item.storage_location === 'pantry').length})
                    </button>
                    <button
                      onClick={() => handleClearLocation('fridge')}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium flex items-center gap-2"
                      disabled={!items.some(item => item.storage_location === 'fridge')}
                    >
                      <span>🧊</span>
                      Clear Fridge ({items.filter(item => item.storage_location === 'fridge').length})
                    </button>
                    <button
                      onClick={() => handleClearLocation('freezer')}
                      className="px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors text-sm font-medium flex items-center gap-2"
                      disabled={!items.some(item => item.storage_location === 'freezer')}
                    >
                      <span>❄️</span>
                      Clear Freezer ({items.filter(item => item.storage_location === 'freezer').length})
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium flex items-center gap-2 border-2 border-red-300 dark:border-red-700"
                    >
                      <Trash2 size={16} />
                      Clear All ({items.length})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Display */}
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No items found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'Try adjusting your filters or search term'
                    : 'Add your first item to get started'
                  }
                </p>
                {!searchTerm && Object.keys(filters).length === 0 && (
                  <button
                    onClick={handleAddItem}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    <span>Add First Item</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className={`
                    grid gap-6
                    ${cardSize === 'small' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6' : ''}
                    ${cardSize === 'medium' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : ''}
                    ${cardSize === 'large' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
                  `}>
                    {items.map((item) => (
                      <InventoryCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                        onAddToList={handleAddToShoppingList}
                        onStillGood={handleStillGood}
                        onWentBad={handleWentBad}
                        onMarkOpened={handleMarkOpened}
                        size={cardSize}
                      />
                    ))}
                  </div>
                )}

                {/* Shelf View */}
                {viewMode === 'shelf' && (
                  <ShelfView
                    items={items}
                    location={activeLocation || 'pantry'}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onQuickAction={(item, action) => {
                      if (action === 'addToList') handleAddToShoppingList(item);
                      if (action === 'stillGood') handleStillGood(item.id);
                      if (action === 'wentBad') handleWentBad(item.id);
                      if (action === 'markOpened') handleMarkOpened(item.id);
                    }}
                    cardSize={cardSize}
                  />
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <ListView
                    items={items}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onQuickAction={(item, action) => {
                      if (action === 'addToList') handleAddToShoppingList(item);
                      if (action === 'stillGood') handleStillGood(item.id);
                      if (action === 'wentBad') handleWentBad(item.id);
                      if (action === 'markOpened') handleMarkOpened(item.id);
                    }}
                  />
                )}

                {/* Category Box View */}
                {viewMode === 'category' && (
                  <CategoryBoxView
                    items={items}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onQuickAction={(item, action) => {
                      if (action === 'addToList') handleAddToShoppingList(item);
                      if (action === 'stillGood') handleStillGood(item.id);
                      if (action === 'wentBad') handleWentBad(item.id);
                      if (action === 'markOpened') handleMarkOpened(item.id);
                    }}
                    cardSize={cardSize}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Add/Edit Item Modal */}
        {showAddModal && (
          <AddItemModal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setEditingItem(null);
            }}
            onSave={handleSaveItem}
            item={editingItem}
            locations={locations}
            categories={categories}
          />
        )}

        {/* Toast Notifications */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </PageTransition>
  );
};

export default PantryNew;
