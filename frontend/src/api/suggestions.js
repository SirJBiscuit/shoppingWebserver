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
  return response;
};

export const getSuggestions = async (listId) => {
  const response = await fetch(`${API_URL}/api/suggestions/${listId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return response;
};
