import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, GripVertical, Save, RotateCcw, Smartphone, 
  ShoppingCart, Package, ChefHat, Calendar, BarChart3, Search, 
  History, Mic, Scan, Share2, Store, Sparkles, Settings, Shield,
  AlertCircle, CheckCircle, X, ArrowLeft
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFeatureFlags } from '../../context/FeatureFlagContext';

const ICON_MAP = {
  shopping_lists: ShoppingCart,
  pantry: Package,
  recipes: ChefHat,
  meal_planner: Calendar,
  statistics: BarChart3,
  recipe_discovery: Search,
  activity_history: History,
  voice_input: Mic,
  barcode_scanner: Scan,
  sharing: Share2,
  store_management: Store,
  ach_customization: Sparkles,
  dashboard_editor: Settings,
};

const FeatureManagementVisual = () => {
  const navigate = useNavigate();
  const { refreshFeatures } = useFeatureFlags();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [previewMode, setPreviewMode] = useState('sidebar');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/features/admin/all');
      const featuresData = response.data.features || [];
      
      // Sort by display_order if available, otherwise by category
      const sorted = featuresData.sort((a, b) => {
        if (a.display_order && b.display_order) {
          return a.display_order - b.display_order;
        }
        return (a.category || '').localeCompare(b.category || '');
      });
      
      setFeatures(sorted);
    } catch (error) {
      console.error('Error loading features:', error);
      showMessage('Failed to load features', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureId, currentStatus) => {
    try {
      // Find the feature to get its current display_order
      const feature = features.find(f => f.id === featureId);
      
      await api.put(`/features/admin/feature/${featureId}`, {
        is_enabled: !currentStatus,
        display_order: feature.display_order // Preserve display_order
      });
      
      // Update local state only (don't reload to preserve unsaved order)
      setFeatures(features.map(f => 
        f.id === featureId ? { ...f, is_enabled: !currentStatus } : f
      ));
      
      // Refresh feature flags context (for sidebar/UI updates)
      await refreshFeatures();
      
      showMessage('Feature updated successfully!', 'success');
    } catch (error) {
      console.error('Error toggling feature:', error);
      showMessage('Failed to update feature', 'error');
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(features);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setFeatures(updatedItems);
    setHasUnsavedChanges(true); // Mark as having unsaved changes
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      
      // Save display order for each feature
      await Promise.all(
        features.map((feature, index) =>
          api.put(`/features/admin/feature/${feature.id}`, {
            display_order: index
          })
        )
      );
      
      setHasUnsavedChanges(false); // Clear unsaved changes flag
      showMessage('Order saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving order:', error);
      showMessage('Failed to save order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Filter features based on search query
  const filteredFeatures = features.filter(feature => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      feature.feature_name.toLowerCase().includes(query) ||
      feature.feature_key.toLowerCase().includes(query) ||
      feature.category.toLowerCase().includes(query) ||
      feature.description?.toLowerCase().includes(query)
    );
  });

  const renderSidebarPreview = () => {
    // Get features by key
    const getFeature = (key) => features.find(f => f.feature_key === key);
    
    // Exact sidebar structure from Sidebar.js
    const mainNavItems = [
      { feature: getFeature('shopping_lists'), label: 'Dashboard', icon: ShoppingCart },
      { feature: getFeature('pantry'), label: 'After Shop', icon: Package, badge: '🛒' },
      { feature: getFeature('pantry'), label: 'Kitchen Inventory', icon: Package },
      { feature: getFeature('recipes'), label: 'Recipe Book', icon: ChefHat },
      { feature: getFeature('meal_planner'), label: 'Meal Planner', icon: Calendar },
      { feature: getFeature('statistics'), label: 'Statistics', icon: BarChart3 },
      { feature: getFeature('recipe_discovery'), label: 'Recipe Discovery', icon: Search },
      { feature: getFeature('activity_history'), label: 'Activity History', icon: History },
    ].filter(item => item.feature);
    
    const toolItems = [
      { feature: getFeature('voice_input'), label: 'Voice Input', icon: Mic },
      { feature: getFeature('barcode_scanner'), label: 'Barcode Scanner', icon: Scan },
      { feature: getFeature('sharing'), label: 'Share List', icon: Share2 },
    ].filter(item => item.feature);
    
    const settingsItems = [
      { feature: getFeature('store_management'), label: 'Manage Stores', icon: Store },
      { feature: getFeature('ach_customization'), label: 'ACH Customization', icon: Sparkles, special: true },
    ].filter(item => item.feature);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Main Menu
          </h3>
          {mainNavItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`main-${index}`}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  item.feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
                {item.badge && item.feature.is_enabled && (
                  <span className="ml-auto text-xs">{item.badge}</span>
                )}
                {!item.feature.is_enabled && (
                  <EyeOff className="w-4 h-4 ml-auto text-red-500" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Quick Tools
          </h3>
          {toolItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`tool-${index}`}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  item.feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
                {!item.feature.is_enabled && (
                  <EyeOff className="w-4 h-4 ml-auto text-red-500" />
                )}
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            System
          </h3>
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`setting-${index}`}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  item.special && item.feature.is_enabled
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                    : item.feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.special && item.feature.is_enabled ? 'text-white' : ''}`} />
                <span className="text-sm">{item.label}</span>
                {item.special && item.feature.is_enabled && (
                  <span className="ml-auto bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                )}
                {!item.feature.is_enabled && (
                  <EyeOff className="w-4 h-4 ml-auto text-red-500" />
                )}
              </div>
            );
          })}
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
            <Shield className="w-5 h-5 text-white" />
            <span className="text-sm">Admin</span>
            <span className="ml-auto bg-white text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold">
              ADMIN
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visual Feature Management
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Drag to reorder, toggle to enable/disable, and see live preview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadFeatures}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={saveOrder}
            disabled={saving}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
              hasUnsavedChanges 
                ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Order (Unsaved Changes)' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature List with Drag & Drop */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Features (Drag to Reorder)
            </h3>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Found {filteredFeatures.length} of {features.length} features
              </p>
            )}
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="features">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary-500 scrollbar-track-gray-200 dark:scrollbar-track-gray-700 hover:scrollbar-thumb-primary-600"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgb(99 102 241) rgb(229 231 235)'
                  }}
                >
                  {filteredFeatures.map((feature, index) => {
                    const Icon = ICON_MAP[feature.feature_key] || Package;
                    return (
                      <Draggable
                        key={feature.id}
                        draggableId={feature.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              snapshot.isDragging
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                            </div>
                            
                            <Icon className={`w-5 h-5 ${
                              feature.is_enabled ? 'text-primary-600' : 'text-gray-400'
                            }`} />
                            
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {feature.feature_name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {feature.category} • {feature.min_tier}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => toggleFeature(feature.id, feature.is_enabled)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                feature.is_enabled
                                  ? 'bg-green-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  feature.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Live Preview */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Preview
            </h3>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Sidebar View</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            {renderSidebarPreview()}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Live Preview:</strong> Disabled features are shown with reduced opacity and a strikethrough. 
                Users won't see these features in their sidebar.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureManagementVisual;
