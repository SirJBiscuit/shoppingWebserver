import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, TrendingUp, Award, Lock, Zap, Crown } from 'lucide-react';

const AchievementsPanel = ({ userStats }) => {
  const [achievements, setAchievements] = useState([]);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(100);

  useEffect(() => {
    loadAchievements();
    calculateLevel();
  }, [userStats]);

  const loadAchievements = () => {
    const allAchievements = [
      {
        id: 1,
        name: 'First Steps',
        description: 'Create your first shopping list',
        icon: '🎯',
        xp: 10,
        unlocked: userStats?.listsCreated >= 1,
        progress: Math.min(userStats?.listsCreated || 0, 1),
        max: 1,
        rarity: 'common'
      },
      {
        id: 2,
        name: 'Shopping Spree',
        description: 'Complete 10 shopping trips',
        icon: '🛒',
        xp: 50,
        unlocked: userStats?.tripsCompleted >= 10,
        progress: userStats?.tripsCompleted || 0,
        max: 10,
        rarity: 'uncommon'
      },
      {
        id: 3,
        name: 'Budget Master',
        description: 'Stay under budget for 5 trips',
        icon: '💰',
        xp: 75,
        unlocked: userStats?.underBudgetTrips >= 5,
        progress: userStats?.underBudgetTrips || 0,
        max: 5,
        rarity: 'rare'
      },
      {
        id: 4,
        name: 'Recipe Explorer',
        description: 'Try 20 different recipes',
        icon: '👨‍🍳',
        xp: 100,
        unlocked: userStats?.recipesCooked >= 20,
        progress: userStats?.recipesCooked || 0,
        max: 20,
        rarity: 'rare'
      },
      {
        id: 5,
        name: 'Pantry Pro',
        description: 'Track 50 pantry items',
        icon: '📦',
        xp: 60,
        unlocked: userStats?.pantryItems >= 50,
        progress: userStats?.pantryItems || 0,
        max: 50,
        rarity: 'uncommon'
      },
      {
        id: 6,
        name: 'Streak Master',
        description: 'Shop 7 days in a row',
        icon: '🔥',
        xp: 150,
        unlocked: userStats?.shoppingStreak >= 7,
        progress: userStats?.shoppingStreak || 0,
        max: 7,
        rarity: 'epic'
      },
      {
        id: 7,
        name: 'Coupon King',
        description: 'Save $100 with coupons',
        icon: '🎟️',
        xp: 200,
        unlocked: userStats?.couponSavings >= 100,
        progress: userStats?.couponSavings || 0,
        max: 100,
        rarity: 'epic'
      },
      {
        id: 8,
        name: 'Zero Waste',
        description: 'No expired items for 30 days',
        icon: '♻️',
        xp: 250,
        unlocked: userStats?.daysNoWaste >= 30,
        progress: userStats?.daysNoWaste || 0,
        max: 30,
        rarity: 'legendary'
      },
      {
        id: 9,
        name: 'Social Shopper',
        description: 'Share 10 lists with friends',
        icon: '👥',
        xp: 80,
        unlocked: userStats?.listsShared >= 10,
        progress: userStats?.listsShared || 0,
        max: 10,
        rarity: 'uncommon'
      },
      {
        id: 10,
        name: 'Speed Shopper',
        description: 'Complete a trip in under 20 minutes',
        icon: '⚡',
        xp: 120,
        unlocked: userStats?.fastestTrip <= 20,
        progress: userStats?.fastestTrip ? Math.max(0, 20 - userStats.fastestTrip) : 0,
        max: 20,
        rarity: 'rare'
      }
    ];

    setAchievements(allAchievements);
  };

  const calculateLevel = () => {
    const totalXp = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.xp, 0);
    
    const newLevel = Math.floor(totalXp / 100) + 1;
    const currentLevelXp = totalXp % 100;
    const nextLevel = newLevel * 100;
    
    setLevel(newLevel);
    setXp(currentLevelXp);
    setNextLevelXp(nextLevel);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      case 'uncommon': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'rare': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'epic': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'legendary': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-600" />
            Achievements
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {unlockedCount} / {totalCount} unlocked
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2 mb-1">
            <Crown className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Level {level}
            </span>
          </div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${(xp / 100) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {xp} / 100 XP
          </p>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              achievement.unlocked
                ? 'border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`text-4xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                {achievement.unlocked ? achievement.icon : '🔒'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {achievement.name}
                  </h3>
                  {achievement.unlocked && (
                    <Award className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {achievement.description}
                </p>
                
                {/* Progress Bar */}
                {!achievement.unlocked && (
                  <div className="mb-2">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(achievement.progress / achievement.max) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {achievement.progress} / {achievement.max}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getRarityColor(achievement.rarity)}`}>
                    {achievement.rarity}
                  </span>
                  <div className="flex items-center space-x-1 text-sm">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      +{achievement.xp} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unlockedCount}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Unlocked</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total XP</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{level}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Level</p>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {Math.round((unlockedCount / totalCount) * 100)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Complete</p>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPanel;
