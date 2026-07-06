import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
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

export default api;
