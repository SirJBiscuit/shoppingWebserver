import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Layout,
  Type,
  Square,
  Circle,
  Image,
  List,
  Grid3x3,
  Columns,
  Package,
  Bookmark
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { WIDGET_TYPES } from '../../utils/widgetConfig';

/**
 * WidgetLibrary - Left sidebar with all available widgets
 * 
 * Features:
 * - Search/filter widgets
 * - Categories (Layout, Content, Interactive, etc.)
 * - Drag to add to canvas
 * - Favorites
 * - Recently used
 * - Custom templates
 */

const WIDGET_CATEGORIES = {
  layout: {
    name: 'Layout',
    icon: Layout,
    widgets: [
      WIDGET_TYPES.CONTAINER,
      WIDGET_TYPES.FLEX_CONTAINER,
      WIDGET_TYPES.GRID_CONTAINER,
      WIDGET_TYPES.SECTION,
      WIDGET_TYPES.CARD
    ]
  },
  content: {
    name: 'Content',
    icon: Type,
    widgets: [
      WIDGET_TYPES.TEXT,
      WIDGET_TYPES.HEADING,
      WIDGET_TYPES.PARAGRAPH,
      WIDGET_TYPES.BUTTON,
      WIDGET_TYPES.IMAGE,
      WIDGET_TYPES.ICON
    ]
  },
  interactive: {
    name: 'Interactive',
    icon: Circle,
    widgets: [
      WIDGET_TYPES.BUTTON,
      WIDGET_TYPES.INPUT,
      WIDGET_TYPES.SELECT,
      WIDGET_TYPES.CHECKBOX,
      WIDGET_TYPES.TOGGLE
    ]
  },
  custom: {
    name: 'Custom Components',
    icon: Package,
    widgets: [
      'custom_panel',
      'custom_keypad',
      'custom_notification',
      'item_list',
      'next_item_suggestion'
    ]
  }
};

const WidgetLibrary = () => {
  const { isEditorActive, aveManager } = useEditor();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(['layout', 'content']);
  const [activeTab, setActiveTab] = useState('all'); // all, favorites, recent, templates
  const [favorites, setFavorites] = useState([]);
  const [recentlyUsed, setRecentlyUsed] = useState([]);
  
  // Filter widgets based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return WIDGET_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    const filtered = {};
    
    Object.entries(WIDGET_CATEGORIES).forEach(([key, category]) => {
      const matchingWidgets = category.widgets.filter(widget =>
        widget.toLowerCase().includes(query)
      );
      
      if (matchingWidgets.length > 0) {
        filtered[key] = {
          ...category,
          widgets: matchingWidgets
        };
      }
    });
    
    return filtered;
  }, [searchQuery]);
  
  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev =>
      prev.includes(categoryKey)
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };
  
  const toggleFavorite = (widgetType) => {
    setFavorites(prev =>
      prev.includes(widgetType)
        ? prev.filter(w => w !== widgetType)
        : [...prev, widgetType]
    );
  };
  
  const handleDragStart = (e, widgetType) => {
    e.dataTransfer.setData('widgetType', widgetType);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add to recently used
    setRecentlyUsed(prev => {
      const filtered = prev.filter(w => w !== widgetType);
      return [widgetType, ...filtered].slice(0, 10);
    });
  };
  
  const handleAddWidget = (widgetType, section = 'dashboard') => {
    const newWidget = {
      id: `${widgetType}_${Date.now()}`,
      type: widgetType,
      name: widgetType.replace(/_/g, ' '),
      content: {},
      style: {},
      layout: {}
    };
    
    aveManager.addWidget(section, newWidget);
    
    // Add to recently used
    setRecentlyUsed(prev => {
      const filtered = prev.filter(w => w !== widgetType);
      return [widgetType, ...filtered].slice(0, 10);
    });
  };
  
  if (!isEditorActive) return null;
  
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="fixed left-0 top-16 bottom-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Widget Library
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search widgets..."
            className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'favorites'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            Favorites
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'recent'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            Recent
          </button>
        </div>
      </div>
      
      {/* Widget list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeTab === 'all' && Object.entries(filteredCategories).map(([key, category]) => (
          <div key={key} className="space-y-1">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(key)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <category.icon className="w-4 h-4" />
                <span>{category.name}</span>
                <span className="text-xs text-gray-500">({category.widgets.length})</span>
              </div>
              {expandedCategories.includes(key) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {/* Widgets */}
            <AnimatePresence>
              {expandedCategories.includes(key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 pl-4"
                >
                  {category.widgets.map(widgetType => (
                    <div
                      key={widgetType}
                      draggable
                      onDragStart={(e) => handleDragStart(e, widgetType)}
                      className="group flex items-center justify-between px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-600 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-indigo-500 rounded flex items-center justify-center">
                          <Square className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {widgetType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleFavorite(widgetType)}
                          className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded transition-colors"
                          title="Add to favorites"
                        >
                          <Star
                            className={`w-3 h-3 ${
                              favorites.includes(widgetType)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleAddWidget(widgetType)}
                          className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                          title="Add to canvas"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        
        {/* Favorites tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-1">
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs mt-1">Click the star icon to add widgets</p>
              </div>
            ) : (
              favorites.map(widgetType => (
                <div
                  key={widgetType}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widgetType)}
                  className="group flex items-center justify-between px-3 py-2 text-sm bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {widgetType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleAddWidget(widgetType)}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Recent tab */}
        {activeTab === 'recent' && (
          <div className="space-y-1">
            {recentlyUsed.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent widgets</p>
                <p className="text-xs mt-1">Add widgets to see them here</p>
              </div>
            ) : (
              recentlyUsed.map(widgetType => (
                <div
                  key={widgetType}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widgetType)}
                  className="group flex items-center justify-between px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {widgetType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleAddWidget(widgetType)}
                    className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Drag widgets to canvas or click + to add
        </div>
      </div>
    </motion.div>
  );
};

export default WidgetLibrary;
