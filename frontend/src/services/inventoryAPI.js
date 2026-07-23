import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3007/api';

// Create axios instance with auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const inventoryAPI = {
  // ============================================
  // STORAGE LOCATIONS
  // ============================================

  // Get all storage locations (default + custom)
  getLocations: async () => {
    const response = await axios.get(`${API_URL}/inventory/locations`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Create custom storage location
  createLocation: async (locationData) => {
    const response = await axios.post(`${API_URL}/inventory/locations`, locationData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update custom storage location
  updateLocation: async (id, locationData) => {
    const response = await axios.patch(`${API_URL}/inventory/locations/${id}`, locationData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete custom storage location
  deleteLocation: async (id) => {
    const response = await axios.delete(`${API_URL}/inventory/locations/${id}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Reorder storage locations
  reorderLocations: async (locations) => {
    const response = await axios.post(`${API_URL}/inventory/locations/reorder`, 
      { locations }, 
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // ============================================
  // INVENTORY ITEMS
  // ============================================

  // Get all inventory items with filters
  getItems: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const response = await axios.get(`${API_URL}/inventory?${params.toString()}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get single inventory item
  getItem: async (id) => {
    const response = await axios.get(`${API_URL}/inventory/${id}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Add item to inventory
  addItem: async (itemData) => {
    const response = await axios.post(`${API_URL}/inventory`, itemData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Update inventory item
  updateItem: async (id, itemData) => {
    const response = await axios.patch(`${API_URL}/inventory/${id}`, itemData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Delete inventory item
  deleteItem: async (id) => {
    const response = await axios.delete(`${API_URL}/inventory/${id}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Move item to different location
  moveItem: async (id, storage_location, custom_location_id = null) => {
    const response = await axios.post(`${API_URL}/inventory/${id}/move`, 
      { storage_location, custom_location_id },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Mark item as "still good" (extends expiration)
  markStillGood: async (id, extension_days = 3) => {
    const response = await axios.post(`${API_URL}/inventory/${id}/still-good`, 
      { extension_days },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Mark item as "went bad" (learns from it)
  markWentBad: async (id, actual_expiry_date = null) => {
    const response = await axios.post(`${API_URL}/inventory/${id}/went-bad`, 
      { actual_expiry_date: actual_expiry_date || new Date().toISOString().split('T')[0] },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Mark item as opened
  markOpened: async (id) => {
    const response = await axios.post(`${API_URL}/inventory/${id}/opened`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Reorder items (custom sort)
  reorderItems: async (items) => {
    const response = await axios.post(`${API_URL}/inventory/reorder`, 
      { items },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // ============================================
  // ANALYTICS
  // ============================================

  // Get items expiring soon
  getExpiringSoon: async (days = 7) => {
    const response = await axios.get(`${API_URL}/inventory/expiring-soon?days=${days}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get inventory statistics
  getStats: async () => {
    const response = await axios.get(`${API_URL}/inventory/stats`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Get inventory history
  getHistory: async (limit = 50, offset = 0) => {
    const response = await axios.get(`${API_URL}/inventory/history?limit=${limit}&offset=${offset}`, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};

export default inventoryAPI;
