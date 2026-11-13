import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Clock, Users, Trash2, ShoppingCart, Star, Package, LogOut, Settings, Edit2, Sparkles, GraduationCap, Layers, Library } from 'lucide-react';
import { recipesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import RecipeModal from '../components/RecipeModal';
import RecipeCardSlider from '../components/recipes/RecipeCardSlider';
import RecipeRolodex from '../components/recipes/RecipeRolodex';
import TeachableRecipe from '../components/recipes/TeachableRecipe';
import QuickRecipeTemplates from '../components/recipes/QuickRecipeTemplates';
import ConfirmModal from '../limbo/modals/ConfirmModal';

const Recipes = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [canMake, setCanMake] = useState({ can_make: [], can_make_with_few_items: [] });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const [showTeach, setShowTeach] = useState(false);
  const [deckView, setDeckView] = useState('rolodex'); // 'rolodex' | 'slider'
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  /* ---- auto shelves ---- */
  const totalMin = (r) => (r.total_time || (r.prep_time || 0) + (r.cook_time || 0));
  const isSmoothie = (r) =>
    /smoothie|shake/i.test(r.category || '') ||
    (r.tags || []).some((t) => /smoothie|shake/i.test(t)) ||
    /smoothie|milkshake/i.test(r.name || '');

  const shelves = [
    { id: 'love', label: 'Recipes We Love', emoji: '💛',
      items: recipes.filter((r) => r.is_favorite) },
    { id: 'canmake', label: 'Recipes We Can Make', emoji: '✅',
      items: canMake.can_make },
    { id: 'smoothie', label: 'Smoothie Recipes', emoji: '🥤',
      items: recipes.filter(isSmoothie) },
    { id: 'easy', label: 'Easy Meals', emoji: '⚡',
      items: recipes.filter((r) => r.difficulty === 'easy' || totalMin(r) <= 30) },
    { id: 'favmeals', label: 'Favorite Meals', emoji: '⭐',
      items: recipes.filter((r) => (r.rating || 0) >= 4 && !isSmoothie(r)) },
  ];

  const handleDeleteRecipe = (id) => setDeleteTarget(id);

  const confirmDeleteRecipe = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    if (!id) return;
    try {
      await recipesAPI.deleteRecipe(id);
      fetchRecipes();
      checkCanMake();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTeach(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  title="Step-by-step quick recipe entry"
                >
                  <GraduationCap className="w-5 h-5" />
                  Teach
                </button>
                <button
                  onClick={() => setShowQuickTemplates(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <ChefHat className="w-5 h-5" />
                  Quick Add
                </button>
                <button
                  onClick={() => navigate('/discover')}
                  className="btn-secondary flex items-center"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI Generator
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Custom Recipe
                </button>
              </div>
            </div>

            {/* Recipe deck — flip-book rolodex or horizontal slider */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ChefHat className="w-6 h-6 text-primary-600" />
                  Recipe Collection
                </h2>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setDeckView('rolodex')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${deckView === 'rolodex' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Flip-book rolodex"
                  >
                    <Library className="w-3.5 h-3.5" /> Rolodex
                  </button>
                  <button
                    onClick={() => setDeckView('slider')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${deckView === 'slider' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Horizontal card slider"
                  >
                    <Layers className="w-3.5 h-3.5" /> Slider
                  </button>
                </div>
              </div>
              {deckView === 'rolodex' ? (
                <RecipeRolodex
                  recipes={recipes}
                  onAddRecipe={() => setShowCreateModal(true)}
                  onDeleteRecipe={handleDeleteRecipe}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToList={handleAddToShoppingList}
                />
              ) : (
                <RecipeCardSlider
                  recipes={recipes}
                  onAddRecipe={() => setShowCreateModal(true)}
                  onDeleteRecipe={handleDeleteRecipe}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
            </div>

            {/* Recipe shelves — auto-categorized collections */}
            {shelves.map((shelf) => shelf.items.length > 0 && (
              <div key={shelf.id} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{shelf.emoji}</span>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{shelf.label}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold">{shelf.items.length}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {shelf.items.map((recipe) => (
                    <ShelfCard
                      key={recipe.id}
                      recipe={recipe}
                      onOpen={setSelectedRecipe}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToList={handleAddToShoppingList}
                    />
                  ))}
                </div>
              </div>
            ))}

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

            {/* Quick Recipe Templates */}
            {showQuickTemplates && (
              <QuickRecipeTemplates
                onAddRecipe={handleCreateRecipe}
                onClose={() => setShowQuickTemplates(false)}
              />
            )}

            {/* Teachable Recipe wizard */}
            <TeachableRecipe
              isOpen={showTeach}
              onClose={() => setShowTeach(false)}
              onSave={handleCreateRecipe}
            />

            <ConfirmModal
              isOpen={deleteTarget !== null}
              title="Delete recipe?"
              message="This recipe and its ingredients will be removed. This can't be undone."
              confirmText="Delete"
              type="danger"
              onConfirm={confirmDeleteRecipe}
              onCancel={() => setDeleteTarget(null)}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

/** Compact shelf card — click opens the recipe editor, ⭐ toggles favorite, 🛒 adds to list. */
const ShelfCard = ({ recipe, onOpen, onToggleFavorite, onAddToList }) => {
  const mins = (recipe.total_time || (recipe.prep_time || 0) + (recipe.cook_time || 0));
  return (
    <div
      onClick={() => onOpen(recipe)}
      className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer overflow-hidden"
    >
      {recipe.image_url && !recipe.image_url.startsWith('emoji:') ? (
        <img src={recipe.image_url} alt={recipe.name} className="w-full h-20 object-cover" />
      ) : (
        <div className="w-full h-20 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
          <span className="text-3xl">{recipe.image_url?.startsWith('emoji:') ? recipe.image_url.slice(6) : '🍽️'}</span>
        </div>
      )}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">{recipe.name}</h4>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe); }}
            className="flex-shrink-0"
          >
            <Star className={`w-3.5 h-3.5 ${recipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          {mins > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{mins}m
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onAddToList(recipe.id); }}
            className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-0.5 hover:bg-primary-100 dark:hover:bg-primary-900/50"
          >
            <ShoppingCart className="w-3 h-3" /> List
          </button>
        </div>
      </div>
    </div>
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
