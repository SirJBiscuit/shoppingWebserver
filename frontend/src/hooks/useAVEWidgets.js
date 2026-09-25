/**
 * CFS AVE Widgets Hook
 * 
 * Smart state management for AVE widgets with instant drag/drop/resize
 * and automatic PostgreSQL synchronization
 * 
 * Features:
 * - Instant drag/drop/resize (60fps)
 * - Undo/Redo support
 * - Snap to grid
 * - Alignment tools
 * - Grouping/ungrouping
 * - Z-index management
 * - Keyboard shortcuts
 * - Auto-save with debouncing
 */

import { useCallback, useRef, useState } from 'react';
import useSmartState from './useSmartState';
import * as aveAPI from '../api/ave';

export const useAVEWidgets = (pageId, options = {}) => {
  const {
    gridSize = 10,
    snapToGrid = false,
    enableUndo = true,
    maxHistory = 50,
  } = options;

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

  const [selectedWidgets, setSelectedWidgets] = useState([]);
  const [clipboard, setClipboard] = useState(null);

  const dragState = useRef({
    isDragging: false,
    dirtyWidgets: new Set(),
    saveTimeout: null,
  });

  const history = useRef({
    past: [],
    future: [],
  });

  const snapPosition = useCallback((position) => {
    if (!snapToGrid) return position;
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  const saveHistory = useCallback(() => {
    if (!enableUndo || !widgets) return;
    
    history.current.past.push(JSON.parse(JSON.stringify(widgets)));
    
    if (history.current.past.length > maxHistory) {
      history.current.past.shift();
    }
    
    history.current.future = [];
  }, [widgets, enableUndo, maxHistory]);

  const startDrag = useCallback((widgetId) => {
    dragState.current.isDragging = true;
    saveHistory();
  }, [saveHistory]);

  const updatePosition = useCallback((widgetId, position) => {
    const snappedPosition = snapPosition(position);
    
    setData(prevWidgets => 
      prevWidgets.map(w => 
        w.id === widgetId 
          ? { ...w, position: snappedPosition, _dirty: true }
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
  }, [setData, snapPosition]);

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
    saveHistory();
    await update(widgetId, properties, aveAPI.updateWidget);
  }, [update, saveHistory]);

  const undo = useCallback(() => {
    if (history.current.past.length === 0) return;
    
    const previous = history.current.past.pop();
    history.current.future.push(JSON.parse(JSON.stringify(widgets)));
    
    setData(previous);
  }, [widgets, setData]);

  const redo = useCallback(() => {
    if (history.current.future.length === 0) return;
    
    const next = history.current.future.pop();
    history.current.past.push(JSON.parse(JSON.stringify(widgets)));
    
    setData(next);
  }, [widgets, setData]);

  const alignWidgets = useCallback((alignment) => {
    if (selectedWidgets.length < 2) return;
    
    saveHistory();
    
    const selected = widgets.filter(w => selectedWidgets.includes(w.id));
    
    let updates = [];
    
    switch (alignment) {
      case 'left':
        const minX = Math.min(...selected.map(w => w.position.x));
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, x: minX } }
        }));
        break;
        
      case 'right':
        const maxX = Math.max(...selected.map(w => w.position.x + (w.width || 0)));
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, x: maxX - (w.width || 0) } }
        }));
        break;
        
      case 'top':
        const minY = Math.min(...selected.map(w => w.position.y));
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, y: minY } }
        }));
        break;
        
      case 'bottom':
        const maxY = Math.max(...selected.map(w => w.position.y + (w.height || 0)));
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, y: maxY - (w.height || 0) } }
        }));
        break;
        
      case 'center-horizontal':
        const avgX = selected.reduce((sum, w) => sum + w.position.x, 0) / selected.length;
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, x: avgX } }
        }));
        break;
        
      case 'center-vertical':
        const avgY = selected.reduce((sum, w) => sum + w.position.y, 0) / selected.length;
        updates = selected.map(w => ({
          id: w.id,
          changes: { position: { ...w.position, y: avgY } }
        }));
        break;
        
      default:
        return;
    }
    
    batchUpdate(updates, aveAPI.batchUpdateWidgets);
  }, [selectedWidgets, widgets, saveHistory, batchUpdate]);

  const distributeWidgets = useCallback((direction) => {
    if (selectedWidgets.length < 3) return;
    
    saveHistory();
    
    const selected = widgets.filter(w => selectedWidgets.includes(w.id));
    const sorted = [...selected].sort((a, b) => 
      direction === 'horizontal' 
        ? a.position.x - b.position.x 
        : a.position.y - b.position.y
    );
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    const totalSpace = direction === 'horizontal'
      ? (last.position.x + (last.width || 0)) - first.position.x
      : (last.position.y + (last.height || 0)) - first.position.y;
      
    const totalWidgetSize = sorted.reduce((sum, w) => 
      sum + (direction === 'horizontal' ? (w.width || 0) : (w.height || 0)), 0
    );
    
    const spacing = (totalSpace - totalWidgetSize) / (sorted.length - 1);
    
    let currentPos = direction === 'horizontal' ? first.position.x : first.position.y;
    
    const updates = sorted.map(w => {
      const pos = currentPos;
      currentPos += (direction === 'horizontal' ? (w.width || 0) : (w.height || 0)) + spacing;
      
      return {
        id: w.id,
        changes: {
          position: direction === 'horizontal'
            ? { ...w.position, x: pos }
            : { ...w.position, y: pos }
        }
      };
    });
    
    batchUpdate(updates, aveAPI.batchUpdateWidgets);
  }, [selectedWidgets, widgets, saveHistory, batchUpdate]);

  const bringToFront = useCallback((widgetId) => {
    saveHistory();
    
    const maxZ = Math.max(...widgets.map(w => w.zIndex || 0));
    update(widgetId, { zIndex: maxZ + 1 }, aveAPI.updateWidget);
  }, [widgets, saveHistory, update]);

  const sendToBack = useCallback((widgetId) => {
    saveHistory();
    
    const minZ = Math.min(...widgets.map(w => w.zIndex || 0));
    update(widgetId, { zIndex: minZ - 1 }, aveAPI.updateWidget);
  }, [widgets, saveHistory, update]);

  const duplicateWidget = useCallback(async (widgetId) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    
    saveHistory();
    
    const duplicate = {
      ...widget,
      position: {
        x: widget.position.x + 20,
        y: widget.position.y + 20,
      },
    };
    
    delete duplicate.id;
    
    await aveAPI.createWidget(pageId, duplicate);
    await invalidate();
  }, [widgets, pageId, saveHistory, invalidate]);

  const copyWidgets = useCallback(() => {
    const selected = widgets.filter(w => selectedWidgets.includes(w.id));
    setClipboard(selected);
  }, [widgets, selectedWidgets]);

  const pasteWidgets = useCallback(async () => {
    if (!clipboard || clipboard.length === 0) return;
    
    saveHistory();
    
    const duplicates = clipboard.map(w => ({
      ...w,
      position: {
        x: w.position.x + 20,
        y: w.position.y + 20,
      },
    }));
    
    for (const widget of duplicates) {
      delete widget.id;
      await aveAPI.createWidget(pageId, widget);
    }
    
    await invalidate();
  }, [clipboard, pageId, saveHistory, invalidate]);

  const groupWidgets = useCallback(async () => {
    if (selectedWidgets.length < 2) return;
    
    saveHistory();
    
    const groupId = `group_${Date.now()}`;
    const updates = selectedWidgets.map(id => ({
      id,
      changes: { groupId }
    }));
    
    await batchUpdate(updates, aveAPI.batchUpdateWidgets);
  }, [selectedWidgets, saveHistory, batchUpdate]);

  const ungroupWidgets = useCallback(async () => {
    if (selectedWidgets.length === 0) return;
    
    saveHistory();
    
    const updates = selectedWidgets.map(id => ({
      id,
      changes: { groupId: null }
    }));
    
    await batchUpdate(updates, aveAPI.batchUpdateWidgets);
  }, [selectedWidgets, saveHistory, batchUpdate]);

  const deleteWidgets = useCallback(async (widgetIds) => {
    saveHistory();
    
    for (const id of widgetIds) {
      await aveAPI.deleteWidget(id);
    }
    
    await invalidate();
  }, [saveHistory, invalidate]);

  return {
    widgets: widgets || [],
    loading,
    error,
    selectedWidgets,
    setSelectedWidgets,
    
    startDrag,
    updatePosition,
    updateSize,
    endDrag,
    updateProperties,
    
    undo,
    redo,
    canUndo: history.current.past.length > 0,
    canRedo: history.current.future.length > 0,
    
    alignWidgets,
    distributeWidgets,
    bringToFront,
    sendToBack,
    
    duplicateWidget,
    copyWidgets,
    pasteWidgets,
    
    groupWidgets,
    ungroupWidgets,
    
    deleteWidgets,
    invalidate,
  };
};

export default useAVEWidgets;
