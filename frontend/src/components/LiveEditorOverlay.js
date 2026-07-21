import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, X, Palette, Wand2, Volume2, FileText, Grid, Move, 
  Trash2, Copy, Edit3, Plus, Undo, Redo, Settings, Eye,
  Layout, Sidebar as SidebarIcon, Sliders, Image, Type,
  Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut
} from 'lucide-react';
import api from '../services/api';

const LiveEditorOverlay = ({ onClose, onSave }) => {
  const [selectedElement, setSelectedElement] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showTools, setShowTools] = useState(true);
  const [editMode, setEditMode] = useState('widgets'); // 'widgets' or 'sidebar'
  const [customColors, setCustomColors] = useState({});
  const [animations, setAnimations] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [gridVisible, setGridVisible] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [toolsPanelPos, setToolsPanelPos] = useState({ x: window.innerWidth - 340, y: 80 });
  const [toolsPanelSize, setToolsPanelSize] = useState({ width: 320, height: 600 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [existingWidgets, setExistingWidgets] = useState([]);
  const [currentTier, setCurrentTier] = useState('free');
  const [removedItems, setRemovedItems] = useState({ widgets: [], sidebar: [], toolbar: [] });
  const [showRemovedPanel, setShowRemovedPanel] = useState(false);
  const [toolbarItems, setToolbarItems] = useState([]);
  const [sidebarItems, setSidebarItems] = useState([]);
  const overlayRef = useRef(null);
  const toolsPanelRef = useRef(null);
  const draggedElementRef = useRef(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    // Load existing widgets from dashboard
    loadExistingWidgets();
    
    // Add wiggle animation to all editable elements
    document.body.classList.add('editor-active');
    
    // Disable all interactive elements
    disableInteractions();
    
    // Inject editor styles
    const style = document.createElement('style');
    style.id = 'live-editor-styles';
    style.innerHTML = `
      .editor-active * {
        transition: all 0.2s ease;
      }
      
      .editor-active .editable-widget {
        outline: 2px dashed rgba(59, 130, 246, 0.3);
        outline-offset: 4px;
        cursor: move;
        position: relative;
      }
      
      .editor-active .editable-widget:hover {
        outline: 2px solid rgba(59, 130, 246, 0.8);
        outline-offset: 4px;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        animation: subtle-wiggle 0.5s ease-in-out;
      }
      
      .editor-active .editable-widget.selected {
        outline: 3px solid #3B82F6;
        outline-offset: 4px;
        box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
      }
      
      .editor-active .editable-sidebar-item {
        outline: 2px dashed rgba(168, 85, 247, 0.3);
        outline-offset: 2px;
        cursor: move;
      }
      
      .editor-active .editable-sidebar-item:hover {
        outline: 2px solid rgba(168, 85, 247, 0.8);
        background: rgba(168, 85, 247, 0.1);
        animation: subtle-wiggle 0.5s ease-in-out;
      }
      
      @keyframes subtle-wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(0.5deg); }
        75% { transform: rotate(-0.5deg); }
      }
      
      .resize-handle {
        position: absolute;
        width: 12px;
        height: 12px;
        background: #3B82F6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: nwse-resize;
      }
      
      .resize-handle.top-left { top: -6px; left: -6px; }
      .resize-handle.top-right { top: -6px; right: -6px; cursor: nesw-resize; }
      .resize-handle.bottom-left { bottom: -6px; left: -6px; cursor: nesw-resize; }
      .resize-handle.bottom-right { bottom: -6px; right: -6px; }
      
      .delete-button {
        position: absolute;
        top: -12px;
        right: -12px;
        width: 24px;
        height: 24px;
        background: #EF4444;
        color: white;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10000;
      }
      
      .editor-active .editable-widget .delete-button {
        display: flex;
      }
      
      .editor-active .editable-widget:hover .delete-button,
      .editor-active .editable-widget.selected .delete-button {
        opacity: 1;
      }
      
      /* Animation triggers */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .anim-on-load {
        animation: fadeInUp 0.6s ease-out;
      }
      
      .anim-on-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }
      
      .anim-on-click:active {
        transform: scale(0.98);
        transition: transform 0.1s ease;
      }
      
      .editor-grid {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
        z-index: 9998;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.classList.remove('editor-active');
      const styleEl = document.getElementById('live-editor-styles');
      if (styleEl) styleEl.remove();
      enableInteractions();
    };
  }, []);

  // Mark all widgets as editable
  useEffect(() => {
    const widgets = document.querySelectorAll('[data-widget], .card, .widget');
    widgets.forEach((widget, index) => {
      widget.classList.add('editable-widget');
      widget.setAttribute('data-widget-id', index);
      widget.style.position = 'relative';
      
      // Add resize handles
      if (!widget.querySelector('.resize-handle')) {
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
          const handle = document.createElement('div');
          handle.className = `resize-handle ${pos}`;
          handle.style.display = 'none';
          widget.appendChild(handle);
        });
        
        // Add delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          handleDeleteWidget(widget);
        };
        widget.appendChild(deleteBtn);
      }
      
      // Show handles on hover/select
      widget.addEventListener('mouseenter', () => {
        widget.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
      });
      widget.addEventListener('mouseleave', () => {
        if (!widget.classList.contains('selected')) {
          widget.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
        }
      });
      
      // Click to select
      widget.addEventListener('click', (e) => {
        e.stopPropagation();
        selectWidget(widget);
      });
      
      // Right-click context menu
      widget.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectWidget(widget);
        setContextMenu({ x: e.clientX, y: e.clientY, element: widget });
      });
    });

    // Mark sidebar items as editable
    const sidebarItems = document.querySelectorAll('nav a, nav button, .sidebar-item');
    sidebarItems.forEach((item, index) => {
      item.classList.add('editable-sidebar-item');
      item.setAttribute('data-sidebar-id', index);
    });
  }, [editMode]);

  const selectWidget = (widget) => {
    // Deselect previous
    document.querySelectorAll('.editable-widget.selected').forEach(w => {
      w.classList.remove('selected');
      w.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
    });
    
    // Select new
    widget.classList.add('selected');
    widget.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
    setSelectedElement(widget);
  };

  const handleDeleteWidget = (widget) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Remove this widget? You can restore it later.')) {
      const widgetData = {
        id: widget.dataset.widgetId,
        name: widget.querySelector('h2, h3, h4')?.textContent || 'Widget',
        element: widget,
        tier: currentTier
      };
      
      widget.style.opacity = '0';
      widget.style.transform = 'scale(0.8)';
      setTimeout(() => {
        widget.style.display = 'none';
        trackRemovedItem(widgetData, 'widgets');
      }, 200);
      setSelectedElement(null);
      setHasChanges(true);
    }
  };

  const handleContextAction = (action) => {
    if (!contextMenu?.element) return;
    
    const element = contextMenu.element;
    
    switch (action) {
      case 'edit-text':
        element.contentEditable = 'true';
        element.focus();
        element.style.outline = '2px solid #3B82F6';
        element.style.outlineOffset = '2px';
        
        // Auto-save on blur (no apply button needed)
        const handleBlur = () => {
          element.contentEditable = 'false';
          element.style.outline = '';
          element.style.outlineOffset = '';
          element.removeEventListener('blur', handleBlur);
          setHasChanges(true);
        };
        element.addEventListener('blur', handleBlur);
        
        // Also save on Enter key
        const handleKeyDown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            element.blur();
          }
        };
        element.addEventListener('keydown', handleKeyDown);
        break;
      case 'duplicate':
        const clone = element.cloneNode(true);
        clone.style.marginTop = '20px';
        element.parentNode.insertBefore(clone, element.nextSibling);
        setHasChanges(true);
        break;
      case 'change-color':
        const color = prompt('Enter color (hex or name):');
        if (color) {
          element.style.backgroundColor = color;
          setCustomColors(prev => ({ ...prev, [element.dataset.widgetId]: color }));
          setHasChanges(true);
        }
        break;
      case 'add-animation':
        element.style.animation = 'pulse 2s infinite';
        setHasChanges(true);
        break;
      case 'remove':
        handleDeleteWidget(element);
        break;
      default:
        break;
    }
    
    setContextMenu(null);
  };

  const handleSave = async () => {
    // Collect all widget positions, colors, animations
    const widgets = Array.from(document.querySelectorAll('.editable-widget')).map(w => ({
      id: w.dataset.widgetId,
      position: { x: w.offsetLeft, y: w.offsetTop },
      size: { width: w.offsetWidth, height: w.offsetHeight },
      color: w.style.backgroundColor,
      animation: w.style.animation,
      content: w.innerHTML
    }));
    
    try {
      await api.post('/features/admin/layouts', {
        widgets,
        colors: customColors,
        animations
      });
      alert('Layout saved successfully!');
      onSave?.();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save layout');
    }
  };

  const handleClose = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Discard changes?')) {
      onClose();
    }
  };

  // Load existing widgets from the page
  const loadExistingWidgets = () => {
    const widgets = [];
    document.querySelectorAll('[data-widget], .card, .widget').forEach((el, idx) => {
      const name = el.querySelector('h2, h3, h4')?.textContent || `Widget ${idx + 1}`;
      widgets.push({
        id: `existing-${idx}`,
        name,
        element: el,
        type: el.className.includes('card') ? 'card' : 'widget',
        tier: currentTier
      });
    });
    setExistingWidgets(widgets);
    
    // Load sidebar items
    const sidebar = [];
    document.querySelectorAll('nav a, nav button, .sidebar-item').forEach((el, idx) => {
      sidebar.push({
        id: `sidebar-${idx}`,
        name: el.textContent.trim(),
        element: el,
        icon: el.querySelector('svg')?.outerHTML || '',
        tier: currentTier
      });
    });
    setSidebarItems(sidebar);
    
    // Load toolbar items
    const toolbar = [];
    document.querySelectorAll('header button, header a').forEach((el, idx) => {
      if (!el.hasAttribute('data-editor-control')) {
        toolbar.push({
          id: `toolbar-${idx}`,
          name: el.getAttribute('title') || el.textContent.trim(),
          element: el,
          tier: currentTier
        });
      }
    });
    setToolbarItems(toolbar);
  };

  // Track removed item
  const trackRemovedItem = (item, type) => {
    setRemovedItems(prev => ({
      ...prev,
      [type]: [...prev[type], { ...item, tier: currentTier }]
    }));
  };

  // Restore removed item
  const restoreItem = (item, type) => {
    if (item.element) {
      item.element.style.display = '';
      item.element.style.opacity = '1';
    }
    setRemovedItems(prev => ({
      ...prev,
      [type]: prev[type].filter(i => i.id !== item.id)
    }));
    setHasChanges(true);
  };

  // Move sidebar item to toolbar
  const moveToToolbar = (sidebarItem) => {
    const toolbar = document.querySelector('header .flex');
    if (toolbar && sidebarItem.element) {
      const clone = sidebarItem.element.cloneNode(true);
      clone.classList.add('moved-to-toolbar');
      toolbar.appendChild(clone);
      sidebarItem.element.style.display = 'none';
      trackRemovedItem(sidebarItem, 'sidebar');
      setHasChanges(true);
    }
  };

  // Add separator
  const addSeparator = (location) => {
    const separator = document.createElement('div');
    separator.className = 'separator';
    separator.style.cssText = 'width: 1px; height: 24px; background: rgba(0,0,0,0.1); margin: 0 8px;';
    separator.setAttribute('data-separator', 'true');
    
    if (location === 'toolbar') {
      const toolbar = document.querySelector('header .flex');
      if (toolbar) toolbar.appendChild(separator);
    } else if (location === 'sidebar') {
      const sidebar = document.querySelector('nav');
      if (sidebar) sidebar.appendChild(separator);
    }
    setHasChanges(true);
  };

  // Disable all interactive elements while in edit mode
  const disableInteractions = () => {
    const interactives = document.querySelectorAll('button:not([data-editor-control]), a:not([data-editor-control]), input, select, textarea');
    interactives.forEach(el => {
      el.setAttribute('data-original-pointer-events', el.style.pointerEvents || '');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.7';
    });
  };

  // Re-enable interactions when exiting
  const enableInteractions = () => {
    const interactives = document.querySelectorAll('[data-original-pointer-events]');
    interactives.forEach(el => {
      el.style.pointerEvents = el.getAttribute('data-original-pointer-events');
      el.style.opacity = '';
      el.removeAttribute('data-original-pointer-events');
    });
  };

  // Tools panel dragging
  const handlePanelMouseDown = (e) => {
    if (e.target.closest('.panel-resize-handle')) return;
    setIsDraggingPanel(true);
    setDragOffset({
      x: e.clientX - toolsPanelPos.x,
      y: e.clientY - toolsPanelPos.y
    });
  };

  const handlePanelResize = (e) => {
    setIsResizingPanel(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: toolsPanelSize.width,
      height: toolsPanelSize.height
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingPanel) {
        setToolsPanelPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizingPanel) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        setToolsPanelSize({
          width: Math.max(280, resizeStartRef.current.width + deltaX),
          height: Math.max(400, resizeStartRef.current.height + deltaY)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
      setIsResizingPanel(false);
    };

    if (isDraggingPanel || isResizingPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPanel, isResizingPanel, dragOffset]);

  return (
    <>
      {/* Grid Overlay */}
      {gridVisible && <div className="editor-grid" />}
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg z-[9999] px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Layout className="w-5 h-5" />
            <span className="font-semibold">Live Editor Mode</span>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setEditMode('widgets')}
                className={`px-3 py-1 rounded ${editMode === 'widgets' ? 'bg-white text-blue-600' : 'bg-blue-700'}`}
                data-editor-control
              >
                Widgets
              </button>
              <button
                onClick={() => setEditMode('sidebar')}
                className={`px-3 py-1 rounded ${editMode === 'sidebar' ? 'bg-white text-purple-600' : 'bg-purple-700'}`}
                data-editor-control
              >
                Sidebar
              </button>
              <button
                onClick={() => setEditMode('toolbar')}
                className={`px-3 py-1 rounded ${editMode === 'toolbar' ? 'bg-white text-green-600' : 'bg-green-700'}`}
                data-editor-control
              >
                Toolbar
              </button>
            </div>
            
            {/* Tier Selector */}
            <div className="flex items-center space-x-2 ml-4 border-l border-white/30 pl-4">
              <span className="text-sm text-white/80">Editing:</span>
              <select
                value={currentTier}
                onChange={(e) => setCurrentTier(e.target.value)}
                className="px-3 py-1 rounded bg-white/20 text-white border border-white/30 text-sm"
                data-editor-control
              >
                <option value="guest">Guest Tier</option>
                <option value="free">Free Tier</option>
                <option value="premium">Premium Tier</option>
                <option value="admin">Admin View</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={() => setGridVisible(!gridVisible)} className="p-2 hover:bg-white/20 rounded" title="Toggle Grid" data-editor-control>
              <Grid className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded" title="Undo" data-editor-control>
              <Undo className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded" title="Redo" data-editor-control>
              <Redo className="w-4 h-4" />
            </button>
            <div className="border-l border-white/30 h-6 mx-2" />
            <button onClick={handleSave} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 rounded flex items-center space-x-2" data-editor-control>
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button onClick={handleClose} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded flex items-center space-x-2" data-editor-control>
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Tools Panel */}
      {showTools && (
        <div 
          ref={toolsPanelRef}
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 z-[9999] overflow-hidden"
          style={{
            left: `${toolsPanelPos.x}px`,
            top: `${toolsPanelPos.y}px`,
            width: `${toolsPanelSize.width}px`,
            height: `${toolsPanelSize.height}px`,
            cursor: isDraggingPanel ? 'grabbing' : 'default'
          }}
        >
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between rounded-t-lg cursor-grab active:cursor-grabbing"
            onMouseDown={handlePanelMouseDown}
            data-editor-control
          >
            <h3 className="font-semibold flex items-center">
              <Sliders className="w-4 h-4 mr-2" />
              Editor Tools
            </h3>
            <button onClick={() => setShowTools(false)} className="hover:bg-white/20 rounded p-1" data-editor-control>
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Resize Handle */}
          <div 
            className="panel-resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-blue-500 rounded-tl"
            onMouseDown={handlePanelResize}
            data-editor-control
          />

          <div className="p-4 space-y-4 overflow-y-auto" style={{ height: `${toolsPanelSize.height - 60}px` }}>
            {/* Tier Info Banner */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 p-3 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Editing: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                Changes apply only to this tier
              </p>
            </div>

            {/* Removed Items Manager */}
            <div>
              <button
                onClick={() => setShowRemovedPanel(!showRemovedPanel)}
                className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                data-editor-control
              >
                <span className="flex items-center text-sm font-semibold text-red-900 dark:text-red-100">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Removed Items ({removedItems.widgets.length + removedItems.sidebar.length + removedItems.toolbar.length})
                </span>
                <span className="text-xs text-red-600 dark:text-red-300">
                  {showRemovedPanel ? 'Hide' : 'Show'}
                </span>
              </button>
              
              {showRemovedPanel && (
                <div className="mt-2 space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                  {removedItems.widgets.filter(w => w.tier === currentTier).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Widgets:</p>
                      {removedItems.widgets.filter(w => w.tier === currentTier).map(widget => (
                        <button
                          key={widget.id}
                          onClick={() => restoreItem(widget, 'widgets')}
                          className="w-full px-2 py-1 text-xs text-left bg-white dark:bg-gray-800 border rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-between"
                          data-editor-control
                        >
                          <span>{widget.name}</span>
                          <RotateCw className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                  {removedItems.sidebar.filter(s => s.tier === currentTier).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Sidebar:</p>
                      {removedItems.sidebar.filter(s => s.tier === currentTier).map(item => (
                        <button
                          key={item.id}
                          onClick={() => restoreItem(item, 'sidebar')}
                          className="w-full px-2 py-1 text-xs text-left bg-white dark:bg-gray-800 border rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-between"
                          data-editor-control
                        >
                          <span>{item.name}</span>
                          <RotateCw className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                  {(removedItems.widgets.filter(w => w.tier === currentTier).length === 0 && 
                    removedItems.sidebar.filter(s => s.tier === currentTier).length === 0) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                      No removed items for this tier
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Toolbar Customization */}
            {editMode === 'toolbar' && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Toolbar Items
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => addSeparator('toolbar')}
                    className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    data-editor-control
                  >
                    + Add Separator
                  </button>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {toolbarItems.filter(t => t.tier === currentTier).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border rounded text-xs">
                        <span>{item.name}</span>
                        <button
                          onClick={() => {
                            item.element.style.display = 'none';
                            trackRemovedItem(item, 'toolbar');
                          }}
                          className="text-red-500 hover:text-red-700"
                          data-editor-control
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar Customization */}
            {editMode === 'sidebar' && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <SidebarIcon className="w-4 h-4 mr-2" />
                  Sidebar Items
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => addSeparator('sidebar')}
                    className="w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    data-editor-control
                  >
                    + Add Separator
                  </button>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sidebarItems.filter(s => s.tier === currentTier).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border rounded text-xs">
                        <span>{item.name}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveToToolbar(item)}
                            className="text-blue-500 hover:text-blue-700"
                            data-editor-control
                            title="Move to Toolbar"
                          >
                            <Move className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              item.element.style.display = 'none';
                              trackRemovedItem(item, 'sidebar');
                            }}
                            className="text-red-500 hover:text-red-700"
                            data-editor-control
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Existing Widgets */}
            {editMode === 'widgets' && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Restore Widgets
                </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {existingWidgets.map(widget => (
                  <button
                    key={widget.id}
                    onClick={() => {
                      if (widget.element.style.display === 'none') {
                        widget.element.style.display = '';
                        widget.element.style.opacity = '1';
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-between"
                    data-editor-control
                  >
                    <span>{widget.name}</span>
                    <Plus className="w-3 h-3" />
                  </button>
                ))}
              </div>
              </div>
            )}

            {/* Widget Library */}
            {editMode === 'widgets' && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add New Widgets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['Stats', 'Chart', 'List', 'Calendar', 'Notes', 'Weather'].map(widget => (
                  <button
                    key={widget}
                    className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                    data-editor-control
                  >
                    {widget}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Color Picker */}
            {editMode === 'widgets' && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Colors
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#1F2937'].map(color => (
                  <button
                    key={color}
                    onClick={() => selectedElement && (selectedElement.style.backgroundColor = color)}
                    className="w-full h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            )}

            {/* Animations */}
            {editMode === 'widgets' && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Wand2 className="w-4 h-4 mr-2" />
                Animations
              </h4>
              
              {/* Animation Trigger */}
              <div className="mb-3">
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  Trigger:
                </label>
                <select 
                  className="w-full text-xs border rounded px-2 py-1 dark:bg-gray-700"
                  data-editor-control
                  onChange={(e) => {
                    if (!selectedElement) return;
                    selectedElement.classList.remove('anim-on-load', 'anim-on-hover', 'anim-on-click');
                    if (e.target.value) {
                      selectedElement.classList.add(e.target.value);
                    }
                  }}
                >
                  <option value="">Continuous</option>
                  <option value="anim-on-load">On Page Load</option>
                  <option value="anim-on-hover">On Hover</option>
                  <option value="anim-on-click">On Click</option>
                </select>
              </div>

              <div className="space-y-1">
                {[
                  { name: 'None', value: '', desc: 'Remove animation' },
                  { name: 'Pulse', value: 'pulse 2s ease-in-out infinite', desc: 'Gentle pulsing' },
                  { name: 'Bounce', value: 'bounce 1s ease-in-out infinite', desc: 'Bouncing motion' },
                  { name: 'Spin', value: 'spin 3s linear infinite', desc: 'Rotating 360°' },
                  { name: 'Wiggle', value: 'wiggle 0.5s ease-in-out infinite', desc: 'Shake effect' },
                  { name: 'Fade In Up', value: 'fadeInUp 0.6s ease-out', desc: 'Fade in from below' },
                  { name: 'Scale In', value: 'scaleIn 0.5s ease-out', desc: 'Grow from center' },
                  { name: 'Slide In Left', value: 'slideInLeft 0.6s ease-out', desc: 'Slide from left' },
                  { name: 'Slide In Right', value: 'slideInRight 0.6s ease-out', desc: 'Slide from right' }
                ].map(anim => (
                  <button
                    key={anim.name}
                    onClick={() => {
                      if (selectedElement) {
                        selectedElement.style.animation = anim.value;
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    data-editor-control
                    title={anim.desc}
                  >
                    <div className="flex justify-between items-center">
                      <span>{anim.name}</span>
                      <span className="text-xs text-gray-400">{anim.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Settings */}
            {editMode === 'widgets' && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Widget Settings
              </h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span>Opacity</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    defaultValue="100"
                    onChange={(e) => selectedElement && (selectedElement.style.opacity = e.target.value / 100)}
                    className="w-32"
                    data-editor-control
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Border Radius</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    defaultValue="8"
                    onChange={(e) => selectedElement && (selectedElement.style.borderRadius = `${e.target.value}px`)}
                    className="w-32"
                    data-editor-control
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Shadow</span>
                  <select 
                    onChange={(e) => selectedElement && (selectedElement.style.boxShadow = e.target.value)}
                    className="text-xs border rounded px-2 py-1 dark:bg-gray-700"
                    data-editor-control
                  >
                    <option value="">None</option>
                    <option value="0 1px 3px rgba(0,0,0,0.1)">Small</option>
                    <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
                    <option value="0 10px 15px rgba(0,0,0,0.1)">Large</option>
                    <option value="0 20px 25px rgba(0,0,0,0.15)">XL</option>
                  </select>
                </label>
              </div>
            </div>
            )}

            {/* Quick Actions */}
            {editMode === 'widgets' && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full btn-secondary text-sm justify-start" data-editor-control>
                  <Type className="w-4 h-4 mr-2" />
                  Edit Text
                </button>
                <button className="w-full btn-secondary text-sm justify-start" data-editor-control>
                  <Image className="w-4 h-4 mr-2" />
                  Change Icon
                </button>
                <button className="w-full btn-secondary text-sm justify-start" data-editor-control>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Show Tools Button (when hidden) */}
      {!showTools && (
        <button
          onClick={() => setShowTools(true)}
          className="fixed right-4 top-20 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-[9999]"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl py-2 z-[10000]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleContextAction('edit-text')} className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2">
            <Edit3 className="w-4 h-4" />
            <span>Edit Text</span>
          </button>
          <button onClick={() => handleContextAction('change-color')} className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Change Color</span>
          </button>
          <button onClick={() => handleContextAction('add-animation')} className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2">
            <Wand2 className="w-4 h-4" />
            <span>Add Animation</span>
          </button>
          <button onClick={() => handleContextAction('duplicate')} className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center space-x-2">
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button onClick={() => handleContextAction('remove')} className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900 text-red-600 flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export default LiveEditorOverlay;
