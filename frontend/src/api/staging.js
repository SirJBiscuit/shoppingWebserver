const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getStagingItems = async () => {
  const response = await fetch(`${API_URL}/api/staging`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch staging items');
  return response;
};

export const addToStaging = async (itemData) => {
  const response = await fetch(`${API_URL}/api/staging`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to add to staging');
  return response;
};

export const removeFromStaging = async (itemId) => {
  const response = await fetch(`${API_URL}/api/staging/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to remove from staging');
  return response;
};
