import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, 
  Palette, 
  Layout, 
  Maximize2,
  ChevronRight,
  X
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * InlinePropertiesPanel - Context menu for editing widget properties
 * 
 * Appears next to selected widget
 * Quick edit for common properties
 * "More Properties" button for full panel
 */

const InlinePropertiesPanel = () => {
  const { selectedWidget, updateWidgetProperty, deselectWidget, aveManager } = useEditor();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [widget, setWidget] = useState(null);
  const panelRef = useRef(null);
  
  useEffect(() => {
    if (!selectedWidget) {
      setWidget(null);
      return;
    }
    
    // Get widget data
    const layout = aveManager.layout;
    const widgets = layout[selectedWidget.section]?.widgets || [];
    const foundWidget = widgets.find(w => w.id === selectedWidget.id);
    
    if (foundWidget) {
      setWidget(foundWidget);
      
      // Calculate position next to widget
      // TODO: Get actual widget DOM element position
      // For now, use a fixed position
      setPosition({ x: 300, y: 200 });
    }
  }, [selectedWidget, aveManager]);
  
  if (!selectedWidget || !widget) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.9, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -20 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-80"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {widget.name || widget.type}
            </span>
          </div>
          
          <button
            onClick={deselectWidget}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {/* Quick properties */}
        <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
          {/* Text content (if applicable) */}
          {widget.content?.text !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Type className="w-3 h-3" />
                Text
              </label>
              <input
                type="text"
                value={widget.content.text}
                onChange={(e) => updateWidgetProperty('content.text', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter text..."
              />
            </div>
          )}
          
          {/* Background color */}
          {widget.style?.backgroundColor !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Palette className="w-3 h-3" />
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={widget.style.backgroundColor}
                  onChange={(e) => updateWidgetProperty('style.backgroundColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={widget.style.backgroundColor}
                  onChange={(e) => updateWidgetProperty('style.backgroundColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="#000000"
                />
              </div>
            </div>
          )}
          
          {/* Text color */}
          {widget.style?.textColor !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Type className="w-3 h-3" />
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={widget.style.textColor}
                  onChange={(e) => updateWidgetProperty('style.textColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={widget.style.textColor}
                  onChange={(e) => updateWidgetProperty('style.textColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}
          
          {/* Font size */}
          {widget.style?.fontSize !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Type className="w-3 h-3" />
                Font Size
              </label>
              <input
                type="text"
                value={widget.style.fontSize}
                onChange={(e) => updateWidgetProperty('style.fontSize', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="16px"
              />
            </div>
          )}
          
          {/* Width */}
          {widget.layout?.width !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Maximize2 className="w-3 h-3" />
                Width
              </label>
              <input
                type="text"
                value={widget.layout.width}
                onChange={(e) => updateWidgetProperty('layout.width', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="auto, 100px, 50%"
              />
            </div>
          )}
          
          {/* Height */}
          {widget.layout?.height !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Layout className="w-3 h-3" />
                Height
              </label>
              <input
                type="text"
                value={widget.layout.height}
                onChange={(e) => updateWidgetProperty('layout.height', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="auto, 100px, 50%"
              />
            </div>
          )}
          
          {/* Border radius */}
          {widget.style?.borderRadius !== undefined && (
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Layout className="w-3 h-3" />
                Border Radius
              </label>
              <input
                type="text"
                value={widget.style.borderRadius}
                onChange={(e) => updateWidgetProperty('style.borderRadius', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="8px"
              />
            </div>
          )}
        </div>
        
        {/* Footer - More properties button */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {/* TODO: Open full properties panel */}}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            More Properties
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InlinePropertiesPanel;
