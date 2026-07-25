import React from 'react';

/**
 * RecipeCategoryBadge - Color-coded badges for recipe categories
 */
const RecipeCategoryBadge = ({ category, size = 'md' }) => {
  const categoryConfig = {
    'Breakfast': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🍳' },
    'Lunch': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: '🥗' },
    'Dinner': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: '🍽️' },
    'Dessert': { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400', icon: '🍰' },
    'Snack': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: '🍿' },
    'Appetizer': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: '🥟' },
    'Beverage': { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: '🥤' },
    'Sauce/Condiment': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: '🧂' },
    'Soup/Stew': { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: '🍲' },
    'Salad': { color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400', icon: '🥗' },
    'Side Dish': { color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400', icon: '🍚' },
    'Bread/Baked Goods': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: '🍞' }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const config = categoryConfig[category] || { 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', 
    icon: '📦' 
  };

  if (!category) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      <span>{category}</span>
    </span>
  );
};

/**
 * DifficultyBadge - Badge for recipe difficulty
 */
export const DifficultyBadge = ({ difficulty, size = 'md' }) => {
  const difficultyConfig = {
    'easy': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Easy' },
    'medium': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Medium' },
    'hard': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Hard' }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const config = difficultyConfig[difficulty?.toLowerCase()] || difficultyConfig['medium'];

  if (!difficulty) return null;

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
};

/**
 * CanMakeBadge - Badge showing if user can make the recipe
 */
export const CanMakeBadge = ({ canMake, matchPercentage, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  if (canMake) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ${sizeClasses[size]}`}>
        <span>✓</span>
        <span>Can Make</span>
      </span>
    );
  }

  if (matchPercentage >= 75) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 ${sizeClasses[size]}`}>
        <span>{matchPercentage}%</span>
      </span>
    );
  }

  return null;
};

export default RecipeCategoryBadge;
