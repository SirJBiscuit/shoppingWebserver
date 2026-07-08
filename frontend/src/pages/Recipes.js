import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Clock, Users, Trash2, ShoppingCart, Star, Package, LogOut, Settings, Edit2, Sparkles } from 'lucide-react';
import { recipesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import RecipeModal from '../components/RecipeModal';

const Recipes = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [canMake, setCanMake] = useState({ can_make: [], can_make_with_few_items: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
    checkCanMake();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await recipesAPI.getRecipes();
      setRecipes(response.data);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanMake = async () => {
    try {
      const response = await recipesAPI.checkCanMake();
      setCanMake(response.data);
    } catch (error) {
      console.error('Failed to check recipes:', error);
    }
  };

  const handleAddToShoppingList = async (recipeId) => {
    try {
      await recipesAPI.recipeToShoppingList(recipeId, {});
      alert('Recipe added to shopping list!');
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      alert('Failed to add recipe to shopping list');
    }
  };

  const handleToggleFavorite = async (recipe) => {
    try {
      await recipesAPI.updateRecipe(recipe.id, { is_favorite: !recipe.is_favorite });
      fetchRecipes();
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await recipesAPI.deleteRecipe(id);
        fetchRecipes();
        checkCanMake();
      } catch (error) {
        console.error('Failed to delete recipe:', error);
      }
    }
  };

  const handleCreateRecipe = async (recipeData) => {
    try {
      await recipesAPI.createRecipe(recipeData);
      fetchRecipes();
      checkCanMake();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create recipe:', error);
      alert('Failed to create recipe');
    }
  };

  const handleEditRecipe = async (recipeData) => {
    try {
      await recipesAPI.updateRecipe(selectedRecipe.id, recipeData);
      fetchRecipes();
      checkCanMake();
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Failed to update recipe:', error);
      alert('Failed to update recipe');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading recipes...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="lg:ml-72">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <ChefHat className="w-8 h-8 text-primary-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Recipes</h1>
              </div>
              <button
                onClick={() => navigate('/discover')}
                className="btn-secondary flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                AI Recipe Generator
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Recipe
              </button>
            </div>
          </div>

            {/* What Can I Make Section */}
            {canMake.can_make.length > 0 && (
              <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
                  ✨ You can make these recipes now!
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {canMake.can_make.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToList={handleAddToShoppingList}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteRecipe}
                      canMake={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Almost There Section */}
            {canMake.can_make_with_few_items.length > 0 && (
              <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
                  🛒 Just a few items away
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {canMake.can_make_with_few_items.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToList={handleAddToShoppingList}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteRecipe}
                      missingItems={recipe.missing_ingredients}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Recipes */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">All Recipes</h2>
              {recipes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 text-lg">No recipes yet</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Create your first recipe to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToList={handleAddToShoppingList}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteRecipe}
                      onEdit={setSelectedRecipe}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Modals */}
            <RecipeModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSave={handleCreateRecipe}
            />
            
            <RecipeModal
              isOpen={!!selectedRecipe}
              onClose={() => setSelectedRecipe(null)}
              onSave={handleEditRecipe}
              recipe={selectedRecipe}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const RecipeCard = ({ recipe, onAddToList, onToggleFavorite, onDelete, onEdit, canMake, missingItems }) => {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">{recipe.name}</h3>
          <button
            onClick={() => onToggleFavorite(recipe)}
            className="ml-2"
          >
            <Star
              className={`w-5 h-5 ${
                recipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
              }`}
            />
          </button>
        </div>

        {recipe.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4 mb-3">
          {recipe.prep_time && (
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {recipe.prep_time + (recipe.cook_time || 0)} min
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {recipe.servings} servings
            </div>
          )}
        </div>

        {canMake && (
          <div className="mb-3 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full inline-block">
            ✓ Ready to make!
          </div>
        )}

        {missingItems && (
          <div className="mb-3">
            <p className="text-xs text-yellow-700 mb-1">Missing:</p>
            <div className="flex flex-wrap gap-1">
              {missingItems.map((item, idx) => (
                <span key={idx} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  {item.item_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={() => onAddToList(recipe.id)}
            className="btn-secondary flex-1 text-sm flex items-center justify-center"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Add to List
          </button>
          <button
            onClick={() => onEdit(recipe)}
            className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            title="Edit recipe"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(recipe.id)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Recipes;
