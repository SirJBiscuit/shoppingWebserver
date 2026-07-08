import React from 'react';
import { ChefHat, Check, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const RecipeCardMini = ({ recipe, onView, showProgress = false }) => {
  const progress = showProgress && recipe.ingredient_count > 0
    ? (recipe.checked_count / recipe.ingredient_count) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-primary-200 dark:border-primary-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onView}
    >
      {/* Recipe Image */}
      {recipe.image_url && (
        <div className="h-32 overflow-hidden">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Recipe Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
              {recipe.name}
            </h3>
            {recipe.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>
          <ChefHat className="w-5 h-5 text-primary-600 dark:text-primary-400 ml-2 flex-shrink-0" />
        </div>

        {/* Recipe Meta */}
        <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
          {recipe.prep_time && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{recipe.prep_time}m</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && recipe.ingredient_count > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                {recipe.checked_count} / {recipe.ingredient_count} ingredients
              </span>
              <span className="text-primary-600 dark:text-primary-400 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              />
            </div>
          </div>
        )}

        {/* Completion Badge */}
        {recipe.is_completed && (
          <div className="mt-2 flex items-center space-x-1 text-green-600 dark:text-green-400 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>All ingredients collected!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RecipeCardMini;
