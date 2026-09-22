import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, RotateCcw, Palette, Type, Layout, 
  Eye, EyeOff, Sliders, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * PropertiesPanel - Right sidebar for editing selected widget properties
 */
const PropertiesPanel = () => {
  const { 
    selectedWidget, 
    widgetProperties, 
    updateWidgetProperty, 
    saveLayout,
    selectWidget,
    getWidgetSchema 
  } = useEditor();

  const [localProperties, setLocalProperties] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    appearance: true,
    layout: true,
    behavior: true,
  });

  // Load properties when widget changes
  useEffect(() => {
    if (selectedWidget && widgetProperties[selectedWidget]) {
      setLocalProperties(widgetProperties[selectedWidget]);
    } else {
      setLocalProperties({});
    }
  }, [selectedWidget, widgetProperties]);

  if (!selectedWidget) return null;

  const schema = getWidgetSchema(selectedWidget);
  if (!schema) return null;

  const handlePropertyChange = (key, value) => {
    setLocalProperties(prev => ({ ...prev, [key]: value }));
    updateWidgetProperty(selectedWidget, key, value);
  };

  const handleSave = () => {
    saveLayout();
  };

  const handleReset = () => {
    if (schema.properties) {
      const defaults = {};
      Object.entries(schema.properties).forEach(([key, prop]) => {
        defaults[key] = prop.default;
      });
      setLocalProperties(defaults);
      Object.entries(defaults).forEach(([key, value]) => {
        updateWidgetProperty(selectedWidget, key, value);
      });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderPropertyInput = (key, property) => {
    const value = localProperties[key] ?? property.default;

    switch (property.type) {
      case 'boolean':
        return (
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">{property.label || key}</span>
            <button
              onClick={() => handlePropertyChange(key, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        );

      case 'color':
        return (
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              {property.label || key}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
                className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                placeholder="#000000"
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              {property.label || key}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
              min={property.min}
              max={property.max}
              step={property.step || 1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              {property.label || key}
            </label>
            <select
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {property.options?.map(option => (
                <option key={option.value || option} value={option.value || option}>
                  {option.label || option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'text':
        return (
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              {property.label || key}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              placeholder={property.placeholder}
            />
          </div>
        );

      case 'range':
        return (
          <div>
            <label className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span>{property.label || key}</span>
              <span className="font-mono">{value}</span>
            </label>
            <input
              type="range"
              value={value}
              onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
              min={property.min || 0}
              max={property.max || 100}
              step={property.step || 1}
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const groupedProperties = {
    appearance: [],
    layout: [],
    behavior: [],
    other: [],
  };

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, prop]) => {
      const category = prop.category || 'other';
      if (groupedProperties[category]) {
        groupedProperties[category].push([key, prop]);
      } else {
        groupedProperties.other.push([key, prop]);
      }
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-screen w-80 bg-white dark:bg-gray-800 border-l-2 border-gray-200 dark:border-gray-700 shadow-2xl z-[70] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Properties</h3>
            <button
              onClick={() => selectWidget(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-primary-100 dark:bg-primary-900 rounded text-xs font-medium text-primary-700 dark:text-primary-300">
              {schema.name || selectedWidget}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {schema.category || 'Widget'}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Appearance Section */}
          {groupedProperties.appearance.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('appearance')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <span>Appearance</span>
                </div>
                {expandedSections.appearance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.appearance && (
                <div className="space-y-3 pl-6">
                  {groupedProperties.appearance.map(([key, prop]) => (
                    <div key={key}>{renderPropertyInput(key, prop)}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Layout Section */}
          {groupedProperties.layout.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('layout')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  <span>Layout</span>
                </div>
                {expandedSections.layout ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.layout && (
                <div className="space-y-3 pl-6">
                  {groupedProperties.layout.map(([key, prop]) => (
                    <div key={key}>{renderPropertyInput(key, prop)}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Behavior Section */}
          {groupedProperties.behavior.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('behavior')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>Behavior</span>
                </div>
                {expandedSections.behavior ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.behavior && (
                <div className="space-y-3 pl-6">
                  {groupedProperties.behavior.map(([key, prop]) => (
                    <div key={key}>{renderPropertyInput(key, prop)}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other Properties */}
          {groupedProperties.other.length > 0 && (
            <div className="space-y-3 pl-6">
              {groupedProperties.other.map(([key, prop]) => (
                <div key={key}>{renderPropertyInput(key, prop)}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleSave}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PropertiesPanel;
