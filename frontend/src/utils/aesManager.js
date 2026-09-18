/**
 * AES Manager - Admin Editor System Management
 * 
 * Handles:
 * - Auto-save with version control
 * - Undo/redo with snapshots
 * - Error recovery
 * - Performance optimization
 * - Validation and safety checks
 * - Database persistence
 */

import { validateWidgetConfig } from './widgetConfig';
import { getDefaultDashboard, getDefaultSidebar } from './defaultPresets';

/**
 * AES Manager Class
 */
class AESManager {
  constructor() {
    this.currentLayout = null;
    this.history = [];
    this.historyIndex = -1;
    this.autoSaveTimer = null;
    this.autoSaveInterval = 5000; // 5 seconds
    this.maxHistorySize = 50; // Keep last 50 changes
    this.isDirty = false;
    this.isAutoSaveEnabled = true;
    this.validationErrors = [];
  }

  /**
   * Initialize AES Manager
   */
  async initialize(userId) {
    this.userId = userId;
    
    // Load saved layout from database
    const savedLayout = await this.loadFromDatabase();
    
    if (savedLayout) {
      this.currentLayout = savedLayout;
    } else {
      // Use default layout
      this.currentLayout = {
        dashboard: getDefaultDashboard(),
        sidebar: getDefaultSidebar(),
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: userId
        }
      };
    }
    
    // Add to history
    this.addToHistory(this.currentLayout);
    
    // Start auto-save
    if (this.isAutoSaveEnabled) {
      this.startAutoSave();
    }
    
    return this.currentLayout;
  }

  /**
   * Update layout
   */
  updateLayout(updates) {
    const newLayout = {
      ...this.currentLayout,
      ...updates,
      metadata: {
        ...this.currentLayout.metadata,
        updatedAt: new Date().toISOString(),
        updatedBy: this.userId
      }
    };
    
    // Validate before applying
    const validation = this.validateLayout(newLayout);
    if (!validation.valid) {
      console.error('Layout validation failed:', validation.errors);
      this.validationErrors = validation.errors;
      return false;
    }
    
    this.currentLayout = newLayout;
    this.isDirty = true;
    this.addToHistory(newLayout);
    
    return true;
  }

  /**
   * Add widget to layout
   */
  addWidget(section, widgetConfig) {
    // Validate widget
    const validation = validateWidgetConfig(widgetConfig);
    if (!validation.valid) {
      console.error('Widget validation failed:', validation.errors);
      return false;
    }
    
    const newLayout = { ...this.currentLayout };
    
    if (section === 'dashboard') {
      newLayout.dashboard.widgets.push(widgetConfig);
    } else if (section === 'sidebar') {
      newLayout.sidebar.widgets.push(widgetConfig);
    }
    
    return this.updateLayout(newLayout);
  }

  /**
   * Remove widget from layout
   */
  removeWidget(section, widgetId) {
    const newLayout = { ...this.currentLayout };
    
    if (section === 'dashboard') {
      newLayout.dashboard.widgets = newLayout.dashboard.widgets.filter(
        w => w.id !== widgetId
      );
    } else if (section === 'sidebar') {
      newLayout.sidebar.widgets = newLayout.sidebar.widgets.filter(
        w => w.id !== widgetId
      );
    }
    
    return this.updateLayout(newLayout);
  }

  /**
   * Update widget in layout
   */
  updateWidget(section, widgetId, updates) {
    const newLayout = { ...this.currentLayout };
    
    if (section === 'dashboard') {
      newLayout.dashboard.widgets = newLayout.dashboard.widgets.map(w =>
        w.id === widgetId ? { ...w, ...updates } : w
      );
    } else if (section === 'sidebar') {
      newLayout.sidebar.widgets = newLayout.sidebar.widgets.map(w =>
        w.id === widgetId ? { ...w, ...updates } : w
      );
    }
    
    return this.updateLayout(newLayout);
  }

  /**
   * Reorder widgets
   */
  reorderWidgets(section, fromIndex, toIndex) {
    const newLayout = { ...this.currentLayout };
    const widgets = section === 'dashboard' 
      ? newLayout.dashboard.widgets 
      : newLayout.sidebar.widgets;
    
    const [removed] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, removed);
    
    return this.updateLayout(newLayout);
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(visible) {
    const newLayout = { ...this.currentLayout };
    newLayout.sidebar.visible = visible;
    return this.updateLayout(newLayout);
  }

  /**
   * Update sidebar configuration
   */
  updateSidebarConfig(config) {
    const newLayout = { ...this.currentLayout };
    newLayout.sidebar = {
      ...newLayout.sidebar,
      ...config
    };
    return this.updateLayout(newLayout);
  }

  /**
   * Add to history
   */
  addToHistory(layout) {
    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    // Add new state
    this.history.push(JSON.parse(JSON.stringify(layout)));
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Undo
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentLayout = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.isDirty = true;
      return this.currentLayout;
    }
    return null;
  }

  /**
   * Redo
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentLayout = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.isDirty = true;
      return this.currentLayout;
    }
    return null;
  }

  /**
   * Can undo
   */
  canUndo() {
    return this.historyIndex > 0;
  }

  /**
   * Can redo
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Reset to default
   */
  resetToDefault() {
    const defaultLayout = {
      dashboard: getDefaultDashboard(),
      sidebar: getDefaultSidebar(),
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.userId,
        resetToDefault: true
      }
    };
    
    this.currentLayout = defaultLayout;
    this.isDirty = true;
    this.addToHistory(defaultLayout);
    
    return defaultLayout;
  }

  /**
   * Create snapshot (manual save point)
   */
  createSnapshot(name) {
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      name: name || `Snapshot ${new Date().toLocaleString()}`,
      layout: JSON.parse(JSON.stringify(this.currentLayout)),
      createdAt: new Date().toISOString(),
      createdBy: this.userId
    };
    
    // Save snapshot to database
    this.saveSnapshot(snapshot);
    
    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  async restoreFromSnapshot(snapshotId) {
    const snapshot = await this.loadSnapshot(snapshotId);
    
    if (snapshot) {
      this.currentLayout = snapshot.layout;
      this.isDirty = true;
      this.addToHistory(snapshot.layout);
      return true;
    }
    
    return false;
  }

  /**
   * Validate layout
   */
  validateLayout(layout) {
    const errors = [];
    
    // Check required fields
    if (!layout.dashboard) errors.push('Dashboard configuration missing');
    if (!layout.sidebar) errors.push('Sidebar configuration missing');
    if (!layout.metadata) errors.push('Metadata missing');
    
    // Validate all widgets
    if (layout.dashboard?.widgets) {
      layout.dashboard.widgets.forEach((widget, index) => {
        const validation = validateWidgetConfig(widget);
        if (!validation.valid) {
          errors.push(`Dashboard widget ${index}: ${validation.errors.join(', ')}`);
        }
      });
    }
    
    if (layout.sidebar?.widgets) {
      layout.sidebar.widgets.forEach((widget, index) => {
        const validation = validateWidgetConfig(widget);
        if (!validation.valid) {
          errors.push(`Sidebar widget ${index}: ${validation.errors.join(', ')}`);
        }
      });
    }
    
    // Check for duplicate IDs
    const allWidgets = [
      ...(layout.dashboard?.widgets || []),
      ...(layout.sidebar?.widgets || [])
    ];
    const ids = allWidgets.map(w => w.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate widget IDs found: ${duplicates.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Auto-save
   */
  startAutoSave() {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty) {
        await this.save();
      }
    }, this.autoSaveInterval);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Manual save
   */
  async save() {
    try {
      // Validate before saving
      const validation = this.validateLayout(this.currentLayout);
      if (!validation.valid) {
        console.error('Cannot save invalid layout:', validation.errors);
        return false;
      }
      
      // Save to database
      await this.saveToDatabase(this.currentLayout);
      
      this.isDirty = false;
      
      return true;
    } catch (error) {
      console.error('Failed to save layout:', error);
      return false;
    }
  }

  /**
   * Save to database
   */
  async saveToDatabase(layout) {
    try {
      const response = await fetch('/api/aes/layouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          layout: layout,
          version: layout.metadata.version
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save layout');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }

  /**
   * Load from database
   */
  async loadFromDatabase() {
    try {
      const response = await fetch(`/api/aes/layouts/${this.userId}`);
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.layout;
    } catch (error) {
      console.error('Database load error:', error);
      return null;
    }
  }

  /**
   * Save snapshot to database
   */
  async saveSnapshot(snapshot) {
    try {
      await fetch('/api/aes/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(snapshot)
      });
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }

  /**
   * Load snapshot from database
   */
  async loadSnapshot(snapshotId) {
    try {
      const response = await fetch(`/api/aes/snapshots/${snapshotId}`);
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      return null;
    }
  }

  /**
   * Get all snapshots
   */
  async getSnapshots() {
    try {
      const response = await fetch(`/api/aes/snapshots?userId=${this.userId}`);
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      return [];
    }
  }

  /**
   * Export layout
   */
  exportLayout() {
    return JSON.stringify(this.currentLayout, null, 2);
  }

  /**
   * Import layout
   */
  importLayout(jsonString) {
    try {
      const layout = JSON.parse(jsonString);
      
      // Validate
      const validation = this.validateLayout(layout);
      if (!validation.valid) {
        console.error('Invalid layout:', validation.errors);
        return false;
      }
      
      this.currentLayout = layout;
      this.isDirty = true;
      this.addToHistory(layout);
      
      return true;
    } catch (error) {
      console.error('Failed to import layout:', error);
      return false;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const dashboardWidgets = this.currentLayout.dashboard?.widgets || [];
    const sidebarWidgets = this.currentLayout.sidebar?.widgets || [];
    const totalWidgets = dashboardWidgets.length + sidebarWidgets.length;
    
    // Count widgets with animations
    const animatedWidgets = [...dashboardWidgets, ...sidebarWidgets].filter(
      w => w.animation?.enabled
    ).length;
    
    // Count nested widgets
    let nestedCount = 0;
    const countNested = (widgets) => {
      widgets.forEach(w => {
        if (w.children && w.children.length > 0) {
          nestedCount += w.children.length;
          countNested(w.children);
        }
      });
    };
    countNested([...dashboardWidgets, ...sidebarWidgets]);
    
    return {
      totalWidgets,
      animatedWidgets,
      nestedWidgets: nestedCount,
      historySize: this.history.length,
      isDirty: this.isDirty,
      estimatedRenderTime: totalWidgets * 2, // Rough estimate in ms
      performanceScore: this.calculatePerformanceScore(totalWidgets, animatedWidgets)
    };
  }

  /**
   * Calculate performance score (0-100)
   */
  calculatePerformanceScore(totalWidgets, animatedWidgets) {
    let score = 100;
    
    // Deduct for too many widgets
    if (totalWidgets > 50) score -= (totalWidgets - 50) * 0.5;
    
    // Deduct for too many animations
    if (animatedWidgets > 20) score -= (animatedWidgets - 20) * 1;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Optimize layout (remove unnecessary properties, compress)
   */
  optimizeLayout() {
    // Remove empty children arrays
    const optimize = (widget) => {
      if (widget.children && widget.children.length === 0) {
        delete widget.children;
      }
      if (widget.children) {
        widget.children.forEach(optimize);
      }
      return widget;
    };
    
    const optimized = {
      ...this.currentLayout,
      dashboard: {
        ...this.currentLayout.dashboard,
        widgets: this.currentLayout.dashboard.widgets.map(optimize)
      },
      sidebar: {
        ...this.currentLayout.sidebar,
        widgets: this.currentLayout.sidebar.widgets.map(optimize)
      }
    };
    
    this.currentLayout = optimized;
    this.isDirty = true;
    
    return optimized;
  }

  /**
   * Cleanup (call when component unmounts)
   */
  cleanup() {
    this.stopAutoSave();
    
    // Save if dirty
    if (this.isDirty) {
      this.save();
    }
  }
}

// Singleton instance
let aesManagerInstance = null;

/**
 * Get AES Manager instance
 */
export const getAESManager = () => {
  if (!aesManagerInstance) {
    aesManagerInstance = new AESManager();
  }
  return aesManagerInstance;
};

/**
 * Reset AES Manager instance (for testing)
 */
export const resetAESManager = () => {
  if (aesManagerInstance) {
    aesManagerInstance.cleanup();
  }
  aesManagerInstance = null;
};

export default AESManager;
