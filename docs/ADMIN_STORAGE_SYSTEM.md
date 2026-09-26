# CFS Admin Storage System
**Visual file and data management for administrators**

## 🎯 Overview

A comprehensive admin storage system that provides visual management of:
- **Files** (images, sounds, documents)
- **Database records** (visual CRUD operations)
- **Cache data** (view and manage)
- **User uploads** (organize and moderate)

---

## 📁 Storage Architecture

### **1. File Storage**
```
/storage/
  ├── images/
  │   ├── products/
  │   ├── users/
  │   ├── categories/
  │   └── temp/
  ├── sounds/
  │   ├── effects/
  │   ├── notifications/
  │   └── custom/
  ├── documents/
  │   ├── receipts/
  │   ├── reports/
  │   └── exports/
  └── cache/
      ├── thumbnails/
      └── processed/
```

### **2. Database Storage**
```sql
-- File metadata table
CREATE TABLE storage_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  category VARCHAR(50),
  path TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false
);

-- Storage analytics
CREATE TABLE storage_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  total_files INTEGER,
  total_size_bytes BIGINT,
  uploads_count INTEGER,
  deletions_count INTEGER,
  category_breakdown JSONB
);
```

---

## 🎨 UI Components

### **1. Storage Dashboard**
```javascript
// Main dashboard showing storage overview
<StorageDashboard>
  <StorageStats />
  <QuickActions />
  <RecentUploads />
  <StorageChart />
</StorageDashboard>
```

### **2. File Browser**
```javascript
// Visual file browser with drag-drop
<FileBrowser>
  <FolderTree />
  <FileGrid mode="grid|list" />
  <FilePreview />
  <FileActions />
</FileBrowser>
```

### **3. Upload Manager**
```javascript
// Drag-drop upload with progress
<UploadManager>
  <DropZone />
  <UploadQueue />
  <ProgressBars />
</UploadManager>
```

### **4. Data Editor**
```javascript
// Visual database record editor
<DataEditor>
  <TableSelector />
  <RecordGrid />
  <RecordForm />
  <BulkActions />
</DataEditor>
```

---

## 🚀 Features

### **File Management**
- ✅ Drag-drop upload
- ✅ Bulk upload
- ✅ Image preview
- ✅ Audio player
- ✅ File search
- ✅ Tag system
- ✅ Folder organization
- ✅ Download/delete
- ✅ Share links
- ✅ Access control

### **Data Management**
- ✅ Visual table browser
- ✅ CRUD operations
- ✅ Inline editing
- ✅ Bulk operations
- ✅ Export to CSV/JSON
- ✅ Import from CSV
- ✅ Search and filter
- ✅ Relationship viewer

### **Storage Analytics**
- ✅ Storage usage charts
- ✅ File type breakdown
- ✅ Upload trends
- ✅ User activity
- ✅ Quota management
- ✅ Cleanup suggestions

---

## 🔧 API Endpoints

### **File Operations**
```javascript
// Upload file
POST /api/admin/storage/upload
Body: FormData with file

// List files
GET /api/admin/storage/files?category=images&page=1

// Get file
GET /api/admin/storage/files/:id

// Update file metadata
PUT /api/admin/storage/files/:id

// Delete file
DELETE /api/admin/storage/files/:id

// Bulk operations
POST /api/admin/storage/bulk
Body: { action: 'delete|move|tag', fileIds: [...] }
```

### **Data Operations**
```javascript
// List tables
GET /api/admin/data/tables

// Get table schema
GET /api/admin/data/tables/:table/schema

// List records
GET /api/admin/data/tables/:table/records?page=1&limit=50

// Get record
GET /api/admin/data/tables/:table/records/:id

// Create record
POST /api/admin/data/tables/:table/records

// Update record
PUT /api/admin/data/tables/:table/records/:id

// Delete record
DELETE /api/admin/data/tables/:table/records/:id

// Export data
GET /api/admin/data/tables/:table/export?format=csv|json
```

---

## 💾 Implementation Example

### **Backend: File Upload Handler**
```javascript
// routes/admin/storage.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const category = req.body.category || 'general';
    const dir = path.join(__dirname, '../../storage', category);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp3|wav|pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { category, tags } = req.body;
    
    // Save to database
    const result = await db.query(`
      INSERT INTO storage_files 
        (filename, original_name, mime_type, size_bytes, category, path, uploaded_by, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      category,
      file.path,
      req.user.id,
      tags ? tags.split(',') : []
    ]);
    
    res.json({
      success: true,
      file: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// List files endpoint
router.get('/files', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM storage_files WHERE 1=1';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (original_name ILIKE $${params.length} OR tags::text ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    res.json({
      files: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rowCount
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});
```

### **Frontend: Storage Dashboard Component**
```javascript
// components/admin/StorageDashboard.js
import React, { useState, useEffect } from 'react';
import { Upload, Folder, Image, Music, FileText, Trash2, Download, Search } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const StorageDashboard = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  useEffect(() => {
    loadFiles();
    loadStats();
  }, [category]);
  
  const loadFiles = async () => {
    const response = await fetch(`/api/admin/storage/files?category=${category}`);
    const data = await response.json();
    setFiles(data.files);
  };
  
  const loadStats = async () => {
    const response = await fetch('/api/admin/storage/stats');
    const data = await response.json();
    setStats(data);
  };
  
  const onDrop = async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      
      await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData
      });
    }
    
    loadFiles();
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  
  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedFiles.length} files?`)) return;
    
    await fetch('/api/admin/storage/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        fileIds: selectedFiles
      })
    });
    
    setSelectedFiles([]);
    loadFiles();
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Folder />}
          label="Total Files"
          value={stats.totalFiles || 0}
          color="blue"
        />
        <StatCard
          icon={<Image />}
          label="Images"
          value={stats.images || 0}
          color="purple"
        />
        <StatCard
          icon={<Music />}
          label="Sounds"
          value={stats.sounds || 0}
          color="green"
        />
        <StatCard
          icon={<FileText />}
          label="Documents"
          value={stats.documents || 0}
          color="orange"
        />
      </div>
      
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">
          {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports: Images, Audio, Documents (Max 10MB)
        </p>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="sounds">Sounds</option>
            <option value="documents">Documents</option>
          </select>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedFiles.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Trash2 className="w-5 h-5 inline mr-2" />
              Delete ({selectedFiles.length})
            </button>
          )}
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {viewMode === 'grid' ? 'List' : 'Grid'}
          </button>
        </div>
      </div>
      
      {/* File Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-6 gap-4' : 'space-y-2'}>
        {files.map(file => (
          <FileCard
            key={file.id}
            file={file}
            viewMode={viewMode}
            selected={selectedFiles.includes(file.id)}
            onSelect={(id) => {
              setSelectedFiles(prev =>
                prev.includes(id)
                  ? prev.filter(f => f !== id)
                  : [...prev, id]
              );
            }}
          />
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-lg p-6 shadow">
    <div className={`text-${color}-500 mb-2`}>{icon}</div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

const FileCard = ({ file, viewMode, selected, onSelect }) => {
  if (viewMode === 'grid') {
    return (
      <div
        className={`relative border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
          selected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => onSelect(file.id)}
      >
        {file.mime_type?.startsWith('image/') ? (
          <img
            src={`/storage/${file.category}/${file.filename}`}
            alt={file.original_name}
            className="w-full h-32 object-cover rounded mb-2"
          />
        ) : (
          <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <p className="text-sm font-medium truncate">{file.original_name}</p>
        <p className="text-xs text-gray-500">{formatBytes(file.size_bytes)}</p>
      </div>
    );
  }
  
  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelect(file.id)}
    >
      <div className="flex items-center space-x-4">
        <FileText className="w-8 h-8 text-gray-400" />
        <div>
          <p className="font-medium">{file.original_name}</p>
          <p className="text-sm text-gray-500">
            {formatBytes(file.size_bytes)} • {new Date(file.uploaded_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button className="p-2 hover:bg-gray-100 rounded">
          <Download className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded">
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>
      </div>
    </div>
  );
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default StorageDashboard;
```

---

## 🎯 Benefits

### **For Admins:**
- ✅ Visual file management
- ✅ No need for FTP/SSH
- ✅ Drag-drop uploads
- ✅ Bulk operations
- ✅ Search and filter
- ✅ Storage analytics

### **For Developers:**
- ✅ Centralized storage
- ✅ API for file access
- ✅ Automatic thumbnails
- ✅ CDN integration ready
- ✅ Access control built-in

### **For Users:**
- ✅ Fast file delivery
- ✅ Optimized images
- ✅ Reliable storage
- ✅ Backup system

---

## 🚀 Next Steps

1. **Phase 1:** Basic file upload/download
2. **Phase 2:** Visual file browser
3. **Phase 3:** Data editor
4. **Phase 4:** Analytics dashboard
5. **Phase 5:** CDN integration

---

**This creates a complete admin storage system with visual management, making it easy to manage all site assets!**
