import React, { useState, useEffect } from 'react';
import { Save, X, Layout, Star, Trash2, Check } from 'lucide-react';

const SaveLayoutModal = ({ onClose, onSave, currentLayout }) => {
  const [layoutName, setLayoutName] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadSavedLayouts();
  }, []);

  const loadSavedLayouts = () => {
    const layouts = JSON.parse(localStorage.getItem('customLayouts') || '[]');
    setSavedLayouts(layouts);
  };

  const handleSaveNew = () => {
    if (!layoutName.trim()) {
      alert('Please enter a layout name');
      return;
    }

    const newLayout = {
      id: Date.now(),
      name: layoutName,
      description: layoutDescription,
      createdAt: new Date().toISOString(),
      isDefault: isDefault,
      data: currentLayout
    };

    const layouts = [...savedLayouts, newLayout];
    
    // If this is set as default, remove default from others
    if (isDefault) {
      layouts.forEach(l => {
        if (l.id !== newLayout.id) l.isDefault = false;
      });
    }

    localStorage.setItem('customLayouts', JSON.stringify(layouts));
    onSave(newLayout);
    onClose();
  };

  const handleLoadLayout = (layout) => {
    if (window.confirm(`Load "${layout.name}" layout? Current changes will be lost.`)) {
      onSave(layout);
      onClose();
    }
  };

  const handleDeleteLayout = (layoutId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this layout?')) {
      const layouts = savedLayouts.filter(l => l.id !== layoutId);
      localStorage.setItem('customLayouts', JSON.stringify(layouts));
      setSavedLayouts(layouts);
    }
  };

  const handleSetDefault = (layoutId, e) => {
    e.stopPropagation();
    const layouts = savedLayouts.map(l => ({
      ...l,
      isDefault: l.id === layoutId
    }));
    localStorage.setItem('customLayouts', JSON.stringify(layouts));
    setSavedLayouts(layouts);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset to factory default layout? All customizations will be lost.')) {
      localStorage.removeItem('dashboardLayout');
      onSave({ isFactoryReset: true });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Layout className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Save Layout</h2>
              <p className="text-sm text-white/80">Save or load custom dashboard layouts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Save New Layout */}
          <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <h3 className="font-semibold text-lg mb-4 flex items-center text-blue-900 dark:text-blue-100">
              <Save className="w-5 h-5 mr-2" />
              Save Current Layout
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Layout Name *
                </label>
                <input
                  type="text"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="e.g., My Custom Dashboard"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Description (optional)
                </label>
                <textarea
                  value={layoutDescription}
                  onChange={(e) => setLayoutDescription(e.target.value)}
                  placeholder="Describe this layout..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="setDefault" className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  Set as default layout
                </label>
              </div>
              <button
                onClick={handleSaveNew}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Layout</span>
              </button>
            </div>
          </div>

          {/* Saved Layouts */}
          <div>
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
              Saved Layouts ({savedLayouts.length})
            </h3>
            {savedLayouts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No saved layouts yet</p>
                <p className="text-sm">Create your first custom layout above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer bg-white dark:bg-gray-700"
                    onClick={() => handleLoadLayout(layout)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {layout.name}
                          </h4>
                          {layout.isDefault && (
                            <span className="flex items-center text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                        {layout.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {layout.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Created: {new Date(layout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-4">
                        <button
                          onClick={(e) => handleSetDefault(layout.id, e)}
                          className={`p-2 rounded-lg transition-colors ${
                            layout.isDefault
                              ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900'
                              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                          }`}
                          title="Set as default"
                        >
                          <Star className={`w-4 h-4 ${layout.isDefault ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLayout(layout.id, e)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete layout"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset to Factory Default */}
          <div className="border-2 border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
            <h3 className="font-semibold text-lg mb-2 flex items-center text-red-900 dark:text-red-100">
              <Trash2 className="w-5 h-5 mr-2" />
              Reset to Factory Default
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Restore the original dashboard layout. All customizations will be removed.
            </p>
            <button
              onClick={handleResetToDefault}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveLayoutModal;
