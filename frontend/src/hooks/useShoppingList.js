/**
 * CFS Shopping List Hook
 * 
 * Smart state management for shopping lists with instant updates
 */

import { useCallback } from 'react';
import useSmartState from './useSmartState';
import * as shoppingAPI from '../api/shopping';

export const useShoppingLists = () => {
  const {
    data: lists,
    loading,
    error,
    add,
    update,
    remove,
    invalidate,
  } = useSmartState(
    'shopping_lists',
    shoppingAPI.getLists,
    {
      cacheExpiry: 30,
      optimistic: true,
      autoSync: true,
    }
  );

  const createList = useCallback(async (listData) => {
    return add(listData, shoppingAPI.createList);
  }, [add]);

  const updateList = useCallback(async (listId, updates) => {
    return update(listId, updates, (id, data) => shoppingAPI.updateList(id, data));
  }, [update]);

  const deleteList = useCallback(async (listId) => {
    return remove(listId, shoppingAPI.deleteList);
  }, [remove]);

  return {
    lists: lists || [],
    loading,
    error,
    createList,
    updateList,
    deleteList,
    refresh: invalidate,
  };
};

export const useShoppingItems = (listId) => {
  const {
    data: items,
    loading,
    error,
    add,
    update,
    remove,
    batchUpdate,
    setData,
    invalidate,
  } = useSmartState(
    `shopping_items_${listId}`,
    () => shoppingAPI.getListItems(listId).then(r => r.json()),
    {
      cacheExpiry: 15,
      optimistic: true,
      autoSync: true,
    }
  );

  const addItem = useCallback(async (itemData) => {
    return add(itemData, (data) => shoppingAPI.addItem(listId, data));
  }, [listId, add]);

  const updateItem = useCallback(async (itemId, updates) => {
    return update(itemId, updates, (id, data) => shoppingAPI.updateItem(listId, id, data));
  }, [listId, update]);

  const deleteItem = useCallback(async (itemId) => {
    return remove(itemId, (id) => shoppingAPI.deleteItem(listId, id));
  }, [listId, remove]);

  const toggleCheck = useCallback(async (itemId) => {
    const item = items?.find(i => i.id === itemId);
    if (!item) return;
    
    return update(
      itemId, 
      { is_checked: !item.is_checked },
      (id, data) => shoppingAPI.updateItem(listId, id, data)
    );
  }, [listId, items, update]);

  const checkMultiple = useCallback(async (itemIds, checked) => {
    return batchUpdate(
      itemIds.map(id => ({
        id,
        changes: { is_checked: checked }
      })),
      (updates) => shoppingAPI.batchUpdateItems(listId, updates)
    );
  }, [listId, batchUpdate]);

  const sortItems = useCallback((sortFn) => {
    setData(prevItems => {
      if (!prevItems) return prevItems;
      return [...prevItems].sort(sortFn);
    });
  }, [setData]);

  return {
    items: items || [],
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    toggleCheck,
    checkMultiple,
    sortItems,
    refresh: invalidate,
  };
};

export default useShoppingItems;
