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

// ============================================================================
// PRODUCT DATABASE (admin)
// ============================================================================

export const getAdminStats = async () => {
  try {
    const response = await mdlAPI.get('/admin/stats');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const searchProducts = async (q = '', category = '', limit = 50) => {
  try {
    const response = await mdlAPI.get('/search', {
      params: { q: q || undefined, category: category || undefined, limit }
    });
    return response.data;
  } catch (error) {
    return [];
  }
};

export const getProductCategories = async () => {
  try {
    const response = await mdlAPI.get('/categories');
    return response.data;
  } catch (error) {
    return [];
  }
};

export const createProduct = async (data) => {
  try {
    const response = await mdlAPI.post('/admin/product', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create product:', error);
    return null;
  }
};

export const updateProduct = async (id, data) => {
  try {
    const response = await mdlAPI.put(`/admin/product/${id}`, data);
    return response.data;
  } catch (error) {
    console.warn('Update product failed:', error.message);
    return null;
  }
};

export const addPriceRecord = async (id, price, store) => {
  try {
    const response = await mdlAPI.post(`/admin/product/${id}/price`, { price, store });
    return response.data;
  } catch (error) {
    console.warn('Add price failed:', error.message);
    return null;
  }
};

export const runMdlBackup = async () => {
  try {
    const response = await mdlAPI.post('/backups/run');
    return response.data;
  } catch (error) {
    console.warn('Backup failed:', error.message);
    return null;
  }
};

// ============================================================================
// SIZE / WEIGHT / UNIT PRESETS
// ============================================================================

export const getSizePresets = async (category = '') => {
  try {
    const response = await mdlAPI.get('/size-presets', {
      params: { category: category || undefined }
    });
    return response.data;
  } catch (error) {
    return [];
  }
};

export const createSizePreset = async (data) => {
  try {
    const response = await mdlAPI.post('/admin/size-presets', data);
    return response.data;
  } catch (error) {
    console.warn('Create preset failed:', error.message);
    return null;
  }
};

export const deleteSizePreset = async (id) => {
  try {
    await mdlAPI.delete(`/admin/size-presets/${id}`);
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// PER-STORE PRODUCT VARIANTS
// ============================================================================

export const getProductVariants = async (productId) => {
  try {
    const response = await mdlAPI.get(`/admin/product/${productId}/variants`);
    return response.data;
  } catch (error) {
    return [];
  }
};

export const saveProductVariant = async (productId, data) => {
  try {
    const response = await mdlAPI.post(`/admin/product/${productId}/variants`, data);
    return response.data;
  } catch (error) {
    console.warn('Save variant failed:', error.message);
    return null;
  }
};

export const deleteProductVariant = async (variantId) => {
  try {
    await mdlAPI.delete(`/admin/variants/${variantId}`);
    return true;
  } catch (error) {
    return false;
  }
};

export const markBestVariant = async (variantId) => {
  try {
    const response = await mdlAPI.post(`/admin/variants/${variantId}/mark-best`);
    return response.data;
  } catch (error) {
    console.warn('Mark best failed:', error.message);
    return null;
  }
};

// ============================================================================
// HOUSEHOLD-MEMBER FAVORITES (item / brand / ingredient / meal / restaurant)
// ============================================================================

export const getFavorites = async (entityType = '', entityName = '') => {
  try {
    const response = await mdlAPI.get('/favorites', {
      params: {
        entity_type: entityType || undefined,
        entity_name: entityName || undefined
      }
    });
    return response.data;
  } catch (error) {
    return [];
  }
};

export const setFavorite = async (data) => {
  try {
    const response = await mdlAPI.post('/favorites', data);
    return response.data;
  } catch (error) {
    console.warn('Set favorite failed:', error.message);
    return null;
  }
};

export const removeFavorite = async (id) => {
  try {
    await mdlAPI.delete(`/favorites/${id}`);
    return true;
  } catch (error) {
    return false;
  }
};

// Household members (for the "whose favorite?" picker)
export const getHouseholdMembers = async () => {
  try {
    const response = await axios.get(`${API_URL}/household`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    return [];
  }
};

export default mdlAPI;
