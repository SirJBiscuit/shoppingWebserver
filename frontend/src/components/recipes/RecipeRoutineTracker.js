import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Star, Award, Clock } from 'lucide-react';

/**
 * RecipeRoutineTracker - Shows cooking frequency and favorites
 * Features:
 * - Most cooked recipes
 * - Cooking streaks
 * - Favorite recipes
 * - Last cooked date
 * - Routine patterns
 */

const RecipeRoutineTracker = ({ routineData = [] }) => {
  if (routineData.length === 0) {
    return null;
  }

  // Sort by times cooked
  const topRecipes = [...routineData]
    .sort((a, b) => b.times_cooked - b.times_cooked)
    .slice(0, 5);

  const formatLastCooked = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-green-500" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Your Cooking Routine
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topRecipes.map((routine, index) => (
          <motion.div
            key={routine.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-5 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all"
          >
            {/* Rank badge */}
            {index < 3 && (
              <div className="absolute -top-2 -right-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  'bg-orange-600'
                }`}>
                  {index + 1}
                </div>
              </div>
            )}

            {/* Recipe name */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {routine.recipe.recipe_name || routine.recipe.name}
              {routine.is_favorite && <Star className="w-5 h-5 text-yellow-500 fill-current" />}
            </h3>

            {/* Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  Times Cooked
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {routine.times_cooked}x
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Last Made
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatLastCooked(routine.last_cooked_date)}
                </span>
              </div>

              {routine.user_rating && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Your Rating
                  </span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < routine.user_rating
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {routine.average_days_between && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Frequency
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Every {routine.average_days_between} days
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-primary-600 dark:text-primary-400">
                    Cooking Streak
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                <div
                  style={{ width: `${Math.min((routine.times_cooked / 10) * 100, 100)}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary-500 to-primary-600"
                ></div>
              </div>
            </div>

            {/* Typical meal time */}
            {routine.typical_meal_time && (
              <div className="mt-3 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-full text-xs font-semibold text-primary-700 dark:text-primary-300 text-center">
                Usually for {routine.typical_meal_time}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {routineData.reduce((sum, r) => sum + r.times_cooked, 0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Meals Cooked</div>
          </div>
          <div className="h-12 w-px bg-green-300 dark:bg-green-700"></div>
          <div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {routineData.filter(r => r.is_favorite).length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Favorite Recipes</div>
          </div>
          <div className="h-12 w-px bg-green-300 dark:bg-green-700"></div>
          <div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {routineData.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Recipes in Rotation</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeRoutineTracker;
