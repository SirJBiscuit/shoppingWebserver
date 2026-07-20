const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Get all feature flags (public - for checking user access)
router.get('/flags', auth, async (req, res) => {
  try {
    // Get user's subscription status
    const userResult = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const isPremium = userResult.rows[0]?.subscription_status === 'active' || 
                      userResult.rows[0]?.subscription_status === 'trialing';

    // Get all enabled features
    const result = await db.query(
      `SELECT feature_key, feature_name, description, category, icon, 
              requires_premium, free_tier_enabled, premium_tier_enabled
       FROM feature_flags 
       WHERE is_enabled = TRUE
       ORDER BY display_order, feature_name`
    );

    // Filter features based on user's tier
    const features = result.rows.map(feature => {
      const isAvailable = isPremium 
        ? feature.premium_tier_enabled 
        : feature.free_tier_enabled;

      return {
        key: feature.feature_key,
        name: feature.feature_name,
        description: feature.description,
        category: feature.category,
        icon: feature.icon,
        requiresPremium: feature.requires_premium,
        isAvailable: isAvailable,
        isPremium: isPremium,
      };
    });

    res.json({ features, isPremium });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Get tier limits for current user
router.get('/limits', auth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const isPremium = userResult.rows[0]?.subscription_status === 'active' || 
                      userResult.rows[0]?.subscription_status === 'trialing';
    
    const tier = isPremium ? 'premium' : 'free';

    const result = await db.query(
      'SELECT limit_key, limit_value, description FROM tier_limits WHERE tier_name = $1',
      [tier]
    );

    const limits = {};
    result.rows.forEach(row => {
      limits[row.limit_key] = {
        value: row.limit_value,
        description: row.description,
      };
    });

    res.json({ tier, limits });
  } catch (error) {
    console.error('Error fetching tier limits:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

// Check if specific feature is available to user
router.get('/check/:featureKey', auth, async (req, res) => {
  try {
    const { featureKey } = req.params;

    const userResult = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const isPremium = userResult.rows[0]?.subscription_status === 'active' || 
                      userResult.rows[0]?.subscription_status === 'trialing';

    const featureResult = await db.query(
      `SELECT free_tier_enabled, premium_tier_enabled, requires_premium, is_enabled
       FROM feature_flags WHERE feature_key = $1`,
      [featureKey]
    );

    if (featureResult.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    const feature = featureResult.rows[0];
    const isAvailable = feature.is_enabled && (isPremium 
      ? feature.premium_tier_enabled 
      : feature.free_tier_enabled);

    res.json({
      featureKey,
      isAvailable,
      requiresPremium: feature.requires_premium,
      isPremium,
    });
  } catch (error) {
    console.error('Error checking feature:', error);
    res.status(500).json({ error: 'Failed to check feature' });
  }
});

// ============= ADMIN ROUTES =============

// Admin: Get all features (including disabled)
router.get('/admin/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT * FROM feature_flags ORDER BY category, display_order, feature_name`
    );

    res.json({ features: result.rows });
  } catch (error) {
    console.error('Error fetching all features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Admin: Update feature flag
router.put('/admin/feature/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const {
      feature_name,
      description,
      is_enabled,
      free_tier_enabled,
      premium_tier_enabled,
      requires_premium,
      display_order,
    } = req.body;

    const result = await db.query(
      `UPDATE feature_flags 
       SET feature_name = $1,
           description = $2,
           is_enabled = $3,
           free_tier_enabled = $4,
           premium_tier_enabled = $5,
           requires_premium = $6,
           display_order = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [feature_name, description, is_enabled, free_tier_enabled, 
       premium_tier_enabled, requires_premium, display_order, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    res.json({ feature: result.rows[0] });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// Admin: Get all tier limits
router.get('/admin/limits', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'SELECT * FROM tier_limits ORDER BY tier_name, limit_key'
    );

    res.json({ limits: result.rows });
  } catch (error) {
    console.error('Error fetching tier limits:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

// Admin: Update tier limit
router.put('/admin/limit/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { limit_value, description } = req.body;

    const result = await db.query(
      `UPDATE tier_limits 
       SET limit_value = $1,
           description = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [limit_value, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Limit not found' });
    }

    res.json({ limit: result.rows[0] });
  } catch (error) {
    console.error('Error updating limit:', error);
    res.status(500).json({ error: 'Failed to update limit' });
  }
});

// Admin: Toggle feature on/off quickly
router.post('/admin/toggle/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await db.query(
      `UPDATE feature_flags 
       SET is_enabled = NOT is_enabled,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    res.json({ feature: result.rows[0] });
  } catch (error) {
    console.error('Error toggling feature:', error);
    res.status(500).json({ error: 'Failed to toggle feature' });
  }
});

module.exports = router;
