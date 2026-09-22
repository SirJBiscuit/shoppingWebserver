const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getPreferences = async () => {
  const response = await fetch(`${API_URL}/api/items/preferences`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch preferences');
  return response;
};

export const searchItems = async (query) => {
  const response = await fetch(`${API_URL}/api/items/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to search items');
  return response;
};
