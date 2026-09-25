/**
 * CFS AVE Widgets Hook
 * 
 * Smart state management for AVE widgets with instant drag/drop/resize
 * and automatic PostgreSQL synchronization
 */

import { useCallback, useRef } from 'react';
import useSmartState from './useSmartState';
import * as aveAPI from '../api/ave';

export const useAVEWidgets = (pageId) => {
  const {
    data: widgets,
    loading,
    error,
    update,
    batchUpdate,
    setData,
    invalidate,
  } = useSmartState(
    `ave_widgets_${pageId}`,
    () => aveAPI.getWidgets(pageId),
    {
      cacheExpiry: 120,
      optimistic: true,
      autoSync: true,
    }
  );

  const dragState = useRef({
    isDragging: false,
    dirtyWidgets: new Set(),
    saveTimeout: null,
  });

  const startDrag = useCallback((widgetId) => {
    dragState.current.isDragging = true;
  }, []);

  const updatePosition = useCallback((widgetId, position) => {
    setData(prevWidgets => 
      prevWidgets.map(w => 
        w.id === widgetId 
          ? { ...w, position, _dirty: true }
          : w
      )
    );
    
    dragState.current.dirtyWidgets.add(widgetId);
    
    if (dragState.current.saveTimeout) {
      clearTimeout(dragState.current.saveTimeout);
    }
    
    dragState.current.saveTimeout = setTimeout(() => {
      saveDirtyWidgets();
    }, 500);
  }, [setData]);

  const updateSize = useCallback((widgetId, size) => {
    setData(prevWidgets => 
      prevWidgets.map(w => 
        w.id === widgetId 
          ? { ...w, width: size.width, height: size.height, _dirty: true }
          : w
      )
    );
    
    dragState.current.dirtyWidgets.add(widgetId);
    
    if (dragState.current.saveTimeout) {
      clearTimeout(dragState.current.saveTimeout);
    }
    
    dragState.current.saveTimeout = setTimeout(() => {
      saveDirtyWidgets();
    }, 500);
  }, [setData]);

  const endDrag = useCallback(async () => {
    dragState.current.isDragging = false;
    
    if (dragState.current.saveTimeout) {
      clearTimeout(dragState.current.saveTimeout);
    }
    
    await saveDirtyWidgets();
  }, []);

  const saveDirtyWidgets = useCallback(async () => {
    if (dragState.current.dirtyWidgets.size === 0) return;

    const dirtyIds = Array.from(dragState.current.dirtyWidgets);
    const dirtyWidgets = widgets.filter(w => dirtyIds.includes(w.id));
    
    try {
      await batchUpdate(
        dirtyWidgets.map(w => ({
          id: w.id,
          changes: {
            position: w.position,
            width: w.width,
            height: w.height,
          }
        })),
        aveAPI.batchUpdateWidgets
      );
      
      dragState.current.dirtyWidgets.clear();
    } catch (error) {
      console.error('Failed to save widget changes:', error);
    }
  }, [widgets, batchUpdate]);

  const updateProperties = useCallback(async (widgetId, properties) => {
    await update(widgetId, properties, aveAPI.updateWidget);
  }, [update]);

  return {
    widgets: widgets || [],
    loading,
    error,
    
    startDrag,
    updatePosition,
    updateSize,
    endDrag,
    updateProperties,
    invalidate,
  };
};

export default useAVEWidgets;
