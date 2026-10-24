const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, isAdmin } = require('../src/middleware/auth');
const db = require('../src/database/db');

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Ensure storage directory exists
const ensureStorageDir = async (category) => {
  const dir = path.join(__dirname, '../../storage', category);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const category = req.body.category || 'general';
      const dir = await ensureStorageDir(category);
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg|mp3|wav|ogg|pdf|doc|docx|txt|json|csv/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mimeOk = allowedTypes.test(file.mimetype);
  const extOk = allowedTypes.test(ext);
  
  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.source}`));
  }
};

// Multer upload instance
const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Max 10 files at once
  },
  fileFilter
});

// ============================================================================
// FILE UPLOAD ENDPOINTS
// ============================================================================

// Upload single file
router.post('/upload', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { category = 'general', tags = '', metadata = '{}' } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check user quota
    const quotaCheck = await db.query(
      'SELECT * FROM storage_quotas WHERE user_id = $1',
      [req.user.id]
    );
    
    if (quotaCheck.rows.length > 0) {
      const quota = quotaCheck.rows[0];
      if (quota.used_storage_bytes + file.size > quota.max_storage_bytes) {
        // Delete uploaded file
        await fs.unlink(file.path);
        return res.status(413).json({ error: 'Storage quota exceeded' });
      }
      if (quota.used_files + 1 > quota.max_files) {
        await fs.unlink(file.path);
        return res.status(413).json({ error: 'File count quota exceeded' });
      }
    }
    
    // Parse tags and metadata
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
    const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    // Generate URL
    const url = `/storage/${category}/${file.filename}`;
    
    // Save to database
    const result = await db.query(`
      INSERT INTO storage_files 
        (filename, original_name, mime_type, size_bytes, category, path, url, uploaded_by, metadata, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      category,
      file.path,
      url,
      req.user.id,
      metadataObj,
      tagsArray
    ]);
    
    res.json({
      success: true,
      file: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Upload multiple files
router.post('/upload/bulk', authenticateToken, isAdmin, upload.array('files', 10), async (req, res) => {
  try {
    const { files } = req;
    const { category = 'general', tags = '' } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
    const uploadedFiles = [];
    
    for (const file of files) {
      const url = `/storage/${category}/${file.filename}`;
      
      const result = await db.query(`
        INSERT INTO storage_files 
          (filename, original_name, mime_type, size_bytes, category, path, url, uploaded_by, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        category,
        file.path,
        url,
        req.user.id,
        tagsArray
      ]);
      
      uploadedFiles.push(result.rows[0]);
    }
    
    res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed', details: error.message });
  }
});

// ============================================================================
// FILE MANAGEMENT ENDPOINTS
// ============================================================================

// List files
router.get('/files', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 50,
      sortBy = 'uploaded_at',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM storage_files WHERE 1=1';
    const params = [];
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (original_name ILIKE $${params.length} OR tags::text ILIKE $${params.length})`;
    }
    
    // Validate sort column
    const validSortColumns = ['uploaded_at', 'original_name', 'size_bytes', 'category'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'uploaded_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;
    
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM storage_files WHERE 1=1';
    const countParams = [];
    
    if (category && category !== 'all') {
      countParams.push(category);
      countQuery += ` AND category = $${countParams.length}`;
    }
    
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (original_name ILIKE $${countParams.length} OR tags::text ILIKE $${countParams.length})`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      files: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get single file
router.get('/files/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM storage_files WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Log access
    await db.query(`
      INSERT INTO storage_access_log (file_id, user_id, action, ip_address)
      VALUES ($1, $2, 'view', $3)
    `, [id, req.user.id, req.ip]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Update file metadata
router.put('/files/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { original_name, tags, metadata, is_public } = req.body;
    
    const updates = [];
    const params = [];
    
    if (original_name !== undefined) {
      params.push(original_name);
      updates.push(`original_name = $${params.length}`);
    }
    
    if (tags !== undefined) {
      params.push(Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()));
      updates.push(`tags = $${params.length}`);
    }
    
    if (metadata !== undefined) {
      params.push(metadata);
      updates.push(`metadata = $${params.length}`);
    }
    
    if (is_public !== undefined) {
      params.push(is_public);
      updates.push(`is_public = $${params.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    params.push(new Date());
    updates.push(`updated_at = $${params.length}`);
    
    params.push(id);
    const query = `
      UPDATE storage_files 
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING *
    `;
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Log access
    await db.query(`
      INSERT INTO storage_access_log (file_id, user_id, action, ip_address)
      VALUES ($1, $2, 'update', $3)
    `, [id, req.user.id, req.ip]);
    
    res.json({
      success: true,
      file: result.rows[0]
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file
router.delete('/files/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file info
    const fileResult = await db.query(
      'SELECT * FROM storage_files WHERE id = $1',
      [id]
    );
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Delete from filesystem
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.error('Failed to delete file from disk:', err);
    }
    
    // Delete from database
    await db.query('DELETE FROM storage_files WHERE id = $1', [id]);
    
    // Log access
    await db.query(`
      INSERT INTO storage_access_log (file_id, user_id, action, ip_address)
      VALUES ($1, $2, 'delete', $3)
    `, [id, req.user.id, req.ip]);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Bulk delete
router.post('/files/bulk/delete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }
    
    // Get files
    const filesResult = await db.query(
      'SELECT * FROM storage_files WHERE id = ANY($1)',
      [fileIds]
    );
    
    // Delete from filesystem
    for (const file of filesResult.rows) {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error(`Failed to delete file ${file.id} from disk:`, err);
      }
    }
    
    // Delete from database
    const result = await db.query(
      'DELETE FROM storage_files WHERE id = ANY($1) RETURNING id',
      [fileIds]
    );
    
    res.json({
      success: true,
      deleted: result.rows.length,
      message: `${result.rows.length} files deleted successfully`
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete files' });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Get storage stats
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Total files and size
    const totalsResult = await db.query(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(size_bytes), 0) as total_size
      FROM storage_files
    `);
    
    // Category breakdown
    const categoryResult = await db.query(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(size_bytes), 0) as size
      FROM storage_files
      GROUP BY category
    `);
    
    // Recent uploads (last 7 days)
    const recentResult = await db.query(`
      SELECT 
        DATE(uploaded_at) as date,
        COUNT(*) as count
      FROM storage_files
      WHERE uploaded_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(uploaded_at)
      ORDER BY date DESC
    `);
    
    // User quota
    const quotaResult = await db.query(
      'SELECT * FROM storage_quotas WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      totals: totalsResult.rows[0],
      categories: categoryResult.rows,
      recentUploads: recentResult.rows,
      quota: quotaResult.rows[0] || null
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get analytics history
router.get('/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const result = await db.query(`
      SELECT *
      FROM storage_analytics
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY date DESC
    `);
    
    res.json({
      analytics: result.rows,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;
