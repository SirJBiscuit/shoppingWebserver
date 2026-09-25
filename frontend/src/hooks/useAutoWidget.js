/**
 * CFS Auto Widget Hook Generator
 * 
 * Automatically creates smart state hooks for AVE widgets
 * 
 * Features:
 * - Auto-generates useSmartState hooks
 * - Automatic cache management
 * - Optimistic updates
 * - Error recovery
 * - AVE integration
 * 
 * Usage:
 * const MyWidget = createAutoWidget('my-widget', {
 *   fetchData: () => fetch('/api/my-data'),
 *   cacheKey: 'my_widget_data',
 *   cacheExpiry: 30,
 * });
 */

import { useCallback, useMemo } from 'react';
import useSmartState from './useSmartState';
import { useEditor } from '../contexts/EditorContext';
import { EditableContainer } from '../components/editor/EditorOverlay';

/**
 * Create an auto-managed widget hook
 * 
 * @param {string} widgetId - Unique widget identifier
 * @param {object} config - Widget configuration
 * @returns {function} Widget hook
 */
export const createAutoWidget = (widgetId, config = {}) => {
  const {
    fetchData,
    cacheKey = widgetId,
    cacheExpiry = 30,
    optimistic = true,
    autoSync = true,
    displayName = widgetId,
  } = config;

  // Return the hook function
  return (additionalConfig = {}) => {
    const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
    
    // Get widget-specific properties from AVE
    const props = widgetProperties[widgetId] || {};
    
    // Use SmartState for data management
    const {
      data,
      loading,
      error,
      add,
      update,
      remove,
      setData,
      invalidate,
    } = useSmartState(
      cacheKey,
      fetchData,
      {
        cacheExpiry,
        optimistic,
        autoSync,
        ...additionalConfig,
      }
    );

    // Check if this widget is selected
    const isSelected = selectedWidget?.id === widgetId;

    // Handler to select this widget
    const handleSelect = useCallback(() => {
      if (isEditorActive) {
        selectWidget(widgetId);
      }
    }, [isEditorActive, selectWidget, widgetId]);

    // Wrapper function for AVE integration
    const wrapWithAVE = useCallback((children) => {
      if (!isEditorActive) {
        return children;
      }

      return (
        <EditableContainer
          isEditorActive={isEditorActive}
          componentName={displayName}
          onSelect={handleSelect}
          isSelected={isSelected}
        >
          {children}
        </EditableContainer>
      );
    }, [isEditorActive, displayName, handleSelect, isSelected]);

    return {
      // Data from SmartState
      data,
      loading,
      error,
      
      // CRUD operations
      add,
      update,
      remove,
      setData,
      refresh: invalidate,
      
      // AVE integration
      props,
      isSelected,
      isEditorActive,
      wrapWithAVE,
      handleSelect,
    };
  };
};

/**
 * Quick widget creator for simple data widgets
 * 
 * @param {string} widgetId - Widget ID
 * @param {string} apiEndpoint - API endpoint to fetch from
 * @param {object} options - Additional options
 */
export const createDataWidget = (widgetId, apiEndpoint, options = {}) => {
  return createAutoWidget(widgetId, {
    fetchData: async () => {
      const response = await fetch(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    ...options,
  });
};

/**
 * Create a widget hook with custom API functions
 * 
 * @param {string} widgetId - Widget ID
 * @param {object} api - API functions { fetch, create, update, delete }
 * @param {object} options - Additional options
 */
export const createAPIWidget = (widgetId, api, options = {}) => {
  const hook = createAutoWidget(widgetId, {
    fetchData: api.fetch,
    ...options,
  });

  // Enhance with custom API methods
  return (config) => {
    const widget = hook(config);
    
    return {
      ...widget,
      
      // Override CRUD with custom API
      create: api.create ? (data) => widget.add(data, api.create) : widget.add,
      update: api.update ? (id, data) => widget.update(id, data, api.update) : widget.update,
      delete: api.delete ? (id) => widget.remove(id, api.delete) : widget.remove,
    };
  };
};

/**
 * Example usage:
 * 
 * // Simple data widget
 * const useBudgetWidget = createDataWidget('budget-tracker', '/api/budget');
 * 
 * // In component:
 * const { data: budget, loading, wrapWithAVE } = useBudgetWidget();
 * 
 * return wrapWithAVE(
 *   <div>
 *     {loading ? 'Loading...' : `Budget: $${budget?.total}`}
 *   </div>
 * );
 * 
 * // Custom API widget
 * const useShoppingWidget = createAPIWidget('shopping-list', {
 *   fetch: () => shoppingAPI.getLists(),
 *   create: (data) => shoppingAPI.createList(data),
 *   update: (id, data) => shoppingAPI.updateList(id, data),
 *   delete: (id) => shoppingAPI.deleteList(id),
 * });
 */

export default createAutoWidget;
