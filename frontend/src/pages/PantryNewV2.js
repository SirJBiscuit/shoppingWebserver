import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3, GripVertical, CheckSquare } from 'lucide-react';
import inventoryAPI from '../services/inventoryAPI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

// New Home Inventory Components
import LocationNavigator from '../components/inventory/LocationNavigator';
import FilterPanel from '../components/inventory/FilterPanel';
import EnhancedGridView from '../components/inventory/EnhancedGridView';
import DraggableGridView from '../components/inventory/DraggableGridView';
import EnhancedListView from '../components/inventory/EnhancedListView';
import CategoryView from '../components/inventory/CategoryView';
import VisualInventoryMap from '../components/inventory/VisualInventoryMap';
import AddItemModal from '../components/inventory/AddItemModal';
import InventoryStats from '../components/inventory/InventoryStats';
import BulkActionBar from '../components/inventory/BulkActionBar';

/**
 * PantryNewV2 - Home Inventory with new 3-panel layout
 * Left: Location Navigator
 * Center: Item Display (Grid/List/Map/Category)
 * Right: Filter Panel
 */
const PantryNewV2 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError, toasts, hideToast } = useToast();

  // Core State
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeLocation, setActiveLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null 
  });

  // Stats
  const [stats, setStats] = useState(null);

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLocations(),
        loadItems(),
        loadStats()
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
      // Flatten default and custom locations
      const allLocations = [...(data.default || []), ...(data.custom || [])];
      setLocations(allLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadItems = async () => {
    try {
      const data = await inventoryAPI.getItems();
      setItems(data);
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

  // ============================================
  // FILTER & SEARCH LOGIC
  // ============================================

  const getFilteredItems = () => {
    let filtered = [...items];

    // Filter by location
    if (activeLocation) {
      filtered = filtered.filter(item => 
        item.custom_location_id === activeLocation.id
      );
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_name?.toLowerCase().includes(search) ||
        item.notes?.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (activeCategory && activeCategory !== 'all') {
      filtered = filtered.filter(item => 
        (item.item_category || 'food') === activeCategory
      );
    }

    // Filter by active filter
    switch (activeFilter) {
      case 'expiring':
        filtered = filtered.filter(item => {
          if (!item.estimated_expiry_date) return false;
          const daysUntilExpiry = Math.floor(
            (new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
        });
        break;
      
      case 'low_stock':
        filtered = filtered.filter(item => 
          item.quantity && item.quantity < (item.min_quantity || 1)
        );
        break;
      
      case 'warning':
        filtered = filtered.filter(item => {
          if (!item.estimated_expiry_date) return false;
          const daysUntilExpiry = Math.floor(
            (new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry > 7 && daysUntilExpiry <= 14;
        });
        break;
      
      case 'favorites':
        filtered = filtered.filter(item => item.is_favorite);
        break;
      
      case 'all':
      default:
        // No additional filtering
        break;
    }

    return filtered;
  };

  // ============================================
  // COUNTS FOR UI
  // ============================================

  const getItemCounts = () => {
    const counts = {};
    locations.forEach(location => {
      counts[location.id] = items.filter(item => 
        item.custom_location_id === location.id
      ).length;
    });
    return counts;
  };

  const getFilterCounts = () => {
    const now = new Date();
    
    return {
      all: items.length,
      expiring: items.filter(item => {
        if (!item.estimated_expiry_date) return false;
        const daysUntilExpiry = Math.floor(
          (new Date(item.estimated_expiry_date) - now) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
      }).length,
      low_stock: items.filter(item => 
        item.quantity && item.quantity < (item.min_quantity || 1)
      ).length,
      warning: items.filter(item => {
        if (!item.estimated_expiry_date) return false;
        const daysUntilExpiry = Math.floor(
          (new Date(item.estimated_expiry_date) - now) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 7 && daysUntilExpiry <= 14;
      }).length,
      favorites: items.filter(item => item.is_favorite).length,
      categories: new Set(items.map(item => item.item_category)).size,
      locations: locations.length
    };
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
        success('Item updated successfully!');
      } else {
        await inventoryAPI.addItem(itemData);
        success('Item added successfully!');
      }
      setShowAddModal(false);
      setEditingItem(null);
      await loadItems();
      await loadStats();
    } catch (error) {
      console.error('Failed to save item:', error);
      showError('Failed to save item');
    }
  };

  const handleDeleteItem = (item) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Item?',
      message: `Are you sure you want to delete "${item.item_name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await inventoryAPI.deleteItem(item.id);
          success('Item deleted successfully!');
          setConfirmModal({ isOpen: false });
          await loadItems();
          await loadStats();
        } catch (error) {
          console.error('Failed to delete item:', error);
          showError('Failed to delete item');
        }
      }
    });
  };

  const handleToggleFavorite = async (item) => {
    try {
      await inventoryAPI.updateItem(item.id, {
        is_favorite: !item.is_favorite
      });
      await loadItems();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showError('Failed to update favorite');
    }
  };

  const handleQuickAction = async (item, action) => {
    try {
      if (action === 'still_good') {
        await inventoryAPI.markStillGood(item.id);
        success('Item marked as still good!');
      } else if (action === 'went_bad') {
        await inventoryAPI.markWentBad(item.id);
        success('Feedback recorded!');
      }
      await loadItems();
      await loadStats();
    } catch (error) {
      console.error('Failed to perform action:', error);
      showError('Failed to perform action');
    }
  };

  const handleReorder = async (itemIds) => {
    try {
      // Update sort_order for each item
      await Promise.all(
        itemIds.map((id, index) => 
          inventoryAPI.updateItem(id, { sort_order: index })
        )
      );
      success('Items reordered!');
      await loadItems();
    } catch (error) {
      console.error('Failed to reorder items:', error);
      showError('Failed to reorder items');
    }
  };

  // ============================================
  // BULK ACTIONS
  // ============================================

  const handleToggleSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(filteredItems.map(item => item.id));
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
    setSelectionMode(false);
  };

  const handleBulkDelete = () => {
    const count = selectedItems.length;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Items?`,
      message: `Are you sure you want to delete ${count} selected items? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          await Promise.all(selectedItems.map(id => inventoryAPI.deleteItem(id)));
          success(`${count} items deleted!`);
          setSelectedItems([]);
          setSelectionMode(false);
          await loadItems();
          await loadStats();
        } catch (error) {
          console.error('Failed to delete items:', error);
          showError('Failed to delete items');
        }
      }
    });
  };

  const handleBulkFavorite = async () => {
    try {
      await Promise.all(
        selectedItems.map(id => 
          inventoryAPI.updateItem(id, { is_favorite: true })
        )
      );
      success(`${selectedItems.length} items added to favorites!`);
      setSelectedItems([]);
      setSelectionMode(false);
      await loadItems();
    } catch (error) {
      console.error('Failed to favorite items:', error);
      showError('Failed to favorite items');
    }
  };

  const handleBulkUnfavorite = async () => {
    try {
      await Promise.all(
        selectedItems.map(id => 
          inventoryAPI.updateItem(id, { is_favorite: false })
        )
      );
      success(`${selectedItems.length} items removed from favorites!`);
      setSelectedItems([]);
      setSelectionMode(false);
      await loadItems();
    } catch (error) {
      console.error('Failed to unfavorite items:', error);
      showError('Failed to unfavorite items');
    }
  };

  const handleBulkCategoryChange = () => {
    // TODO: Show modal to select new category
    showError('Category change coming soon!');
  };

  // ============================================
  // CLEAR ACTIONS
  // ============================================

  const handleClearLocation = (location) => {
    if (!location) {
      // Clear all
      const totalItems = items.length;
      if (totalItems === 0) {
        showError('No items to clear');
        return;
      }
      
      setConfirmModal({
        isOpen: true,
        title: 'Clear All Items?',
        message: `Are you sure you want to delete ALL ${totalItems} items? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
            await Promise.all(items.map(item => inventoryAPI.deleteItem(item.id)));
            success('All items cleared!');
            await loadItems();
            await loadStats();
          } catch (error) {
            console.error('Failed to clear all:', error);
            showError('Failed to clear items');
          }
        }
      });
    } else {
      // Clear specific location
      const locationItems = items.filter(item => item.custom_location_id === location.id);
      if (locationItems.length === 0) {
        showError(`No items in ${location.name}`);
        return;
      }
      
      setConfirmModal({
        isOpen: true,
        title: `Clear ${location.name}?`,
        message: `Are you sure you want to delete all ${locationItems.length} items from ${location.name}? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
            await Promise.all(locationItems.map(item => inventoryAPI.deleteItem(item.id)));
            success(`${location.name} cleared!`);
            await loadItems();
            await loadStats();
          } catch (error) {
            console.error('Failed to clear location:', error);
            showError('Failed to clear location');
          }
        }
      });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const filteredItems = getFilteredItems();
  const itemCounts = getItemCounts();
  const filterCounts = getFilterCounts();

  return (
    <PageTransition>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-[2000px] mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Home Inventory
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage all your household items - kitchen, bathroom, pet supplies, and more
                </p>
              </div>

              <div className="flex gap-3">
                {viewMode === 'grid' && !dragMode && (
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      if (selectionMode) setSelectedItems([]);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      selectionMode 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <CheckSquare className="w-5 h-5" />
                    <span className="hidden md:inline">{selectionMode ? 'Select Mode ON' : 'Select'}</span>
                  </button>
                )}
                {viewMode === 'grid' && !selectionMode && (
                  <button
                    onClick={() => setDragMode(!dragMode)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      dragMode 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <GripVertical className="w-5 h-5" />
                    <span className="hidden md:inline">{dragMode ? 'Drag Mode ON' : 'Drag Mode'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="hidden md:inline">{showStats ? 'Hide' : 'Show'} Stats</span>
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Stats Dashboard */}
            {showStats && stats && (
              <div className="mb-6">
                <InventoryStats stats={stats} expiringSoon={[]} />
              </div>
            )}

            {/* Three-Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
              {/* Left Panel - Location Navigator */}
              <div className="lg:col-span-3">
                <LocationNavigator
                  locations={locations}
                  activeLocation={activeLocation}
                  onLocationChange={setActiveLocation}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onClearLocation={handleClearLocation}
                  itemCounts={itemCounts}
                />
              </div>

              {/* Center Panel - Item Display */}
              <div className="lg:col-span-6">
                {viewMode === 'grid' && !dragMode && (
                  <EnhancedGridView
                    items={filteredItems}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickAction={handleQuickAction}
                    selectionMode={selectionMode}
                    selectedItems={selectedItems}
                    onToggleSelection={handleToggleSelection}
                  />
                )}
                
                {viewMode === 'grid' && dragMode && (
                  <DraggableGridView
                    items={filteredItems}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickAction={handleQuickAction}
                    onReorder={handleReorder}
                  />
                )}
                
                {viewMode === 'list' && (
                  <EnhancedListView
                    items={filteredItems}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickAction={handleQuickAction}
                  />
                )}
                
                {viewMode === 'category' && (
                  <CategoryView
                    items={filteredItems}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}
                
                {viewMode === 'map' && (
                  <VisualInventoryMap
                    items={filteredItems}
                    location={activeLocation?.name || 'All Locations'}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onQuickAction={handleQuickAction}
                  />
                )}
              </div>

              {/* Right Panel - Filter Panel */}
              <div className="lg:col-span-3">
                <FilterPanel
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  counts={filterCounts}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toasts */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => hideToast(toast.id)}
            />
          ))}
        </div>

        {/* Add/Edit Modal */}
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
          />
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
          onConfirm={() => {
            if (confirmModal.onConfirm) {
              confirmModal.onConfirm();
            }
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedItems.length}
          onBulkDelete={handleBulkDelete}
          onBulkFavorite={handleBulkFavorite}
          onBulkUnfavorite={handleBulkUnfavorite}
          onBulkCategoryChange={handleBulkCategoryChange}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
        />
      </div>
    </PageTransition>
  );
};

export default PantryNewV2;
