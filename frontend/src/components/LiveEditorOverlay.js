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
  const overlayRef = useRef(null);

  useEffect(() => {
    // Add wiggle animation to all editable elements
    document.body.classList.add('editor-active');
    
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
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .editable-widget:hover .delete-button,
      .editable-widget.selected .delete-button {
        opacity: 1;
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
    if (confirm('Delete this widget?')) {
      widget.style.opacity = '0';
      widget.style.transform = 'scale(0.8)';
      setTimeout(() => widget.remove(), 200);
      setSelectedElement(null);
    }
  };

  const handleContextAction = (action) => {
    if (!contextMenu?.element) return;
    
    const element = contextMenu.element;
    
    switch (action) {
      case 'edit-text':
        element.contentEditable = 'true';
        element.focus();
        break;
      case 'duplicate':
        const clone = element.cloneNode(true);
        clone.style.marginTop = '20px';
        element.parentNode.insertBefore(clone, element.nextSibling);
        break;
      case 'change-color':
        const color = prompt('Enter color (hex or name):');
        if (color) {
          element.style.backgroundColor = color;
          setCustomColors(prev => ({ ...prev, [element.dataset.widgetId]: color }));
        }
        break;
      case 'add-animation':
        element.style.animation = 'pulse 2s infinite';
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
    if (confirm('Discard changes?')) {
      onClose();
    }
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
            <span className="font-semibold">Live Editor Mode</span>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setEditMode('widgets')}
                className={`px-3 py-1 rounded ${editMode === 'widgets' ? 'bg-white text-blue-600' : 'bg-blue-700'}`}
              >
                Widgets
              </button>
              <button
                onClick={() => setEditMode('sidebar')}
                className={`px-3 py-1 rounded ${editMode === 'sidebar' ? 'bg-white text-purple-600' : 'bg-purple-700'}`}
              >
                Sidebar
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={() => setGridVisible(!gridVisible)} className="p-2 hover:bg-white/20 rounded" title="Toggle Grid">
              <Grid className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded" title="Undo">
              <Undo className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded" title="Redo">
              <Redo className="w-4 h-4" />
            </button>
            <div className="border-l border-white/30 h-6 mx-2" />
            <button onClick={handleSave} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 rounded flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button onClick={handleClose} className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded flex items-center space-x-2">
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Tools Panel */}
      {showTools && (
        <div className="fixed right-4 top-20 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-500 z-[9999] w-80 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between rounded-t-lg">
            <h3 className="font-semibold flex items-center">
              <Sliders className="w-4 h-4 mr-2" />
              Editor Tools
            </h3>
            <button onClick={() => setShowTools(false)} className="hover:bg-white/20 rounded p-1">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Widget Library */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Widgets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['Stats', 'Chart', 'List', 'Calendar', 'Notes', 'Weather'].map(widget => (
                  <button
                    key={widget}
                    className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                  >
                    {widget}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
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

            {/* Animations */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Wand2 className="w-4 h-4 mr-2" />
                Animations
              </h4>
              <div className="space-y-1">
                {['None', 'Pulse', 'Bounce', 'Spin', 'Wiggle', 'Fade'].map(anim => (
                  <button
                    key={anim}
                    onClick={() => {
                      if (selectedElement) {
                        selectedElement.style.animation = anim === 'None' ? '' : `${anim.toLowerCase()} 2s infinite`;
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    {anim}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Quick Actions
              </h4>
              <div className="space-y-2">
                <button className="w-full btn-secondary text-sm justify-start">
                  <Type className="w-4 h-4 mr-2" />
                  Edit Text
                </button>
                <button className="w-full btn-secondary text-sm justify-start">
                  <Image className="w-4 h-4 mr-2" />
                  Change Icon
                </button>
                <button className="w-full btn-secondary text-sm justify-start">
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
              </div>
            </div>
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
