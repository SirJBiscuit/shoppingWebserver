import React, { useState, useEffect } from 'react';
import { Upload, Image, Music, FileImage, Trash2, Download, Copy, Eye } from 'lucide-react';

const MediaAssetManager = () => {
  const [activeTab, setActiveTab] = useState('icons');
  const [assets, setAssets] = useState({ icons: [], sounds: [], images: [] });
  const [uploading, setUploading] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);

  const uploadAsset = async (file, type) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/admin/upload-asset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setAssets(prev => ({
          ...prev,
          [type]: [...prev[type], result]
        }));
        alert('Asset uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload asset');
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (assetId, type) => {
    if (window.confirm('Delete this asset?')) {
      try {
        await fetch(`/api/admin/assets/${assetId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setAssets(prev => ({
          ...prev,
          [type]: prev[type].filter(a => a.id !== assetId)
        }));
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const copyAssetUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileImage className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Media Asset Manager</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload and manage icons, sounds, and images
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'icons', label: 'Icons', icon: Image },
          { id: 'sounds', label: 'Sounds', icon: Music },
          { id: 'images', label: 'Images', icon: FileImage }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Area */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-8 border-2 border-dashed border-purple-300 dark:border-purple-700">
        <div className="text-center">
          <Upload className="w-12 h-12 mx-auto text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload {activeTab}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Drag and drop or click to browse
          </p>
          <input
            type="file"
            accept={
              activeTab === 'icons' ? 'image/*' :
              activeTab === 'sounds' ? 'audio/*' :
              'image/*'
            }
            onChange={(e) => {
              if (e.target.files[0]) {
                uploadAsset(e.target.files[0], activeTab);
              }
            }}
            className="hidden"
            id="asset-upload"
          />
          <label
            htmlFor="asset-upload"
            className="btn-primary cursor-pointer inline-block"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </label>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {assets[activeTab]?.map((asset) => (
          <div
            key={asset.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition"
          >
            {activeTab === 'sounds' ? (
              <div className="aspect-square flex items-center justify-center bg-purple-100 dark:bg-purple-900/20 rounded-lg mb-2">
                <Music className="w-8 h-8 text-purple-600" />
              </div>
            ) : (
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full aspect-square object-cover rounded-lg mb-2"
              />
            )}
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate mb-2">
              {asset.name}
            </p>
            <div className="flex space-x-1">
              <button
                onClick={() => setPreviewAsset(asset)}
                className="flex-1 p-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded hover:bg-blue-200"
                title="Preview"
              >
                <Eye className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => copyAssetUrl(asset.url)}
                className="flex-1 p-1 bg-green-100 dark:bg-green-900/20 text-green-600 rounded hover:bg-green-200"
                title="Copy URL"
              >
                <Copy className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => deleteAsset(asset.id, activeTab)}
                className="flex-1 p-1 bg-red-100 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-200"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setPreviewAsset(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">{previewAsset.name}</h3>
            {activeTab === 'sounds' ? (
              <audio controls src={previewAsset.url} className="w-full" />
            ) : (
              <img src={previewAsset.url} alt={previewAsset.name} className="w-full rounded-lg" />
            )}
            <button onClick={() => setPreviewAsset(null)} className="btn-secondary mt-4 w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaAssetManager;
