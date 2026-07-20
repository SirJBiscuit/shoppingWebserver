const db = require('../database/db');

// Middleware to check if user has active premium subscription
const requirePremium = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    const isPremium = user.subscription_status === 'active' || user.subscription_status === 'trialing';

    if (!isPremium) {
      return res.status(403).json({
        error: 'Premium feature',
        message: 'This feature requires a Premium subscription',
        upgradeUrl: '/premium',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking premium status:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};

// Middleware to add premium status to request
const checkPremiumStatus = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    req.user.isPremium = user.subscription_status === 'active' || user.subscription_status === 'trialing';
    req.user.subscriptionTier = user.subscription_tier;

    next();
  } catch (error) {
    console.error('Error checking premium status:', error);
    req.user.isPremium = false;
    next();
  }
};

// Feature limits for free vs premium
const LIMITS = {
  free: {
    maxLists: 3,
    maxInventoryItems: 50,
    maxRecipes: 10,
    maxStores: 1,
  },
  premium: {
    maxLists: Infinity,
    maxInventoryItems: Infinity,
    maxRecipes: Infinity,
    maxStores: Infinity,
  },
};

// Check if user can create more items based on their tier
const checkLimit = (limitType) => async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT subscription_status FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    const isPremium = user.subscription_status === 'active' || user.subscription_status === 'trialing';
    const tier = isPremium ? 'premium' : 'free';
    const limit = LIMITS[tier][limitType];

    if (limit === Infinity) {
      return next();
    }

    // Check current count based on limit type
    let countQuery;
    switch (limitType) {
      case 'maxLists':
        countQuery = 'SELECT COUNT(*) FROM shopping_lists WHERE user_id = $1';
        break;
      case 'maxInventoryItems':
        countQuery = 'SELECT COUNT(*) FROM inventory WHERE user_id = $1';
        break;
      case 'maxRecipes':
        countQuery = 'SELECT COUNT(*) FROM recipes WHERE user_id = $1';
        break;
      case 'maxStores':
        countQuery = 'SELECT COUNT(*) FROM store_locations WHERE created_by = $1';
        break;
      default:
        return next();
    }

    const countResult = await db.query(countQuery, [req.user.id]);
    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= limit) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `Free tier is limited to ${limit} ${limitType.replace('max', '').toLowerCase()}. Upgrade to Premium for unlimited access.`,
        currentCount,
        limit,
        upgradeUrl: '/premium',
      });
    }

    next();
  } catch (error) {
    console.error('Error checking limit:', error);
    next(); // Allow on error to avoid blocking users
  }
};

module.exports = {
  requirePremium,
  checkPremiumStatus,
  checkLimit,
  LIMITS,
};
