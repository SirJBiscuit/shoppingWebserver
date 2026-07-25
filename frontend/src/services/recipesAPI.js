import api from './api';

/**
 * Recipes API Service
 * Handles all recipe-related API calls including inventory integration
 */

const recipesAPI = {
  // ============================================
  // BASIC RECIPE CRUD
  // ============================================

  /**
   * Get all recipes with optional filters
   * @param {object} filters - { category, cuisine, difficulty, search, favorite, canMake }
   */
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.cuisine) params.append('cuisine', filters.cuisine);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.search) params.append('search', filters.search);
    if (filters.favorite) params.append('favorite', 'true');
    if (filters.canMake) params.append('canMake', 'true');

    const queryString = params.toString();
    const url = queryString ? `/api/recipes?${queryString}` : '/api/recipes';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get single recipe with ingredients
   */
  getById: async (id) => {
    const response = await api.get(`/api/recipes/${id}`);
    return response.data;
  },

  /**
   * Create new recipe
   */
  create: async (recipeData) => {
    const response = await api.post('/api/recipes', recipeData);
    return response.data;
  },

  /**
   * Update existing recipe
   */
  update: async (id, recipeData) => {
    const response = await api.patch(`/api/recipes/${id}`, recipeData);
    return response.data;
  },

  /**
   * Delete recipe
   */
  delete: async (id) => {
    const response = await api.delete(`/api/recipes/${id}`);
    return response.data;
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: async (id, isFavorite) => {
    const response = await api.patch(`/api/recipes/${id}`, { is_favorite: isFavorite });
    return response.data;
  },

  // ============================================
  // RECIPE-INVENTORY INTEGRATION
  // ============================================

  /**
   * Compare recipe with user's inventory
   * Returns matched, insufficient, and missing ingredients
   */
  getInventoryComparison: async (recipeId) => {
    const response = await api.get(`/api/recipes/${recipeId}/inventory-comparison`);
    return response.data;
  },

  /**
   * Get missing ingredients for shopping list
   */
  getMissingIngredients: async (recipeId) => {
    const response = await api.get(`/api/recipes/${recipeId}/missing-ingredients`);
    return response.data;
  },

  /**
   * Find recipes user can make with current inventory
   * @param {number} minMatch - Minimum match percentage (default 100)
   */
  getMakeableRecipes: async (minMatch = 100) => {
    const response = await api.get(`/api/recipes/can-make/list?minMatch=${minMatch}`);
    return response.data;
  },

  /**
   * Mark recipe as cooked and optionally deduct from inventory
   * @param {number} recipeId
   * @param {object} data - { servings_made, rating, notes, deduct_inventory }
   */
  markCooked: async (recipeId, data) => {
    const response = await api.post(`/api/recipes/${recipeId}/mark-cooked`, data);
    return response.data;
  },

  /**
   * Get cooking history for a recipe
   */
  getCookingHistory: async (recipeId) => {
    const response = await api.get(`/api/recipes/${recipeId}/history`);
    return response.data;
  },

  // ============================================
  // METADATA
  // ============================================

  /**
   * Get all recipe categories
   */
  getCategories: async () => {
    const response = await api.get('/api/recipes/meta/categories');
    return response.data;
  },

  /**
   * Get all recipe cuisines
   */
  getCuisines: async () => {
    const response = await api.get('/api/recipes/meta/cuisines');
    return response.data;
  },

  // ============================================
  // RECIPE IMPORT & SEARCH
  // ============================================

  /**
   * Import recipe from URL
   */
  importFromUrl: async (url) => {
    const response = await api.post('/api/recipes/import', { url });
    return response.data;
  },

  /**
   * Search recipes from external sites
   */
  searchExternal: async (query) => {
    const response = await api.get(`/api/recipes/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  /**
   * Get supported recipe sites
   */
  getSupportedSites: async () => {
    const response = await api.get('/api/recipes/supported-sites');
    return response.data;
  },

  // ============================================
  // SHOPPING LIST INTEGRATION
  // ============================================

  /**
   * Add recipe to shopping list
   * @param {number} recipeId
   * @param {number} listId - Optional, creates new list if not provided
   */
  addToShoppingList: async (recipeId, listId = null) => {
    const response = await api.post(`/api/recipes/${recipeId}/to-shopping-list`, { list_id: listId });
    return response.data;
  },

  /**
   * Get recipes associated with a shopping list
   */
  getShoppingListRecipes: async (listId) => {
    const response = await api.get(`/api/recipes/shopping-list/${listId}/recipes`);
    return response.data;
  }
};

export default recipesAPI;
