import React, { useState, useEffect } from 'react';
import { Play, Pause, StopCircle, Clock, TrendingUp, Award } from 'lucide-react';

const ShoppingTimer = ({ itemCount, checkedCount }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [bestTime, setBestTime] = useState(null);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    // Load best time from localStorage
    const saved = localStorage.getItem('bestShoppingTime');
    if (saved) setBestTime(parseInt(saved));
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setSeconds(0);
  };

  const handleStop = () => {
    setIsRunning(false);
    
    // Check if this is a new best time
    if (checkedCount === itemCount && itemCount > 0) {
      if (!bestTime || seconds < bestTime) {
        setBestTime(seconds);
        localStorage.setItem('bestShoppingTime', seconds.toString());
      }
    }
  };

  const efficiency = itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;
  const itemsPerMinute = seconds > 0 ? (checkedCount / (seconds / 60)).toFixed(1) : 0;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Shopping Timer</h3>
        </div>
        {bestTime && (
          <div className="flex items-center space-x-1 text-xs text-purple-600 dark:text-purple-400">
            <Award className="w-4 h-4" />
            <span>Best: {formatTime(bestTime)}</span>
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
          {formatTime(seconds)}
        </div>
        <div className="flex justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-medium">{checkedCount}</span>/{itemCount} items
          </div>
          <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
            <span className="font-medium">{efficiency}%</span> complete
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-2 mb-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsRunning(false)}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
            <button
              onClick={handleStop}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {seconds > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {itemsPerMinute}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">items/min</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {seconds > 0 ? Math.round(seconds / Math.max(checkedCount, 1)) : 0}s
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">per item</div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {checkedCount === itemCount && itemCount > 0 && !isRunning && seconds > 0 && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-center">
          <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-400">
            <Award className="w-5 h-5" />
            <span className="font-semibold">
              {bestTime && seconds < bestTime ? '🎉 New Record!' : 'Shopping Complete!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingTimer;
