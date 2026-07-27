import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart3 } from 'lucide-react';
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
import AddItemModal from '../components/inventory/AddItemModal';
import InventoryStats from '../components/inventory/InventoryStats';

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
  const [showStats, setShowStats] = useState(false);
  
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

  // ============================================
  // CLEAR ACTIONS
  // ============================================

  const handleClearLocation = (location) => {
    if (!location) {
      // Clear all
      setConfirmModal({
        isOpen: true,
        title: 'Clear All Items?',
        message: `Are you sure you want to delete ALL ${items.length} items? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            await Promise.all(items.map(item => inventoryAPI.deleteItem(item.id)));
            success('All items cleared!');
            setConfirmModal({ isOpen: false });
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
      setConfirmModal({
        isOpen: true,
        title: `Clear ${location.name}?`,
        message: `Are you sure you want to delete all ${locationItems.length} items from ${location.name}? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            await Promise.all(locationItems.map(item => inventoryAPI.deleteItem(item.id)));
            success(`${location.name} cleared!`);
            setConfirmModal({ isOpen: false });
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
                <EnhancedGridView
                  items={filteredItems}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onToggleFavorite={handleToggleFavorite}
                  onQuickAction={handleQuickAction}
                />
              </div>

              {/* Right Panel - Filter Panel */}
              <div className="lg:col-span-3">
                <FilterPanel
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  counts={filterCounts}
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
          onCancel={() => setConfirmModal({ isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </PageTransition>
  );
};

export default PantryNewV2;
