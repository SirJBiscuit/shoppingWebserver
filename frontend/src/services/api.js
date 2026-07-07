import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

export const shoppingAPI = {
  getLists: () => api.get('/shopping/lists'),
  getList: (id) => api.get(`/shopping/lists/${id}`),
  createList: (data) => api.post('/shopping/lists', data),
  addItem: (listId, data) => api.post(`/shopping/lists/${listId}/items`, data),
  updateItem: (listId, itemId, data) => api.patch(`/shopping/lists/${listId}/items/${itemId}`, data),
  deleteItem: (listId, itemId) => api.delete(`/shopping/lists/${listId}/items/${itemId}`),
  completeList: (listId) => api.post(`/shopping/lists/${listId}/complete`),
};

export const suggestionsAPI = {
  getSmartSuggestions: () => api.get('/suggestions/smart-suggestions'),
  searchItems: (query) => api.get('/suggestions/search', { params: { q: query } }),
};

export const inventoryAPI = {
  getInventory: () => api.get('/inventory'),
  updateInventory: (itemId, data) => api.patch(`/inventory/${itemId}`, data),
  getHistory: (itemId) => api.get('/inventory/history', { params: { itemId } }),
  getStatistics: () => api.get('/inventory/statistics'),
};

export const categoriesAPI = {
  getCategories: () => api.get('/categories'),
  getCommonItems: () => api.get('/categories/common-items'),
  searchItems: (query) => api.get('/categories/search-items', { params: { q: query } }),
  lookupItem: (params) => api.get('/categories/item-lookup', { params }),
  addCustomItem: (data) => api.post('/categories/custom-item', data),
};

export const recipesAPI = {
  getRecipes: () => api.get('/recipes'),
  getRecipe: (id) => api.get(`/recipes/${id}`),
  createRecipe: (data) => api.post('/recipes', data),
  updateRecipe: (id, data) => api.patch(`/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/recipes/${id}`),
  checkCanMake: () => api.get('/recipes/can-make/check'),
  recipeToShoppingList: (id, data) => api.post(`/recipes/${id}/to-shopping-list`, data),
};

export const pantryAPI = {
  getPantry: () => api.get('/pantry'),
  addItem: (data) => api.post('/pantry', data),
  addBulk: (data) => api.post('/pantry/bulk', data),
  updateItem: (id, data) => api.patch(`/pantry/${id}`, data),
  deleteItem: (id) => api.delete(`/pantry/${id}`),
  getExpiring: (days) => api.get('/pantry/expiring', { params: { days } }),
};

export const imagesAPI = {
  upload: (formData) => api.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadMultiple: (formData) => api.post('/images/upload-multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getImages: (params) => api.get('/images', { params }),
  deleteImage: (id) => api.delete(`/images/${id}`),
};

export default api;
