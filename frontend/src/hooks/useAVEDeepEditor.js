/**
 * CFS AVE Deep Editor Hook
 * 
 * Advanced editing for nested elements within widgets
 * - Edit text, buttons, images, icons within widgets
 * - Responsive design (desktop/tablet/mobile)
 * - Visual property editing
 * - Real-time preview
 */

import { useState, useCallback, useRef } from 'react';
import useSmartState from './useSmartState';
import * as aveAPI from '../api/ave';

export const useAVEDeepEditor = (widgetId) => {
  const [selectedElement, setSelectedElement] = useState(null);
  const [editMode, setEditMode] = useState(null); // 'text', 'style', 'layout'
  const [viewport, setViewport] = useState('desktop'); // 'desktop', 'tablet', 'mobile'
  
  const {
    data: elements,
    loading,
    error,
    update,
    setData,
    invalidate,
  } = useSmartState(
    `ave_widget_elements_${widgetId}`,
    () => aveAPI.getWidgetElements(widgetId),
    {
      cacheExpiry: 120,
      optimistic: true,
      autoSync: true,
    }
  );

  const history = useRef({
    past: [],
    future: [],
  });

  const saveHistory = useCallback(() => {
    if (!elements) return;
    history.current.past.push(JSON.parse(JSON.stringify(elements)));
    if (history.current.past.length > 50) {
      history.current.past.shift();
    }
    history.current.future = [];
  }, [elements]);

  // Select element for editing
  const selectElement = useCallback((elementPath) => {
    setSelectedElement(elementPath);
  }, []);

  // Update element text
  const updateText = useCallback(async (elementPath, text) => {
    saveHistory();
    
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const element = getElementByPath(updated, elementPath);
      if (element) {
        element.text = text;
        element._dirty = true;
      }
      return updated;
    });

    await update(elementPath, { text }, aveAPI.updateElement);
  }, [saveHistory, setData, update]);

  // Update element style
  const updateStyle = useCallback(async (elementPath, styles, viewport = 'desktop') => {
    saveHistory();
    
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const element = getElementByPath(updated, elementPath);
      if (element) {
        if (!element.responsive) {
          element.responsive = {
            desktop: {},
            tablet: {},
            mobile: {},
          };
        }
        element.responsive[viewport] = {
          ...element.responsive[viewport],
          ...styles,
        };
        element._dirty = true;
      }
      return updated;
    });

    await update(elementPath, { 
      responsive: { [viewport]: styles } 
    }, aveAPI.updateElement);
  }, [saveHistory, setData, update]);

  // Update element position (within widget)
  const updatePosition = useCallback(async (elementPath, position, viewport = 'desktop') => {
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const element = getElementByPath(updated, elementPath);
      if (element) {
        if (!element.responsive) {
          element.responsive = {
            desktop: {},
            tablet: {},
            mobile: {},
          };
        }
        element.responsive[viewport] = {
          ...element.responsive[viewport],
          position: position,
        };
        element._dirty = true;
      }
      return updated;
    });
  }, [setData]);

  // Update element size
  const updateSize = useCallback(async (elementPath, size, viewport = 'desktop') => {
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const element = getElementByPath(updated, elementPath);
      if (element) {
        if (!element.responsive) {
          element.responsive = {
            desktop: {},
            tablet: {},
            mobile: {},
          };
        }
        element.responsive[viewport] = {
          ...element.responsive[viewport],
          width: size.width,
          height: size.height,
        };
        element._dirty = true;
      }
      return updated;
    });
  }, [setData]);

  // Update element properties (color, font, etc.)
  const updateProperties = useCallback(async (elementPath, properties, viewport = 'desktop') => {
    saveHistory();
    
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const element = getElementByPath(updated, elementPath);
      if (element) {
        if (!element.responsive) {
          element.responsive = {
            desktop: {},
            tablet: {},
            mobile: {},
          };
        }
        element.responsive[viewport] = {
          ...element.responsive[viewport],
          ...properties,
        };
        element._dirty = true;
      }
      return updated;
    });

    await update(elementPath, { 
      responsive: { [viewport]: properties } 
    }, aveAPI.updateElement);
  }, [saveHistory, setData, update]);

  // Convert responsive styles automatically
  const autoConvertResponsive = useCallback((desktopStyles) => {
    const tablet = {
      ...desktopStyles,
      fontSize: desktopStyles.fontSize ? `${parseFloat(desktopStyles.fontSize) * 0.9}px` : undefined,
      padding: desktopStyles.padding ? `${parseFloat(desktopStyles.padding) * 0.8}px` : undefined,
      width: desktopStyles.width ? `${parseFloat(desktopStyles.width) * 0.85}%` : undefined,
    };

    const mobile = {
      ...desktopStyles,
      fontSize: desktopStyles.fontSize ? `${parseFloat(desktopStyles.fontSize) * 0.8}px` : undefined,
      padding: desktopStyles.padding ? `${parseFloat(desktopStyles.padding) * 0.6}px` : undefined,
      width: '100%',
      flexDirection: 'column',
    };

    return { desktop: desktopStyles, tablet, mobile };
  }, []);

  // Apply responsive conversion
  const applyResponsiveConversion = useCallback(async (elementPath) => {
    const element = getElementByPath(elements, elementPath);
    if (!element || !element.responsive?.desktop) return;

    const converted = autoConvertResponsive(element.responsive.desktop);
    
    await updateProperties(elementPath, converted.tablet, 'tablet');
    await updateProperties(elementPath, converted.mobile, 'mobile');
  }, [elements, autoConvertResponsive, updateProperties]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (history.current.past.length === 0) return;
    const previous = history.current.past.pop();
    history.current.future.push(JSON.parse(JSON.stringify(elements)));
    setData(previous);
  }, [elements, setData]);

  const redo = useCallback(() => {
    if (history.current.future.length === 0) return;
    const next = history.current.future.pop();
    history.current.past.push(JSON.parse(JSON.stringify(elements)));
    setData(next);
  }, [elements, setData]);

  // Save all dirty elements
  const saveChanges = useCallback(async () => {
    if (!elements) return;

    const dirtyElements = findDirtyElements(elements);
    
    for (const { path, element } of dirtyElements) {
      await aveAPI.updateElement(widgetId, path, element);
    }

    await invalidate();
  }, [elements, widgetId, invalidate]);

  return {
    elements: elements || [],
    loading,
    error,
    selectedElement,
    editMode,
    viewport,
    
    selectElement,
    setEditMode,
    setViewport,
    
    updateText,
    updateStyle,
    updatePosition,
    updateSize,
    updateProperties,
    
    autoConvertResponsive,
    applyResponsiveConversion,
    
    undo,
    redo,
    canUndo: history.current.past.length > 0,
    canRedo: history.current.future.length > 0,
    
    saveChanges,
    refresh: invalidate,
  };
};

// Helper: Get element by path (e.g., "header.title.text")
const getElementByPath = (elements, path) => {
  const parts = path.split('.');
  let current = elements;
  
  for (const part of parts) {
    if (!current) return null;
    current = current[part];
  }
  
  return current;
};

// Helper: Find all dirty elements
const findDirtyElements = (elements, path = '', result = []) => {
  if (!elements) return result;

  if (typeof elements === 'object') {
    if (elements._dirty) {
      result.push({ path, element: elements });
    }

    for (const [key, value] of Object.entries(elements)) {
      if (key !== '_dirty') {
        const newPath = path ? `${path}.${key}` : key;
        findDirtyElements(value, newPath, result);
      }
    }
  }

  return result;
};

export default useAVEDeepEditor;
