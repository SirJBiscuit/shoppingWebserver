import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import api from '../../services/api';

/**
 * RecipeFilters - Search and filter component for recipes
 * Integrates with recipe categories, cuisines, and difficulty levels
 */
const RecipeFilters = ({ onFilterChange, activeFilters = {} }) => {
  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [searchTerm, setSearchTerm] = useState(activeFilters.search || '');
  const [selectedCategory, setSelectedCategory] = useState(activeFilters.category || '');
  const [selectedCuisine, setSelectedCuisine] = useState(activeFilters.cuisine || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState(activeFilters.difficulty || '');
  const [showCanMake, setShowCanMake] = useState(activeFilters.canMake || false);
  const [showFavorites, setShowFavorites] = useState(activeFilters.favorite || false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadCategories();
    loadCuisines();
  }, []);

  useEffect(() => {
    // Notify parent of filter changes
    const filters = {
      search: searchTerm,
      category: selectedCategory,
      cuisine: selectedCuisine,
      difficulty: selectedDifficulty,
      canMake: showCanMake,
      favorite: showFavorites
    };
    onFilterChange(filters);
  }, [searchTerm, selectedCategory, selectedCuisine, selectedDifficulty, showCanMake, showFavorites]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/api/recipes/meta/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCuisines = async () => {
    try {
      const response = await api.get('/api/recipes/meta/cuisines');
      setCuisines(response.data);
    } catch (error) {
      console.error('Failed to load cuisines:', error);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedCuisine('');
    setSelectedDifficulty('');
    setShowCanMake(false);
    setShowFavorites(false);
  };

  const hasActiveFilters = searchTerm || selectedCategory || selectedCuisine || selectedDifficulty || showCanMake || showFavorites;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search recipes by name or ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowCanMake(!showCanMake)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showCanMake
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ✓ Can Make Now
        </button>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showFavorites
              ? 'bg-pink-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          ★ Favorites
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
        >
          <Filter size={18} />
          Advanced
          <ChevronDown size={16} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cuisine Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cuisine
            </label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">All Cuisines</option>
              {cuisines.map((cuisine) => (
                <option key={cuisine.id} value={cuisine.name}>
                  {cuisine.icon} {cuisine.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">Active filters:</span>
          {searchTerm && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-sm">
              Search: "{searchTerm}"
            </span>
          )}
          {selectedCategory && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded text-sm">
              {selectedCategory}
            </span>
          )}
          {selectedCuisine && (
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded text-sm">
              {selectedCuisine}
            </span>
          )}
          {selectedDifficulty && (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-sm">
              {selectedDifficulty}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeFilters;
