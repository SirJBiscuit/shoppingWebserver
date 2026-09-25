/**
 * CFS Recipes Hook
 * 
 * Smart state management for recipes with instant updates
 */

import { useCallback } from 'react';
import useSmartState from './useSmartState';
import * as recipesAPI from '../api/recipes';

export const useRecipes = () => {
  const {
    data: recipes,
    loading,
    error,
    add,
    update,
    remove,
    invalidate,
  } = useSmartState(
    'recipes',
    recipesAPI.getRecipes,
    {
      cacheExpiry: 120,
      optimistic: true,
      autoSync: true,
    }
  );

  const createRecipe = useCallback(async (recipeData) => {
    return add(recipeData, recipesAPI.createRecipe);
  }, [add]);

  const updateRecipe = useCallback(async (recipeId, updates) => {
    return update(recipeId, updates, recipesAPI.updateRecipe);
  }, [update]);

  const deleteRecipe = useCallback(async (recipeId) => {
    return remove(recipeId, recipesAPI.deleteRecipe);
  }, [remove]);

  const addToShoppingList = useCallback(async (recipeId, listId) => {
    return recipesAPI.addRecipeToList(recipeId, listId);
  }, []);

  return {
    recipes: recipes || [],
    loading,
    error,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    addToShoppingList,
    refresh: invalidate,
  };
};

export default useRecipes;
