import api from './api';

const householdAPI = {
  // Members
  getMembers: () => api.get('/household'),
  getMember: (id) => api.get(`/household/${id}`),
  createMember: (data) => api.post('/household', data),
  updateMember: (id, data) => api.put(`/household/${id}`, data),
  deleteMember: (id) => api.delete(`/household/${id}`),

  // Health logs (weight / BMI / muscle)
  logHealth: (memberId, data) => api.post(`/household/${memberId}/health`, data),

  // Water tracking
  logWater: (memberId, amountOz) => api.post(`/household/${memberId}/water`, { amount_oz: amountOz }),

  // Food preferences (tier list)
  saveFoodPref: (memberId, data) => api.post(`/household/${memberId}/foods`, data),
  updateFoodPref: (prefId, data) => api.put(`/household/foods/${prefId}`, data),
  deleteFoodPref: (prefId) => api.delete(`/household/foods/${prefId}`),

  // Traits (likes / dislikes / pet peeves / habits)
  addTrait: (memberId, category, description) =>
    api.post(`/household/${memberId}/traits`, { category, description }),
  updateTrait: (traitId, data) => api.put(`/household/traits/${traitId}`, data),
  deleteTrait: (traitId) => api.delete(`/household/traits/${traitId}`),

  // Chores
  addChore: (memberId, data) => api.post(`/household/${memberId}/chores`, data),
  updateChore: (choreId, data) => api.put(`/household/chores/${choreId}`, data),
  completeChore: (choreId) => api.post(`/household/chores/${choreId}/complete`),
  deleteChore: (choreId) => api.delete(`/household/chores/${choreId}`),

  // Daily calorie intake
  logCalories: (memberId, calories, notes) =>
    api.post(`/household/${memberId}/calories`, { calories, notes }),
  getCalories: (memberId, days = 14) =>
    api.get(`/household/${memberId}/calories`, { params: { days } }),

  // Eating out — log + pattern engine
  getEatOutLogs: () => api.get('/household/eat-out'),
  getEatOutPatterns: () => api.get('/household/eat-out/patterns'),
  logEatOut: (data) => api.post('/household/eat-out', data),
  updateEatOut: (logId, data) => api.put(`/household/eat-out/${logId}`, data),
  deleteEatOut: (logId) => api.delete(`/household/eat-out/${logId}`),

  // Random food generator (per-member + whole household)
  getRandomFood: (memberId) => api.get(`/household/${memberId}/random-food`),
  getHouseholdRandomFood: () => api.get('/household/random-food'),

  // Shopping integration
  getShoppingGuide: () => api.get('/household/shopping-guide'),
  checkItem: (name) => api.get('/household/check-item', { params: { name } })
};

export default householdAPI;
