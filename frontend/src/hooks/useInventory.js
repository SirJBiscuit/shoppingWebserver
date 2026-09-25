/**
 * CFS Inventory Hook
 * 
 * Smart state management for pantry/inventory with instant updates
 */

import { useCallback } from 'react';
import useSmartState from './useSmartState';
import * as inventoryAPI from '../api/inventory';

export const useInventory = () => {
  const {
    data: items,
    loading,
    error,
    add,
    update,
    remove,
    batchUpdate,
    invalidate,
  } = useSmartState(
    'inventory_items',
    inventoryAPI.getItems,
    {
      cacheExpiry: 60,
      optimistic: true,
      autoSync: true,
    }
  );

  const addItem = useCallback(async (itemData) => {
    return add(itemData, inventoryAPI.addItem);
  }, [add]);

  const updateItem = useCallback(async (itemId, updates) => {
    return update(itemId, updates, inventoryAPI.updateItem);
  }, [update]);

  const deleteItem = useCallback(async (itemId) => {
    return remove(itemId, inventoryAPI.deleteItem);
  }, [remove]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    return update(itemId, { quantity }, inventoryAPI.updateItem);
  }, [update]);

  const moveToStagingArea = useCallback(async (itemIds) => {
    return batchUpdate(
      itemIds.map(id => ({
        id,
        changes: { moved_to_staging: true, moved_to_staging_at: new Date().toISOString() }
      })),
      inventoryAPI.batchUpdate
    );
  }, [batchUpdate]);

  return {
    items: items || [],
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    updateQuantity,
    moveToStagingArea,
    refresh: invalidate,
  };
};

export default useInventory;
