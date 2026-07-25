const db = require('../database/db');

/**
 * Recipe-Inventory Comparison Service
 * Compares recipe ingredients with user's kitchen inventory
 */

/**
 * Compare recipe ingredients with user's inventory
 * @param {number} recipeId - Recipe ID
 * @param {number} userId - User ID
 * @returns {object} Comparison results with matched, missing, and insufficient items
 */
async function compareRecipeWithInventory(recipeId, userId) {
  try {
    // Get recipe ingredients
    const ingredientsResult = await db.query(`
      SELECT * FROM recipe_ingredients 
      WHERE recipe_id = $1 
      ORDER BY sort_order ASC
    `, [recipeId]);

    const ingredients = ingredientsResult.rows;

    // Get user's inventory
    const inventoryResult = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        it.preferred_icon as icon
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1 AND i.current_quantity > 0
    `, [userId]);

    const inventory = inventoryResult.rows;

    // Compare each ingredient
    const comparison = {
      matched: [],      // Have enough
      insufficient: [], // Have some but not enough
      missing: [],      // Don't have at all
      totalIngredients: ingredients.length,
      canMake: false
    };

    for (const ingredient of ingredients) {
      const ingredientName = ingredient.item_name.toLowerCase().trim();
      const requiredQty = parseFloat(ingredient.quantity) || 0;
      const requiredUnit = ingredient.unit?.toLowerCase() || '';

      // Try to find matching inventory item
      const match = inventory.find(item => {
        const itemName = (item.item_name || '').toLowerCase().trim();
        // Fuzzy match: check if ingredient name contains item name or vice versa
        return itemName.includes(ingredientName) || ingredientName.includes(itemName);
      });

      if (match) {
        const availableQty = parseFloat(match.current_quantity) || 0;
        const availableUnit = match.unit?.toLowerCase() || '';

        // Check if units match and quantity is sufficient
        const unitsMatch = !requiredUnit || !availableUnit || requiredUnit === availableUnit;
        const hasEnough = availableQty >= requiredQty;

        if (unitsMatch && hasEnough) {
          comparison.matched.push({
            ...ingredient,
            inventoryItem: match,
            available: availableQty,
            needed: requiredQty,
            excess: availableQty - requiredQty
          });
        } else {
          comparison.insufficient.push({
            ...ingredient,
            inventoryItem: match,
            available: availableQty,
            needed: requiredQty,
            shortage: Math.max(0, requiredQty - availableQty),
            unitMismatch: !unitsMatch
          });
        }
      } else {
        comparison.missing.push({
          ...ingredient,
          needed: requiredQty
        });
      }
    }

    // Can make recipe if all ingredients are matched
    comparison.canMake = comparison.matched.length === comparison.totalIngredients;
    comparison.matchPercentage = Math.round((comparison.matched.length / comparison.totalIngredients) * 100);

    return comparison;
  } catch (error) {
    console.error('Recipe-inventory comparison error:', error);
    throw error;
  }
}

/**
 * Get missing ingredients for shopping list
 * @param {number} recipeId - Recipe ID
 * @param {number} userId - User ID
 * @returns {array} List of ingredients to add to shopping list
 */
async function getMissingIngredients(recipeId, userId) {
  const comparison = await compareRecipeWithInventory(recipeId, userId);
  
  // Combine missing and insufficient items
  const toShop = [
    ...comparison.missing.map(item => ({
      item_name: item.item_name,
      quantity: item.needed,
      unit: item.unit,
      notes: item.notes,
      reason: 'missing'
    })),
    ...comparison.insufficient.map(item => ({
      item_name: item.item_name,
      quantity: item.shortage,
      unit: item.unit,
      notes: item.notes,
      reason: 'insufficient',
      currentQty: item.available
    }))
  ];

  return toShop;
}

/**
 * Deduct recipe ingredients from inventory
 * @param {number} recipeId - Recipe ID
 * @param {number} userId - User ID
 * @param {number} servingsMade - Number of servings made (for scaling)
 * @returns {object} Deduction results
 */
async function deductIngredientsFromInventory(recipeId, userId, servingsMade = null) {
  try {
    const comparison = await compareRecipeWithInventory(recipeId, userId);
    
    // Get recipe servings for scaling
    const recipeResult = await db.query(
      'SELECT servings FROM recipes WHERE id = $1',
      [recipeId]
    );
    const recipeServings = recipeResult.rows[0]?.servings || 1;
    const scale = servingsMade ? servingsMade / recipeServings : 1;

    const deducted = [];
    const failed = [];

    // Deduct matched ingredients
    for (const item of comparison.matched) {
      try {
        const deductQty = item.needed * scale;
        const newQty = Math.max(0, item.available - deductQty);

        await db.query(`
          UPDATE inventory 
          SET current_quantity = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND user_id = $3
        `, [newQty, item.inventoryItem.id, userId]);

        deducted.push({
          item_name: item.item_name,
          deducted: deductQty,
          remaining: newQty
        });
      } catch (error) {
        failed.push({
          item_name: item.item_name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      deducted,
      failed,
      notInInventory: [...comparison.missing, ...comparison.insufficient]
    };
  } catch (error) {
    console.error('Deduct ingredients error:', error);
    throw error;
  }
}

/**
 * Find recipes user can make with current inventory
 * @param {number} userId - User ID
 * @param {number} minMatchPercentage - Minimum percentage of ingredients needed (default 100)
 * @returns {array} List of recipes with match percentages
 */
async function findMakeableRecipes(userId, minMatchPercentage = 100) {
  try {
    // Get all user's recipes
    const recipesResult = await db.query(`
      SELECT id, name, image_url, category, cuisine, difficulty, prep_time, cook_time
      FROM recipes 
      WHERE user_id = $1 OR is_public = true
      ORDER BY created_at DESC
    `, [userId]);

    const recipes = recipesResult.rows;
    const makeableRecipes = [];

    // Check each recipe
    for (const recipe of recipes) {
      const comparison = await compareRecipeWithInventory(recipe.id, userId);
      
      if (comparison.matchPercentage >= minMatchPercentage) {
        makeableRecipes.push({
          ...recipe,
          matchPercentage: comparison.matchPercentage,
          canMake: comparison.canMake,
          missingCount: comparison.missing.length + comparison.insufficient.length,
          totalIngredients: comparison.totalIngredients
        });
      }
    }

    // Sort by match percentage (highest first)
    makeableRecipes.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return makeableRecipes;
  } catch (error) {
    console.error('Find makeable recipes error:', error);
    throw error;
  }
}

module.exports = {
  compareRecipeWithInventory,
  getMissingIngredients,
  deductIngredientsFromInventory,
  findMakeableRecipes
};
