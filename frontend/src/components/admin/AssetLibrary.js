import React, { useState, useEffect } from 'react';
import { 
  Package, Upload, Download, Trash2, Copy, Eye, 
  Image, Zap, Box, Search, Filter, Star, Plus
} from 'lucide-react';

const AssetLibrary = ({ onSelectAsset, type = 'all' }) => {
  const [assets, setAssets] = useState({
    animations: [],
    images: [],
    widgets: [],
    functions: []
  });
  const [activeTab, setActiveTab] = useState('animations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets/library', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  // Premade animations
  const premadeAnimations = [
    { id: 'fade', name: 'Fade In', duration: 0.3, type: 'opacity', code: '{ opacity: [0, 1] }' },
    { id: 'slide-up', name: 'Slide Up', duration: 0.4, type: 'transform', code: '{ y: [50, 0], opacity: [0, 1] }' },
    { id: 'slide-down', name: 'Slide Down', duration: 0.4, type: 'transform', code: '{ y: [-50, 0], opacity: [0, 1] }' },
    { id: 'slide-left', name: 'Slide Left', duration: 0.4, type: 'transform', code: '{ x: [50, 0], opacity: [0, 1] }' },
    { id: 'slide-right', name: 'Slide Right', duration: 0.4, type: 'transform', code: '{ x: [-50, 0], opacity: [0, 1] }' },
    { id: 'zoom', name: 'Zoom In', duration: 0.3, type: 'scale', code: '{ scale: [0.8, 1], opacity: [0, 1] }' },
    { id: 'bounce', name: 'Bounce', duration: 0.6, type: 'spring', code: '{ y: [0, -20, 0], transition: { type: "spring" } }' },
    { id: 'rotate', name: 'Rotate', duration: 0.5, type: 'rotate', code: '{ rotate: [0, 360] }' },
    { id: 'flip', name: 'Flip', duration: 0.6, type: '3d', code: '{ rotateY: [0, 180] }' },
    { id: 'shake', name: 'Shake', duration: 0.5, type: 'transform', code: '{ x: [0, -10, 10, -10, 10, 0] }' },
    { id: 'pulse', name: 'Pulse', duration: 0.4, type: 'scale', code: '{ scale: [1, 1.05, 1] }' },
    { id: 'swing', name: 'Swing', duration: 0.6, type: 'rotate', code: '{ rotate: [0, 15, -15, 10, -10, 0] }' },
  ];

  // Premade widgets
  const premadeWidgets = [
    { 
      id: 'hero-section', 
      name: 'Hero Section', 
      category: 'sections',
      preview: 'Large header with CTA button',
      code: `<div className="hero"><h1>Hero Title</h1><button>Get Started</button></div>`
    },
    { 
      id: 'feature-card', 
      name: 'Feature Card', 
      category: 'cards',
      preview: 'Icon + Title + Description',
      code: `<div className="feature-card"><div className="icon">🚀</div><h3>Feature</h3><p>Description</p></div>`
    },
    { 
      id: 'pricing-table', 
      name: 'Pricing Table', 
      category: 'sections',
      preview: '3-column pricing comparison',
      code: `<div className="pricing"><div className="plan">Basic</div><div className="plan featured">Pro</div><div className="plan">Enterprise</div></div>`
    },
    { 
      id: 'testimonial', 
      name: 'Testimonial', 
      category: 'cards',
      preview: 'Quote + Author + Avatar',
      code: `<div className="testimonial"><p>"Great product!"</p><div className="author">John Doe</div></div>`
    },
    { 
      id: 'stats-counter', 
      name: 'Stats Counter', 
      category: 'widgets',
      preview: 'Animated number counter',
      code: `<div className="stat"><div className="number">1000+</div><div className="label">Happy Customers</div></div>`
    },
    { 
      id: 'contact-form', 
      name: 'Contact Form', 
      category: 'forms',
      preview: 'Name, Email, Message fields',
      code: `<form className="contact-form"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="Message"/><button>Send</button></form>`
    },
  ];

  // Premade functions
  const premadeFunctions = [
    { 
      id: 'validate-email', 
      name: 'Validate Email', 
      category: 'validation',
      code: `const validateEmail = (email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);`
    },
    { 
      id: 'format-currency', 
      name: 'Format Currency', 
      category: 'formatting',
      code: `const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);`
    },
    { 
      id: 'debounce', 
      name: 'Debounce', 
      category: 'utilities',
      code: `const debounce = (func, wait) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; };`
    },
    { 
      id: 'copy-to-clipboard', 
      name: 'Copy to Clipboard', 
      category: 'utilities',
      code: `const copyToClipboard = (text) => navigator.clipboard.writeText(text);`
    },
    { 
      id: 'generate-id', 
      name: 'Generate Unique ID', 
      category: 'utilities',
      code: `const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);`
    },
    { 
      id: 'truncate-text', 
      name: 'Truncate Text', 
      category: 'formatting',
      code: `const truncate = (str, length) => str.length > length ? str.substring(0, length) + '...' : str;`
    },
  ];

  const uploadAsset = async (file, assetType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', assetType);

    try {
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setAssets(prev => ({
          ...prev,
          [assetType]: [...prev[assetType], result]
        }));
        alert('Asset uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload asset');
    }
  };

  const saveCustomAsset = async (assetType, assetData) => {
    try {
      const response = await fetch('/api/admin/assets/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: assetType, data: assetData })
      });

      if (response.ok) {
        loadAssets();
        alert('Asset saved!');
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const deleteAsset = async (assetType, assetId) => {
    if (!window.confirm('Delete this asset?')) return;

    try {
      await fetch(`/api/admin/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      setAssets(prev => ({
        ...prev,
        [assetType]: prev[assetType].filter(a => a.id !== assetId)
      }));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const exportAssets = () => {
    const blob = new Blob([JSON.stringify(assets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-library-${Date.now()}.json`;
    a.click();
  };

  const importAssets = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setAssets(imported);
        alert('Assets imported successfully!');
      } catch (error) {
        alert('Invalid asset file');
      }
    };
    reader.readAsText(file);
  };

  const getCurrentAssets = () => {
    switch (activeTab) {
      case 'animations':
        return [...premadeAnimations, ...assets.animations];
      case 'widgets':
        return [...premadeWidgets, ...assets.widgets];
      case 'functions':
        return [...premadeFunctions, ...assets.functions];
      case 'images':
        return assets.images;
      default:
        return [];
    }
  };

  const filteredAssets = getCurrentAssets().filter(asset =>
    asset.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <Package className="w-5 h-5 mr-2 text-purple-600" />
            Asset Library
          </h3>
          <div className="flex space-x-2">
            <button onClick={exportAssets} className="text-sm text-purple-600 hover:text-purple-800">
              <Download className="w-4 h-4" />
            </button>
            <label className="text-sm text-purple-600 hover:text-purple-800 cursor-pointer">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={importAssets} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4">
          {[
            { id: 'animations', label: 'Animations', icon: Zap },
            { id: 'widgets', label: 'Widgets', icon: Box },
            { id: 'functions', label: 'Functions', icon: Code },
            { id: 'images', label: 'Images', icon: Image }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === tab.id
                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assets..."
            className="input-field pl-10 text-sm"
          />
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3">
          {filteredAssets.map((asset, idx) => (
            <div
              key={asset.id || idx}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition cursor-pointer border-2 border-transparent hover:border-purple-300"
              onClick={() => {
                setSelectedAsset(asset);
                if (onSelectAsset) onSelectAsset(asset);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{asset.name}</div>
                  {asset.duration && (
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {asset.duration}s
                    </div>
                  )}
                  {asset.category && (
                    <div className="text-xs text-purple-600 mt-1">
                      {asset.category}
                    </div>
                  )}
                  {asset.preview && (
                    <div className="text-xs text-gray-500 mt-1">
                      {asset.preview}
                    </div>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(asset);
                      setShowPreview(true);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(asset.code || JSON.stringify(asset));
                      alert('Copied to clipboard!');
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {!premadeAnimations.includes(asset) && 
                   !premadeWidgets.includes(asset) && 
                   !premadeFunctions.includes(asset) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAsset(activeTab, asset.id);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Area */}
        {activeTab === 'images' && (
          <div className="mt-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Upload images</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  uploadAsset(e.target.files[0], 'images');
                }
              }}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="btn-secondary text-sm cursor-pointer inline-block">
              Choose File
            </label>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedAsset && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">{selectedAsset.name}</h3>
            {selectedAsset.code && (
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {selectedAsset.code}
              </pre>
            )}
            <button 
              onClick={() => setShowPreview(false)} 
              className="btn-secondary mt-4 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetLibrary;
