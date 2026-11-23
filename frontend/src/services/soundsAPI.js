import api from './api';

// Sound endpoints — rides the shared axios client so auth headers,
// maintenance-mode detection, and base URL all behave like every
// other API call.

const soundsAPI = {
  // Sound library
  getAllSounds: async () => (await api.get('/sounds')).data,

  getCategories: async () => (await api.get('/sounds/categories')).data,

  uploadSound: async (formData) => {
    const response = await api.post('/sounds/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteSound: async (soundId) => (await api.delete(`/sounds/${soundId}`)).data,

  // Per-user preferences
  getPreferences: async () => (await api.get('/sounds/preferences')).data,
  updatePreferences: async (preferences) =>
    (await api.put('/sounds/preferences', preferences)).data,

  // Effective playback config for the current user — one call feeds
  // the whole SoundManager.
  getPlayConfig: async () => (await api.get('/sounds/play-config')).data,

  // Admin: global + per-category settings
  getGlobalSettings: async () => (await api.get('/sounds/global')).data,
  updateGlobalSettings: async (settings) =>
    (await api.put('/sounds/global', settings)).data,
  updateCategory: async (name, patch) =>
    (await api.put(`/sounds/categories/${name}`, patch)).data,

  // Element sound bindings (admin picks an element, assigns a sound)
  getBindings: async () => (await api.get('/sounds/bindings')).data,
  createBinding: async (binding) =>
    (await api.post('/sounds/bindings', binding)).data,
  updateBinding: async (id, patch) =>
    (await api.put(`/sounds/bindings/${id}`, patch)).data,
  deleteBinding: async (id) =>
    (await api.delete(`/sounds/bindings/${id}`)).data,
};

export default soundsAPI;
