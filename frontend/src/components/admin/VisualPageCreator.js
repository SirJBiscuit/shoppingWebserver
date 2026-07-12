import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Code, Eye, Save, Download, Upload, Plus, Trash2,
  Move, Copy, Settings, Layers, Grid, Zap, Image, Type,
  Square, Circle, MousePointer, Maximize2, RotateCw, Palette,
  ChevronRight, ChevronLeft, Play, Pause, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VisualPageCreator = () => {
  const [mode, setMode] = useState('layout'); // 'layout' or 'nodecraft'
  const [pages, setPages] = useState([
    { id: 1, name: 'Home', elements: [], nodes: [] }
  ]);
  const [currentPage, setCurrentPage] = useState(pages[0]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState('top');
  const [sidebarPosition, setSidebarPosition] = useState('left');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState(null);
  const [animationLibrary, setAnimationLibrary] = useState([]);
  const [widgetLibrary, setWidgetLibrary] = useState([]);
  const [customFunctions, setCustomFunctions] = useState([]);
  const canvasRef = useRef(null);

  // Animation presets
  const animations = [
    { id: 'fade', name: 'Fade In', duration: 0.3, type: 'opacity' },
    { id: 'slide-up', name: 'Slide Up', duration: 0.4, type: 'transform' },
    { id: 'slide-down', name: 'Slide Down', duration: 0.4, type: 'transform' },
    { id: 'slide-left', name: 'Slide Left', duration: 0.4, type: 'transform' },
    { id: 'slide-right', name: 'Slide Right', duration: 0.4, type: 'transform' },
    { id: 'zoom', name: 'Zoom In', duration: 0.3, type: 'scale' },
    { id: 'bounce', name: 'Bounce', duration: 0.6, type: 'spring' },
    { id: 'rotate', name: 'Rotate', duration: 0.5, type: 'rotate' },
    { id: 'flip', name: 'Flip', duration: 0.6, type: '3d' },
  ];

  // Widget templates
  const widgetTemplates = [
    { id: 'button', name: 'Button', icon: Square, defaultProps: { text: 'Click me', style: 'primary' } },
    { id: 'text', name: 'Text', icon: Type, defaultProps: { content: 'Text here', size: 'medium' } },
    { id: 'image', name: 'Image', icon: Image, defaultProps: { src: '', alt: 'Image' } },
    { id: 'container', name: 'Container', icon: Square, defaultProps: { layout: 'flex', direction: 'row' } },
    { id: 'card', name: 'Card', icon: Layers, defaultProps: { title: 'Card Title', content: 'Card content' } },
    { id: 'input', name: 'Input', icon: Type, defaultProps: { type: 'text', placeholder: 'Enter text' } },
    { id: 'grid', name: 'Grid', icon: Grid, defaultProps: { columns: 3, gap: 4 } },
  ];

  // Custom context menu
  const handleContextMenu = (e, element) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      element
    });
    setSelectedElement(element);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Add element to canvas
  const addElement = (template) => {
    const newElement = {
      id: Date.now(),
      type: template.id,
      ...template.defaultProps,
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      animation: null,
      style: {},
      events: []
    };

    setCurrentPage({
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    });
  };

  // Update element
  const updateElement = (id, updates) => {
    setCurrentPage({
      ...currentPage,
      elements: currentPage.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      )
    });
  };

  // Delete element
  const deleteElement = (id) => {
    setCurrentPage({
      ...currentPage,
      elements: currentPage.elements.filter(el => el.id !== id)
    });
    setSelectedElement(null);
    closeContextMenu();
  };

  // Duplicate element
  const duplicateElement = (element) => {
    const duplicate = {
      ...element,
      id: Date.now(),
      position: { x: element.position.x + 20, y: element.position.y + 20 }
    };
    setCurrentPage({
      ...currentPage,
      elements: [...currentPage.elements, duplicate]
    });
    closeContextMenu();
  };

  // Apply animation
  const applyAnimation = (element, animation) => {
    updateElement(element.id, { animation });
    closeContextMenu();
  };

  // Create new page
  const createPage = () => {
    const name = prompt('Enter page name:');
    if (!name) return;
    
    const newPage = {
      id: Date.now(),
      name,
      elements: [],
      nodes: []
    };
    setPages([...pages, newPage]);
  };

  // Switch page
  const switchPage = (page) => {
    // Save current page
    setPages(pages.map(p => p.id === currentPage.id ? currentPage : p));
    setCurrentPage(page);
    setSelectedElement(null);
  };

  // Generate code from layout
  const generateCode = () => {
    let code = `import React from 'react';\nimport { motion } from 'framer-motion';\n\n`;
    code += `const ${currentPage.name.replace(/\s/g, '')}Page = () => {\n`;
    code += `  return (\n    <div className="page-container">\n`;
    
    currentPage.elements.forEach(el => {
      const Component = el.animation ? 'motion.div' : 'div';
      code += `      <${Component}\n`;
      code += `        className="${el.type}"\n`;
      code += `        style={{\n`;
      code += `          position: 'absolute',\n`;
      code += `          left: '${el.position.x}px',\n`;
      code += `          top: '${el.position.y}px',\n`;
      code += `          width: '${el.size.width}px',\n`;
      code += `          height: '${el.size.height}px'\n`;
      code += `        }}\n`;
      
      if (el.animation) {
        code += `        initial={{ opacity: 0 }}\n`;
        code += `        animate={{ opacity: 1 }}\n`;
        code += `        transition={{ duration: ${el.animation.duration} }}\n`;
      }
      
      code += `      >\n`;
      
      if (el.type === 'text') {
        code += `        ${el.content}\n`;
      } else if (el.type === 'button') {
        code += `        <button>${el.text}</button>\n`;
      }
      
      code += `      </${Component}>\n`;
    });
    
    code += `    </div>\n  );\n};\n\n`;
    code += `export default ${currentPage.name.replace(/\s/g, '')}Page;\n`;
    
    return code;
  };

  // Export page
  const exportPage = () => {
    const code = generateCode();
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPage.name}.jsx`;
    a.click();
  };

  // Save page
  const savePage = async () => {
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentPage)
      });

      if (response.ok) {
        alert('Page saved successfully!');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Visual Page Creator</h2>
          
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('layout')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'layout'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Layout className="w-4 h-4 inline mr-1" />
              Layout Mode
            </button>
            <button
              onClick={() => setMode('nodecraft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'nodecraft'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <GitBranch className="w-4 h-4 inline mr-1" />
              NodeCraft Mode
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button onClick={savePage} className="btn-secondary text-sm flex items-center">
            <Save className="w-4 h-4 mr-1" />
            Save
          </button>
          <button onClick={exportPage} className="btn-secondary text-sm flex items-center">
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>
          <button onClick={() => setShowToolbar(!showToolbar)} className="btn-secondary text-sm">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Widgets & Tools */}
        {showSidebar && sidebarPosition === 'left' && (
          <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Pages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">Pages</h3>
                  <button onClick={createPage} className="text-purple-600 hover:text-purple-800">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {pages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => switchPage(page)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        currentPage.id === page.id
                          ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Widgets */}
              <div>
                <h3 className="font-bold text-sm mb-2">Widgets</h3>
                <div className="grid grid-cols-2 gap-2">
                  {widgetTemplates.map(widget => {
                    const Icon = widget.icon;
                    return (
                      <button
                        key={widget.id}
                        onClick={() => addElement(widget)}
                        className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                      >
                        <Icon className="w-6 h-6 mb-1 text-purple-600" />
                        <span className="text-xs">{widget.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Animations */}
              <div>
                <h3 className="font-bold text-sm mb-2">Animations</h3>
                <div className="space-y-1">
                  {animations.slice(0, 5).map(anim => (
                    <div
                      key={anim.id}
                      className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs"
                    >
                      {anim.name}
                      <span className="text-gray-500 ml-2">{anim.duration}s</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-auto bg-gray-50 dark:bg-gray-900">
          {mode === 'layout' ? (
            /* LAYOUT MODE */
            <div
              ref={canvasRef}
              className="relative w-full min-h-full"
              onClick={closeContextMenu}
            >
              {/* Grid Background */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
              
              {/* Elements */}
              {currentPage.elements.map(element => (
                <motion.div
                  key={element.id}
                  drag
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    updateElement(element.id, {
                      position: {
                        x: element.position.x + info.offset.x,
                        y: element.position.y + info.offset.y
                      }
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(element);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, element)}
                  className={`absolute cursor-move ${
                    selectedElement?.id === element.id
                      ? 'ring-2 ring-purple-600'
                      : 'hover:ring-2 hover:ring-purple-400'
                  }`}
                  style={{
                    left: element.position.x,
                    top: element.position.y,
                    width: element.size.width,
                    height: element.size.height,
                  }}
                  initial={element.animation ? { opacity: 0 } : {}}
                  animate={element.animation ? { opacity: 1 } : {}}
                  transition={element.animation ? { duration: element.animation.duration } : {}}
                >
                  {/* Render element based on type */}
                  {element.type === 'button' && (
                    <button className="w-full h-full bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                      {element.text}
                    </button>
                  )}
                  {element.type === 'text' && (
                    <div className="w-full h-full flex items-center justify-center text-gray-900 dark:text-white">
                      {element.content}
                    </div>
                  )}
                  {element.type === 'container' && (
                    <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400">
                      Container
                    </div>
                  )}
                  {element.type === 'card' && (
                    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                      <h3 className="font-bold mb-2">{element.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{element.content}</p>
                    </div>
                  )}
                  {element.type === 'image' && (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {element.type === 'input' && (
                    <input
                      type={element.type}
                      placeholder={element.placeholder}
                      className="w-full h-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  )}
                  {element.type === 'grid' && (
                    <div className={`w-full h-full grid grid-cols-${element.columns} gap-${element.gap} border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2`}>
                      {[...Array(element.columns * 2)].map((_, i) => (
                        <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded" />
                      ))}
                    </div>
                  )}

                  {/* Resize Handle */}
                  {selectedElement?.id === element.id && (
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 rounded-tl cursor-nwse-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Handle resize
                      }}
                    />
                  )}
                </motion.div>
              ))}

              {/* Empty State */}
              {currentPage.elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Layers className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Start building your page</p>
                    <p className="text-sm">Drag widgets from the sidebar</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NODECRAFT MODE */
            <div className="p-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <GitBranch className="w-6 h-6 mr-2 text-purple-600" />
                  NodeCraft Mode - Visual Programming
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connect nodes to build logic visually. Changes automatically update your page code.
                </p>
                
                {/* Node Canvas */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 min-h-96 border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <div className="text-center text-gray-400">
                    <Code className="w-12 h-12 mx-auto mb-2" />
                    <p>NodeCraft visual programming interface</p>
                    <p className="text-sm mt-2">Drag nodes to create logic flows</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Properties */}
        {selectedElement && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h3 className="font-bold">Properties</h3>
              
              {/* Position */}
              <div>
                <label className="block text-sm font-medium mb-2">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">X</label>
                    <input
                      type="number"
                      value={selectedElement.position.x}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, x: parseInt(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Y</label>
                    <input
                      type="number"
                      value={selectedElement.position.y}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, y: parseInt(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium mb-2">Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Width</label>
                    <input
                      type="number"
                      value={selectedElement.size.width}
                      onChange={(e) => updateElement(selectedElement.id, {
                        size: { ...selectedElement.size, width: parseInt(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Height</label>
                    <input
                      type="number"
                      value={selectedElement.size.height}
                      onChange={(e) => updateElement(selectedElement.id, {
                        size: { ...selectedElement.size, height: parseInt(e.target.value) }
                      })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Animation */}
              <div>
                <label className="block text-sm font-medium mb-2">Animation</label>
                <select
                  value={selectedElement.animation?.id || ''}
                  onChange={(e) => {
                    const anim = animations.find(a => a.id === e.target.value);
                    updateElement(selectedElement.id, { animation: anim });
                  }}
                  className="input-field text-sm"
                >
                  <option value="">None</option>
                  {animations.map(anim => (
                    <option key={anim.id} value={anim.id}>{anim.name}</option>
                  ))}
                </select>
              </div>

              {/* Type-specific properties */}
              {selectedElement.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="input-field text-sm h-24"
                  />
                </div>
              )}

              {selectedElement.type === 'button' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Button Text</label>
                  <input
                    type="text"
                    value={selectedElement.text}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <button
                  onClick={() => duplicateElement(selectedElement)}
                  className="btn-secondary w-full text-sm flex items-center justify-center"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
                <button
                  onClick={() => deleteElement(selectedElement.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg w-full text-sm hover:bg-red-700 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => duplicateElement(contextMenu.element)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </button>
          <button
            onClick={() => deleteElement(contextMenu.element.id)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          <div className="px-4 py-1 text-xs font-medium text-gray-500">Animations</div>
          {animations.slice(0, 5).map(anim => (
            <button
              key={anim.id}
              onClick={() => applyAnimation(contextMenu.element, anim)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {anim.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisualPageCreator;
