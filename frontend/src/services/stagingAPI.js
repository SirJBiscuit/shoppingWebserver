import api from './api';

const stagingAPI = {
  // Get all staging area items
  getStagingItems: () => api.get('/staging'),

  // Move shopping list to staging
  moveFromShoppingList: (listId) => api.post(`/staging/from-shopping-list/${listId}`),

  // Get suggestions for a staging item
  getSuggestions: (stagingItemId) => api.get(`/staging/${stagingItemId}/suggestions`),

  // Put away single item
  putAwayItem: (stagingItemId) => api.post(`/staging/${stagingItemId}/put-away`),

  // Put away all items
  putAwayAll: () => api.post('/staging/put-away-all'),

  // Remove item from staging
  removeItem: (stagingItemId) => api.delete(`/staging/${stagingItemId}`),

  // Resolve a suggestion
  resolveSuggestion: (suggestionId, actionType) => 
    api.post(`/staging/suggestions/${suggestionId}/resolve`, { actionType }),

  // Get suggestions summary
  getSuggestionsSummary: () => api.get('/staging/suggestions/summary')
};

export default stagingAPI;
