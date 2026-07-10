const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { parseIconFilename, validateIconFilename, getRarityColor } = require('../utils/iconParser');
const { 
  getVisibleIconCount, 
  getRarityChances, 
  rollRarity, 
  getIconsPerLevelUp 
} = require('../utils/xpSystem');
const db = require('../database/db');

// Configure multer for icon uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/icons');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const validation = validateIconFilename(file.originalname);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join(', ')));
    }
  }
});

// ============================================
// ICON ROUTES
// ============================================

// Get all icons (admin only - sees everything)
router.get('/icons/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rarity, category, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM icons WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (rarity && rarity !== 'all') {
      query += ` AND rarity = $${paramCount}`;
      params.push(rarity);
      paramCount++;
    }
    
    if (category && category !== 'all') {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (search) {
      query += ` AND item_name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    query += ` ORDER BY quality_tier DESC, rarity, item_name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const icons = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM icons WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;
    
    if (rarity && rarity !== 'all') {
      countQuery += ` AND rarity = $${countParamCount}`;
      countParams.push(rarity);
      countParamCount++;
    }
    
    if (category && category !== 'all') {
      countQuery += ` AND category = $${countParamCount}`;
      countParams.push(category);
      countParamCount++;
    }
    
    if (search) {
      countQuery += ` AND item_name ILIKE $${countParamCount}`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      icons: icons.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching icons:', error);
    res.status(500).json({ error: 'Failed to fetch icons' });
  }
});

// Get icon statistics (admin)
router.get('/icons/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rarity = 'common') as common,
        COUNT(*) FILTER (WHERE rarity = 'uncommon') as uncommon,
        COUNT(*) FILTER (WHERE rarity = 'rare') as rare,
        COUNT(*) FILTER (WHERE rarity = 'epic') as epic,
        COUNT(*) FILTER (WHERE rarity = 'legendary') as legendary,
        COUNT(*) FILTER (WHERE rarity = 'mythical') as mythical,
        COUNT(*) FILTER (WHERE animated = true) as animated,
        COUNT(*) FILTER (WHERE has_particles = true) as with_particles,
        COUNT(*) FILTER (WHERE premium_only = true) as premium_only
      FROM icons
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching icon stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Bulk upload icons (admin)
router.post('/icons/admin/bulk-upload', authenticateToken, isAdmin, upload.array('icons', 100), async (req, res) => {
  try {
    const uploadedIcons = [];
    const errors = [];
    
    for (const file of req.files) {
      try {
        // Parse filename
        const parsed = parseIconFilename(file.originalname);
        
        // Insert into database
        const result = await db.query(`
          INSERT INTO icons (
            item_name, rarity, variant, category, filename, file_path,
            quality_tier, min_level, animated, has_particles, has_sound, premium_only
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (filename) DO UPDATE SET
            item_name = EXCLUDED.item_name,
            rarity = EXCLUDED.rarity,
            variant = EXCLUDED.variant,
            category = EXCLUDED.category,
            quality_tier = EXCLUDED.quality_tier,
            min_level = EXCLUDED.min_level,
            animated = EXCLUDED.animated,
            has_particles = EXCLUDED.has_particles,
            has_sound = EXCLUDED.has_sound,
            premium_only = EXCLUDED.premium_only
          RETURNING *
        `, [
          parsed.itemName,
          parsed.rarity,
          parsed.variant,
          parsed.category,
          parsed.filename,
          `/icons/${parsed.filename}`,
          parsed.qualityTier,
          parsed.minLevel,
          parsed.animated,
          parsed.hasParticles,
          parsed.hasSound,
          parsed.premiumOnly
        ]);
        
        uploadedIcons.push(result.rows[0]);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      uploaded: uploadedIcons.length,
      icons: uploadedIcons,
      errors
    });
  } catch (error) {
    console.error('Error uploading icons:', error);
    res.status(500).json({ error: 'Failed to upload icons' });
  }
});

// Get user's icon collection
router.get('/icons/my-collection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const icons = await db.query(`
      SELECT i.*, ui.unlocked_at, ui.unlock_method, ui.is_favorite
      FROM user_icons ui
      JOIN icons i ON ui.icon_id = i.id
      WHERE ui.user_id = $1
      ORDER BY ui.unlocked_at DESC
    `, [userId]);
    
    // Get stats
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE i.rarity = 'common') as common,
        COUNT(*) FILTER (WHERE i.rarity = 'uncommon') as uncommon,
        COUNT(*) FILTER (WHERE i.rarity = 'rare') as rare,
        COUNT(*) FILTER (WHERE i.rarity = 'epic') as epic,
        COUNT(*) FILTER (WHERE i.rarity = 'legendary') as legendary,
        COUNT(*) FILTER (WHERE i.rarity = 'mythical') as mythical
      FROM user_icons ui
      JOIN icons i ON ui.icon_id = i.id
      WHERE ui.user_id = $1
    `, [userId]);
    
    res.json({
      icons: icons.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user icons:', error);
    res.status(500).json({ error: 'Failed to fetch icon collection' });
  }
});

// Get available icons (user can see based on level)
router.get('/icons/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, rarity } = req.query;
    
    // Get user level and premium status
    const user = await db.query('SELECT level, is_premium FROM users WHERE id = $1', [userId]);
    const userLevel = user.rows[0].level;
    const isPremium = user.rows[0].is_premium;
    
    // Get visible icon count
    const visibleCount = getVisibleIconCount(userLevel, isPremium);
    
    // Build query
    let query = `
      SELECT i.*, 
        CASE WHEN ui.icon_id IS NOT NULL THEN true ELSE false END as unlocked
      FROM icons i
      LEFT JOIN user_icons ui ON i.id = ui.icon_id AND ui.user_id = $1
      WHERE i.id <= (SELECT id FROM icons ORDER BY id LIMIT 1 OFFSET $2)
    `;
    const params = [userId, visibleCount - 1];
    let paramCount = 3;
    
    if (category && category !== 'all') {
      query += ` AND i.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (rarity && rarity !== 'all') {
      query += ` AND i.rarity = $${paramCount}`;
      params.push(rarity);
      paramCount++;
    }
    
    query += ' ORDER BY i.quality_tier, i.rarity, i.item_name';
    
    const icons = await db.query(query, params);
    
    res.json({
      icons: icons.rows,
      visibleCount,
      userLevel,
      isPremium
    });
  } catch (error) {
    console.error('Error fetching available icons:', error);
    res.status(500).json({ error: 'Failed to fetch available icons' });
  }
});

// Unlock icon for user (internal - called by level up system)
router.post('/icons/unlock', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { iconId, method = 'manual' } = req.body;
    
    // Check if already unlocked
    const existing = await db.query(
      'SELECT * FROM user_icons WHERE user_id = $1 AND icon_id = $2',
      [userId, iconId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Icon already unlocked' });
    }
    
    // Unlock icon
    const result = await db.query(`
      INSERT INTO user_icons (user_id, icon_id, unlock_method)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, iconId, method]);
    
    // Get icon details
    const icon = await db.query('SELECT * FROM icons WHERE id = $1', [iconId]);
    
    res.json({
      success: true,
      icon: icon.rows[0],
      unlockData: result.rows[0]
    });
  } catch (error) {
    console.error('Error unlocking icon:', error);
    res.status(500).json({ error: 'Failed to unlock icon' });
  }
});

// ============================================
// CART SKINS ROUTES
// ============================================

// Get all cart skins
router.get('/cart-skins', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const skins = await db.query(`
      SELECT cs.*, 
        CASE WHEN ucs.cart_skin_id IS NOT NULL THEN true ELSE false END as unlocked,
        ucs.is_active
      FROM cart_skins cs
      LEFT JOIN user_cart_skins ucs ON cs.id = ucs.cart_skin_id AND ucs.user_id = $1
      ORDER BY cs.min_level, cs.name
    `, [userId]);
    
    res.json({ skins: skins.rows });
  } catch (error) {
    console.error('Error fetching cart skins:', error);
    res.status(500).json({ error: 'Failed to fetch cart skins' });
  }
});

// Set active cart skin
router.post('/cart-skins/activate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skinId } = req.body;
    
    // Check if user owns this skin
    const owned = await db.query(
      'SELECT * FROM user_cart_skins WHERE user_id = $1 AND cart_skin_id = $2',
      [userId, skinId]
    );
    
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'Skin not unlocked' });
    }
    
    // Deactivate all skins
    await db.query('UPDATE user_cart_skins SET is_active = false WHERE user_id = $1', [userId]);
    
    // Activate selected skin
    await db.query(
      'UPDATE user_cart_skins SET is_active = true WHERE user_id = $1 AND cart_skin_id = $2',
      [userId, skinId]
    );
    
    // Update user customization
    await db.query(`
      INSERT INTO user_customization (user_id, active_cart_skin_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET active_cart_skin_id = $2
    `, [userId, skinId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error activating cart skin:', error);
    res.status(500).json({ error: 'Failed to activate cart skin' });
  }
});

// ============================================
// COLOR THEMES ROUTES
// ============================================

// Get all color themes
router.get('/themes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const themes = await db.query(`
      SELECT ct.*, 
        CASE WHEN uct.theme_id IS NOT NULL THEN true ELSE false END as unlocked,
        uct.is_active
      FROM color_themes ct
      LEFT JOIN user_color_themes uct ON ct.id = uct.theme_id AND uct.user_id = $1
      ORDER BY ct.min_level, ct.name
    `, [userId]);
    
    res.json({ themes: themes.rows });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Set active theme
router.post('/themes/activate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { themeId } = req.body;
    
    // Check if user owns this theme
    const owned = await db.query(
      'SELECT * FROM user_color_themes WHERE user_id = $1 AND theme_id = $2',
      [userId, themeId]
    );
    
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'Theme not unlocked' });
    }
    
    // Deactivate all themes
    await db.query('UPDATE user_color_themes SET is_active = false WHERE user_id = $1', [userId]);
    
    // Activate selected theme
    await db.query(
      'UPDATE user_color_themes SET is_active = true WHERE user_id = $1 AND theme_id = $2',
      [userId, themeId]
    );
    
    // Update user customization
    await db.query(`
      INSERT INTO user_customization (user_id, active_theme_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET active_theme_id = $2
    `, [userId, themeId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error activating theme:', error);
    res.status(500).json({ error: 'Failed to activate theme' });
  }
});

// ============================================
// USER CUSTOMIZATION
// ============================================

// Get user's active customization
router.get('/customization', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const customization = await db.query(`
      SELECT 
        uc.*,
        cs.name as cart_skin_name,
        cs.image_path as cart_skin_image,
        ct.name as theme_name,
        ct.primary_color,
        ct.secondary_color,
        ct.accent_color,
        ns.name as note_style_name,
        bs.name as border_style_name,
        bp.name as background_name,
        ca.name as check_animation_name
      FROM user_customization uc
      LEFT JOIN cart_skins cs ON uc.active_cart_skin_id = cs.id
      LEFT JOIN color_themes ct ON uc.active_theme_id = ct.id
      LEFT JOIN note_styles ns ON uc.active_note_style_id = ns.id
      LEFT JOIN border_styles bs ON uc.active_border_style_id = bs.id
      LEFT JOIN background_patterns bp ON uc.active_background_id = bp.id
      LEFT JOIN check_animations ca ON uc.active_check_animation_id = ca.id
      WHERE uc.user_id = $1
    `, [userId]);
    
    if (customization.rows.length === 0) {
      // Create default customization
      await db.query('INSERT INTO user_customization (user_id) VALUES ($1)', [userId]);
      return res.json({ customization: null });
    }
    
    res.json({ customization: customization.rows[0] });
  } catch (error) {
    console.error('Error fetching customization:', error);
    res.status(500).json({ error: 'Failed to fetch customization' });
  }
});

module.exports = router;
