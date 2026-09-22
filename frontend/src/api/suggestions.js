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

export const deleteItem = async (itemId) => {
  const response = await fetch(`${API_URL}/api/suggestions/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete item');
  const data = await response.json();
  return { data };
};
