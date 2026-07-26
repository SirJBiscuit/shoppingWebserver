import React, { useState } from 'react';
import { Clock, Users, Heart, ChefHat, ShoppingCart, Eye, Trash2 } from 'lucide-react';
import RecipeCategoryBadge, { DifficultyBadge, CanMakeBadge } from './RecipeCategoryBadge';

/**
 * RecipeCard - Beautiful card for displaying recipes
 * Shows category, difficulty, can make status, and missing ingredients
 */
const RecipeCard = ({ 
  recipe, 
  onView, 
  onToggleFavorite,
  onAddToList,
  onCheckInventory,
  onDelete,
  showInventoryStatus = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const {
    id,
    name,
    description,
    image_url,
    category,
    cuisine,
    difficulty,
    prep_time,
    cook_time,
    servings,
    is_favorite,
    ingredient_count,
    // Inventory comparison data (if available)
    canMake,
    matchPercentage,
    missingCount
  } = recipe;

  const totalTime = (prep_time || 0) + (cook_time || 0);

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(recipe)}
    >
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 overflow-hidden">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat size={64} className="text-gray-400 dark:text-gray-600" />
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(id, !is_favorite);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
            is_favorite
              ? 'bg-pink-500 text-white shadow-lg scale-110'
              : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-pink-500 hover:text-white'
          }`}
        >
          <Heart size={20} fill={is_favorite ? 'currentColor' : 'none'} />
        </button>

        {/* Can Make Badge */}
        {showInventoryStatus && (canMake || matchPercentage >= 75) && (
          <div className="absolute top-3 left-3">
            <CanMakeBadge canMake={canMake} matchPercentage={matchPercentage} />
          </div>
        )}

        {/* Category Badge */}
        {category && (
          <div className="absolute bottom-3 left-3">
            <RecipeCategoryBadge category={category} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Badges Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {difficulty && <DifficultyBadge difficulty={difficulty} size="sm" />}
          {cuisine && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              {cuisine}
            </span>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
          {totalTime > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{totalTime} min</span>
            </div>
          )}
          {servings && (
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>{servings} servings</span>
            </div>
          )}
          {ingredient_count && (
            <div className="flex items-center gap-1">
              <ChefHat size={16} />
              <span>{ingredient_count} ingredients</span>
            </div>
          )}
        </div>

        {/* Inventory Status */}
        {showInventoryStatus && missingCount !== undefined && (
          <div className="mb-3">
            {canMake ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                You have all ingredients!
              </div>
            ) : missingCount > 0 ? (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm font-medium">
                <span className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full"></span>
                Missing {missingCount} ingredient{missingCount !== 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-2 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(recipe);
            }}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            View
          </button>
          {onCheckInventory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCheckInventory(recipe);
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              title="Check Inventory"
            >
              <ChefHat size={16} />
            </button>
          )}
          {onAddToList && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToList(recipe);
              }}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              title="Add to Shopping List"
            >
              <ShoppingCart size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(recipe);
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              title="Delete Recipe"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
