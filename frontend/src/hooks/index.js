/**
 * CFS Smart State Management Hooks
 * 
 * Central export for all smart state hooks
 */

export { default as useSmartState } from './useSmartState';

export { 
  useShoppingLists, 
  useShoppingItems 
} from './useShoppingList';

export { default as useInventory } from './useInventory';

export { default as useRecipes } from './useRecipes';

export { default as useAVEWidgets } from './useAVEWidgets';

export {
  useMDLPatterns,
  useMDLSuggestions,
  useMDLPriceEstimate,
  useMDLAislePrediction,
} from './useMDL';

export { default as useUserPreferences } from './useUserPreferences';

export { default as useContextMenu } from './useContextMenu';
