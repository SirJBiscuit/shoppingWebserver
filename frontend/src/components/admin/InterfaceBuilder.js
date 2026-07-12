import React, { useState } from 'react';
import { Plus, Trash2, Eye, Code, Save, Layout, MessageSquare, Bell } from 'lucide-react';

const InterfaceBuilder = () => {
  const [interfaces, setInterfaces] = useState([]);
  const [selectedInterface, setSelectedInterface] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const interfaceTypes = [
    { id: 'modal', name: 'Modal/Popup', icon: '🪟' },
    { id: 'toast', name: 'Toast Notification', icon: '🔔' },
    { id: 'sidebar', name: 'Sidebar Panel', icon: '📋' },
    { id: 'dropdown', name: 'Dropdown Menu', icon: '📑' },
    { id: 'card', name: 'Info Card', icon: '🎴' },
    { id: 'banner', name: 'Banner', icon: '📢' },
  ];

  const createInterface = (type) => {
    const newInterface = {
      id: Date.now(),
      type,
      name: `New ${type}`,
      title: '',
      content: '',
      style: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderRadius: '8px',
        padding: '16px',
        position: type === 'toast' ? 'top-right' : 'center',
      },
      trigger: 'manual',
      animation: 'fade',
    };
    setInterfaces([...interfaces, newInterface]);
    setSelectedInterface(newInterface);
  };

  const updateInterface = (updates) => {
    setSelectedInterface({...selectedInterface, ...updates});
    setInterfaces(interfaces.map(i => 
      i.id === selectedInterface.id ? {...selectedInterface, ...updates} : i
    ));
  };

  const deleteInterface = (id) => {
    setInterfaces(interfaces.filter(i => i.id !== id));
    if (selectedInterface?.id === id) setSelectedInterface(null);
  };

  const exportInterfaces = () => {
    const blob = new Blob([JSON.stringify(interfaces, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-interfaces-${Date.now()}.json`;
    a.click();
  };

  const generateCode = () => {
    if (!selectedInterface) return '';
    
    return `
// Custom ${selectedInterface.type} Component
import React from 'react';

const Custom${selectedInterface.name.replace(/\s/g, '')} = ({ isOpen, onClose }) => {
  return (
    <div 
      className="${selectedInterface.type}-container"
      style={{
        backgroundColor: '${selectedInterface.style.backgroundColor}',
        color: '${selectedInterface.style.textColor}',
        borderRadius: '${selectedInterface.style.borderRadius}',
        padding: '${selectedInterface.style.padding}',
      }}
    >
      <h3>${selectedInterface.title}</h3>
      <p>${selectedInterface.content}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default Custom${selectedInterface.name.replace(/\s/g, '')};
    `.trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layout className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Interface Builder</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create custom modals, toasts, and UI components
            </p>
          </div>
        </div>
        <button onClick={exportInterfaces} className="btn-secondary">
          Export All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interface Types */}
        <div className="space-y-4">
          <h3 className="font-bold">Create New Interface</h3>
          <div className="grid grid-cols-2 gap-2">
            {interfaceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => createInterface(type.id)}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 transition text-center"
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <div className="text-sm font-medium">{type.name}</div>
              </button>
            ))}
          </div>

          {/* Interface List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-bold mb-3">Your Interfaces</h3>
            <div className="space-y-2">
              {interfaces.map((iface) => (
                <div
                  key={iface.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedInterface?.id === iface.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedInterface(iface)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{iface.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInterface(iface.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{iface.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        {selectedInterface && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <h3 className="font-bold text-lg">Edit Interface</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={selectedInterface.name}
                  onChange={(e) => updateInterface({ name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={selectedInterface.title}
                  onChange={(e) => updateInterface({ title: e.target.value })}
                  className="input-field"
                  placeholder="Interface title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={selectedInterface.content}
                  onChange={(e) => updateInterface({ content: e.target.value })}
                  className="input-field h-24"
                  placeholder="Interface content..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Background Color</label>
                  <input
                    type="color"
                    value={selectedInterface.style.backgroundColor}
                    onChange={(e) => updateInterface({
                      style: {...selectedInterface.style, backgroundColor: e.target.value}
                    })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Text Color</label>
                  <input
                    type="color"
                    value={selectedInterface.style.textColor}
                    onChange={(e) => updateInterface({
                      style: {...selectedInterface.style, textColor: e.target.value}
                    })}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Animation</label>
                <select
                  value={selectedInterface.animation}
                  onChange={(e) => updateInterface({ animation: e.target.value })}
                  className="input-field"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                  <option value="bounce">Bounce</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Trigger</label>
                <select
                  value={selectedInterface.trigger}
                  onChange={(e) => updateInterface({ trigger: e.target.value })}
                  className="input-field"
                >
                  <option value="manual">Manual</option>
                  <option value="onload">On Page Load</option>
                  <option value="onclick">On Click</option>
                  <option value="scroll">On Scroll</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                </button>
                <button className="btn-primary flex-1">
                  <Save className="w-4 h-4 mr-2 inline" />
                  Save Interface
                </button>
              </div>
            </div>

            {/* Generated Code */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-bold mb-3 flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Generated Code</span>
              </h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {generateCode()}
              </pre>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="font-bold mb-4">Live Preview</h3>
                <div
                  style={{
                    backgroundColor: selectedInterface.style.backgroundColor,
                    color: selectedInterface.style.textColor,
                    borderRadius: selectedInterface.style.borderRadius,
                    padding: selectedInterface.style.padding,
                  }}
                  className="shadow-xl max-w-md mx-auto"
                >
                  <h4 className="text-xl font-bold mb-2">{selectedInterface.title}</h4>
                  <p className="mb-4">{selectedInterface.content}</p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
                    Action Button
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterfaceBuilder;
