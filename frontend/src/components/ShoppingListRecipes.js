import React, { useState, useEffect } from 'react';
import { ChefHat, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RecipeCardMini from './RecipeCardMini';
import RecipeModal from './RecipeModal';
import { recipesAPI } from '../services/api';

const ShoppingListRecipes = ({ listId }) => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (listId) {
      loadRecipes();
    }
  }, [listId]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipesAPI.getShoppingListRecipes(listId);
      setRecipes(response.data);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipe = async (recipe) => {
    try {
      const response = await recipesAPI.getRecipe(recipe.id);
      setSelectedRecipe(response.data);
      setShowRecipeModal(true);
    } catch (error) {
      console.error('Error loading recipe details:', error);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <ChefHat className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recipes
          </h2>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return null; // Don't show section if no recipes
  }

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ChefHat className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shopping for {recipes.length} {recipes.length === 1 ? 'Recipe' : 'Recipes'}
            </h2>
          </div>
          <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
            {recipes.filter(r => r.is_completed).length} completed
          </span>
        </div>

        {/* Recipe Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {recipes.map((recipe) => (
              <RecipeCardMini
                key={recipe.id}
                recipe={recipe}
                showProgress={true}
                onView={() => handleViewRecipe(recipe)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Helper Text */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>💡 Tip:</strong> Items from these recipes are marked in your shopping list. 
            Check them off as you shop to track your progress!
          </p>
        </div>
      </div>

      {/* Recipe Detail Modal */}
      {showRecipeModal && selectedRecipe && (
        <RecipeModal
          isOpen={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setSelectedRecipe(null);
          }}
          recipe={selectedRecipe}
          onSave={() => {
            setShowRecipeModal(false);
            setSelectedRecipe(null);
          }}
        />
      )}
    </>
  );
};

export default ShoppingListRecipes;
