import React, { useState } from 'react';
import { Search, Plus, Clock, Users, ChefHat, ShoppingCart, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RecipeDiscovery = ({ onAddToShoppingList, pantryItems = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Using Spoonacular API (you'll need an API key)
  const searchRecipes = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // For demo, using mock data. Replace with actual API call:
      // const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?query=${searchQuery}&apiKey=YOUR_API_KEY&addRecipeInformation=true&number=12`);
      
      // Mock data for demonstration
      const mockRecipes = [
        {
          id: 1,
          title: `${searchQuery} Pasta`,
          image: 'https://via.placeholder.com/300x200?text=Pasta',
          readyInMinutes: 30,
          servings: 4,
          sourceUrl: '#',
          extendedIngredients: [
            { name: 'pasta', amount: 1, unit: 'lb' },
            { name: 'tomato sauce', amount: 2, unit: 'cups' },
            { name: 'garlic', amount: 3, unit: 'cloves' },
            { name: 'olive oil', amount: 2, unit: 'tbsp' },
          ],
        },
        {
          id: 2,
          title: `Grilled ${searchQuery}`,
          image: 'https://via.placeholder.com/300x200?text=Grilled',
          readyInMinutes: 25,
          servings: 2,
          sourceUrl: '#',
          extendedIngredients: [
            { name: searchQuery.toLowerCase(), amount: 2, unit: 'pieces' },
            { name: 'salt', amount: 1, unit: 'tsp' },
            { name: 'pepper', amount: 1, unit: 'tsp' },
            { name: 'lemon', amount: 1, unit: 'piece' },
          ],
        },
        {
          id: 3,
          title: `${searchQuery} Salad`,
          image: 'https://via.placeholder.com/300x200?text=Salad',
          readyInMinutes: 15,
          servings: 4,
          sourceUrl: '#',
          extendedIngredients: [
            { name: 'lettuce', amount: 1, unit: 'head' },
            { name: searchQuery.toLowerCase(), amount: 2, unit: 'cups' },
            { name: 'dressing', amount: 0.5, unit: 'cup' },
          ],
        },
      ];

      setRecipes(mockRecipes);
    } catch (error) {
      console.error('Error searching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPantryAvailability = (ingredients) => {
    const available = [];
    const missing = [];

    ingredients.forEach(ingredient => {
      const inPantry = pantryItems.some(item => 
        item.item_name.toLowerCase().includes(ingredient.name.toLowerCase())
      );
      
      if (inPantry) {
        available.push(ingredient);
      } else {
        missing.push(ingredient);
      }
    });

    return { available, missing };
  };

  const handleAddMissingToList = (recipe) => {
    const { missing } = checkPantryAvailability(recipe.extendedIngredients);
    
    if (missing.length > 0) {
      onAddToShoppingList(missing.map(ing => ({
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        category: 'Pantry',
      })));
      
      alert(`Added ${missing.length} missing ingredients to your shopping list!`);
    } else {
      alert('You have all ingredients in your pantry!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <ChefHat className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recipe Discovery
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
              placeholder="Search for recipes (e.g., chicken, pasta, salad)..."
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={searchRecipes}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💡 Tip: We'll check your pantry and add missing ingredients to your shopping list!
        </p>
      </div>

      {/* Recipe Results */}
      <AnimatePresence>
        {recipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {recipes.map((recipe) => {
              const { available, missing } = checkPantryAvailability(recipe.extendedIngredients);
              const availabilityPercent = (available.length / recipe.extendedIngredients.length) * 100;

              return (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {/* Recipe Image */}
                  <div className="relative mb-4">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {availabilityPercent === 100 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        ✓ All in Pantry
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {recipe.title}
                  </h3>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {recipe.readyInMinutes} min
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {recipe.servings} servings
                    </div>
                  </div>

                  {/* Ingredient Availability */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">
                        {available.length}/{recipe.extendedIngredients.length} in pantry
                      </span>
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {availabilityPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 dark:bg-primary-400 h-2 rounded-full transition-all"
                        style={{ width: `${availabilityPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {missing.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddMissingToList(recipe);
                        }}
                        className="btn-primary flex-1 text-sm flex items-center justify-center"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Add {missing.length} Items
                      </button>
                    )}
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn-secondary text-sm flex items-center justify-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {selectedRecipe.title}
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Ingredients
                  </h3>
                  <div className="space-y-1">
                    {selectedRecipe.extendedIngredients.map((ing, index) => {
                      const inPantry = pantryItems.some(item => 
                        item.item_name.toLowerCase().includes(ing.name.toLowerCase())
                      );
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded ${
                            inPantry 
                              ? 'bg-green-50 dark:bg-green-900/20' 
                              : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <span className="text-sm text-gray-900 dark:text-white">
                            {ing.amount} {ing.unit} {ing.name}
                          </span>
                          {inPantry && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ In Pantry
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleAddMissingToList(selectedRecipe);
                    setSelectedRecipe(null);
                  }}
                  className="w-full btn-primary"
                >
                  Add Missing Ingredients to Shopping List
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecipeDiscovery;
