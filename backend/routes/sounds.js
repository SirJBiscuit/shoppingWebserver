const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Configure multer for sound file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/sounds');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a)'));
    }
  }
});

// Get all available sounds
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const sounds = await db.all(`
      SELECT id, name, category, filename, file_path, created_at, is_default
      FROM sounds
      ORDER BY category, name
    `);
    
    res.json(sounds);
  } catch (error) {
    console.error('Error fetching sounds:', error);
    res.status(500).json({ error: 'Failed to fetch sounds' });
  }
});

// Upload new sound (admin only)
router.post('/upload', authenticateToken, isAdmin, upload.single('sound'), async (req, res) => {
  try {
    const { name, category } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    const db = req.app.get('db');
    const filePath = `/sounds/${file.filename}`;
    
    const result = await db.run(`
      INSERT INTO sounds (name, category, filename, file_path, is_default)
      VALUES (?, ?, ?, ?, 0)
    `, [name, category, file.filename, filePath]);
    
    const sound = await db.get('SELECT * FROM sounds WHERE id = ?', result.lastID);
    
    res.json({
      message: 'Sound uploaded successfully',
      sound
    });
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

// Delete sound (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.get('db');
    
    const sound = await db.get('SELECT * FROM sounds WHERE id = ?', id);
    
    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }
    
    if (sound.is_default) {
      return res.status(400).json({ error: 'Cannot delete default sounds' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '../public', sound.file_path);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Could not delete file:', err);
    }
    
    await db.run('DELETE FROM sounds WHERE id = ?', id);
    
    res.json({ message: 'Sound deleted successfully' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

// Get user sound preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.userId;
    
    const prefs = await db.get(`
      SELECT sound_enabled, sound_volume, check_sound_id, uncheck_sound_id
      FROM user_sound_preferences
      WHERE user_id = ?
    `, userId);
    
    if (!prefs) {
      // Return defaults
      return res.json({
        sound_enabled: false,
        sound_volume: 0.3,
        check_sound_id: null,
        uncheck_sound_id: null
      });
    }
    
    res.json(prefs);
  } catch (error) {
    console.error('Error fetching sound preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user sound preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const userId = req.user.userId;
    const { sound_enabled, sound_volume, check_sound_id, uncheck_sound_id } = req.body;
    
    await db.run(`
      INSERT INTO user_sound_preferences (user_id, sound_enabled, sound_volume, check_sound_id, uncheck_sound_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        sound_enabled = excluded.sound_enabled,
        sound_volume = excluded.sound_volume,
        check_sound_id = excluded.check_sound_id,
        uncheck_sound_id = excluded.uncheck_sound_id
    `, [userId, sound_enabled, sound_volume, check_sound_id, uncheck_sound_id]);
    
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating sound preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
