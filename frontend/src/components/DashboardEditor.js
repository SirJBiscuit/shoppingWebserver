import React, { useState, useEffect } from 'react';
import { 
  Layout, Eye, Save, X, Plus, Trash2, Settings, Users, Crown, 
  UserX, Grid, Move, Edit3, Check, AlertCircle, Sparkles
} from 'lucide-react';
import api from '../services/api';

const DashboardEditor = ({ onClose }) => {
  const [activeTier, setActiveTier] = useState('free');
  const [widgets, setWidgets] = useState([]);
  const [tierLayouts, setTierLayouts] = useState({
    guest: [],
    free: [],
    premium: [],
    admin: []
  });
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWidgets();
    loadLayouts();
  }, []);

  const loadWidgets = async () => {
    try {
      const res = await api.get('/features/admin/widgets');
      setWidgets(res.data.widgets || []);
    } catch (error) {
      console.error('Error loading widgets:', error);
    }
  };

  const loadLayouts = async () => {
    try {
      const res = await api.get('/features/admin/layouts');
      if (res.data.layouts) {
        setTierLayouts(res.data.layouts);
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
    }
  };

  const handleDragStart = (widget) => {
    setDraggedWidget(widget);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (position) => {
    if (!draggedWidget) return;

    const currentLayout = tierLayouts[activeTier] || [];
    const widgetExists = currentLayout.find(w => w.id === draggedWidget.id);

    if (widgetExists) {
      // Move existing widget
      const newLayout = currentLayout.map(w => 
        w.id === draggedWidget.id ? { ...w, position } : w
      );
      setTierLayouts(prev => ({ ...prev, [activeTier]: newLayout }));
    } else {
      // Add new widget
      const newWidget = {
        ...draggedWidget,
        position,
        enabled: true,
        tier: activeTier
      };
      setTierLayouts(prev => ({
        ...prev,
        [activeTier]: [...currentLayout, newWidget]
      }));
    }

    setHasChanges(true);
    setDraggedWidget(null);
  };

  const removeWidget = (widgetId) => {
    const newLayout = tierLayouts[activeTier].filter(w => w.id !== widgetId);
    setTierLayouts(prev => ({ ...prev, [activeTier]: newLayout }));
    setHasChanges(true);
  };

  const toggleWidget = (widgetId) => {
    const newLayout = tierLayouts[activeTier].map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    setTierLayouts(prev => ({ ...prev, [activeTier]: newLayout }));
    setHasChanges(true);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await api.post('/features/admin/layouts', { layouts: tierLayouts });
      setHasChanges(false);
      alert('Dashboard layouts saved successfully!');
    } catch (error) {
      console.error('Error saving layouts:', error);
      alert('Failed to save layouts');
    } finally {
      setSaving(false);
    }
  };

  const tiers = [
    { id: 'guest', name: 'Guest', icon: UserX, color: 'gray' },
    { id: 'free', name: 'Free', icon: Users, color: 'blue' },
    { id: 'premium', name: 'Premium', icon: Crown, color: 'yellow' },
    { id: 'admin', name: 'Admin', icon: Settings, color: 'purple' }
  ];

  const currentLayout = tierLayouts[activeTier] || [];
  const availableWidgets = widgets.filter(w => 
    !currentLayout.find(lw => lw.id === w.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Layout className="w-6 h-6 text-primary-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard Editor
            </h2>
            {hasChanges && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`btn-secondary flex items-center space-x-2 ${
                previewMode ? 'bg-primary-100 dark:bg-primary-900' : ''
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
            </button>

            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>

            <button onClick={onClose} className="btn-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tier Selector */}
        <div className="flex space-x-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <button
                key={tier.id}
                onClick={() => setActiveTier(tier.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  activeTier === tier.id
                    ? `bg-${tier.color}-500 text-white shadow-lg`
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tier.name}</span>
                <span className="text-xs opacity-75">
                  ({currentLayout.filter(w => w.enabled).length} widgets)
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Widget Palette */}
          {!previewMode && (
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Available Widgets
              </h3>

              <div className="space-y-2">
                {availableWidgets.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    All widgets added to this tier
                  </p>
                ) : (
                  availableWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={() => handleDragStart(widget)}
                      className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-move hover:border-primary-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {widget.widget_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {widget.description}
                          </p>
                        </div>
                        <Move className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  Drag widgets from here onto the dashboard grid to add them. Click on widgets in the grid to configure or remove them.
                </p>
              </div>
            </div>
          )}

          {/* Dashboard Preview Grid */}
          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-6xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Grid className="w-5 h-5 mr-2" />
                  {tiers.find(t => t.id === activeTier)?.name} Dashboard
                </h3>
                {!previewMode && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Drag widgets here to position them
                  </p>
                )}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-12 gap-4 min-h-[600px]">
                {[...Array(12)].map((_, colIndex) => (
                  <div
                    key={colIndex}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(colIndex)}
                    className={`col-span-4 min-h-[200px] rounded-lg border-2 border-dashed transition-all ${
                      !previewMode
                        ? 'border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                        : 'border-transparent'
                    }`}
                  >
                    {currentLayout
                      .filter(w => w.position === colIndex)
                      .map((widget) => (
                        <div
                          key={widget.id}
                          draggable={!previewMode}
                          onDragStart={() => !previewMode && handleDragStart(widget)}
                          className={`h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${
                            !previewMode ? 'cursor-move hover:shadow-xl' : ''
                          } ${
                            !widget.enabled ? 'opacity-50' : ''
                          } transition-all`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              {widget.enabled && <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />}
                              {widget.widget_name}
                            </h4>
                            {!previewMode && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => toggleWidget(widget.id)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                  title={widget.enabled ? 'Disable' : 'Enable'}
                                >
                                  {widget.enabled ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <X className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => removeWidget(widget.id)}
                                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                  title="Remove"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {widget.description}
                          </p>
                          <div className="mt-4 h-24 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Widget Preview
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEditor;
