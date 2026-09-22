const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const getLists = async () => {
  const response = await fetch(`${API_URL}/api/shopping/lists`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch lists');
  return response;
};

export const getList = async (listId) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch list');
  return response;
};

export const createList = async (listData) => {
  const response = await fetch(`${API_URL}/api/shopping/lists`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(listData)
  });
  if (!response.ok) throw new Error('Failed to create list');
  return response;
};

export const updateList = async (listId, listData) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(listData)
  });
  if (!response.ok) throw new Error('Failed to update list');
  return response;
};

export const deleteList = async (listId) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete list');
  return response;
};

export const getListItems = async (listId) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}/items`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch list items');
  return response;
};

export const addItem = async (listId, itemData) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to add item');
  return response;
};

export const updateItem = async (listId, itemId, itemData) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}/items/${itemId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData)
  });
  if (!response.ok) throw new Error('Failed to update item');
  return response;
};

export const deleteItem = async (listId, itemId) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete item');
  return response;
};

export const toggleItemCheck = async (listId, itemId) => {
  const response = await fetch(`${API_URL}/api/shopping/lists/${listId}/items/${itemId}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to toggle item');
  return response;
};

export const copyItem = async (itemId, targetListId) => {
  const response = await fetch(`${API_URL}/api/shopping/items/${itemId}/copy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ target_list_id: targetListId })
  });
  if (!response.ok) throw new Error('Failed to copy item');
  return response;
};

export const moveItem = async (itemId, targetListId) => {
  const response = await fetch(`${API_URL}/api/shopping/items/${itemId}/move`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ target_list_id: targetListId })
  });
  if (!response.ok) throw new Error('Failed to move item');
  return response;
};
