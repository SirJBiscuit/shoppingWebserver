const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getPantryItems = async () => {
  const response = await fetch(`${API_URL}/api/pantry`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch pantry items');
  return response;
};

// Alias for consistency with Dashboard usage
export const getPantry = getPantryItems;

export const addPantryItem = async (itemData) => {
  const response = await fetch(`${API_URL}/api/pantry`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to add pantry item');
  return response;
};

export const updatePantryItem = async (itemId, itemData) => {
  const response = await fetch(`${API_URL}/api/pantry/${itemId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to update pantry item');
  return response;
};

export const deletePantryItem = async (itemId) => {
  const response = await fetch(`${API_URL}/api/pantry/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete pantry item');
  return response;
};

// Alias for consistency with Dashboard usage
export const deleteItem = deletePantryItem;
