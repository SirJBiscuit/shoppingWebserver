const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const nextcloud = require('../services/nextcloud');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload image
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { image_type, related_id, folder } = req.body;
    const timestamp = Date.now();
    const filename = `${req.user.userId}_${timestamp}_${req.file.originalname}`;

    // Create thumbnail
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailFilename = `thumb_${filename}`;

    // Upload to Nextcloud
    const imageUrl = await nextcloud.uploadImage(req.file.buffer, filename, folder || image_type);
    const thumbnailUrl = await nextcloud.uploadImage(thumbnailBuffer, thumbnailFilename, folder || image_type);

    // Save to database
    const result = await db.query(`
      INSERT INTO images (user_id, image_url, thumbnail_url, image_type, related_id, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.userId, imageUrl, thumbnailUrl, image_type, related_id, req.file.size, req.file.mimetype]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/upload-multiple', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const { image_type, folder } = req.body;
    const uploadedImages = [];

    for (const file of req.files) {
      const timestamp = Date.now();
      const filename = `${req.user.userId}_${timestamp}_${file.originalname}`;

      // Create thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailFilename = `thumb_${filename}`;

      // Upload to Nextcloud
      const imageUrl = await nextcloud.uploadImage(file.buffer, filename, folder || image_type);
      const thumbnailUrl = await nextcloud.uploadImage(thumbnailBuffer, thumbnailFilename, folder || image_type);

      // Save to database
      const result = await db.query(`
        INSERT INTO images (user_id, image_url, thumbnail_url, image_type, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [req.user.userId, imageUrl, thumbnailUrl, image_type, file.size, file.mimetype]);

      uploadedImages.push(result.rows[0]);
    }

    res.status(201).json({
      message: `Uploaded ${uploadedImages.length} images`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Multiple image upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Get user's images
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { image_type, related_id } = req.query;
    
    let query = 'SELECT * FROM images WHERE user_id = $1';
    const params = [req.user.userId];
    
    if (image_type) {
      params.push(image_type);
      query += ` AND image_type = $${params.length}`;
    }
    
    if (related_id) {
      params.push(related_id);
      query += ` AND related_id = $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM images WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];

    // Delete from Nextcloud (extract path from URL)
    // This is a simplified version - adjust based on your URL structure
    const imagePath = image.image_url.replace(process.env.NEXTCLOUD_URL, '');
    const thumbnailPath = image.thumbnail_url.replace(process.env.NEXTCLOUD_URL, '');
    
    await nextcloud.deleteImage(imagePath);
    await nextcloud.deleteImage(thumbnailPath);

    // Delete from database
    await db.query('DELETE FROM images WHERE id = $1', [req.params.id]);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
