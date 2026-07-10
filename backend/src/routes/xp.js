const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  getXPProgress,
  calculateTripXP,
  canEarnAddItemXP,
  calculateAddItemXP,
  getXPReward,
  getIconsPerLevelUp,
  getRarityChances,
  rollRarity
} = require('../utils/xpSystem');
const db = require('../database/db');

// ============================================
// XP TRANSACTION ROUTES
// ============================================

// Get user XP history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const transactions = await db.query(`
      SELECT * FROM user_xp_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    
    res.json({ transactions: transactions.rows });
  } catch (error) {
    console.error('Error fetching XP history:', error);
    res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});

// Get XP progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await db.query('SELECT xp, level FROM users WHERE id = $1', [userId]);
    const totalXP = user.rows[0].xp || 0;
    
    const progress = getXPProgress(totalXP);
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching XP progress:', error);
    res.status(500).json({ error: 'Failed to fetch XP progress' });
  }
});

// Award XP for adding item (only levels 1-5)
router.post('/add-item', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, listId } = req.body;
    
    // Get user level and premium status
    const user = await db.query('SELECT level, is_premium, xp FROM users WHERE id = $1', [userId]);
    const userLevel = user.rows[0].level;
    const isPremium = user.rows[0].is_premium;
    
    // Check if user can earn XP from adding items
    if (!canEarnAddItemXP(userLevel)) {
      return res.json({ xp: 0, message: 'No XP for adding items at this level' });
    }
    
    // Check daily cap
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayXP = await db.query(`
      SELECT COALESCE(SUM(xp_amount), 0) as total
      FROM user_xp_transactions
      WHERE user_id = $1 
        AND action = 'add_item'
        AND created_at >= $2
    `, [userId, today]);
    
    const dailyXP = parseInt(todayXP.rows[0].total);
    const maxDaily = isPremium ? 75 : 50;
    
    if (dailyXP >= maxDaily) {
      return res.json({ xp: 0, message: 'Daily XP cap reached' });
    }
    
    // Calculate XP
    const xp = calculateAddItemXP(isPremium);
    
    // Record transaction
    await db.query(`
      INSERT INTO user_xp_transactions (user_id, item_id, list_id, xp_amount, action)
      VALUES ($1, $2, $3, $4, 'add_item')
    `, [userId, itemId, listId, xp]);
    
    // Add XP to user
    const newXP = user.rows[0].xp + xp;
    await db.query('UPDATE users SET xp = $1 WHERE id = $2', [newXP, userId]);
    
    // Check for level up
    const progress = getXPProgress(newXP);
    if (progress.currentLevel > userLevel) {
      await handleLevelUp(userId, progress.currentLevel, isPremium);
    }
    
    res.json({ xp, totalXP: newXP, progress });
  } catch (error) {
    console.error('Error awarding add item XP:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// Remove XP for removing item
router.post('/remove-item', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, listId } = req.body;
    
    // Find the XP transaction for this item
    const transaction = await db.query(`
      SELECT xp_amount 
      FROM user_xp_transactions
      WHERE user_id = $1 
        AND item_id = $2 
        AND list_id = $3
        AND action = 'add_item'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, itemId, listId]);
    
    if (transaction.rows.length === 0) {
      return res.json({ xp: 0, message: 'No XP to remove' });
    }
    
    const xpToRemove = transaction.rows[0].xp_amount;
    
    // Record removal transaction
    await db.query(`
      INSERT INTO user_xp_transactions (user_id, item_id, list_id, xp_amount, action)
      VALUES ($1, $2, $3, $4, 'remove_item')
    `, [userId, itemId, listId, -xpToRemove]);
    
    // Remove XP from user (but don't go below 0)
    const user = await db.query('SELECT xp FROM users WHERE id = $1', [userId]);
    const newXP = Math.max(0, user.rows[0].xp - xpToRemove);
    await db.query('UPDATE users SET xp = $1 WHERE id = $2', [newXP, userId]);
    
    res.json({ xpRemoved: xpToRemove, totalXP: newXP });
  } catch (error) {
    console.error('Error removing XP:', error);
    res.status(500).json({ error: 'Failed to remove XP' });
  }
});

// Award XP for completing shopping trip
router.post('/complete-trip', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tripData } = req.body;
    
    // Get user info
    const user = await db.query('SELECT level, is_premium, xp FROM users WHERE id = $1', [userId]);
    const isPremium = user.rows[0].is_premium;
    
    // Calculate XP
    const xp = calculateTripXP(tripData, isPremium);
    
    // Record transaction
    await db.query(`
      INSERT INTO user_xp_transactions (user_id, xp_amount, action, metadata)
      VALUES ($1, $2, 'complete_trip', $3)
    `, [userId, xp, JSON.stringify(tripData)]);
    
    // Add XP to user
    const newXP = user.rows[0].xp + xp;
    await db.query('UPDATE users SET xp = $1 WHERE id = $2', [newXP, userId]);
    
    // Check for level up
    const progress = getXPProgress(newXP);
    const userLevel = user.rows[0].level;
    
    let levelUpRewards = null;
    if (progress.currentLevel > userLevel) {
      levelUpRewards = await handleLevelUp(userId, progress.currentLevel, isPremium);
    }
    
    res.json({ 
      xp, 
      totalXP: newXP, 
      progress,
      levelUp: levelUpRewards
    });
  } catch (error) {
    console.error('Error awarding trip XP:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// Award XP for other actions
router.post('/award', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { action, metadata = {} } = req.body;
    
    // Get user info
    const user = await db.query('SELECT level, is_premium, xp FROM users WHERE id = $1', [userId]);
    const isPremium = user.rows[0].is_premium;
    
    // Get XP reward
    const xp = getXPReward(action, isPremium);
    
    if (xp === 0) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Record transaction
    await db.query(`
      INSERT INTO user_xp_transactions (user_id, xp_amount, action, metadata)
      VALUES ($1, $2, $3, $4)
    `, [userId, xp, action, JSON.stringify(metadata)]);
    
    // Add XP to user
    const newXP = user.rows[0].xp + xp;
    await db.query('UPDATE users SET xp = $1 WHERE id = $2', [newXP, userId]);
    
    // Check for level up
    const progress = getXPProgress(newXP);
    const userLevel = user.rows[0].level;
    
    let levelUpRewards = null;
    if (progress.currentLevel > userLevel) {
      levelUpRewards = await handleLevelUp(userId, progress.currentLevel, isPremium);
    }
    
    res.json({ 
      xp, 
      totalXP: newXP, 
      progress,
      levelUp: levelUpRewards
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

// ============================================
// LEVEL UP HANDLER
// ============================================

async function handleLevelUp(userId, newLevel, isPremium) {
  try {
    // Update user level
    await db.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, userId]);
    
    // Determine how many icons to unlock
    const iconCount = getIconsPerLevelUp(newLevel, isPremium);
    
    // Get rarity chances
    const rarityChances = getRarityChances(newLevel, isPremium);
    
    // Unlock random icons
    const unlockedIcons = [];
    
    for (let i = 0; i < iconCount; i++) {
      const rarity = rollRarity(rarityChances);
      
      // Get a random icon of this rarity that user doesn't have
      const availableIcons = await db.query(`
        SELECT i.* 
        FROM icons i
        WHERE i.id NOT IN (
          SELECT icon_id FROM user_icons WHERE user_id = $1
        )
        AND i.rarity = $2
        AND i.min_level <= $3
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId, rarity, newLevel]);
      
      if (availableIcons.rows.length > 0) {
        const icon = availableIcons.rows[0];
        
        // Unlock icon
        await db.query(`
          INSERT INTO user_icons (user_id, icon_id, unlock_method)
          VALUES ($1, $2, 'level_up')
        `, [userId, icon.id]);
        
        unlockedIcons.push(icon);
      }
    }
    
    // Check for milestone rewards (every 10 levels)
    let milestoneRewards = null;
    if (newLevel % 10 === 0) {
      milestoneRewards = await handleMilestoneRewards(userId, newLevel, isPremium);
    }
    
    return {
      newLevel,
      unlockedIcons,
      milestoneRewards
    };
  } catch (error) {
    console.error('Error handling level up:', error);
    throw error;
  }
}

// Handle milestone rewards (every 10 levels)
async function handleMilestoneRewards(userId, level, isPremium) {
  const rewards = {
    xpBonus: level * 10,
    cosmetics: []
  };
  
  // Award bonus XP
  await db.query(`
    INSERT INTO user_xp_transactions (user_id, xp_amount, action, metadata)
    VALUES ($1, $2, 'milestone_bonus', $3)
  `, [userId, rewards.xpBonus, JSON.stringify({ level })]);
  
  await db.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [rewards.xpBonus, userId]);
  
  // Unlock milestone cosmetics based on level
  // Cart skins
  const cartSkin = await db.query(
    'SELECT * FROM cart_skins WHERE min_level = $1 LIMIT 1',
    [level]
  );
  
  if (cartSkin.rows.length > 0) {
    await db.query(`
      INSERT INTO user_cart_skins (user_id, cart_skin_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, cartSkin.rows[0].id]);
    
    rewards.cosmetics.push({ type: 'cart_skin', item: cartSkin.rows[0] });
  }
  
  // Color themes
  const theme = await db.query(
    'SELECT * FROM color_themes WHERE min_level = $1 LIMIT 1',
    [level]
  );
  
  if (theme.rows.length > 0) {
    await db.query(`
      INSERT INTO user_color_themes (user_id, theme_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, theme.rows[0].id]);
    
    rewards.cosmetics.push({ type: 'theme', item: theme.rows[0] });
  }
  
  return rewards;
}

module.exports = router;
