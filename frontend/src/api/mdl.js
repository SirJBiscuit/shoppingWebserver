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

// ============================================================================
// LEARNING / TRACKING
// ============================================================================

/**
 * Record that an item was added to a list. Fire-and-forget — never block the UI.
 */
export const trackItem = async (data) => {
  try {
    const response = await mdlAPI.post('/track-item', data);
    return response.data;
  } catch (error) {
    console.warn('MDL track-item failed:', error.message);
    return null; // tracking is non-critical
  }
};

/** Predicted-due items ("running low" suggestions) */
export const getSuggestions = async () => {
  try {
    const response = await mdlAPI.get('/suggestions');
    return response.data;
  } catch (error) {
    console.warn('MDL suggestions failed:', error.message);
    return [];
  }
};

/** Best price estimate for an item name */
export const getPriceEstimate = async (itemName) => {
  try {
    const response = await mdlAPI.get(`/price/${encodeURIComponent(itemName)}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

/** Learned pattern for one item */
export const getItemPattern = async (itemName) => {
  try {
    const response = await mdlAPI.get(`/patterns/${encodeURIComponent(itemName)}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

/** Aisle prediction for item at a store */
export const getAislePrediction = async (itemName, storeId) => {
  try {
    const response = await mdlAPI.get(`/aisle/${encodeURIComponent(itemName)}/${storeId}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

/** Report actual aisle for learning */
export const reportAisle = async (data) => {
  try {
    const response = await mdlAPI.post('/aisle/report', data);
    return response.data;
  } catch (error) {
    console.warn('Aisle report failed:', error.message);
    return null;
  }
};

/** User location for location-aware prices */
export const getLocation = async () => {
  try {
    const response = await mdlAPI.get('/location');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const setLocation = async (data) => {
  try {
    const response = await mdlAPI.post('/location', data);
    return response.data;
  } catch (error) {
    console.warn('Set location failed:', error.message);
    return null;
  }
};

export default mdlAPI;
