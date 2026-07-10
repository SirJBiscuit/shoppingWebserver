import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Award } from 'lucide-react';

function XPProgressBar({ compact = false, showDetails = true }) {
  const [progress, setProgress] = useState(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    fetchProgress();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchProgress, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress) {
      // Animate progress bar
      setTimeout(() => {
        setAnimatedProgress(progress.progress);
      }, 100);
    }
  }, [progress]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/xp/progress', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      // Check for level up
      if (progress && data.currentLevel > progress.currentLevel) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
      
      setProgress(data);
    } catch (error) {
      console.error('Error fetching XP progress:', error);
    }
  };

  if (!progress) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-16'} bg-gray-200 rounded-lg`}></div>
    );
  }

  if (compact) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <Star className="text-yellow-300" size={20} fill="currentColor" />
            <span className="font-bold text-lg">Level {progress.currentLevel}</span>
          </div>
          
          <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-yellow-300 h-full transition-all duration-500 ease-out"
              style={{ width: `${animatedProgress}%` }}
            ></div>
          </div>
          
          <span className="text-sm font-medium">
            {progress.currentLevelXP} / {progress.xpNeeded} XP
          </span>
        </div>

        {showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-bounce bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full font-bold shadow-lg">
              🎉 LEVEL UP! 🎉
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Star className="text-yellow-500" size={24} fill="currentColor" />
            <h3 className="text-2xl font-bold">Level {progress.currentLevel}</h3>
          </div>
          <p className="text-sm text-gray-600">
            {progress.currentLevelXP.toLocaleString()} / {progress.xpNeeded.toLocaleString()} XP
          </p>
        </div>

        {showDetails && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-blue-600 mb-1">
              <TrendingUp size={16} />
              <span className="text-sm font-medium">
                {Math.round(progress.progress)}% to next level
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Total: {progress.totalXP.toLocaleString()} XP
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out relative"
            style={{ width: `${animatedProgress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Milestone markers */}
        <div className="absolute inset-0 flex justify-between px-1">
          {[25, 50, 75].map(marker => (
            <div 
              key={marker}
              className="w-0.5 h-4 bg-white/50"
              style={{ marginLeft: `${marker}%` }}
            ></div>
          ))}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Award size={16} />
            <span>Next reward at Level {progress.currentLevel + 1}</span>
          </div>
          
          <button
            onClick={fetchProgress}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Level Up Animation */}
      {showLevelUp && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
          <div className="animate-bounce">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">🎉 LEVEL UP! 🎉</div>
                <div className="text-2xl font-bold">Level {progress.currentLevel}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default XPProgressBar;
