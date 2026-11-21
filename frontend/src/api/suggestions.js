const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getSmartSuggestions = async () => {
  const response = await fetch(`${API_URL}/api/suggestions/smart-suggestions`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  const data = await response.json();
  return { data };
};

export const getSuggestions = async (listId) => {
  const response = await fetch(`${API_URL}/api/suggestions/${listId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  const data = await response.json();
  return { data };
};

export const searchItems = async (query) => {
  const response = await fetch(`${API_URL}/api/suggestions/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to search items');
  const data = await response.json();
  return { data };
};

// Price advisor — batch per-store price intel for Smart Suggestions.
// Returns { store, advisor: { [lowercased item name]: { store, best, stores } } }.
export const getPriceAdvisor = async (store, items = []) => {
  try {
    const qs = new URLSearchParams();
    if (store) qs.set('store', store);
    if (items.length > 0) qs.set('items', items.join(','));
    const response = await fetch(`${API_URL}/api/suggestions/price-advisor?${qs}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return { data: {} };
    const data = await response.json();
    return { data: data.advisor || {} };
  } catch {
    return { data: {} }; // non-critical — price intel is best-effort
  }
};

// Previously-removed list items — quick re-add source for Smart Suggestions.
export const getRecentlyRemoved = async () => {
  try {
    const response = await fetch(`${API_URL}/api/suggestions/recently-removed`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) return { data: [] };
    const data = await response.json();
    return { data: Array.isArray(data) ? data : [] };
  } catch {
    return { data: [] }; // non-critical — never block suggestions
  }
};

export const deleteItem = async (itemId) => {
  const response = await fetch(`${API_URL}/api/suggestions/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete item');
  const data = await response.json();
  return { data };
};
