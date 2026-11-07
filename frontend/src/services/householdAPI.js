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
  deleteFoodPref: (prefId) => api.delete(`/household/foods/${prefId}`),

  // Traits (likes / dislikes / pet peeves / habits)
  addTrait: (memberId, category, description) =>
    api.post(`/household/${memberId}/traits`, { category, description }),
  deleteTrait: (traitId) => api.delete(`/household/traits/${traitId}`),

  // Chores
  addChore: (memberId, data) => api.post(`/household/${memberId}/chores`, data),
  completeChore: (choreId) => api.post(`/household/chores/${choreId}/complete`),
  deleteChore: (choreId) => api.delete(`/household/chores/${choreId}`),

  // Random food generator
  getRandomFood: (memberId) => api.get(`/household/${memberId}/random-food`),

  // Shopping integration
  getShoppingGuide: () => api.get('/household/shopping-guide'),
  checkItem: (name) => api.get('/household/check-item', { params: { name } })
};

export default householdAPI;
