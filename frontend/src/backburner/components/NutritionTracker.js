import React, { useState } from 'react';
import { Activity, TrendingUp, Target, AlertCircle, Apple, Flame, Droplet } from 'lucide-react';

const NutritionTracker = ({ item, onUpdateNutrition }) => {
  const [nutrition, setNutrition] = useState(item?.nutrition || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });

  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 50,
    carbs: 275,
    fat: 78
  });

  const calculatePercentage = (value, goal) => {
    return Math.min((value / goal) * 100, 100);
  };

  const getMacroColor = (percentage) => {
    if (percentage >= 100) return 'text-red-600 dark:text-red-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getMacroBarColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary-600" />
          Nutrition Facts
        </h3>
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
          Edit Goals
        </button>
      </div>

      {/* Calories */}
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Calories</span>
          </div>
          <span className={`text-2xl font-bold ${getMacroColor(calculatePercentage(nutrition.calories, goals.calories))}`}>
            {nutrition.calories}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Goal: {goals.calories} cal</span>
          <span>{calculatePercentage(nutrition.calories, goals.calories).toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getMacroBarColor(calculatePercentage(nutrition.calories, goals.calories))}`}
            style={{ width: `${calculatePercentage(nutrition.calories, goals.calories)}%` }}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="space-y-4 mb-6">
        {/* Protein */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Protein</span>
            <span className={`text-sm font-bold ${getMacroColor(calculatePercentage(nutrition.protein, goals.protein))}`}>
              {nutrition.protein}g / {goals.protein}g
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMacroBarColor(calculatePercentage(nutrition.protein, goals.protein))}`}
              style={{ width: `${calculatePercentage(nutrition.protein, goals.protein)}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Carbs</span>
            <span className={`text-sm font-bold ${getMacroColor(calculatePercentage(nutrition.carbs, goals.carbs))}`}>
              {nutrition.carbs}g / {goals.carbs}g
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMacroBarColor(calculatePercentage(nutrition.carbs, goals.carbs))}`}
              style={{ width: `${calculatePercentage(nutrition.carbs, goals.carbs)}%` }}
            />
          </div>
        </div>

        {/* Fat */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fat</span>
            <span className={`text-sm font-bold ${getMacroColor(calculatePercentage(nutrition.fat, goals.fat))}`}>
              {nutrition.fat}g / {goals.fat}g
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMacroBarColor(calculatePercentage(nutrition.fat, goals.fat))}`}
              style={{ width: `${calculatePercentage(nutrition.fat, goals.fat)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Additional Nutrients */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fiber</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{nutrition.fiber}g</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sugar</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{nutrition.sugar}g</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sodium</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{nutrition.sodium}mg</p>
        </div>
      </div>

      {/* Dietary Info */}
      <div className="flex flex-wrap gap-2">
        {item?.dietary_tags?.map((tag, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Allergen Warning */}
      {item?.allergens && item.allergens.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100 text-sm">Contains Allergens</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {item.allergens.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionTracker;
