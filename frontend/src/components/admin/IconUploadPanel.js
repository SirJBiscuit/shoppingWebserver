import React, { useState, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';

function IconUploadPanel() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [allIcons, setAllIcons] = useState([]);
  const [filters, setFilters] = useState({
    rarity: 'all',
    category: 'all',
    search: ''
  });

  React.useEffect(() => {
    fetchStats();
    fetchAllIcons();
  }, [filters]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/cosmetics/icons/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAllIcons = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/cosmetics/icons/admin/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAllIcons(data.icons);
    } catch (error) {
      console.error('Error fetching icons:', error);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/')
    );

    setFiles(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseFilename(file.name);
        setPreviews(prev => [...prev, {
          file,
          url: e.target.result,
          ...parsed
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const parseFilename = (filename) => {
    const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg|svg|gif|webp)$/i, '');
    const parts = nameWithoutExt.split('_');
    
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
    let rarity = 'common';
    let rarityIndex = -1;
    
    for (let i = 0; i < parts.length; i++) {
      if (rarities.includes(parts[i].toLowerCase())) {
        rarity = parts[i].toLowerCase();
        rarityIndex = i;
        break;
      }
    }
    
    const itemName = rarityIndex !== -1 
      ? parts.slice(0, rarityIndex).join(' ')
      : parts.join(' ');
    
    const variant = rarityIndex !== -1 
      ? parts.slice(rarityIndex + 1).join(' ')
      : '';
    
    return {
      itemName: formatName(itemName),
      rarity,
      variant,
      filename
    };
  };

  const formatName = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const removePreview = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('icons', file);
    });

    try {
      const response = await fetch('/api/cosmetics/icons/admin/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      setUploadResult(result);
      
      if (result.success) {
        // Clear files and previews
        setFiles([]);
        setPreviews([]);
        
        // Refresh stats and icons
        fetchStats();
        fetchAllIcons();
      }
    } catch (error) {
      console.error('Error uploading icons:', error);
      setUploadResult({
        success: false,
        error: 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-gray-500 bg-gray-100',
      uncommon: 'text-green-600 bg-green-100',
      rare: 'text-blue-600 bg-blue-100',
      epic: 'text-purple-600 bg-purple-100',
      legendary: 'text-yellow-600 bg-yellow-100',
      mythical: 'text-pink-600 bg-pink-100'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Icon Management</h1>
        <p className="text-gray-600">Upload and manage icons for the cosmetics system</p>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Icons" value={stats.total} color="blue" />
          <StatCard title="Common" value={stats.common} color="gray" />
          <StatCard title="Uncommon" value={stats.uncommon} color="green" />
          <StatCard title="Rare" value={stats.rare} color="blue" />
          <StatCard title="Epic" value={stats.epic} color="purple" />
          <StatCard title="Legendary" value={stats.legendary} color="yellow" />
          <StatCard title="Mythical" value={stats.mythical} color="pink" />
          <StatCard title="Animated" value={stats.animated} color="indigo" icon={<Sparkles size={20} />} />
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Upload Icons</h2>
        
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input').click()}
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg font-medium mb-2">Drop icons here or click to browse</p>
          <p className="text-sm text-gray-500">
            Supports PNG, JPG, SVG, GIF, WEBP (max 5MB each)
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Naming: item_rarity_variant.ext (e.g., apple_rare_crystal.png)
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Preview Grid */}
        {previews.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Preview ({previews.length} icons)</h3>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload {previews.length} Icons
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-6 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                  
                  <img 
                    src={preview.url} 
                    alt={preview.itemName}
                    className="w-16 h-16 mx-auto mb-2 object-contain"
                  />
                  
                  <div className="text-center">
                    <div className="font-bold text-xs truncate" title={preview.itemName}>
                      {preview.itemName}
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded mt-1 ${getRarityColor(preview.rarity)}`}>
                      {preview.rarity.toUpperCase()}
                    </div>
                    {preview.variant && (
                      <div className="text-xs text-gray-500 truncate mt-1" title={preview.variant}>
                        {preview.variant}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div className={`mt-4 p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {uploadResult.success ? (
                <Check className="text-green-600 flex-shrink-0" size={20} />
              ) : (
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              )}
              <div className="flex-1">
                <p className={`font-bold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
                </p>
                {uploadResult.success && (
                  <p className="text-sm text-green-700 mt-1">
                    Successfully uploaded {uploadResult.uploaded} icons
                  </p>
                )}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700">Errors:</p>
                    <ul className="text-xs text-red-600 mt-1 space-y-1">
                      {uploadResult.errors.map((err, i) => (
                        <li key={i}>{err.filename}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Icon Library */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Icon Library</h2>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Rarity</label>
            <select
              value={filters.rarity}
              onChange={(e) => setFilters({...filters, rarity: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="mythical">Mythical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="all">All Categories</option>
              <option value="Fruits">Fruits</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Bakery">Bakery</option>
              <option value="Household">Household</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              placeholder="Search icons..."
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Icon Grid */}
        <div className="grid grid-cols-8 gap-3">
          {allIcons.map(icon => (
            <div key={icon.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="relative">
                <img 
                  src={icon.file_path} 
                  alt={icon.item_name}
                  className="w-12 h-12 mx-auto mb-2 object-contain"
                />
                {icon.animated && (
                  <Sparkles className="absolute top-0 right-0 text-purple-500" size={12} />
                )}
              </div>
              
              <div className="text-center">
                <div className="font-bold text-xs truncate" title={icon.item_name}>
                  {icon.item_name}
                </div>
                <div className={`text-xs font-semibold px-1 py-0.5 rounded mt-1 ${getRarityColor(icon.rarity)}`}>
                  {icon.rarity[0].toUpperCase()}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  T{icon.quality_tier}
                </div>
              </div>
            </div>
          ))}
        </div>

        {allIcons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="mx-auto mb-3 text-gray-400" size={48} />
            <p>No icons found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-50 text-gray-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium opacity-80">{title}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value || 0}</div>
    </div>
  );
}

export default IconUploadPanel;
