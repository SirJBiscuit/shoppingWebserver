import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Target, Edit2, Save, X } from 'lucide-react';

const BudgetGoals = ({ currentSpending = 0, onUpdateBudget }) => {
  const [monthlyBudget, setMonthlyBudget] = useState(500);
  const [categoryBudgets, setCategoryBudgets] = useState({
    'Produce': 100,
    'Meat': 150,
    'Dairy': 75,
    'Snacks': 50,
    'Beverages': 50,
    'Other': 75
  });
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState(monthlyBudget);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('budgetGoals');
    if (saved) {
      const data = JSON.parse(saved);
      setMonthlyBudget(data.monthlyBudget || 500);
      setCategoryBudgets(data.categoryBudgets || categoryBudgets);
    }
  }, []);

  const saveBudget = () => {
    setMonthlyBudget(tempBudget);
    const data = { monthlyBudget: tempBudget, categoryBudgets };
    localStorage.setItem('budgetGoals', JSON.stringify(data));
    setIsEditing(false);
    if (onUpdateBudget) onUpdateBudget(tempBudget);
  };

  const percentageUsed = (currentSpending / monthlyBudget) * 100;
  const remaining = monthlyBudget - currentSpending;
  const isOverBudget = currentSpending > monthlyBudget;
  const isWarning = percentageUsed > 80 && !isOverBudget;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Target className="w-5 h-5 mr-2 text-primary-600" />
          Monthly Budget
        </h3>
        {!isEditing ? (
          <button
            onClick={() => {
              setTempBudget(monthlyBudget);
              setIsEditing(true);
            }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={saveBudget}
              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Budget Amount */}
      <div className="mb-6">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">$</span>
            <input
              type="number"
              value={tempBudget}
              onChange={(e) => setTempBudget(parseFloat(e.target.value) || 0)}
              className="input-field text-2xl font-bold w-32"
              min="0"
              step="10"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">/ month</span>
          </div>
        ) : (
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${monthlyBudget.toFixed(2)}
            <span className="text-sm text-gray-600 dark:text-gray-400 font-normal ml-2">/ month</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Spent this month</span>
          <span className={`text-sm font-semibold ${
            isOverBudget ? 'text-red-600 dark:text-red-400' :
            isWarning ? 'text-yellow-600 dark:text-yellow-400' :
            'text-green-600 dark:text-green-400'
          }`}>
            ${currentSpending.toFixed(2)} ({percentageUsed.toFixed(0)}%)
          </span>
        </div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isOverBudget ? 'bg-red-500' :
              isWarning ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className={`p-3 rounded-lg border ${
        isOverBudget 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
          : isWarning
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      }`}>
        <div className="flex items-start space-x-2">
          {isOverBudget ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          ) : isWarning ? (
            <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          ) : (
            <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`font-semibold text-sm ${
              isOverBudget ? 'text-red-900 dark:text-red-100' :
              isWarning ? 'text-yellow-900 dark:text-yellow-100' :
              'text-green-900 dark:text-green-100'
            }`}>
              {isOverBudget 
                ? `Over budget by $${Math.abs(remaining).toFixed(2)}`
                : isWarning
                ? 'Approaching budget limit'
                : `$${remaining.toFixed(2)} remaining`
              }
            </p>
            <p className={`text-xs mt-1 ${
              isOverBudget ? 'text-red-700 dark:text-red-300' :
              isWarning ? 'text-yellow-700 dark:text-yellow-300' :
              'text-green-700 dark:text-green-300'
            }`}>
              {isOverBudget 
                ? 'Consider reducing spending or adjusting your budget'
                : isWarning
                ? 'You\'ve used over 80% of your monthly budget'
                : 'You\'re on track with your budget goals'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Daily Avg</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${(currentSpending / new Date().getDate()).toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Projected</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${((currentSpending / new Date().getDate()) * 30).toFixed(2)}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Days Left</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {30 - new Date().getDate()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetGoals;
