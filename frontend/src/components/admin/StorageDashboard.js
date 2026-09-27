import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, Folder, Image, Music, FileText, Trash2, Download, 
  Search, Grid as GridIcon, List, RefreshCw, BarChart3, X 
} from 'lucide-react';

const StorageDashboard = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [dragActive, setDragActive] = useState(false);
  
  const token = localStorage.getItem('token');
  
  // Load files
  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: category === 'all' ? '' : category,
        search: searchTerm,
        page,
        limit: 50
      });
      
      const response = await fetch(`/api/admin/storage/files?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setFiles(data.files || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }, [category, searchTerm, page, token]);
  
  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/storage/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, [token]);
  
  useEffect(() => {
    loadFiles();
    loadStats();
  }, [loadFiles, loadStats]);
  
  // Handle file upload
  const handleUpload = async (uploadFiles) => {
    if (!uploadFiles || uploadFiles.length === 0) return;
    
    try {
      setUploading(true);
      
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category === 'all' ? 'general' : category);
        
        await fetch('/api/admin/storage/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }
      
      await loadFiles();
      await loadStats();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  
  // Handle file input change
  const handleFileInput = (e) => {
    handleUpload(Array.from(e.target.files));
  };
  
  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };
  
  // Delete selected files
  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedFiles.length} files?`)) return;
    
    try {
      await fetch('/api/admin/storage/files/bulk/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileIds: selectedFiles })
      });
      
      setSelectedFiles([]);
      await loadFiles();
      await loadStats();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + error.message);
    }
  };
  
  // Toggle file selection
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };
  
  // Format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Storage Management
        </h1>
        <button
          onClick={() => { loadFiles(); loadStats(); }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Folder className="w-6 h-6" />}
          label="Total Files"
          value={stats.totals?.total_files || 0}
          color="blue"
        />
        <StatCard
          icon={<Image className="w-6 h-6" />}
          label="Images"
          value={stats.categories?.find(c => c.category === 'images')?.count || 0}
          color="purple"
        />
        <StatCard
          icon={<Music className="w-6 h-6" />}
          label="Sounds"
          value={stats.categories?.find(c => c.category === 'sounds')?.count || 0}
          color="green"
        />
        <StatCard
          icon={<FileText className="w-6 h-6" />}
          label="Documents"
          value={stats.categories?.find(c => c.category === 'documents')?.count || 0}
          color="orange"
        />
      </div>
      
      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {uploading ? 'Uploading...' : dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Supports: Images, Audio, Documents (Max 10MB per file)
          </p>
        </label>
      </div>
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="sounds">Sounds</option>
            <option value="documents">Documents</option>
            <option value="general">General</option>
          </select>
          
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedFiles.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete ({selectedFiles.length})
            </button>
          )}
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <GridIcon className="w-5 h-5" />}
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </button>
        </div>
      </div>
      
      {/* Files Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <Folder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No files found</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              selected={selectedFiles.includes(file.id)}
              onSelect={() => toggleFileSelection(file.id)}
              formatBytes={formatBytes}
              token={token}
              onDelete={async () => {
                if (window.confirm('Delete this file?')) {
                  await fetch(`/api/admin/storage/files/${file.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  loadFiles();
                  loadStats();
                }
              }}
            />
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    purple: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
    green: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    orange: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <div className={`${colors[color]} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
};

// File Card Component
const FileCard = ({ file, viewMode, selected, onSelect, formatBytes, token, onDelete }) => {
  const isImage = file.mime_type?.startsWith('image/');
  const isAudio = file.mime_type?.startsWith('audio/');
  
  if (viewMode === 'grid') {
    return (
      <div
        className={`relative border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
          selected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
        }`}
        onClick={onSelect}
      >
        {isImage ? (
          <img
            src={file.url}
            alt={file.original_name}
            className="w-full h-32 object-cover rounded mb-2"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
            {isAudio ? <Music className="w-12 h-12 text-gray-400" /> : <FileText className="w-12 h-12 text-gray-400" />}
          </div>
        )}
        <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{file.original_name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size_bytes)}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  
  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        {isImage ? <Image className="w-8 h-8 text-gray-400" /> : 
         isAudio ? <Music className="w-8 h-8 text-gray-400" /> : 
         <FileText className="w-8 h-8 text-gray-400" />}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{file.original_name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatBytes(file.size_bytes)} • {new Date(file.uploaded_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={file.url}
          download
          onClick={(e) => e.stopPropagation()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default StorageDashboard;
