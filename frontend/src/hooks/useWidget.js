import { useState, useCallback, useEffect } from 'react';
import { 
  createWidgetConfig, 
  mergeWidgetConfigs, 
  applyAnimationPreset,
  autoAdaptWidget,
  validateWidgetConfig,
  exportWidgetConfig,
  importWidgetConfig
} from '../utils/widgetConfig';
import { 
  resetToDefault, 
  isModifiedFromDefault,
  getDefaultPreset 
} from '../utils/defaultPresets';

/**
 * useWidget - Hook for managing widget configurations
 * 
 * Makes it easy to:
 * - Create and manage widgets
 * - Apply animations
 * - Handle responsive behavior
 * - Save/load configurations
 */
export const useWidget = (initialType, initialConfig = {}) => {
  const [config, setConfig] = useState(() => 
    createWidgetConfig(initialType, initialConfig)
  );
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Update widget config
  const updateConfig = useCallback((updates) => {
    setConfig(current => {
      const newConfig = mergeWidgetConfigs(current, updates);
      
      // Add to history
      setHistory(prev => [...prev.slice(0, historyIndex + 1), newConfig]);
      setHistoryIndex(prev => prev + 1);
      
      return newConfig;
    });
  }, [historyIndex]);

  // Update specific property
  const updateProperty = useCallback((path, value) => {
    const pathParts = path.split('.');
    const updates = {};
    
    let current = updates;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current[pathParts[i]] = {};
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;
    
    updateConfig(updates);
  }, [updateConfig]);

  // Apply animation preset
  const setAnimation = useCallback((presetName) => {
    setConfig(current => applyAnimationPreset(current, presetName));
  }, []);

  // Apply responsive adaptation
  const adaptForBreakpoint = useCallback((breakpoint) => {
    setConfig(current => autoAdaptWidget(current, breakpoint));
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setConfig(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setConfig(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Reset to initial
  const reset = useCallback(() => {
    const newConfig = createWidgetConfig(initialType, initialConfig);
    setConfig(newConfig);
    setHistory([newConfig]);
    setHistoryIndex(0);
  }, [initialType, initialConfig]);

  // Validate current config
  const validate = useCallback(() => {
    return validateWidgetConfig(config);
  }, [config]);

  // Export config as JSON
  const exportConfig = useCallback(() => {
    return exportWidgetConfig(config);
  }, [config]);

  // Import config from JSON
  const importConfig = useCallback((jsonString) => {
    const imported = importWidgetConfig(jsonString);
    if (imported) {
      setConfig(imported);
      setHistory([imported]);
      setHistoryIndex(0);
      return true;
    }
    return false;
  }, []);

  // Clone widget
  const clone = useCallback(() => {
    return {
      ...config,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${config.name} (Copy)`
    };
  }, [config]);

  // Reset to default preset
  const resetToDefaultPreset = useCallback(() => {
    const defaultConfig = resetToDefault(config.type);
    setConfig(defaultConfig);
    setHistory([defaultConfig]);
    setHistoryIndex(0);
  }, [config.type]);

  // Check if modified from default
  const isModified = useCallback(() => {
    return isModifiedFromDefault(config);
  }, [config]);

  // Get default for comparison
  const getDefault = useCallback(() => {
    return getDefaultPreset(config.type);
  }, [config.type]);

  return {
    config,
    updateConfig,
    updateProperty,
    setAnimation,
    adaptForBreakpoint,
    undo,
    redo,
    reset,
    resetToDefaultPreset,
    isModified,
    getDefault,
    validate,
    exportConfig,
    importConfig,
    clone,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};

/**
 * useWidgetCollection - Hook for managing multiple widgets
 */
export const useWidgetCollection = (initialWidgets = []) => {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [selectedId, setSelectedId] = useState(null);

  // Add widget
  const addWidget = useCallback((type, config = {}) => {
    const newWidget = createWidgetConfig(type, config);
    setWidgets(prev => [...prev, newWidget]);
    return newWidget.id;
  }, []);

  // Remove widget
  const removeWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // Update widget
  const updateWidget = useCallback((id, updates) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? mergeWidgetConfigs(w, updates) : w
    ));
  }, []);

  // Get widget by ID
  const getWidget = useCallback((id) => {
    return widgets.find(w => w.id === id);
  }, [widgets]);

  // Select widget
  const selectWidget = useCallback((id) => {
    setSelectedId(id);
  }, []);

  // Get selected widget
  const selectedWidget = selectedId ? getWidget(selectedId) : null;

  // Duplicate widget
  const duplicateWidget = useCallback((id) => {
    const widget = getWidget(id);
    if (!widget) return null;
    
    const duplicate = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${widget.name} (Copy)`,
      layout: {
        ...widget.layout,
        x: widget.layout.x + 20,
        y: widget.layout.y + 20
      }
    };
    
    setWidgets(prev => [...prev, duplicate]);
    return duplicate.id;
  }, [getWidget]);

  // Reorder widgets
  const reorderWidgets = useCallback((fromIndex, toIndex) => {
    setWidgets(prev => {
      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(fromIndex, 1);
      newWidgets.splice(toIndex, 0, removed);
      return newWidgets;
    });
  }, []);

  // Clear all widgets
  const clearAll = useCallback(() => {
    setWidgets([]);
    setSelectedId(null);
  }, []);

  // Export all widgets
  const exportAll = useCallback(() => {
    return JSON.stringify(widgets, null, 2);
  }, [widgets]);

  // Import widgets
  const importAll = useCallback((jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        setWidgets(imported);
        return true;
      }
    } catch (error) {
      console.error('Failed to import widgets:', error);
    }
    return false;
  }, []);

  return {
    widgets,
    selectedWidget,
    selectedId,
    addWidget,
    removeWidget,
    updateWidget,
    getWidget,
    selectWidget,
    duplicateWidget,
    reorderWidgets,
    clearAll,
    exportAll,
    importAll
  };
};

/**
 * useResponsiveWidget - Hook for responsive widget behavior
 */
export const useResponsiveWidget = (config) => {
  const [breakpoint, setBreakpoint] = useState('desktop');
  const [adaptedConfig, setAdaptedConfig] = useState(config);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width <= (config.responsive?.breakpoints?.mobile?.maxWidth || 640)) {
        setBreakpoint('mobile');
      } else if (width <= (config.responsive?.breakpoints?.tablet?.maxWidth || 1024)) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [config.responsive]);

  useEffect(() => {
    if (config.responsive?.autoAdapt) {
      setAdaptedConfig(autoAdaptWidget(config, breakpoint));
    } else {
      setAdaptedConfig(config);
    }
  }, [config, breakpoint]);

  return {
    config: adaptedConfig,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop'
  };
};

export default useWidget;
