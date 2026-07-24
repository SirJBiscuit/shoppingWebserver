import React, { useState, useEffect } from 'react';
import { Upload, Search, Trash2, Edit2, Plus, Image as ImageIcon, Grid, List } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

/**
 * AdminIconManager - Manage all item icons for the inventory system
 * Upload, view, edit, and delete icons
 */
const AdminIconManager = () => {
  const { toast, success, showError } = useToast();
  const [icons, setIcons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [iconName, setIconName] = useState('');
  const [iconCategory, setIconCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Load icons on mount
  useEffect(() => {
    loadIcons();
  }, []);

  const loadIcons = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await api.get('/admin/icons');
      // setIcons(response.data);
      
      // Mock data for now
      setIcons([
        { id: 1, name: 'Apple', emoji: '🍎', category: 'Produce', usageCount: 15 },
        { id: 2, name: 'Milk', emoji: '🥛', category: 'Dairy', usageCount: 8 },
        { id: 3, name: 'Bread', emoji: '🍞', category: 'Bakery', usageCount: 12 },
        { id: 4, name: 'Chicken', emoji: '🍗', category: 'Meat', usageCount: 6 },
        { id: 5, name: 'Cheese', emoji: '🧀', category: 'Dairy', usageCount: 10 },
        { id: 6, name: 'Carrot', emoji: '🥕', category: 'Produce', usageCount: 7 },
        { id: 7, name: 'Egg', emoji: '🥚', category: 'Dairy', usageCount: 20 },
        { id: 8, name: 'Tomato', emoji: '🍅', category: 'Produce', usageCount: 9 },
      ]);
    } catch (error) {
      console.error('Failed to load icons:', error);
      showError('Failed to load icons');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !iconName) {
      showError('Please provide a file and name');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('icon', uploadFile);
      formData.append('name', iconName);
      formData.append('category', iconCategory);

      // TODO: Replace with actual API call
      // await api.post('/admin/icons', formData);
      
      success('Icon uploaded successfully');
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPreview(null);
      setIconName('');
      setIconCategory('');
      loadIcons();
    } catch (error) {
      console.error('Failed to upload icon:', error);
      showError('Failed to upload icon');
    }
  };

  const handleDelete = async (iconId) => {
    if (!window.confirm('Are you sure you want to delete this icon?')) return;

    try {
      // TODO: Replace with actual API call
      // await api.delete(`/admin/icons/${iconId}`);
      
      success('Icon deleted');
      loadIcons();
    } catch (error) {
      console.error('Failed to delete icon:', error);
      showError('Failed to delete icon');
    }
  };

  const filteredIcons = icons.filter(icon =>
    icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    icon.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(icons.map(icon => icon.category))];

  return (
    <PageTransition>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1800px] mx-auto p-3 sm:p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Icon Manager
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Upload and manage icons for inventory items
                </p>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span>Upload Icon</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Icons</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{icons.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Usage</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {icons.reduce((sum, icon) => sum + icon.usageCount, 0)}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Most Used</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {icons.sort((a, b) => b.usageCount - a.usageCount)[0]?.emoji || '-'}
                </div>
              </div>
            </div>

            {/* Search and View Toggle */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search icons by name or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Icons Display */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading icons...</p>
              </div>
            ) : filteredIcons.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No icons found</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                {filteredIcons.map(icon => (
                  <div
                    key={icon.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer group"
                    onClick={() => setSelectedIcon(icon)}
                  >
                    <div className="text-5xl mb-2 text-center">{icon.emoji}</div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate text-center">
                      {icon.name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate text-center">
                      {icon.category}
                    </div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 text-center mt-1">
                      Used {icon.usageCount}x
                    </div>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); /* Edit */ }}
                        className="flex-1 p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(icon.id); }}
                        className="flex-1 p-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Icon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredIcons.map(icon => (
                      <tr key={icon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-3xl">{icon.emoji}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{icon.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {icon.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {icon.usageCount} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {/* Edit */}}
                              className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(icon.id)}
                              className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Upload Icon</h2>
              
              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon File
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  {uploadPreview ? (
                    <div>
                      <img src={uploadPreview} alt="Preview" className="w-32 h-32 mx-auto mb-2 object-contain" />
                      <button
                        onClick={() => { setUploadFile(null); setUploadPreview(null); }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-2 text-gray-400" size={48} />
                      <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                        Choose file
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Icon Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon Name
                </label>
                <input
                  type="text"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  placeholder="e.g., Apple, Milk, Bread"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={iconCategory}
                  onChange={(e) => setIconCategory(e.target.value)}
                  placeholder="e.g., Produce, Dairy, Bakery"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        <Toast {...toast} />
      </div>
    </PageTransition>
  );
};

export default AdminIconManager;
