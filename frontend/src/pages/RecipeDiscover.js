import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shoppingAPI, pantryAPI, recipesAPI } from '../services/api';
import { ArrowLeft, Search, ExternalLink, Clock, Users, ChefHat } from 'lucide-react';
import RecipeDiscovery from '../components/RecipeDiscovery';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const RecipeDiscover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importingRecipe, setImportingRecipe] = useState(null);

  useEffect(() => {
    loadPantryItems();
  }, []);

  const loadPantryItems = async () => {
    try {
      const response = await pantryAPI.getPantry();
      setPantryItems(response.data);
    } catch (error) {
      console.error('Error loading pantry:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRecipes = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await recipesAPI.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching recipes:', error);
      alert('Failed to search recipes');
    } finally {
      setSearching(false);
    }
  };

  const importRecipe = async (url) => {
    setImportingRecipe(url);
    try {
      const response = await recipesAPI.importRecipe(url);
      alert(`Recipe "${response.data.name}" imported successfully!`);
      navigate('/recipes');
    } catch (error) {
      console.error('Error importing recipe:', error);
      alert('Failed to import recipe. Make sure the URL is from a supported recipe site.');
    } finally {
      setImportingRecipe(null);
    }
  };

  const handleAddToShoppingList = async (ingredients) => {
    try {
      // Get active shopping list
      const listsResponse = await shoppingAPI.getLists();
      const activeLists = listsResponse.data.filter(l => l.status === 'active');
      
      let activeList;
      if (activeLists.length === 0) {
        const newListResponse = await shoppingAPI.createList({ 
          name: 'Recipe Ingredients' 
        });
        activeList = newListResponse.data;
      } else {
        activeList = activeLists[0];
      }

      // Add all ingredients
      for (const ingredient of ingredients) {
        await shoppingAPI.addItem(activeList.id, {
          itemName: ingredient.name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || '',
          category: ingredient.category || 'Pantry',
        });
      }

      alert(`Added ${ingredients.length} ingredients to your shopping list!`);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert('Failed to add ingredients to shopping list');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center space-x-3">
                  <Search className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Recipe Discovery
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Find recipes and add missing ingredients
                    </p>
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Recipe Search */}
          <div className="mb-8">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                🔍 Search Recipes from Food Network & AllRecipes
              </h2>
              <form onSubmit={searchRecipes} className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for recipes (e.g., 'chicken pasta', 'chocolate cake')..."
                  className="input-field flex-1"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="btn-primary flex items-center"
                >
                  <Search className="w-5 h-5 mr-2" />
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Search Results ({searchResults.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((recipe, index) => (
                  <div key={index} className="card hover:shadow-xl transition-shadow">
                    {recipe.image && (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                          {recipe.source}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {recipe.title}
                      </h3>
                      {recipe.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => importRecipe(recipe.url)}
                          disabled={importingRecipe === recipe.url}
                          className="btn-primary flex-1 text-sm flex items-center justify-center"
                        >
                          {importingRecipe === recipe.url ? (
                            'Importing...'
                          ) : (
                            <>
                              <ChefHat className="w-4 h-4 mr-1" />
                              Import
                            </>
                          )}
                        </button>
                        <a
                          href={recipe.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-sm flex items-center justify-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xl text-gray-600 dark:text-gray-400">
                Loading pantry...
              </div>
            </div>
          ) : (
            <RecipeDiscovery
              pantryItems={pantryItems}
              onAddToShoppingList={handleAddToShoppingList}
            />
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default RecipeDiscover;
