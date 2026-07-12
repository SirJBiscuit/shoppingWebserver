import React, { useState, useEffect } from 'react';
import { 
  Settings, Layout, Palette, Code, Save, Download, Upload, 
  Eye, EyeOff, Grid, Move, Maximize2, Minimize2, Plus, Trash2,
  Copy, RotateCcw, Zap, Sliders, Package, RefreshCw, Database,
  FileImage, Smartphone, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { playSound } from '../utils/soundEffects';
import PatternDataManager from '../components/admin/PatternDataManager';
import MediaAssetManager from '../components/admin/MediaAssetManager';
import MobileLayoutCustomizer from '../components/admin/MobileLayoutCustomizer';
import InterfaceBuilder from '../components/admin/InterfaceBuilder';
import GitIntegration from '../components/admin/GitIntegration';
import ComponentEditor from '../components/admin/ComponentEditor';
import APIRouteBuilder from '../components/admin/APIRouteBuilder';
import DatabaseSchemaEditor from '../components/admin/DatabaseSchemaEditor';
import VisualPageCreator from '../components/admin/VisualPageCreator';

const AdminCustomization = () => {
  const [activeTab, setActiveTab] = useState('layout');
  const [widgets, setWidgets] = useState([]);
  const [features, setFeatures] = useState({});
  const [theme, setTheme] = useState({});
  const [layouts, setLayouts] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [customCode, setCustomCode] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  // Default available widgets
  const availableWidgets = [
    { id: 'shopping-list', name: 'Shopping List', icon: '🛒', category: 'core' },
    { id: 'animated-cart', name: 'Visual Cart', icon: '🛍️', category: 'core' },
    { id: 'budget-tracker', name: 'Budget Tracker', icon: '💰', category: 'finance' },
    { id: 'pantry-quick', name: 'Pantry Quick View', icon: '📦', category: 'pantry' },
    { id: 'recipe-suggest', name: 'Recipe Suggestions', icon: '🍳', category: 'recipes' },
    { id: 'deals-widget', name: 'Weekly Deals', icon: '🏷️', category: 'deals' },
    { id: 'stats-summary', name: 'Stats Summary', icon: '📊', category: 'analytics' },
    { id: 'xp-progress', name: 'XP Progress', icon: '⭐', category: 'gamification' },
    { id: 'quick-add', name: 'Quick Add Items', icon: '➕', category: 'core' },
    { id: 'store-locator', name: 'Store Locator', icon: '📍', category: 'stores' },
    { id: 'meal-planner', name: 'Meal Planner', icon: '📅', category: 'recipes' },
    { id: 'shopping-history', name: 'Shopping History', icon: '📜', category: 'analytics' },
    { id: 'price-tracker', name: 'Price Tracker', icon: '📈', category: 'analytics' },
    { id: 'custom-notes', name: 'Notes Widget', icon: '📝', category: 'utility' },
    { id: 'weather', name: 'Weather Widget', icon: '🌤️', category: 'utility' },
  ];

  // Load saved configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    const saved = localStorage.getItem('admin_customization');
    if (saved) {
      const config = JSON.parse(saved);
      setWidgets(config.widgets || []);
      setFeatures(config.features || {});
      setTheme(config.theme || {});
    } else {
      // Default configuration
      setWidgets([
        { id: 'shopping-list', x: 0, y: 0, width: 8, height: 12, visible: true },
        { id: 'animated-cart', x: 8, y: 0, width: 4, height: 6, visible: true },
        { id: 'budget-tracker', x: 8, y: 6, width: 4, height: 6, visible: true },
      ]);
      setFeatures({
        voiceInput: true,
        barcodeScanner: true,
        gamification: true,
        darkMode: true,
        animations: true,
        sounds: true,
      });
    }
  };

  const saveConfiguration = () => {
    const config = {
      widgets,
      features,
      theme,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem('admin_customization', JSON.stringify(config));
    playSound('success');
    alert('Configuration saved successfully!');
  };

  const exportConfiguration = () => {
    const config = {
      widgets,
      features,
      theme,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listzy-config-${Date.now()}.json`;
    a.click();
    playSound('success');
  };

  const importConfiguration = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          setWidgets(config.widgets || []);
          setFeatures(config.features || {});
          setTheme(config.theme || {});
          playSound('success');
          alert('Configuration imported successfully!');
        } catch (error) {
          playSound('error');
          alert('Failed to import configuration');
        }
      };
      reader.readAsText(file);
    }
  };

  const addWidget = (widgetType) => {
    const newWidget = {
      id: `${widgetType.id}-${Date.now()}`,
      type: widgetType.id,
      name: widgetType.name,
      x: 0,
      y: widgets.length * 2,
      width: 6,
      height: 4,
      visible: true,
      config: {},
    };
    setWidgets([...widgets, newWidget]);
    playSound('button');
  };

  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    playSound('button');
  };

  const toggleWidget = (widgetId) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    ));
    playSound('button');
  };

  const updateWidget = (widgetId, updates) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  };

  const resetToDefault = () => {
    if (window.confirm('Reset to default configuration? This cannot be undone.')) {
      localStorage.removeItem('admin_customization');
      loadConfiguration();
      playSound('success');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold">Admin Customization Hub</h1>
                  <p className="text-purple-100">Build and customize your perfect shopping app</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={saveConfiguration}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="bg-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-purple-800 transition flex items-center space-x-2"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPreview ? 'Edit' : 'Preview'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'visual', label: '🎨 Visual Page Creator', icon: Layout },
                { id: 'layout', label: 'Layout Editor', icon: Layout },
                { id: 'widgets', label: 'Widgets', icon: Package },
                { id: 'features', label: 'Features', icon: Zap },
                { id: 'patterns', label: 'Pattern Data', icon: Database },
                { id: 'media', label: 'Media Assets', icon: FileImage },
                { id: 'mobile', label: 'Mobile Layout', icon: Smartphone },
                { id: 'interfaces', label: 'UI Builder', icon: MessageSquare },
                { id: 'components', label: 'Component Editor', icon: Code },
                { id: 'api', label: 'API Builder', icon: Zap },
                { id: 'database', label: 'Database Editor', icon: Database },
                { id: 'git', label: 'Git & Version Control', icon: GitBranch },
                { id: 'theme', label: 'Theme', icon: Palette },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      playSound('button');
                    }}
                    className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'visual' && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full -m-6"
              >
                <VisualPageCreator />
              </motion.div>
            )}

            {activeTab === 'layout' && (
              <motion.div
                key="layout"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Layout Editor
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Drag and drop widgets to customize your dashboard layout
                  </p>

                  {/* Grid Layout */}
                  <div className="grid grid-cols-12 gap-4 min-h-[600px] bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                    {widgets.map((widget) => (
                      <motion.div
                        key={widget.id}
                        layout
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 ${
                          selectedWidget?.id === widget.id
                            ? 'border-purple-500'
                            : 'border-gray-200 dark:border-gray-700'
                        } ${widget.visible ? '' : 'opacity-50'}`}
                        style={{
                          gridColumn: `span ${widget.width}`,
                          gridRow: `span ${widget.height}`,
                        }}
                        onClick={() => setSelectedWidget(widget)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Move className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {widget.name || widget.type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWidget(widget.id);
                              }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              {widget.visible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeWidget(widget.id);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Size: {widget.width}x{widget.height} | Position: ({widget.x}, {widget.y})
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Widget Controls */}
                  {selectedWidget && (
                    <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        Widget Controls: {selectedWidget.name || selectedWidget.type}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Width</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={selectedWidget.width}
                            onChange={(e) => updateWidget(selectedWidget.id, { width: parseInt(e.target.value) })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Height</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={selectedWidget.height}
                            onChange={(e) => updateWidget(selectedWidget.id, { height: parseInt(e.target.value) })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">X Position</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedWidget.x}
                            onChange={(e) => updateWidget(selectedWidget.id, { x: parseInt(e.target.value) })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Y Position</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedWidget.y}
                            onChange={(e) => updateWidget(selectedWidget.id, { y: parseInt(e.target.value) })}
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'widgets' && (
              <motion.div
                key="widgets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Available Widgets
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Click to add widgets to your dashboard
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableWidgets.map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => addWidget(widget)}
                        className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{widget.icon}</span>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {widget.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {widget.category}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Feature Toggles
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Enable or disable app features
                  </p>

                  <div className="space-y-4">
                    {Object.entries({
                      voiceInput: 'Voice Input',
                      barcodeScanner: 'Barcode Scanner',
                      gamification: 'Gamification & XP',
                      darkMode: 'Dark Mode',
                      animations: 'Animations',
                      sounds: 'Sound Effects',
                      smartSort: 'Smart Sorting',
                      priceTracking: 'Price Tracking',
                      dealMatching: 'Deal Matching',
                      recipeIntegration: 'Recipe Integration',
                    }).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={features[key] || false}
                            onChange={(e) => {
                              setFeatures({ ...features, [key]: e.target.checked });
                              playSound('button');
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'patterns' && (
              <motion.div
                key="patterns"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PatternDataManager />
              </motion.div>
            )}

            {activeTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MediaAssetManager />
              </motion.div>
            )}

            {activeTab === 'mobile' && (
              <motion.div
                key="mobile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MobileLayoutCustomizer />
              </motion.div>
            )}

            {activeTab === 'interfaces' && (
              <motion.div
                key="interfaces"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <InterfaceBuilder />
              </motion.div>
            )}

            {activeTab === 'components' && (
              <motion.div
                key="components"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ComponentEditor />
              </motion.div>
            )}

            {activeTab === 'api' && (
              <motion.div
                key="api"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <APIRouteBuilder />
              </motion.div>
            )}

            {activeTab === 'database' && (
              <motion.div
                key="database"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <DatabaseSchemaEditor />
              </motion.div>
            )}

            {activeTab === 'git' && (
              <motion.div
                key="git"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GitIntegration />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <div className="fixed bottom-20 md:bottom-6 right-6 flex flex-col space-y-2">
          <button
            onClick={exportConfiguration}
            className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition"
            title="Export Configuration"
          >
            <Download className="w-6 h-6" />
          </button>
          <label className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition cursor-pointer"
            title="Import Configuration"
          >
            <Upload className="w-6 h-6" />
            <input
              type="file"
              accept=".json"
              onChange={importConfiguration}
              className="hidden"
            />
          </label>
          <button
            onClick={resetToDefault}
            className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition"
            title="Reset to Default"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminCustomization;
