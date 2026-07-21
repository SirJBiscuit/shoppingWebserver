const db = require('../database/db');

// Tier hierarchy: guest < free < premium
const TIER_HIERARCHY = {
  guest: 0,
  free: 1,
  premium: 2
};

/**
 * Check if user has access to a feature based on their tier
 */
const hasFeatureAccess = async (userId, featureKey) => {
  try {
    // Get user's tier
    const userResult = await db.query(
      'SELECT subscription_tier, is_guest FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return false;
    }

    const user = userResult.rows[0];
    const userTier = user.is_guest ? 'guest' : (user.subscription_tier || 'free');

    // Get feature requirements
    const featureResult = await db.query(
      'SELECT is_enabled, min_tier FROM feature_flags WHERE feature_key = $1',
      [featureKey]
    );

    if (featureResult.rows.length === 0) {
      // Feature doesn't exist in flags, allow by default
      return true;
    }

    const feature = featureResult.rows[0];

    // Check if feature is enabled globally
    if (!feature.is_enabled) {
      return false;
    }

    // Check if user's tier meets minimum requirement
    const userTierLevel = TIER_HIERARCHY[userTier] || 0;
    const minTierLevel = TIER_HIERARCHY[feature.min_tier] || 0;

    return userTierLevel >= minTierLevel;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

/**
 * Get all features accessible to a user
 */
const getUserFeatures = async (userId) => {
  try {
    const userResult = await db.query(
      'SELECT subscription_tier, is_guest FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    const userTier = user.is_guest ? 'guest' : (user.subscription_tier || 'free');
    const userTierLevel = TIER_HIERARCHY[userTier] || 0;

    // Get all enabled features that user has access to
    const featuresResult = await db.query(
      `SELECT feature_key, feature_name, description, category, min_tier
       FROM feature_flags
       WHERE is_enabled = true`
    );

    // Filter by tier access
    const accessibleFeatures = featuresResult.rows.filter(feature => {
      const minTierLevel = TIER_HIERARCHY[feature.min_tier] || 0;
      return userTierLevel >= minTierLevel;
    });

    return accessibleFeatures;
  } catch (error) {
    console.error('Error getting user features:', error);
    return [];
  }
};

/**
 * Get tier limits for a user
 */
const getUserLimits = async (userId) => {
  try {
    const userResult = await db.query(
      'SELECT subscription_tier, is_guest FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return {};
    }

    const user = userResult.rows[0];
    const userTier = user.is_guest ? 'guest' : (user.subscription_tier || 'free');

    const limitsResult = await db.query(
      'SELECT limit_key, limit_value FROM tier_limits WHERE tier_name = $1',
      [userTier]
    );

    const limits = {};
    limitsResult.rows.forEach(row => {
      limits[row.limit_key] = row.limit_value;
    });

    return limits;
  } catch (error) {
    console.error('Error getting user limits:', error);
    return {};
  }
};

/**
 * Middleware to check feature access
 */
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await hasFeatureAccess(req.user.id, featureKey);

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Feature not available',
        featureKey,
        message: 'This feature is not available on your current plan'
      });
    }

    next();
  };
};

module.exports = {
  hasFeatureAccess,
  getUserFeatures,
  getUserLimits,
  requireFeature,
  TIER_HIERARCHY
};
