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
  const data = await response.json();
  return { data };
};

export const addToStaging = async (itemData) => {
  const response = await fetch(`${API_URL}/api/staging`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to add to staging');
  const data = await response.json();
  return { data };
};

export const removeFromStaging = async (itemId) => {
  const response = await fetch(`${API_URL}/api/staging/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to remove from staging');
  const data = await response.json();
  return { data };
};

export const moveFromShoppingList = async (listId) => {
  const response = await fetch(`${API_URL}/api/staging/move-from-list/${listId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to move items from shopping list');
  const data = await response.json();
  return { data };
};
