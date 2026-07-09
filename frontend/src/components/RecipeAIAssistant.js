import React, { useState } from 'react';
import { Sparkles, ChefHat, Clock, Users, TrendingUp, Lightbulb, RefreshCw, Heart } from 'lucide-react';

const RecipeAIAssistant = ({ pantryItems = [], preferences = {} }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'any',
    time: 'any',
    dietary: []
  });

  const generateSuggestions = async () => {
    setLoading(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock AI-generated recipes based on pantry items
    const mockSuggestions = [
      {
        id: 1,
        name: 'Creamy Pasta Carbonara',
        matchScore: 95,
        ingredients: pantryItems.slice(0, 5).map(item => item.item_name),
        missingIngredients: ['Bacon', 'Parmesan'],
        difficulty: 'Easy',
        time: 25,
        servings: 4,
        calories: 450,
        image: '🍝',
        tags: ['Italian', 'Comfort Food'],
        aiReason: 'You have most ingredients and this matches your preference for quick meals'
      },
      {
        id: 2,
        name: 'Chicken Stir-Fry',
        matchScore: 88,
        ingredients: pantryItems.slice(0, 6).map(item => item.item_name),
        missingIngredients: ['Soy Sauce'],
        difficulty: 'Easy',
        time: 20,
        servings: 3,
        calories: 380,
        image: '🍗',
        tags: ['Asian', 'Healthy'],
        aiReason: 'High protein, low prep time, uses vegetables from your pantry'
      },
      {
        id: 3,
        name: 'Mediterranean Salad Bowl',
        matchScore: 82,
        ingredients: pantryItems.slice(0, 4).map(item => item.item_name),
        missingIngredients: ['Feta Cheese', 'Olives'],
        difficulty: 'Very Easy',
        time: 15,
        servings: 2,
        calories: 320,
        image: '🥗',
        tags: ['Healthy', 'Vegetarian'],
        aiReason: 'Perfect for a light meal, uses fresh produce you already have'
      }
    ];

    setSuggestions(mockSuggestions);
    setLoading(false);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Very Easy': return 'text-green-600 dark:text-green-400';
      case 'Easy': return 'text-blue-600 dark:text-blue-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-purple-600" />
            AI Recipe Assistant
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Smart suggestions based on your pantry
          </p>
        </div>
        <button
          onClick={generateSuggestions}
          disabled={loading || pantryItems.length === 0}
          className="btn-primary flex items-center disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Get Suggestions
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty
          </label>
          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="input-field"
          >
            <option value="any">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Time
          </label>
          <select
            value={filters.time}
            onChange={(e) => setFilters({ ...filters, time: e.target.value })}
            className="input-field"
          >
            <option value="any">Any</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dietary
          </label>
          <select className="input-field">
            <option value="">Any</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="gluten-free">Gluten-Free</option>
            <option value="keto">Keto</option>
          </select>
        </div>
      </div>

      {/* Pantry Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Items in Pantry</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pantryItems.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">AI Confidence</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {suggestions.length > 0 ? '95%' : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4 animate-pulse">
            <Sparkles className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">AI is analyzing your pantry...</p>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((recipe) => (
            <div
              key={recipe.id}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start space-x-4">
                {/* Recipe Image */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center text-4xl">
                    {recipe.image}
                  </div>
                </div>

                {/* Recipe Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {recipe.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded">
                          {recipe.matchScore}% Match
                        </span>
                        <span className={`text-sm font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                          {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>

                  {/* AI Reason */}
                  <div className="flex items-start space-x-2 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">{recipe.aiReason}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {recipe.time} min
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {recipe.servings} servings
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {recipe.calories} cal
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      You have: {recipe.ingredients.slice(0, 3).join(', ')}
                      {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
                    </p>
                    {recipe.missingIngredients.length > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Missing: {recipe.missingIngredients.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipe.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button className="btn-primary text-sm flex items-center">
                      <ChefHat className="w-4 h-4 mr-1" />
                      View Recipe
                    </button>
                    <button className="btn-secondary text-sm">
                      Add Missing Items to List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {pantryItems.length === 0
              ? 'Add items to your pantry to get AI recipe suggestions'
              : 'Click "Get Suggestions" to discover recipes you can make'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RecipeAIAssistant;
