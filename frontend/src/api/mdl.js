import axios from 'axios';

const API_URL = '/api';

// Create axios instance with auth token
const mdlAPI = axios.create({
  baseURL: `${API_URL}/mdl`,
});

// Add auth token to requests
mdlAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// USER PREFERENCES (USER-SPECIFIC)
// ============================================================================

/**
 * Save a user preference to MDL
 * Each user has their own preferences stored separately
 * @param {string} key - Preference key (e.g., 'last_active_list_id')
 * @param {string|number} value - Preference value
 */
export const savePreference = async (key, value) => {
  try {
    const response = await mdlAPI.post('/preferences', {
      key,
      value: String(value), // Convert to string for storage
    });
    return response.data;
  } catch (error) {
    console.error('Error saving preference:', error);
    throw error;
  }
};

/**
 * Get a specific user preference from MDL
 * Returns only the current user's preference
 * @param {string} key - Preference key
 * @returns {Promise<string|null>} Preference value or null if not found
 */
export const getPreference = async (key) => {
  try {
    const response = await mdlAPI.get(`/preferences/${key}`);
    return response.data.value;
  } catch (error) {
    console.error('Error getting preference:', error);
    return null;
  }
};

/**
 * Get all user preferences from MDL
 * Returns only the current user's preferences
 * @returns {Promise<Object>} Object with all preferences
 */
export const getAllPreferences = async () => {
  try {
    const response = await mdlAPI.get('/preferences');
    return response.data.preferences;
  } catch (error) {
    console.error('Error getting all preferences:', error);
    return {};
  }
};

export default mdlAPI;
