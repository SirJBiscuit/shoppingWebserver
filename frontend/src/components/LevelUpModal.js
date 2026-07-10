import React, { useState, useEffect } from 'react';
import { X, Star, Sparkles, Gift, TrendingUp } from 'lucide-react';

function LevelUpModal({ isOpen, onClose, levelData }) {
  const [showRewards, setShowRewards] = useState(false);
  const [animatedIcons, setAnimatedIcons] = useState([]);

  useEffect(() => {
    if (isOpen && levelData) {
      // Delay showing rewards for dramatic effect
      setTimeout(() => setShowRewards(true), 500);
      
      // Animate icons one by one
      if (levelData.unlockedIcons) {
        levelData.unlockedIcons.forEach((icon, index) => {
          setTimeout(() => {
            setAnimatedIcons(prev => [...prev, icon]);
          }, 1000 + (index * 300));
        });
      }
    } else {
      setShowRewards(false);
      setAnimatedIcons([]);
    }
  }, [isOpen, levelData]);

  if (!isOpen || !levelData) return null;

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'from-gray-400 to-gray-600',
      uncommon: 'from-green-400 to-green-600',
      rare: 'from-blue-400 to-blue-600',
      epic: 'from-purple-400 to-purple-600',
      legendary: 'from-yellow-400 to-yellow-600',
      mythical: 'from-pink-400 to-pink-600'
    };
    return colors[rarity] || colors.common;
  };

  const getRarityGlow = (rarity) => {
    const glows = {
      common: 'shadow-gray-500/50',
      uncommon: 'shadow-green-500/50',
      rare: 'shadow-blue-500/50',
      epic: 'shadow-purple-500/50',
      legendary: 'shadow-yellow-500/50',
      mythical: 'shadow-pink-500/50'
    };
    return glows[rarity] || glows.common;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-pulse"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="relative p-8 text-white">
          {/* Level Up Header */}
          <div className="text-center mb-8">
            <div className="inline-block animate-bounce mb-4">
              <Star className="text-yellow-300" size={64} fill="currentColor" />
            </div>
            
            <h2 className="text-5xl font-bold mb-2 animate-pulse">
              LEVEL UP!
            </h2>
            
            <div className="text-6xl font-black mb-4 text-yellow-300 drop-shadow-lg">
              Level {levelData.newLevel}
            </div>
            
            <p className="text-xl opacity-90">
              Congratulations! You've reached a new level!
            </p>
          </div>

          {/* Rewards Section */}
          {showRewards && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="text-yellow-300" size={24} />
                <h3 className="text-2xl font-bold">Rewards Unlocked</h3>
              </div>

              {/* Unlocked Icons */}
              {levelData.unlockedIcons && levelData.unlockedIcons.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm opacity-80 mb-3">
                    You unlocked {levelData.unlockedIcons.length} new icon{levelData.unlockedIcons.length !== 1 ? 's' : ''}!
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {animatedIcons.map((icon, index) => (
                      <div
                        key={icon.id}
                        className={`relative bg-gradient-to-br ${getRarityColor(icon.rarity)} rounded-lg p-4 shadow-lg ${getRarityGlow(icon.rarity)} transform transition-all duration-500 hover:scale-105`}
                        style={{
                          animation: `slideIn 0.5s ease-out ${index * 0.3}s both`
                        }}
                      >
                        {/* Sparkle Effect */}
                        <div className="absolute top-2 right-2">
                          <Sparkles className="text-white animate-pulse" size={16} />
                        </div>

                        {/* Icon Image */}
                        <div className="bg-white/20 rounded-lg p-3 mb-3">
                          <img
                            src={icon.file_path}
                            alt={icon.item_name}
                            className="w-16 h-16 mx-auto object-contain"
                          />
                        </div>

                        {/* Icon Info */}
                        <div className="text-center">
                          <div className="font-bold text-sm mb-1">{icon.item_name}</div>
                          <div className="text-xs opacity-90 uppercase font-semibold">
                            {icon.rarity}
                          </div>
                          {icon.variant && (
                            <div className="text-xs opacity-75 mt-1">{icon.variant}</div>
                          )}
                        </div>

                        {/* NEW Badge */}
                        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                          NEW
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestone Rewards */}
              {levelData.milestoneRewards && (
                <div className="bg-yellow-400/20 rounded-lg p-4 border-2 border-yellow-400">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="text-yellow-300" size={20} />
                    <h4 className="font-bold text-lg">Milestone Bonus!</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Bonus XP:</span>
                      <span className="font-bold text-yellow-300">
                        +{levelData.milestoneRewards.xpBonus} XP
                      </span>
                    </div>
                    
                    {levelData.milestoneRewards.cosmetics && levelData.milestoneRewards.cosmetics.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Unlocked Cosmetics:</p>
                        <ul className="space-y-1">
                          {levelData.milestoneRewards.cosmetics.map((cosmetic, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-yellow-300">✓</span>
                              <span>{cosmetic.item.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={onClose}
            className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl hover:bg-yellow-300 hover:text-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Continue
          </button>
        </div>

        {/* Confetti Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  );
}

export default LevelUpModal;
