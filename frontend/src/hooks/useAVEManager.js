import { useState, useEffect, useCallback } from 'react';
import { getAVEManager } from '../utils/aveManager';

/**
 * useAVEManager - React hook for AVE Manager
 * 
 * Provides easy access to AVE functionality with React state management
 */
export const useAVEManager = (userId) => {
  const [manager] = useState(() => getAVEManager());
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const initialLayout = await manager.initialize(userId);
        setLayout(initialLayout);
        setIsDirty(manager.isDirty);
        updateMetrics();
      } catch (error) {
        console.error('Failed to initialize AVE Manager:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      manager.cleanup();
    };
  }, [userId, manager]);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const metrics = manager.getPerformanceMetrics();
    setPerformanceMetrics(metrics);
  }, [manager]);

  // Update layout
  const updateLayout = useCallback((updates) => {
    const success = manager.updateLayout(updates);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      setValidationErrors([]);
      updateMetrics();
    } else {
      setValidationErrors(manager.validationErrors);
    }
    return success;
  }, [manager, updateMetrics]);

  // Add widget
  const addWidget = useCallback((section, widgetConfig) => {
    const success = manager.addWidget(section, widgetConfig);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
    return success;
  }, [manager, updateMetrics]);

  // Remove widget
  const removeWidget = useCallback((section, widgetId) => {
    const success = manager.removeWidget(section, widgetId);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
    return success;
  }, [manager, updateMetrics]);

  // Update widget
  const updateWidget = useCallback((section, widgetId, updates) => {
    const success = manager.updateWidget(section, widgetId, updates);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
    return success;
  }, [manager, updateMetrics]);

  // Reorder widgets
  const reorderWidgets = useCallback((section, fromIndex, toIndex) => {
    const success = manager.reorderWidgets(section, fromIndex, toIndex);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
    }
    return success;
  }, [manager]);

  // Toggle sidebar
  const toggleSidebar = useCallback((visible) => {
    const success = manager.toggleSidebar(visible);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
    }
    return success;
  }, [manager]);

  // Update sidebar config
  const updateSidebarConfig = useCallback((config) => {
    const success = manager.updateSidebarConfig(config);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
    }
    return success;
  }, [manager]);

  // Undo
  const undo = useCallback(() => {
    const newLayout = manager.undo();
    if (newLayout) {
      setLayout(newLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
  }, [manager, updateMetrics]);

  // Redo
  const redo = useCallback(() => {
    const newLayout = manager.redo();
    if (newLayout) {
      setLayout(newLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
  }, [manager, updateMetrics]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    const defaultLayout = manager.resetToDefault();
    setLayout(defaultLayout);
    setIsDirty(manager.isDirty);
    updateMetrics();
    return defaultLayout;
  }, [manager, updateMetrics]);

  // Save
  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await manager.save();
      if (success) {
        setIsDirty(false);
      }
      return success;
    } catch (error) {
      console.error('Failed to save:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [manager]);

  // Create snapshot
  const createSnapshot = useCallback(async (name) => {
    const snapshot = manager.createSnapshot(name);
    return snapshot;
  }, [manager]);

  // Restore from snapshot
  const restoreFromSnapshot = useCallback(async (snapshotId) => {
    const success = await manager.restoreFromSnapshot(snapshotId);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
    return success;
  }, [manager, updateMetrics]);

  // Get snapshots
  const getSnapshots = useCallback(async () => {
    return await manager.getSnapshots();
  }, [manager]);

  // Export layout
  const exportLayout = useCallback(() => {
    return manager.exportLayout();
  }, [manager]);

  // Import layout
  const importLayout = useCallback((jsonString) => {
    const success = manager.importLayout(jsonString);
    if (success) {
      setLayout(manager.currentLayout);
      setIsDirty(manager.isDirty);
      updateMetrics();
    }
    return success;
  }, [manager, updateMetrics]);

  // Optimize layout
  const optimizeLayout = useCallback(() => {
    const optimized = manager.optimizeLayout();
    setLayout(optimized);
    setIsDirty(manager.isDirty);
    updateMetrics();
    return optimized;
  }, [manager, updateMetrics]);

  return {
    // State
    layout,
    isLoading,
    isSaving,
    isDirty,
    validationErrors,
    performanceMetrics,
    
    // Layout operations
    updateLayout,
    addWidget,
    removeWidget,
    updateWidget,
    reorderWidgets,
    
    // Sidebar operations
    toggleSidebar,
    updateSidebarConfig,
    
    // History
    undo,
    redo,
    canUndo: manager.canUndo(),
    canRedo: manager.canRedo(),
    
    // Reset
    resetToDefault,
    
    // Save/Load
    save,
    createSnapshot,
    restoreFromSnapshot,
    getSnapshots,
    exportLayout,
    importLayout,
    
    // Optimization
    optimizeLayout,
    
    // Manager instance (for advanced use)
    manager
  };
};

export default useAVEManager;
