import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Users, Star, X, Plus, Trash2, Heart } from 'lucide-react';

/**
 * RecipeCardSlider - Horizontal 3D card slider with flip animations
 * Features:
 * - Draggable horizontal carousel
 * - 3D flip card animation (front/back)
 * - Click to zoom with modal
 * - Overlapping card effect
 * - Smooth transitions
 * - Add/Remove animations
 */
const RecipeCardSlider = ({ 
  recipes = [],
  onRecipeClick,
  onAddRecipe,
  onDeleteRecipe,
  onToggleFavorite
}) => {
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [zoomedRecipe, setZoomedRecipe] = useState(null);
  const scrollContainerRef = useRef(null);

  // Toggle card flip
  const handleCardFlip = (recipeId, e) => {
    e.stopPropagation();
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  // Open zoomed modal
  const handleCardClick = (recipe, e) => {
    if (!e.target.closest('.flip-trigger')) {
      setZoomedRecipe(recipe);
    }
  };

  // Close zoomed modal
  const closeZoom = () => {
    setZoomedRecipe(null);
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[difficulty] || colors.medium;
  };

  // Get category emoji
  const getCategoryEmoji = (category) => {
    const emojis = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍽️',
      dessert: '🍰',
      snack: '🍿',
      appetizer: '🥟',
      drink: '🍹',
      other: '🍴'
    };
    return emojis[category] || '🍴';
  };

  return (
    <div className="relative">
      {/* Horizontal Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-8 px-4 scroll-smooth hide-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Add Recipe Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-shrink-0 w-80 h-96 cursor-pointer"
          onClick={onAddRecipe}
        >
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white hover:scale-105 transition-transform duration-300">
            <Plus className="w-16 h-16 mb-4" />
            <h3 className="text-2xl font-bold">Add Recipe</h3>
            <p className="text-sm opacity-90 mt-2">Create a new recipe</p>
          </div>
        </motion.div>

        {/* Recipe Cards */}
        {recipes.map((recipe, index) => {
          const isFlipped = flippedCards.has(recipe.id);
          
          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, x: 50, rotateY: 0 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                rotateY: isFlipped ? 180 : 0
              }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ 
                delay: index * 0.1,
                rotateY: { duration: 0.6 }
              }}
              className="flex-shrink-0 w-80 h-96 perspective-1000"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div 
                className="relative w-full h-full cursor-pointer"
                onClick={(e) => handleCardClick(recipe, e)}
              >
                {/* Front Side */}
                <div
                  className={`absolute w-full h-full backface-hidden ${isFlipped ? 'invisible' : 'visible'}`}
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)'
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow duration-300">
                    {/* Image */}
                    {recipe.image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={recipe.image_url} 
                          alt={recipe.recipe_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <ChefHat className="w-20 h-20 text-white opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">
                          {recipe.recipe_name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(recipe);
                          }}
                          className="ml-2 hover:scale-110 transition-transform"
                        >
                          <Heart 
                            className={`w-6 h-6 ${recipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-3xl">{getCategoryEmoji(recipe.category)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(recipe.difficulty)}`}>
                          {recipe.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{recipe.servings} servings</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleCardFlip(recipe.id, e)}
                        className="flip-trigger w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                      >
                        View Recipe →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className={`absolute w-full h-full backface-hidden ${isFlipped ? 'visible' : 'invisible'}`}
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-2xl p-6 text-white overflow-y-auto">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold">{recipe.recipe_name}</h3>
                      <button
                        onClick={(e) => handleCardFlip(recipe.id, e)}
                        className="flip-trigger hover:scale-110 transition-transform"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Time
                        </h4>
                        <p className="text-sm opacity-90">
                          Prep: {recipe.prep_time || 0} min | Cook: {recipe.cook_time || 0} min
                        </p>
                      </div>

                      {recipe.description && (
                        <div>
                          <h4 className="font-semibold mb-2">Description</h4>
                          <p className="text-sm opacity-90">{recipe.description}</p>
                        </div>
                      )}

                      {recipe.cuisine && (
                        <div>
                          <h4 className="font-semibold mb-2">Cuisine</h4>
                          <p className="text-sm opacity-90">{recipe.cuisine}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecipe(recipe);
                          }}
                          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Zoomed Modal */}
      <AnimatePresence>
        {zoomedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeZoom}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between z-10">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {zoomedRecipe.recipe_name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {(zoomedRecipe.prep_time || 0) + (zoomedRecipe.cook_time || 0)} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {zoomedRecipe.servings} servings
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(zoomedRecipe.difficulty)}`}>
                      {zoomedRecipe.difficulty}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeZoom}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {zoomedRecipe.image_url && (
                  <img 
                    src={zoomedRecipe.image_url} 
                    alt={zoomedRecipe.recipe_name}
                    className="w-full h-64 object-cover rounded-xl mb-6"
                  />
                )}

                {zoomedRecipe.description && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400">{zoomedRecipe.description}</p>
                  </div>
                )}

                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Full recipe details coming soon!</p>
                  <p className="text-sm mt-2">Ingredients and instructions will be displayed here</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default RecipeCardSlider;
