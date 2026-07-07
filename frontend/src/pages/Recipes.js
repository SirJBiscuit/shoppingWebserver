import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Clock, Users, Trash2, ShoppingCart, Star, Package, LogOut, Settings } from 'lucide-react';
import { recipesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading recipes...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ChefHat className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CloudMC Shop</h1>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <ShoppingCart className="w-5 h-5 mr-1" />
                Shopping
              </button>
              <button
                onClick={() => navigate('/recipes')}
                className="flex items-center text-primary-600 dark:text-primary-400 font-medium"
              >
                <ChefHat className="w-5 h-5 mr-1" />
                Recipes
              </button>
              <button
                onClick={() => navigate('/pantry')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <Package className="w-5 h-5 mr-1" />
                Pantry
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
              >
                <Settings className="w-5 h-5 mr-1" />
                Admin
              </button>
              <span className="text-gray-600 dark:text-gray-300">Welcome, {user?.username}</span>
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ChefHat className="w-8 h-8 mr-3 text-primary-600" />
            My Recipes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your recipes and meal planning</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Recipe
        </button>
      </div>

      {/* What Can I Make Section */}
      {canMake.can_make.length > 0 && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-semibold text-green-900 mb-4">
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
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">
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
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">All Recipes</h2>
        {recipes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <ChefHat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No recipes yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first recipe to get started!</p>
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
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

const RecipeCard = ({ recipe, onAddToList, onToggleFavorite, onDelete, canMake, missingItems }) => {
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

        <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
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
            onClick={() => onDelete(recipe.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Recipes;
