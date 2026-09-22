const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getCategories = async () => {
  const response = await fetch(`${API_URL}/api/categories`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return { data };
};
