import React, { useState, useEffect } from 'react';
import { Plus, Grid, List, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import RecipeFilters from '../components/recipe/RecipeFilters';
import RecipeCard from '../components/recipe/RecipeCard';
import RecipeModal from '../components/RecipeModal';
import InventoryComparisonModal from '../components/recipe/InventoryComparisonModal';
import ConfirmModal from '../components/ConfirmModal';
import recipesAPI from '../services/recipesAPI';

/**
 * RecipesNew - Enhanced recipe page with filters and inventory integration
 */
const RecipesNew = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonRecipe, setComparisonRecipe] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, recipe: null });

  const { success, error: showError, info } = useToast();

  useEffect(() => {
    loadRecipes();
  }, [filters]);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await recipesAPI.getAll(filters);
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      showError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleViewRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeModal(true);
  };

  const handleCheckInventory = async (recipe) => {
    setComparisonRecipe(recipe);
    setShowComparisonModal(true);
  };

  const handleAddToShoppingList = async (recipe) => {
    try {
      const result = await recipesAPI.addToShoppingList(recipe.id);
      success(`Added ${result.added_items.length} items to shopping list!`);
      info('Recipe items have been grouped separately in your shopping list');
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      showError('Failed to add recipe to shopping list');
    }
  };

  const handleAddMissingToList = async (items) => {
    try {
      // This would integrate with shopping list API
      // For now, we'll use the recipe's addToShoppingList
      if (comparisonRecipe) {
        await handleAddToShoppingList(comparisonRecipe);
      }
    } catch (error) {
      console.error('Failed to add items:', error);
      showError('Failed to add items to shopping list');
    }
  };

  const handleToggleFavorite = async (recipeId, isFavorite) => {
    try {
      await recipesAPI.toggleFavorite(recipeId, isFavorite);
      success(isFavorite ? 'Added to favorites!' : 'Removed from favorites');
      loadRecipes();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showError('Failed to update favorite');
    }
  };

  const handleCreateRecipe = async (recipeData) => {
    try {
      await recipesAPI.create(recipeData);
      success('Recipe created successfully!');
      setShowCreateModal(false);
      loadRecipes();
    } catch (error) {
      console.error('Failed to create recipe:', error);
      showError('Failed to create recipe');
    }
  };

  const handleUpdateRecipe = async (recipeData) => {
    try {
      await recipesAPI.update(selectedRecipe.id, recipeData);
      success('Recipe updated successfully!');
      setShowRecipeModal(false);
      setSelectedRecipe(null);
      loadRecipes();
    } catch (error) {
      console.error('Failed to update recipe:', error);
      showError('Failed to update recipe');
    }
  };

  const handleDeleteRecipe = async () => {
    try {
      await recipesAPI.delete(confirmModal.recipe.id);
      success('Recipe deleted successfully!');
      setConfirmModal({ isOpen: false, recipe: null });
      loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      showError('Failed to delete recipe');
    }
  };

  const openDeleteConfirm = (recipe) => {
    setConfirmModal({ isOpen: true, recipe });
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="text-4xl">👨‍🍳</span>
                    Recipe Book
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Discover recipes you can make with your kitchen inventory
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus size={20} />
                  New Recipe
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Grid View"
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="List View"
                >
                  <List size={20} />
                </button>
              </div>

              {/* Filters */}
              <RecipeFilters 
                onFilterChange={handleFilterChange}
                activeFilters={filters}
              />
            </div>

            {/* Recipe Count */}
            {!loading && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} found
                </p>
                {filters.canMake && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                    <Sparkles size={18} />
                    <span>Showing recipes you can make now!</span>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading recipes...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && recipes.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No recipes found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {filters.search || filters.category || filters.cuisine || filters.difficulty
                    ? 'Try adjusting your filters'
                    : 'Create your first recipe to get started!'}
                </p>
                {!filters.search && !filters.category && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Create Recipe
                  </button>
                )}
              </div>
            )}

            {/* Recipe Grid/List */}
            {!loading && recipes.length > 0 && (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onView={handleViewRecipe}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToList={handleAddToShoppingList}
                    onCheckInventory={handleCheckInventory}
                    onDelete={openDeleteConfirm}
                    showInventoryStatus={filters.canMake}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showCreateModal && (
          <RecipeModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateRecipe}
            mode="create"
          />
        )}

        {showRecipeModal && selectedRecipe && (
          <RecipeModal
            isOpen={showRecipeModal}
            onClose={() => {
              setShowRecipeModal(false);
              setSelectedRecipe(null);
            }}
            onSave={handleUpdateRecipe}
            recipe={selectedRecipe}
            mode="edit"
          />
        )}

        {showComparisonModal && comparisonRecipe && (
          <InventoryComparisonModal
            isOpen={showComparisonModal}
            onClose={() => {
              setShowComparisonModal(false);
              setComparisonRecipe(null);
            }}
            recipeId={comparisonRecipe.id}
            recipeName={comparisonRecipe.name}
            onAddToShoppingList={handleAddMissingToList}
          />
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onCancel={() => setConfirmModal({ isOpen: false, recipe: null })}
          onConfirm={handleDeleteRecipe}
          title="Delete Recipe?"
          message={`Are you sure you want to delete "${confirmModal.recipe?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </PageTransition>
  );
};

export default RecipesNew;
