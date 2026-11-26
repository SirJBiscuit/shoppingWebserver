const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const nextcloud = require('../services/nextcloud');

const { iconQuota } = require('../services/iconQuota');

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
    const isIcon = image_type === 'item_icon';
    const share = String(req.body.share || '') === '1' || req.body.share === true;

    // Beta tester daily icon quota — 5/day until they've earned enough
    // contribution credit (10 approved MDL terms) to upload freely.
    // A failing quota check must never block an upload.
    if (isIcon) {
      try {
        const quota = await iconQuota(req.user.id);
        if (!quota.unlimited && quota.used >= quota.limit) {
          return res.status(429).json({
            error: `Daily icon limit reached (${quota.limit}/day for beta testers). It lifts once ${quota.threshold} of your MDL suggestions are approved.`,
            quota,
          });
        }
      } catch (qErr) {
        console.warn('Icon quota check failed (allowing upload):', qErr.message);
      }
    }

    const filename = `${req.user.id}_${timestamp}_${req.file.originalname}${isIcon ? '.icon.png' : ''}`;

    // Create thumbnail
    // Custom item icons normalize to a fixed 128×128 PNG — small, uniform,
    // and fast to render inside list rows. Thumbnail reuses it.
    const imageBuffer = isIcon
      ? await sharp(req.file.buffer).resize(128, 128, { fit: 'cover' }).png().toBuffer()
      : req.file.buffer;
    const thumbnailBuffer = isIcon ? imageBuffer : await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailFilename = `thumb_${filename}`;

    // Upload to Nextcloud
    const imageUrl = await nextcloud.uploadImage(imageBuffer, filename, folder || image_type);
    const thumbnailUrl = await nextcloud.uploadImage(thumbnailBuffer, thumbnailFilename, folder || image_type);

    // Save to database — shared icons enter the pending pool for admin
    // review; local icons stay private (existing behavior). Falls back to
    // the pre-share column set if migration 122 hasn't landed yet.
    let result;
    try {
      result = await db.query(`
        INSERT INTO images (user_id, image_url, thumbnail_url, image_type, related_id, file_size, mime_type, shared_status, shared_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [req.user.id, imageUrl, thumbnailUrl, image_type, related_id, imageBuffer.length, isIcon ? 'image/png' : req.file.mimetype, share && isIcon ? 'pending' : 'local', share && isIcon ? new Date() : null]);
    } catch (insErr) {
      if (insErr.code !== '42703') throw insErr;
      result = await db.query(`
        INSERT INTO images (user_id, image_url, thumbnail_url, image_type, related_id, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [req.user.id, imageUrl, thumbnailUrl, image_type, related_id, imageBuffer.length, isIcon ? 'image/png' : req.file.mimetype]);
    }

    // Attach to MDL entities when tagged (non-fatal — upload still succeeds)
    try {
      if (image_type === 'mdl_product' && related_id) {
        await db.query(
          'UPDATE product_master_data SET icon_image_url = $1, updated_at = NOW() WHERE id = $2',
          [imageUrl, related_id]
        );
      } else if (image_type === 'mdl_item' && related_id) {
        await db.query(
          'UPDATE mdl_item_names SET image_url = $1, thumbnail_url = $2 WHERE id = $3',
          [imageUrl, thumbnailUrl, related_id]
        );
      }
    } catch (linkErr) {
      console.warn('MDL image link failed (non-fatal):', linkErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', detail: error.message });
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
      const filename = `${req.user.id}_${timestamp}_${file.originalname}`;

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
      `, [req.user.id, imageUrl, thumbnailUrl, image_type, file.size, file.mimetype]);

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

// Get user's images — item_icon queries also merge the global pool:
// admin-approved shared icons from everyone, plus each icon's
// shared_status so the UI can badge pending donations.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { image_type, related_id } = req.query;

    if (image_type === 'item_icon' && !related_id) {
      const result = await db.query(
        `SELECT i.*, (i.user_id = $1) AS mine FROM images i
         WHERE i.image_type = 'item_icon'
           AND (i.user_id = $1 OR i.shared_status = 'approved')
         ORDER BY i.created_at DESC`,
        [req.user.id]
      );
      return res.json(result.rows);
    }

    let query = 'SELECT * FROM images WHERE user_id = $1';
    const params = [req.user.id];

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
    // An empty library must not break callers (icon picker expects a list).
    res.json([]);
  }
});

// Icon quota for the caller — the limits viewer reads this so beta
// testers can see uploads used today and their contribution progress.
router.get('/icon-quota', authenticateToken, async (req, res) => {
  try {
    res.json(await iconQuota(req.user.id));
  } catch (error) {
    console.error('Icon quota error:', error);
    res.status(500).json({ error: 'Failed to fetch icon quota' });
  }
});

// ---- Admin: shared icon review ---------------------------------------

// Pending shared icons for the MDL admin panel
router.get('/admin/shared-icons', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const status = String(req.query.status || 'pending');
    const result = await db.query(
      `SELECT i.*, u.username AS uploaded_by_name
       FROM images i LEFT JOIN users u ON u.id = i.user_id
       WHERE i.image_type = 'item_icon' AND i.shared_status = $1
       ORDER BY i.shared_at ASC NULLS LAST, i.created_at ASC LIMIT 200`,
      [status]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Shared icons error:', error);
    res.status(500).json({ error: 'Failed to fetch shared icons' });
  }
});

// Approve/reject a shared icon — approved joins the global pool
router.post('/admin/shared-icons/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const status = String(req.body.status || '').trim();
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved | rejected | pending' });
    }
    const result = await db.query(
      `UPDATE images SET shared_status = $2, shared_approved_by = $3
       WHERE id = $1 AND image_type = 'item_icon' RETURNING id`,
      [req.params.id, status, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Icon not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Shared icon status error:', error);
    res.status(500).json({ error: 'Failed to update icon status' });
  }
});

// Delete image
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM images WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

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
