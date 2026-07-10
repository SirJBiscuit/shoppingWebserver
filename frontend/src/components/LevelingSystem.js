import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Star, Zap, Target, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LevelingSystem = ({ userId }) => {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState([]);

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = () => {
    const saved = localStorage.getItem(`userProgress_${userId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setLevel(data.level || 1);
      setXp(data.xp || 0);
      setTotalXP(data.totalXP || 0);
    }
  };

  const saveProgress = (newLevel, newXP, newTotalXP) => {
    const data = { level: newLevel, xp: newXP, totalXP: newTotalXP };
    localStorage.setItem(`userProgress_${userId}`, JSON.stringify(data));
  };

  const getXPForLevel = (lvl) => {
    return Math.floor(100 * Math.pow(1.5, lvl - 1));
  };

  const addXP = (amount, reason) => {
    const newTotalXP = totalXP + amount;
    let newXP = xp + amount;
    let newLevel = level;
    
    const xpNeeded = getXPForLevel(newLevel);
    
    if (newXP >= xpNeeded) {
      newLevel++;
      newXP = newXP - xpNeeded;
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    
    setXp(newXP);
    setLevel(newLevel);
    setTotalXP(newTotalXP);
    saveProgress(newLevel, newXP, newTotalXP);
    
    // Add achievement notification
    if (reason) {
      setRecentAchievements(prev => [...prev, { reason, xp: amount, time: Date.now() }]);
      setTimeout(() => {
        setRecentAchievements(prev => prev.filter(a => a.time !== Date.now()));
      }, 3000);
    }
  };

  const getProgressPercentage = () => {
    const xpNeeded = getXPForLevel(level);
    return (xp / xpNeeded) * 100;
  };

  const getLevelTitle = () => {
    if (level >= 50) return '🏆 Shopping Legend';
    if (level >= 40) return '👑 Master Shopper';
    if (level >= 30) return '⭐ Expert Shopper';
    if (level >= 20) return '💎 Pro Shopper';
    if (level >= 10) return '🎯 Skilled Shopper';
    if (level >= 5) return '📈 Rising Shopper';
    return '🌱 Novice Shopper';
  };

  const getPerks = () => {
    const perks = [];
    if (level >= 5) perks.push('Unlock Smart Suggestions');
    if (level >= 10) perks.push('Unlock Price History');
    if (level >= 15) perks.push('Unlock Recipe Discovery');
    if (level >= 20) perks.push('Unlock Advanced Stats');
    if (level >= 25) perks.push('Unlock Custom Themes');
    return perks;
  };

  // Expose addXP function globally for other components
  useEffect(() => {
    window.addXP = addXP;
    return () => {
      delete window.addXP;
    };
  }, [xp, level, totalXP]);

  return (
    <>
      {/* Level Display Widget */}
      <div className="card bg-gradient-to-br from-primary-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-600 rounded-full">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Level {level}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getLevelTitle()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {totalXP.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {xp} / {getXPForLevel(level)} XP
            </span>
            <span className="font-medium text-primary-600 dark:text-primary-400">
              {getProgressPercentage().toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-600 to-purple-600 rounded-full"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            {getXPForLevel(level) - xp} XP to Level {level + 1}
          </p>
        </div>

        {/* Perks */}
        {getPerks().length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Unlocked Perks
              </span>
            </div>
            <div className="space-y-1">
              {getPerks().map((perk, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-2xl shadow-2xl text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Trophy className="w-20 h-20 text-white mx-auto mb-4" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-2">LEVEL UP!</h2>
              <p className="text-2xl text-white">Level {level}</p>
              <p className="text-lg text-white/90 mt-2">{getLevelTitle()}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP Notifications */}
      <div className="fixed bottom-4 right-4 z-40 space-y-2">
        <AnimatePresence>
          {recentAchievements.map((achievement) => (
            <motion.div
              key={achievement.time}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2"
            >
              <Award className="w-5 h-5" />
              <div>
                <p className="font-medium">{achievement.reason}</p>
                <p className="text-sm">+{achievement.xp} XP</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

// XP Rewards
export const XP_REWARDS = {
  ADD_ITEM: 5,
  COMPLETE_ITEM: 10,
  COMPLETE_LIST: 50,
  ADD_RECIPE: 25,
  PLAN_MEAL: 30,
  SCAN_BARCODE: 15,
  SHARE_LIST: 20,
  STAY_UNDER_BUDGET: 40,
  PRICE_LEARNED: 15, // For contributing price data
  FIRST_SHOPPING_TRIP: 100,
  STREAK_7_DAYS: 150,
  STREAK_30_DAYS: 500,
};

export default LevelingSystem;
