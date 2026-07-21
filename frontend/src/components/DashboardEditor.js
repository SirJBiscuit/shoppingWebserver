import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Eye, Save, X, Plus, Trash2, Settings, Users, Crown, 
  UserX, Grid, Move, Edit3, Check, AlertCircle, Sparkles,
  Palette, Wand2, Volume2, Download, Upload, Copy, Zap,
  Image, FileText, RotateCw, Sliders
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
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);
  const [showSoundManager, setShowSoundManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [customColors, setCustomColors] = useState({});
  const [animations, setAnimations] = useState({});
  const [sounds, setSounds] = useState([]);
  const editorRef = useRef(null);

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
      await api.post('/features/admin/layouts', { 
        layouts: tierLayouts,
        colors: customColors,
        animations,
        sounds
      });
      setHasChanges(false);
      alert('Dashboard layouts saved successfully!');
    } catch (error) {
      console.error('Error saving layouts:', error);
      alert('Failed to save layouts');
    } finally {
      setSaving(false);
    }
  };

  // Context Menu Handlers
  const handleRightClick = (e, widget) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      widget
    });
    setSelectedWidget(widget);
  };

  const handleContextAction = (action) => {
    if (!selectedWidget) return;

    switch (action) {
      case 'color':
        setShowColorPicker(true);
        break;
      case 'animation':
        setShowAnimationPanel(true);
        break;
      case 'duplicate':
        duplicateWidget(selectedWidget);
        break;
      case 'remove':
        removeWidget(selectedWidget.id);
        break;
      default:
        break;
    }
    setContextMenu(null);
  };

  const duplicateWidget = (widget) => {
    const currentLayout = tierLayouts[activeTier] || [];
    const newWidget = {
      ...widget,
      id: Date.now(),
      position: (widget.position + 1) % 12
    };
    setTierLayouts(prev => ({
      ...prev,
      [activeTier]: [...currentLayout, newWidget]
    }));
    setHasChanges(true);
  };

  // Color Management
  const updateWidgetColor = (widgetId, color) => {
    setCustomColors(prev => ({
      ...prev,
      [widgetId]: color
    }));
    setHasChanges(true);
  };

  // Animation Management
  const updateWidgetAnimation = (widgetId, animationType) => {
    setAnimations(prev => ({
      ...prev,
      [widgetId]: animationType
    }));
    setHasChanges(true);
  };

  // Sound Management
  const uploadSound = async (file) => {
    const formData = new FormData();
    formData.append('sound', file);
    try {
      const res = await api.post('/features/admin/sounds', formData);
      setSounds(prev => [...prev, res.data.sound]);
    } catch (error) {
      console.error('Error uploading sound:', error);
    }
  };

  // Template Management
  const saveTemplate = async (name) => {
    try {
      await api.post('/features/admin/templates', {
        name,
        layouts: tierLayouts,
        colors: customColors,
        animations
      });
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const loadTemplate = async (templateId) => {
    try {
      const res = await api.get(`/features/admin/templates/${templateId}`);
      setTierLayouts(res.data.layouts);
      setCustomColors(res.data.colors || {});
      setAnimations(res.data.animations || {});
      setHasChanges(true);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
            {/* Tools Dropdown */}
            <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="btn-secondary p-2"
                title="Color Picker"
              >
                <Palette className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAnimationPanel(!showAnimationPanel)}
                className="btn-secondary p-2"
                title="Animations"
              >
                <Wand2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSoundManager(!showSoundManager)}
                className="btn-secondary p-2"
                title="Sound Manager"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowTemplateManager(!showTemplateManager)}
                className="btn-secondary p-2"
                title="Templates"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

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
                          onContextMenu={(e) => !previewMode && handleRightClick(e, widget)}
                          style={{
                            backgroundColor: customColors[widget.id] || undefined,
                            animation: animations[widget.id] || undefined
                          }}
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

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => handleContextAction('color')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Palette className="w-4 h-4" />
              <span>Change Color</span>
            </button>
            <button
              onClick={() => handleContextAction('animation')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>Add Animation</span>
            </button>
            <button
              onClick={() => handleContextAction('duplicate')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button
              onClick={() => handleContextAction('remove')}
              className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900 text-red-600 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove</span>
            </button>
          </div>
        )}

        {/* Color Picker Panel */}
        {showColorPicker && selectedWidget && (
          <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-40 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Color Picker
              </h3>
              <button onClick={() => setShowColorPicker(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Background Color</label>
                <input
                  type="color"
                  value={customColors[selectedWidget.id] || '#ffffff'}
                  onChange={(e) => updateWidgetColor(selectedWidget.id, e.target.value)}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                  <button
                    key={color}
                    onClick={() => updateWidgetColor(selectedWidget.id, color)}
                    className="w-full h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Animation Panel */}
        {showAnimationPanel && selectedWidget && (
          <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-40 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Wand2 className="w-4 h-4 mr-2" />
                Animations
              </h3>
              <button onClick={() => setShowAnimationPanel(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {['none', 'pulse 2s infinite', 'bounce 1s infinite', 'spin 3s linear infinite', 'wiggle 1s ease-in-out infinite'].map(anim => (
                <button
                  key={anim}
                  onClick={() => updateWidgetAnimation(selectedWidget.id, anim)}
                  className={`w-full px-3 py-2 text-left rounded border ${
                    animations[selectedWidget.id] === anim
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {anim === 'none' ? 'No Animation' : anim.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound Manager */}
        {showSoundManager && (
          <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-40 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <Volume2 className="w-4 h-4 mr-2" />
                Sound Manager
              </h3>
              <button onClick={() => setShowSoundManager(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="btn-secondary w-full flex items-center justify-center cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload Sound
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && uploadSound(e.target.files[0])}
                />
              </label>
              <div className="space-y-2">
                {sounds.map((sound, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <span className="text-sm">{sound.name}</span>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Template Manager */}
        {showTemplateManager && (
          <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 z-40 w-80 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </h3>
              <button onClick={() => setShowTemplateManager(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const name = prompt('Template name:');
                  if (name) saveTemplate(name);
                }}
                className="btn-primary w-full flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Current Layout
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No saved templates yet
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardEditor;
