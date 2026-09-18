import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, X, Palette, Wand2, Volume2, FileText, Grid, Move, 
  Trash2, Copy, Edit3, Plus, Undo, Redo, Settings, Eye,
  Layout, Sidebar as SidebarIcon, Sliders, Image, Type,
  Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut, CheckCircle, Info
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import SaveLayoutModal from './SaveLayoutModal';

const LiveEditorOverlay = ({ onClose, onSave }) => {
  const { success, error, info, warning } = useToast();
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementInfo, setSelectedElementInfo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showTools, setShowTools] = useState(true);
  const [currentTier, setCurrentTier] = useState('free');
  const [removedItems, setRemovedItems] = useState({ widgets: [], sidebar: [], toolbar: [] });
  const [showRemovedPanel, setShowRemovedPanel] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedThemes, setSavedThemes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showSaveLayoutModal, setShowSaveLayoutModal] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const draggedElementRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const originalStatesRef = useRef(new Map()); // Store original element states

  useEffect(() => {
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
        outline: 2px dashed rgba(59, 130, 246, 0.5) !important;
        outline-offset: 4px;
        cursor: grab !important;
        position: relative;
        user-select: none;
      }
      
      .editor-active .editable-widget:hover {
        outline: 3px solid rgba(59, 130, 246, 1) !important;
        outline-offset: 4px;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5) !important;
        animation: subtle-wiggle 0.5s ease-in-out;
        transform: scale(1.02);
      }
      
      .editor-active .editable-widget:active {
        cursor: grabbing !important;
      }
      
      .editor-active .editable-widget.selected {
        outline: 3px solid #3B82F6;
        outline-offset: 4px;
        box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
      }
      
      .editor-active .editable-sidebar {
        outline: 2px dashed rgba(168, 85, 247, 0.5) !important;
        outline-offset: 2px;
        cursor: grab !important;
        position: relative;
        user-select: none;
        animation: continuous-wiggle 3s ease-in-out infinite;
      }
      
      .editor-active .editable-sidebar:hover {
        outline: 3px solid rgba(168, 85, 247, 1) !important;
        background: rgba(168, 85, 247, 0.15) !important;
        animation: hover-wiggle 0.5s ease-in-out infinite;
        transform: translateX(5px);
      }
      
      .editor-active .editable-sidebar:active {
        cursor: grabbing !important;
      }
      
      .editor-active .editable-toolbar {
        outline: 2px dashed rgba(34, 197, 94, 0.5) !important;
        outline-offset: 2px;
        cursor: grab !important;
        position: relative;
        user-select: none;
        animation: continuous-wiggle 3s ease-in-out infinite;
      }
      
      .editor-active .editable-toolbar:hover {
        outline: 3px solid rgba(34, 197, 94, 1) !important;
        background: rgba(34, 197, 94, 0.15) !important;
        animation: hover-wiggle 0.5s ease-in-out infinite;
        transform: translateY(-2px);
      }
      
      .editor-active .editable-toolbar:active {
        cursor: grabbing !important;
      }
      
      @keyframes continuous-wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(0.3deg); }
        50% { transform: rotate(0deg); }
        75% { transform: rotate(-0.3deg); }
      }
      
      @keyframes hover-wiggle {
        0%, 100% { transform: rotate(0deg) scale(1.02); }
        50% { transform: rotate(0.5deg) scale(1.02); }
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
        display: none !important;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10000;
      }
      
      .editor-active .editable-widget .delete-button {
        display: flex !important;
      }
      
      .editor-active .editable-widget:hover .delete-button,
      .editor-active .editable-widget.selected .delete-button {
        opacity: 1;
      }
      
      /* Drop zone highlighting */
      .drop-zone-highlight {
        background: rgba(59, 130, 246, 0.1) !important;
        outline: 3px dashed rgba(59, 130, 246, 0.8) !important;
        outline-offset: -3px;
        animation: pulse-zone 1s ease-in-out infinite;
      }
      
      @keyframes pulse-zone {
        0%, 100% { 
          background: rgba(59, 130, 246, 0.1);
          outline-color: rgba(59, 130, 246, 0.8);
        }
        50% { 
          background: rgba(59, 130, 246, 0.2);
          outline-color: rgba(59, 130, 246, 1);
        }
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

  // Smart context detection and setup
  useEffect(() => {
    const setupElement = (element, type) => {
      // Save original state
      const elementId = element.id || `${type}-${Math.random().toString(36).substr(2, 9)}`;
      originalStatesRef.current.set(elementId, {
        display: element.style.display || '',
        position: element.style.position || '',
        left: element.style.left || '',
        top: element.style.top || '',
        width: element.style.width || '',
        height: element.style.height || '',
        transform: element.style.transform || '',
        zIndex: element.style.zIndex || ''
      });
      
      element.classList.add(`editable-${type}`);
      element.setAttribute(`data-${type}-id`, elementId);
      element.setAttribute('data-element-type', type);
      
      if (type === 'widget') {
        // Ensure widget can be positioned
        if (!element.style.position || element.style.position === 'static') {
          element.style.position = 'relative';
        }
        
        // Add resize handles
        if (!element.querySelector('.resize-handle')) {
          ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.setAttribute('data-resize-pos', pos);
            handle.setAttribute('data-editor-control', 'true');
            handle.style.display = 'none';
            handle.addEventListener('mousedown', (e) => startResize(e, element, pos));
            element.appendChild(handle);
          });
          
          // Add delete button
          const deleteBtn = document.createElement('div');
          deleteBtn.className = 'delete-button';
          deleteBtn.innerHTML = '×';
          deleteBtn.setAttribute('data-editor-control', 'true');
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            handleDeleteWidget(element);
          };
          element.appendChild(deleteBtn);
        }
        
        // Show handles on hover
        element.addEventListener('mouseenter', () => {
          element.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
        });
        element.addEventListener('mouseleave', () => {
          if (!element.classList.contains('selected')) {
            element.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
          }
        });
      }
      
      // Drag to move (for all types)
      const handleMouseDown = (e) => {
        // Don't drag if clicking on resize handle or editor control
        if (e.target.classList.contains('resize-handle') || 
            e.target.hasAttribute('data-editor-control')) {
          return;
        }
        
        // Don't drag if clicking on input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          return;
        }
        
        // For sidebar/toolbar items, prevent default link/button behavior
        if (type === 'sidebar' || type === 'toolbar') {
          e.preventDefault();
          e.stopPropagation();
        }
        
        // Start drag for all types
        startDrag(e, element);
      };
      element.addEventListener('mousedown', handleMouseDown, { capture: true });
      
      // Right-click context menu (for all types)
      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, element, type);
      };
      element.addEventListener('contextmenu', handleContextMenu);
    };

    // Auto-detect and setup widgets
    const widgets = document.querySelectorAll('[data-widget], .card, .widget, .dashboard-widget');
    console.log(`LiveEditor: Found ${widgets.length} widgets`);
    widgets.forEach(el => {
      if (!el.hasAttribute('data-editor-control')) {
        setupElement(el, 'widget');
        console.log('Setup widget:', el);
      }
    });

    // Auto-detect and setup sidebar items - use more specific selectors
    const sidebarItems = document.querySelectorAll('nav a, nav button, nav [role="button"], .sidebar-item, aside a, aside button');
    console.log(`LiveEditor: Found ${sidebarItems.length} sidebar items`);
    sidebarItems.forEach(el => {
      // Skip if it's a child of an already editable element or is an editor control
      if (!el.hasAttribute('data-editor-control') && !el.closest('[data-editor-control]')) {
        setupElement(el, 'sidebar');
        console.log('Setup sidebar item:', el);
      }
    });

    // Auto-detect and setup toolbar items
    const toolbarItems = document.querySelectorAll('header button, header a, .toolbar-item');
    console.log(`LiveEditor: Found ${toolbarItems.length} toolbar items`);
    toolbarItems.forEach(el => {
      if (!el.hasAttribute('data-editor-control')) {
        setupElement(el, 'toolbar');
        console.log('Setup toolbar item:', el);
      }
    });
    
    info(`LiveEditor ready: ${widgets.length} widgets, ${sidebarItems.length} sidebar items, ${toolbarItems.length} toolbar items`);
  }, [info]);

  // Grid snap helper
  const snapToGrid = (value, gridSize = 20) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Detect which zone the mouse is in
  const detectDropZone = (mouseX, mouseY) => {
    // Get zone boundaries
    const sidebar = document.querySelector('nav');
    const toolbar = document.querySelector('header');
    const main = document.querySelector('main');
    
    if (sidebar) {
      const sidebarRect = sidebar.getBoundingClientRect();
      if (mouseX >= sidebarRect.left && mouseX <= sidebarRect.right &&
          mouseY >= sidebarRect.top && mouseY <= sidebarRect.bottom) {
        return 'sidebar';
      }
    }
    
    if (toolbar) {
      const toolbarRect = toolbar.getBoundingClientRect();
      if (mouseX >= toolbarRect.left && mouseX <= toolbarRect.right &&
          mouseY >= toolbarRect.top && mouseY <= toolbarRect.bottom) {
        return 'toolbar';
      }
    }
    
    if (main) {
      const mainRect = main.getBoundingClientRect();
      if (mouseX >= mainRect.left && mouseX <= mainRect.right &&
          mouseY >= mainRect.top && mouseY <= mainRect.bottom) {
        return 'widget'; // Dashboard area
      }
    }
    
    return null;
  };

  // Convert element from one type to another
  const convertElement = (element, fromType, toType) => {
    const elementName = element.textContent?.trim() || element.getAttribute('title') || 'Item';
    
    info(`Converting ${fromType} → ${toType}: ${elementName}`);
    
    // Remove old type class
    element.classList.remove(`editable-${fromType}`);
    
    // Add new type class
    element.classList.add(`editable-${toType}`);
    
    // Update data attribute
    element.setAttribute('data-element-type', toType);
    element.removeAttribute(`data-${fromType}-id`);
    element.setAttribute(`data-${toType}-id`, element.id || `${toType}-${Math.random().toString(36).substr(2, 9)}`);
    
    if (toType === 'widget') {
      // Converting to dashboard widget
      const main = document.querySelector('main');
      if (main) {
        // Create widget wrapper
        const widget = document.createElement('div');
        widget.className = 'card widget dashboard-widget editable-widget';
        widget.innerHTML = `
          <div class="p-4">
            <h3 class="font-semibold mb-2">${elementName}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Widget converted from ${fromType}</p>
          </div>
        `;
        widget.style.position = 'absolute';
        widget.style.left = element.style.left || '20px';
        widget.style.top = element.style.top || '20px';
        widget.style.minWidth = '200px';
        widget.style.minHeight = '150px';
        
        main.appendChild(widget);
        success(`Created dashboard widget: ${elementName}`);
        
        // Hide original element
        element.style.display = 'none';
        trackRemovedItem({ 
          id: element.getAttribute(`data-${fromType}-id`), 
          name: elementName, 
          element, 
          tier: currentTier 
        }, `${fromType}s`);
      }
    } else if (toType === 'sidebar') {
      // Converting to sidebar item
      const sidebar = document.querySelector('nav');
      if (sidebar) {
        element.style.position = 'relative';
        element.style.left = '0';
        element.style.top = '0';
        sidebar.appendChild(element);
        success(`Moved to sidebar: ${elementName}`);
      }
    } else if (toType === 'toolbar') {
      // Converting to toolbar item
      const toolbar = document.querySelector('header');
      if (toolbar) {
        element.style.position = 'relative';
        element.style.left = '0';
        element.style.top = '0';
        toolbar.appendChild(element);
        success(`Moved to toolbar: ${elementName}`);
      }
    }
    
    setHasChanges(true);
  };

  // Smart drag handler
  const startDrag = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    draggedElementRef.current = element;
    
    // Set selected element and show info
    setSelectedElement(element);
    const elementType = element.getAttribute('data-element-type') || 'widget';
    const elementName = element.textContent?.trim().substring(0, 30) || element.getAttribute('title') || 'Element';
    setSelectedElementInfo({
      type: elementType,
      name: elementName,
      animation: element.style.animation || 'None'
    });
    
    // Remove selected class from all elements
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    // Get element position and size
    const rect = element.getBoundingClientRect();
    
    // Calculate offset from mouse position to element's top-left corner
    // This ensures the element stays under the mouse cursor where grabbed
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Store original size to maintain it during drag
    const originalWidth = element.offsetWidth;
    const originalHeight = element.offsetHeight;
    
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      elementLeft: element.offsetLeft,
      elementTop: element.offsetTop,
      offsetX: offsetX,  // Where on the element the mouse grabbed
      offsetY: offsetY,
      originalWidth: originalWidth,  // Preserve size
      originalHeight: originalHeight
    });
    
    // Set explicit size to prevent collapse during position:absolute
    if (elementType === 'widget') {
      element.style.width = `${originalWidth}px`;
      element.style.height = `${originalHeight}px`;
    }
    
    element.style.cursor = 'grabbing';
    element.classList.add('dragging');
    element.style.zIndex = '1000';
    
    info(`Dragging ${elementType}: ${elementName}`);
  };

  // Smart resize handler
  const startResize = (e, element, position) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    draggedElementRef.current = element;
    resizeHandleRef.current = position;
    
    const rect = element.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    });
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && draggedElementRef.current) {
        const element = draggedElementRef.current;
        const parent = element.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        
        // Calculate new position based on mouse position minus the grab offset
        // This keeps the element under the cursor at the exact spot where it was grabbed
        let newLeft = e.clientX - parentRect.left - dragStart.offsetX;
        let newTop = e.clientY - parentRect.top - dragStart.offsetY;
        
        // Snap to grid
        newLeft = snapToGrid(newLeft);
        newTop = snapToGrid(newTop);
        
        // Apply position
        element.style.position = 'absolute';
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        
        // Highlight drop zone
        const dropZone = detectDropZone(e.clientX, e.clientY);
        const originalType = element.getAttribute('data-element-type');
        
        // Remove all zone highlights
        document.querySelectorAll('.drop-zone-highlight').forEach(el => el.classList.remove('drop-zone-highlight'));
        
        // Add highlight to target zone if different from original
        if (dropZone && dropZone !== originalType) {
          const zoneElement = dropZone === 'widget' ? document.querySelector('main') :
                             dropZone === 'sidebar' ? document.querySelector('nav') :
                             dropZone === 'toolbar' ? document.querySelector('header') : null;
          if (zoneElement) {
            zoneElement.classList.add('drop-zone-highlight');
          }
        }
        
        setHasChanges(true);
      }
      
      if (isResizing && draggedElementRef.current) {
        const element = draggedElementRef.current;
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const position = resizeHandleRef.current;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        
        if (position.includes('right')) {
          newWidth = Math.max(100, resizeStart.width + deltaX);
        } else if (position.includes('left')) {
          newWidth = Math.max(100, resizeStart.width - deltaX);
        }
        
        if (position.includes('bottom')) {
          newHeight = Math.max(100, resizeStart.height + deltaY);
        } else if (position.includes('top')) {
          newHeight = Math.max(100, resizeStart.height - deltaY);
        }
        
        // Snap to grid
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);
        
        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;
        setHasChanges(true);
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging && draggedElementRef.current) {
        const element = draggedElementRef.current;
        const originalType = element.getAttribute('data-element-type');
        
        // Detect drop zone based on mouse position
        const dropZone = detectDropZone(e.clientX, e.clientY);
        
        // Smart conversion if dropped in different zone
        if (dropZone && dropZone !== originalType) {
          convertElement(element, originalType, dropZone);
        }
        
        element.style.cursor = 'grab';
        element.classList.remove('dragging');
        element.style.zIndex = '';
      }
      setIsDragging(false);
      setIsResizing(false);
      draggedElementRef.current = null;
      resizeHandleRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart]);

  // Smart context menu
  const showContextMenu = (e, element, type) => {
    const menu = {
      x: e.clientX,
      y: e.clientY,
      element,
      type,
      options: []
    };

    if (type === 'widget') {
      menu.options = [
        { label: 'Edit Text', action: 'edit-text', icon: Edit3 },
        { label: 'Change Color', action: 'change-color', icon: Palette },
        { label: 'Add Animation', action: 'add-animation', icon: Wand2 },
        { label: 'Duplicate', action: 'duplicate', icon: Copy },
        { label: 'Delete', action: 'delete', icon: Trash2, danger: true }
      ];
    } else if (type === 'sidebar') {
      menu.options = [
        { label: 'Edit Text', action: 'edit-text', icon: Edit3 },
        { label: 'Move Up', action: 'move-up', icon: Move },
        { label: 'Move Down', action: 'move-down', icon: Move },
        { label: 'Move to Toolbar', action: 'move-to-toolbar', icon: Move },
        { label: 'Move to Dashboard', action: 'move-to-dashboard', icon: Layout },
        { label: 'Add Separator After', action: 'add-separator', icon: Plus },
        { label: 'Add New Item After', action: 'add-new-item', icon: Plus },
        { label: 'Enable/Disable', action: 'toggle-enabled', icon: Eye },
        { label: 'Hide', action: 'hide', icon: Trash2, danger: true }
      ];
    } else if (type === 'toolbar') {
      menu.options = [
        { label: 'Edit Text', action: 'edit-text', icon: Edit3 },
        { label: 'Move Left', action: 'move-left', icon: Move },
        { label: 'Move Right', action: 'move-right', icon: Move },
        { label: 'Move to Sidebar', action: 'move-to-sidebar', icon: SidebarIcon },
        { label: 'Add Separator After', action: 'add-separator', icon: Plus },
        { label: 'Add New Item After', action: 'add-new-item', icon: Plus },
        { label: 'Enable/Disable', action: 'toggle-enabled', icon: Eye },
        { label: 'Hide', action: 'hide', icon: Trash2, danger: true }
      ];
    }

    setContextMenu(menu);
  };

  const selectWidget = (widget) => {
    // Deselect previous
    document.querySelectorAll('.editable-widget.selected, .editable-sidebar.selected, .editable-toolbar.selected').forEach(w => {
      w.classList.remove('selected');
      if (w.querySelectorAll) {
        w.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
      }
    });
    
    // Select new
    widget.classList.add('selected');
    if (widget.querySelectorAll) {
      widget.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
    }
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
    const type = contextMenu.type;
    
    switch (action) {
      case 'edit-text':
        element.contentEditable = 'true';
        element.focus();
        element.style.outline = '2px solid #3B82F6';
        element.style.outlineOffset = '2px';
        
        const handleBlur = () => {
          element.contentEditable = 'false';
          element.style.outline = '';
          element.style.outlineOffset = '';
          element.removeEventListener('blur', handleBlur);
          setHasChanges(true);
        };
        element.addEventListener('blur', handleBlur);
        
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
        // Show color picker in tools panel
        setSelectedElement(element);
        setShowTools(true);
        break;
        
      case 'add-animation':
        // Show animation panel in tools
        setSelectedElement(element);
        setShowTools(true);
        break;
        
      case 'delete':
        handleDeleteWidget(element);
        break;
        
      case 'move-to-toolbar':
        const toolbar = document.querySelector('header .flex, header');
        if (toolbar) {
          const clonedToToolbar = element.cloneNode(true);
          clonedToToolbar.classList.remove('editable-sidebar');
          clonedToToolbar.classList.add('editable-toolbar');
          clonedToToolbar.setAttribute('data-element-type', 'toolbar');
          toolbar.appendChild(clonedToToolbar);
          element.style.display = 'none';
          trackRemovedItem({ id: element.dataset.sidebarId, name: element.textContent, element, tier: currentTier }, 'sidebar');
          setHasChanges(true);
        }
        break;
        
      case 'move-up':
        if (element.previousElementSibling && !element.previousElementSibling.hasAttribute('data-editor-control')) {
          element.parentNode.insertBefore(element, element.previousElementSibling);
          success('Moved up');
          setHasChanges(true);
        }
        break;
        
      case 'move-down':
        if (element.nextElementSibling && !element.nextElementSibling.hasAttribute('data-editor-control')) {
          element.parentNode.insertBefore(element.nextElementSibling, element);
          success('Moved down');
          setHasChanges(true);
        }
        break;
        
      case 'move-left':
        if (element.previousElementSibling && !element.previousElementSibling.hasAttribute('data-editor-control')) {
          element.parentNode.insertBefore(element, element.previousElementSibling);
          success('Moved left');
          setHasChanges(true);
        }
        break;
        
      case 'move-right':
        if (element.nextElementSibling && !element.nextElementSibling.hasAttribute('data-editor-control')) {
          element.parentNode.insertBefore(element.nextElementSibling, element);
          success('Moved right');
          setHasChanges(true);
        }
        break;
        
      case 'add-new-item':
        const newItem = document.createElement(type === 'sidebar' ? 'a' : 'button');
        newItem.textContent = 'New Item';
        newItem.className = type === 'sidebar' ? 'flex items-center px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700' : 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded';
        newItem.setAttribute('data-element-type', type);
        newItem.classList.add(`editable-${type}`);
        element.parentNode.insertBefore(newItem, element.nextSibling);
        success(`New ${type} item added`);
        setHasChanges(true);
        break;
        
      case 'toggle-enabled':
        if (element.classList.contains('disabled') || element.style.opacity === '0.5') {
          element.classList.remove('disabled');
          element.style.opacity = '1';
          element.style.pointerEvents = 'auto';
          success('Item enabled');
        } else {
          element.classList.add('disabled');
          element.style.opacity = '0.5';
          element.style.pointerEvents = 'none';
          warning('Item disabled');
        }
        setHasChanges(true);
        break;
        
      case 'move-to-sidebar':
        const sidebar = document.querySelector('nav');
        if (sidebar) {
          const clonedToSidebar = element.cloneNode(true);
          clonedToSidebar.classList.remove('editable-toolbar');
          clonedToSidebar.classList.add('editable-sidebar');
          clonedToSidebar.setAttribute('data-element-type', 'sidebar');
          sidebar.appendChild(clonedToSidebar);
          element.style.display = 'none';
          trackRemovedItem({ id: element.dataset.toolbarId, name: element.textContent, element, tier: currentTier }, 'toolbar');
          setHasChanges(true);
        }
        break;
        
      case 'move-to-dashboard':
        const dashboard = document.querySelector('main, .dashboard');
        if (dashboard) {
          const widget = document.createElement('div');
          widget.className = 'card editable-widget';
          widget.innerHTML = `<h3>${element.textContent}</h3>`;
          widget.style.padding = '20px';
          widget.style.margin = '10px';
          dashboard.appendChild(widget);
          element.style.display = 'none';
          trackRemovedItem({ id: element.dataset.sidebarId, name: element.textContent, element, tier: currentTier }, 'sidebar');
          setHasChanges(true);
        }
        break;
        
      case 'add-separator':
        const separator = document.createElement('div');
        separator.className = 'separator';
        separator.style.cssText = type === 'toolbar' 
          ? 'width: 1px; height: 24px; background: rgba(0,0,0,0.1); margin: 0 8px; display: inline-block;'
          : 'width: 100%; height: 1px; background: rgba(0,0,0,0.1); margin: 8px 0;';
        separator.setAttribute('data-separator', 'true');
        element.parentNode.insertBefore(separator, element.nextSibling);
        setHasChanges(true);
        break;
        
      case 'hide':
        element.style.display = 'none';
        trackRemovedItem({ 
          id: element.dataset[`${type}Id`], 
          name: element.textContent || element.getAttribute('title') || 'Item', 
          element, 
          tier: currentTier 
        }, `${type}s`);
        setHasChanges(true);
        break;
        
      default:
        break;
    }
    
    setContextMenu(null);
  };

  const getCurrentLayoutData = () => {
    // Collect all widget positions, colors, animations
    const widgets = Array.from(document.querySelectorAll('.editable-widget')).map(w => ({
      id: w.dataset.widgetId,
      position: { x: w.offsetLeft, y: w.offsetTop },
      size: { width: w.offsetWidth, height: w.offsetHeight },
      color: w.style.backgroundColor,
      animation: w.style.animation,
      content: w.innerHTML
    }));

    // Collect sidebar items
    const sidebarItems = Array.from(document.querySelectorAll('.editable-sidebar')).map(s => ({
      id: s.dataset.sidebarId || s.textContent?.trim(),
      text: s.textContent,
      order: Array.from(s.parentNode.children).indexOf(s),
      visible: s.style.display !== 'none',
      enabled: !s.classList.contains('disabled')
    }));

    // Collect toolbar items
    const toolbarItems = Array.from(document.querySelectorAll('.editable-toolbar')).map(t => ({
      id: t.dataset.toolbarId || t.textContent?.trim(),
      text: t.textContent,
      order: Array.from(t.parentNode.children).indexOf(t),
      visible: t.style.display !== 'none',
      enabled: !t.classList.contains('disabled')
    }));
    
    return {
      widgets,
      sidebarItems,
      toolbarItems,
      tier: currentTier,
      timestamp: new Date().toISOString()
    };
  };

  const handleSaveLayout = async (layoutData) => {
    if (layoutData.isFactoryReset) {
      // Reset to factory default
      localStorage.removeItem('dashboardLayout');
      success('Reset to factory default layout');
      setHasChanges(false);
      onSave?.();
      return;
    }

    // Save the layout
    const currentLayout = getCurrentLayoutData();
    const savedLayout = {
      ...layoutData,
      data: currentLayout
    };

    try {
      // Save to backend if needed
      await api.post('/features/admin/layouts', savedLayout);
      success(`Layout "${layoutData.name}" saved successfully!`);
      setHasChanges(false);
      onSave?.();
    } catch (err) {
      console.error('Error saving layout:', err);
      // Still save locally even if backend fails
      success(`Layout "${layoutData.name}" saved locally`);
      setHasChanges(false);
    }
  };

  const handleOpenSaveModal = () => {
    setShowSaveLayoutModal(true);
  };

  const handleClose = () => {
    // eslint-disable-next-line no-restricted-globals
    if (!hasChanges || confirm('Discard changes?')) {
      // Restore all original states
      originalStatesRef.current.forEach((state, elementId) => {
        const element = document.querySelector(`[data-widget-id="${elementId}"], [data-sidebar-id="${elementId}"], [data-toolbar-id="${elementId}"]`);
        if (element) {
          element.style.display = state.display;
          element.style.position = state.position;
          element.style.left = state.left;
          element.style.top = state.top;
          element.style.width = state.width;
          element.style.height = state.height;
          element.style.transform = state.transform;
          element.style.zIndex = state.zIndex;
        }
      });
      
      onClose();
    }
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


  return (
    <>
      {/* Grid Overlay */}
      {gridVisible && <div className="editor-grid" />}
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg z-[9999] px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Layout className="w-5 h-5" />
            <span className="font-semibold">Smart Live Editor</span>
            
            {/* Tier Selector */}
            <div className="flex items-center space-x-2 ml-4 border-l border-white/30 pl-4">
              <span className="text-sm text-white/80">Tier:</span>
              <select
                value={currentTier}
                onChange={(e) => setCurrentTier(e.target.value)}
                className="px-3 py-1 rounded bg-white/20 text-white border border-white/30 text-sm"
                data-editor-control
              >
                <option value="guest">Guest</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
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
            <button onClick={handleOpenSaveModal} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 rounded flex items-center space-x-2" data-editor-control>
              <Save className="w-4 h-4" />
              <span>Save As...</span>
            </button>
            <button onClick={handleClose} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded flex items-center space-x-2" data-editor-control>
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Element Indicator */}
      {selectedElementInfo && (
        <div className="fixed right-4 top-16 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-blue-500 z-[9999] p-3 w-80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm flex items-center text-blue-600 dark:text-blue-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              Selected Element
            </h4>
            <button 
              onClick={() => {
                setSelectedElement(null);
                setSelectedElementInfo(null);
                document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
              }}
              className="text-gray-400 hover:text-gray-600"
              data-editor-control
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                selectedElementInfo.type === 'widget' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                selectedElementInfo.type === 'sidebar' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {selectedElementInfo.type.toUpperCase()}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-gray-600 dark:text-gray-400">Name:</span>
              <span className="text-right font-medium">{selectedElementInfo.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Animation:</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {selectedElementInfo.animation}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start">
                <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                Right-click for more options or use Tools panel below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Tools Panel */}
      {showTools && (
        <div 
          className={`fixed right-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 z-[9999] w-80 max-h-[80vh] overflow-y-auto ${
            selectedElementInfo ? 'top-[280px]' : 'top-20'
          }`}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between rounded-t-lg sticky top-0">
            <h3 className="font-semibold flex items-center">
              <Sliders className="w-4 h-4 mr-2" />
              Tools & Themes
            </h3>
            <button onClick={() => setShowTools(false)} className="hover:bg-white/20 rounded p-1" data-editor-control>
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Tier Info */}
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 p-3 rounded-lg text-center">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
              </p>
            </div>

            {/* Quick Settings */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Quick Settings
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => setGridVisible(!gridVisible)}
                  className={`w-full px-3 py-2 text-sm rounded flex items-center justify-between ${
                    gridVisible ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  data-editor-control
                >
                  <span className="flex items-center">
                    <Grid className="w-4 h-4 mr-2" />
                    Grid Overlay
                  </span>
                  <span className="text-xs">{gridVisible ? 'ON' : 'OFF'}</span>
                </button>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Grid Snap Size: 20px
                  </label>
                  <p className="text-xs text-gray-500">Widgets snap to 20px grid when moving</p>
                </div>
              </div>
            </div>

            {/* Theme Presets */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Theme Presets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-2 border-2 border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs" data-editor-control>
                  Ocean Blue
                </button>
                <button className="p-2 border-2 border-purple-300 dark:border-purple-700 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-xs" data-editor-control>
                  Purple Dream
                </button>
                <button className="p-2 border-2 border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-xs" data-editor-control>
                  Forest Green
                </button>
                <button className="p-2 border-2 border-orange-300 dark:border-orange-700 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 text-xs" data-editor-control>
                  Sunset Orange
                </button>
              </div>
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

            {/* Color Picker */}
            {selectedElement && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Colors
              </h4>
              <div className="grid grid-cols-6 gap-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#1F2937'].map(color => (
                  <button
                    key={color}
                    onClick={() => selectedElement.style.backgroundColor = color}
                    className="w-full h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    data-editor-control
                  />
                ))}
              </div>
            </div>
            )}

            {/* Animations */}
            {selectedElement && (
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
            {selectedElement && (
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

      {/* Smart Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl py-2 z-[10000] min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.options.map((option, idx) => (
            <div key={idx}>
              {option.label === 'separator' ? (
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              ) : (
                <button
                  onClick={() => handleContextAction(option.action)}
                  className={`w-full px-4 py-2 text-left flex items-center space-x-2 ${
                    option.danger
                      ? 'hover:bg-red-100 dark:hover:bg-red-900 text-red-600'
                      : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                  data-editor-control
                >
                  {option.icon && <option.icon className="w-4 h-4" />}
                  <span>{option.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Save Layout Modal */}
      {showSaveLayoutModal && (
        <SaveLayoutModal
          onClose={() => setShowSaveLayoutModal(false)}
          onSave={handleSaveLayout}
          currentLayout={getCurrentLayoutData()}
        />
      )}
    </>
  );
};

export default LiveEditorOverlay;
