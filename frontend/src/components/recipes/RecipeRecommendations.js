import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Users, Star, X, ChefHat } from 'lucide-react';

/**
 * RecipeRecommendations - Smart recipe suggestions
 * Features:
 * - Personalized recommendations
 * - Reason for recommendation
 * - Confidence score
 * - Quick add to collection
 * - Dismiss option
 */

const RecipeRecommendations = ({ recommendations = [], onAddRecipe, onDismiss }) => {
  if (recommendations.length === 0) {
    return null;
  }

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'taste_match':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'routine_based':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'seasonal':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      default:
        return <ChefHat className="w-5 h-5 text-primary-600" />;
    }
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'taste_match':
        return 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800';
      case 'routine_based':
        return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
      case 'trending':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
      case 'seasonal':
        return 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800';
      default:
        return 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Recommended for You
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-5 rounded-xl border-2 bg-gradient-to-br ${getRecommendationColor(rec.recommendation_type)}`}
          >
            {/* Dismiss button */}
            <button
              onClick={() => onDismiss(rec.id)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/30 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Recommendation badge */}
            <div className="flex items-center gap-2 mb-3">
              {getRecommendationIcon(rec.recommendation_type)}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                {rec.recommendation_type.replace('_', ' ')}
              </span>
              <span className="ml-auto text-xs font-bold text-primary-600 dark:text-primary-400">
                {rec.recommendation_score}% match
              </span>
            </div>

            {/* Recipe info */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {rec.recipe.recipe_name || rec.recipe.name}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {rec.recommendation_reason}
            </p>

            {/* Recipe details */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
              {rec.recipe.prep_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(rec.recipe.prep_time || 0) + (rec.recipe.cook_time || 0)} min
                </div>
              )}
              {rec.recipe.servings && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {rec.recipe.servings}
                </div>
              )}
              {rec.recipe.difficulty && (
                <span className="px-2 py-1 bg-white/50 dark:bg-black/30 rounded text-xs">
                  {rec.recipe.difficulty}
                </span>
              )}
            </div>

            {/* Add button */}
            <button
              onClick={() => onAddRecipe(rec.recipe)}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Add to My Recipes
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecipeRecommendations;
