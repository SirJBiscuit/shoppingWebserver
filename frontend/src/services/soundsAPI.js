import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const soundsAPI = {
  // Get all available sounds
  getAllSounds: async () => {
    const response = await axios.get(`${API_URL}/api/sounds`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Upload new sound (admin only)
  uploadSound: async (formData) => {
    const response = await axios.post(`${API_URL}/api/sounds/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete sound (admin only)
  deleteSound: async (soundId) => {
    const response = await axios.delete(`${API_URL}/api/sounds/${soundId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Get user sound preferences
  getPreferences: async () => {
    const response = await axios.get(`${API_URL}/api/sounds/preferences`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },

  // Update user sound preferences
  updatePreferences: async (preferences) => {
    const response = await axios.put(`${API_URL}/api/sounds/preferences`, preferences, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }
};

export default soundsAPI;
