import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const BudgetTracker = ({ items, totalCost, listId }) => {
  const [budget, setBudget] = useState(100);
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [tempBudget, setTempBudget] = useState('100');

  const remaining = budget - totalCost;
  const percentUsed = (totalCost / budget) * 100;
  const isOverBudget = totalCost > budget;
  const isNearBudget = percentUsed > 80 && !isOverBudget;

  // Load budget from localStorage (per-list)
  useEffect(() => {
    if (listId) {
      const saved = localStorage.getItem(`shoppingBudget_${listId}`);
      if (saved) {
        setBudget(parseFloat(saved));
        setTempBudget(saved);
      } else {
        // Default budget
        setBudget(100);
        setTempBudget('100');
      }
    }
  }, [listId]);

  const saveBudget = () => {
    const newBudget = parseFloat(tempBudget) || 100;
    setBudget(newBudget);
    if (listId) {
      localStorage.setItem(`shoppingBudget_${listId}`, newBudget.toString());
    }
    setShowBudgetInput(false);
  };

  const getCategoryBreakdown = () => {
    const breakdown = {};
    
    items.forEach(item => {
      const category = item.category_name || item.category || 'Other';
      const itemCost = (item.price || 0) * (item.quantity || 1);
      
      if (!breakdown[category]) {
        breakdown[category] = 0;
      }
      breakdown[category] += itemCost;
    });

    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-600 dark:text-red-400';
    if (isNearBudget) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    if (isOverBudget) return 'bg-red-500';
    if (isNearBudget) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="card bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Budget Tracker
          </h3>
        </div>
        
        <button
          onClick={() => setShowBudgetInput(!showBudgetInput)}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {showBudgetInput ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Budget Input */}
      {showBudgetInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4"
        >
          <div className="flex space-x-2">
            <input
              type="number"
              value={tempBudget}
              onChange={(e) => setTempBudget(e.target.value)}
              className="input-field flex-1"
              placeholder="Enter budget"
              step="0.01"
              min="0"
            />
            <button onClick={saveBudget} className="btn-primary">
              Save
            </button>
          </div>
        </motion.div>
      )}

      {/* Budget Overview */}
      <div className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${budget.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Budget</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              ${totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Spent</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor()}`}>
              ${Math.abs(remaining).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {isOverBudget ? 'Over' : 'Left'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {Math.min(percentUsed, 100).toFixed(0)}% used
            </span>
            {isOverBudget && (
              <span className="flex items-center text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Over budget!
              </span>
            )}
            {isNearBudget && (
              <span className="flex items-center text-yellow-600 dark:text-yellow-400 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Near limit
              </span>
            )}
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentUsed, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full ${getProgressColor()} transition-colors`}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        {items.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Top Categories
            </div>
            {getCategoryBreakdown().map(([category, cost]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{category}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${cost.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({((cost / totalCost) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Savings Tip */}
        {!isOverBudget && remaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800 dark:text-green-300">
                  Great job staying under budget!
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You're saving ${remaining.toFixed(2)} this trip
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Over Budget Warning */}
        {isOverBudget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800 dark:text-red-300">
                  You're over budget
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Consider removing ${Math.abs(remaining).toFixed(2)} worth of items
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;
