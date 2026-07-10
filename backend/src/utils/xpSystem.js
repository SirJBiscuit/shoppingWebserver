// ============================================
// XP SYSTEM
// Handles XP earning, penalties, and leveling
// ============================================

const XP_REWARDS = {
  // Complete shopping trip (MAIN SOURCE)
  COMPLETE_TRIP: {
    base: 100,
    perItem: 5,
    bonuses: {
      underBudget: 50,
      allChecked: 25,
      fastShopper: 30,    // < 30 minutes
      weekStreak: 20,
    }
  },
  
  // Only first 3-5 levels get XP for adding items
  ADD_ITEM: {
    levels: [1, 2, 3, 4, 5],
    xp: 2,
    maxPerDay: 50,
  },
  
  // Other activities
  SCAN_RECEIPT: 10,
  CREATE_RECIPE: 15,
  SHARE_LIST: 5,
  DAILY_LOGIN: 5,
  INVITE_FRIEND: 100,
  WEEKLY_STREAK: 50,
};

// XP required per level (exponential growth)
function getXPForLevel(level) {
  if (level === 0) return 0;
  if (level === 1) return 50;
  
  // Formula: base * (level ^ 1.5)
  const base = 50;
  return Math.floor(base * Math.pow(level, 1.5));
}

// Get total XP required to reach a level
function getTotalXPForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

// Calculate level from total XP
function getLevelFromXP(totalXP) {
  let level = 0;
  let xpNeeded = 0;
  
  while (xpNeeded <= totalXP) {
    level++;
    xpNeeded += getXPForLevel(level);
  }
  
  return level - 1;
}

// Get XP progress for current level
function getXPProgress(totalXP) {
  const currentLevel = getLevelFromXP(totalXP);
  const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
  const xpForNextLevel = getTotalXPForLevel(currentLevel + 1);
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  
  return {
    currentLevel,
    currentLevelXP,
    xpNeeded,
    progress: (currentLevelXP / xpNeeded) * 100,
    totalXP
  };
}

// Calculate XP for completing a shopping trip
function calculateTripXP(trip, isPremium = false) {
  let xp = XP_REWARDS.COMPLETE_TRIP.base;
  
  // Per item bonus
  xp += trip.items.length * XP_REWARDS.COMPLETE_TRIP.perItem;
  
  // Under budget bonus
  if (trip.actualCost && trip.budget && trip.actualCost < trip.budget) {
    xp += XP_REWARDS.COMPLETE_TRIP.bonuses.underBudget;
  }
  
  // All items checked bonus
  if (trip.allItemsChecked) {
    xp += XP_REWARDS.COMPLETE_TRIP.bonuses.allChecked;
  }
  
  // Fast shopper bonus (< 30 minutes)
  if (trip.duration && trip.duration < 30 * 60) {
    xp += XP_REWARDS.COMPLETE_TRIP.bonuses.fastShopper;
  }
  
  // Week streak bonus
  if (trip.weekStreak && trip.weekStreak >= 1) {
    xp += XP_REWARDS.COMPLETE_TRIP.bonuses.weekStreak;
  }
  
  // Premium bonus (50% more XP)
  if (isPremium) {
    xp = Math.floor(xp * 1.5);
  }
  
  return xp;
}

// Check if user can earn XP from adding items (levels 1-5 only)
function canEarnAddItemXP(userLevel) {
  return XP_REWARDS.ADD_ITEM.levels.includes(userLevel);
}

// Calculate XP for adding an item
function calculateAddItemXP(isPremium = false) {
  let xp = XP_REWARDS.ADD_ITEM.xp;
  
  // Premium bonus (50% more)
  if (isPremium) {
    xp = Math.floor(xp * 1.5);
  }
  
  return xp;
}

// Calculate XP with premium multiplier
function applyPremiumMultiplier(baseXP, isPremium = false) {
  if (isPremium) {
    return Math.floor(baseXP * 1.5);
  }
  return baseXP;
}

// Get XP reward for an action
function getXPReward(action, isPremium = false) {
  let baseXP = 0;
  
  switch (action) {
    case 'scan_receipt':
      baseXP = XP_REWARDS.SCAN_RECEIPT;
      break;
    case 'create_recipe':
      baseXP = XP_REWARDS.CREATE_RECIPE;
      break;
    case 'share_list':
      baseXP = XP_REWARDS.SHARE_LIST;
      break;
    case 'daily_login':
      baseXP = XP_REWARDS.DAILY_LOGIN;
      break;
    case 'invite_friend':
      baseXP = XP_REWARDS.INVITE_FRIEND;
      break;
    case 'weekly_streak':
      baseXP = XP_REWARDS.WEEKLY_STREAK;
      break;
    default:
      baseXP = 0;
  }
  
  return applyPremiumMultiplier(baseXP, isPremium);
}

// Icon visibility based on level
const ICON_VISIBILITY = {
  0: 10,
  1: 20,
  2: 35,
  3: 50,
  4: 70,
  5: 95,
  6: 125,
  7: 160,
  8: 200,
  9: 245,
  10: 300,
  15: 400,
  20: 500,
  25: 650,
  30: 800,
  40: 1000,
  50: 1200,
  60: 1400,
  70: 1600,
  80: 1800,
  90: 2000,
  100: 9999
};

// Get visible icon count for user level
function getVisibleIconCount(level, isPremium = false) {
  // Premium sees all icons
  if (isPremium) return 9999;
  
  // Find the highest level threshold <= user's level
  const levels = Object.keys(ICON_VISIBILITY).map(Number).sort((a, b) => a - b);
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (level >= levels[i]) {
      return ICON_VISIBILITY[levels[i]];
    }
  }
  
  return 10; // Default
}

// Rarity chances based on level
function getRarityChances(level, isPremium = false) {
  let chances = {};
  
  // Base chances
  if (level <= 10) {
    chances = {
      common: 0.70,
      uncommon: 0.25,
      rare: 0.045,
      epic: 0.005,
      legendary: 0,
      mythical: 0
    };
  } else if (level <= 30) {
    chances = {
      common: 0.60,
      uncommon: 0.25,
      rare: 0.10,
      epic: 0.04,
      legendary: 0.009,
      mythical: 0.001
    };
  } else if (level <= 60) {
    chances = {
      common: 0.50,
      uncommon: 0.30,
      rare: 0.13,
      epic: 0.06,
      legendary: 0.009,
      mythical: 0.001
    };
  } else {
    chances = {
      common: 0.40,
      uncommon: 0.35,
      rare: 0.15,
      epic: 0.08,
      legendary: 0.018,
      mythical: 0.002
    };
  }
  
  // Premium multiplier (3x for rare+)
  if (isPremium) {
    const commonReduction = (chances.rare * 1.5 + chances.epic * 2 + chances.legendary * 2 + chances.mythical * 2) - 
                            (chances.rare + chances.epic + chances.legendary + chances.mythical);
    
    chances.common = Math.max(0.1, chances.common - commonReduction);
    chances.rare *= 1.5;
    chances.epic *= 2;
    chances.legendary *= 2;
    chances.mythical *= 2;
    
    // Normalize to 1.0
    const total = Object.values(chances).reduce((a, b) => a + b, 0);
    for (const key in chances) {
      chances[key] /= total;
    }
  }
  
  return chances;
}

// Roll for rarity based on chances
function rollRarity(chances) {
  const roll = Math.random();
  let cumulative = 0;
  
  for (const [rarity, chance] of Object.entries(chances)) {
    cumulative += chance;
    if (roll <= cumulative) {
      return rarity;
    }
  }
  
  return 'common'; // Fallback
}

// Get number of icons to unlock on level up
function getIconsPerLevelUp(level, isPremium = false) {
  let baseCount = 1;
  
  if (level <= 5) {
    // Levels 1-5: 2-3 icons
    baseCount = Math.random() < 0.5 ? 2 : 3;
  } else if (level <= 10) {
    // Levels 6-10: 1-2 icons
    baseCount = Math.random() < 0.7 ? 1 : 2;
  } else {
    // Level 11+: Chance-based
    const roll = Math.random();
    if (roll < 0.70) baseCount = 1;
    else if (roll < 0.95) baseCount = 2;
    else baseCount = 3;
  }
  
  // Premium bonus: +1 icon
  if (isPremium) {
    baseCount += 1;
  }
  
  return baseCount;
}

module.exports = {
  XP_REWARDS,
  getXPForLevel,
  getTotalXPForLevel,
  getLevelFromXP,
  getXPProgress,
  calculateTripXP,
  canEarnAddItemXP,
  calculateAddItemXP,
  applyPremiumMultiplier,
  getXPReward,
  getVisibleIconCount,
  getRarityChances,
  rollRarity,
  getIconsPerLevelUp,
  ICON_VISIBILITY
};
