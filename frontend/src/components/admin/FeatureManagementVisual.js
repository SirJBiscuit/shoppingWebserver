import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, GripVertical, Save, RotateCcw, Smartphone, 
  ShoppingCart, Package, ChefHat, Calendar, BarChart3, Search, 
  History, Mic, Scan, Share2, Store, Sparkles, Settings, Shield,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
  const { refreshFeatures } = useFeatureFlags();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [previewMode, setPreviewMode] = useState('sidebar');

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
      await api.put(`/features/admin/feature/${featureId}`, {
        is_enabled: !currentStatus
      });
      
      // Update local state
      setFeatures(features.map(f => 
        f.id === featureId ? { ...f, is_enabled: !currentStatus } : f
      ));
      
      // Refresh feature flags context
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

  const renderSidebarPreview = () => {
    const mainNav = features.filter(f => 
      ['shopping_lists', 'pantry', 'recipes', 'meal_planner', 'statistics', 'recipe_discovery', 'activity_history'].includes(f.feature_key)
    );
    const tools = features.filter(f => 
      ['voice_input', 'barcode_scanner', 'sharing'].includes(f.feature_key)
    );
    const settings = features.filter(f => 
      ['store_management', 'ach_customization'].includes(f.feature_key)
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Main Menu
          </h3>
          {mainNav.map(feature => {
            const Icon = ICON_MAP[feature.feature_key] || Package;
            return (
              <div
                key={feature.id}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{feature.feature_name}</span>
                {!feature.is_enabled && (
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
          {tools.map(feature => {
            const Icon = ICON_MAP[feature.feature_key] || Package;
            return (
              <div
                key={feature.id}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{feature.feature_name}</span>
                {!feature.is_enabled && (
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
          {settings.map(feature => {
            const Icon = ICON_MAP[feature.feature_key] || Settings;
            return (
              <div
                key={feature.id}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg mb-1 ${
                  feature.is_enabled
                    ? 'text-gray-700 dark:text-gray-300 opacity-100'
                    : 'text-gray-400 dark:text-gray-600 opacity-50 line-through'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{feature.feature_name}</span>
                {!feature.is_enabled && (
                  <EyeOff className="w-4 h-4 ml-auto text-red-500" />
                )}
              </div>
            );
          })}
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Admin</span>
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visual Feature Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Drag to reorder, toggle to enable/disable, and see live preview
          </p>
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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Order'}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Features (Drag to Reorder)
          </h3>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="features">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {features.map((feature, index) => {
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
