const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken: auth, isAdmin } = require('../middleware/auth');
const { getUserFeatures, getUserLimits, TIER_HIERARCHY } = require('../middleware/featureAccess');

// Get all feature flags (public - for checking user access)
router.get('/flags', auth, async (req, res) => {
  try {
    // Get user's tier and features
    const userResult = await db.query(
      'SELECT subscription_tier, subscription_status, is_guest FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    const userTier = user?.is_guest ? 'guest' : (user?.subscription_tier || 'free');
    const userTierLevel = TIER_HIERARCHY[userTier] || 0;

    // Get all enabled features
    const result = await db.query(
      `SELECT feature_key, feature_name, description, category, min_tier, is_enabled
       FROM feature_flags 
       WHERE is_enabled = TRUE
       ORDER BY category, feature_name`
    );

    // Filter features based on user's tier
    const features = result.rows.map(feature => {
      const minTierLevel = TIER_HIERARCHY[feature.min_tier] || 0;
      const isAvailable = userTierLevel >= minTierLevel;

      return {
        key: feature.feature_key,
        name: feature.feature_name,
        description: feature.description,
        category: feature.category,
        minTier: feature.min_tier,
        isAvailable: isAvailable,
      };
    });

    res.json({ 
      features, 
      userTier,
      isGuest: user?.is_guest || false
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Get tier limits for current user
router.get('/limits', auth, async (req, res) => {
  try {
    const limits = await getUserLimits(req.user.id);
    
    const userResult = await db.query(
      'SELECT subscription_tier, is_guest FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = userResult.rows[0];
    const tier = user?.is_guest ? 'guest' : (user?.subscription_tier || 'free');

    res.json({ tier, limits, isGuest: user?.is_guest || false });
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
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
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
router.put('/admin/feature/:id', auth, isAdmin, async (req, res) => {
  try {
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
router.get('/admin/limits', auth, isAdmin, async (req, res) => {
  try {
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
router.put('/admin/limit/:id', auth, isAdmin, async (req, res) => {
  try {
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
router.post('/admin/toggle/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id} = req.params;

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

// Admin: Get all tier limits
router.get('/admin/limits/all', auth, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tier_limits ORDER BY tier_name, limit_key'
    );
    res.json({ limits: result.rows });
  } catch (error) {
    console.error('Error fetching all limits:', error);
    res.status(500).json({ error: 'Failed to fetch limits' });
  }
});

// Admin: Get all widgets
router.get('/admin/widgets', auth, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM dashboard_widgets ORDER BY default_position'
    );
    res.json({ widgets: result.rows });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Admin: Update widget
router.put('/admin/widget/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { default_enabled, default_position, min_tier } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (default_enabled !== undefined) {
      updates.push(`default_enabled = $${paramCount++}`);
      values.push(default_enabled);
    }
    if (default_position !== undefined) {
      updates.push(`default_position = $${paramCount++}`);
      values.push(default_position);
    }
    if (min_tier !== undefined) {
      updates.push(`min_tier = $${paramCount++}`);
      values.push(min_tier);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await db.query(
      `UPDATE dashboard_widgets 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    res.json({ widget: result.rows[0] });
  } catch (error) {
    console.error('Error updating widget:', error);
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

module.exports = router;
