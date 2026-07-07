const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all recipes for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count
      FROM recipes r
      WHERE r.user_id = $1 OR r.is_public = true
      ORDER BY r.created_at DESC
    `, [req.user.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe with ingredients
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const recipeResult = await db.query(`
      SELECT * FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = true)
    `, [req.params.id, req.user.userId]);
    
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const ingredientsResult = await db.query(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC
    `, [req.params.id]);
    
    const recipe = recipeResult.rows[0];
    recipe.ingredients = ingredientsResult.rows;
    
    res.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create new recipe
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, servings, prep_time, cook_time, instructions, image_url, ingredients } = req.body;
    
    const recipeResult = await db.query(`
      INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time, instructions, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.user.userId, name, description, servings, prep_time, cook_time, instructions, image_url]);
    
    const recipe = recipeResult.rows[0];
    
    // Add ingredients
    if (ingredients && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await db.query(`
          INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, unit, is_optional, notes, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [recipe.id, ing.item_name, ing.quantity, ing.unit, ing.is_optional || false, ing.notes, i]);
      }
    }
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update recipe
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, servings, prep_time, cook_time, instructions, image_url, is_favorite } = req.body;
    
    const result = await db.query(`
      UPDATE recipes 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          servings = COALESCE($3, servings),
          prep_time = COALESCE($4, prep_time),
          cook_time = COALESCE($5, cook_time),
          instructions = COALESCE($6, instructions),
          image_url = COALESCE($7, image_url),
          is_favorite = COALESCE($8, is_favorite),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [name, description, servings, prep_time, cook_time, instructions, image_url, is_favorite, req.params.id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id
    `, [req.params.id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// "What can I make?" - Find recipes based on pantry
router.get('/can-make/check', authenticateToken, async (req, res) => {
  try {
    // Get user's pantry items
    const pantryResult = await db.query(`
      SELECT LOWER(item_name) as item_name FROM pantry_inventory WHERE user_id = $1
    `, [req.user.userId]);
    
    const pantryItems = new Set(pantryResult.rows.map(r => r.item_name));
    
    // Get all recipes with ingredients
    const recipesResult = await db.query(`
      SELECT r.id, r.name, r.description, r.image_url, r.servings, r.prep_time, r.cook_time,
        json_agg(json_build_object(
          'item_name', ri.item_name,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'is_optional', ri.is_optional
        )) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE r.user_id = $1 OR r.is_public = true
      GROUP BY r.id
    `, [req.user.userId]);
    
    // Check which recipes can be made
    const canMake = [];
    const canMakeWithMissing = [];
    
    for (const recipe of recipesResult.rows) {
      const required = recipe.ingredients.filter(i => !i.is_optional);
      const missing = required.filter(i => !pantryItems.has(i.item_name.toLowerCase()));
      
      if (missing.length === 0) {
        canMake.push(recipe);
      } else if (missing.length <= 3) {
        recipe.missing_ingredients = missing;
        canMakeWithMissing.push(recipe);
      }
    }
    
    res.json({
      can_make: canMake,
      can_make_with_few_items: canMakeWithMissing
    });
  } catch (error) {
    console.error('Can make check error:', error);
    res.status(500).json({ error: 'Failed to check recipes' });
  }
});

// Convert recipe to shopping list
router.post('/:id/to-shopping-list', authenticateToken, async (req, res) => {
  try {
    const { list_id } = req.body;
    
    // Get recipe ingredients
    const ingredientsResult = await db.query(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = $1
    `, [req.params.id]);
    
    // Get user's pantry
    const pantryResult = await db.query(`
      SELECT LOWER(item_name) as item_name, quantity FROM pantry_inventory WHERE user_id = $1
    `, [req.user.userId]);
    
    const pantryMap = new Map(pantryResult.rows.map(r => [r.item_name, r.quantity]));
    
    // Create shopping list if not provided
    let shoppingListId = list_id;
    if (!shoppingListId) {
      const listResult = await db.query(`
        INSERT INTO shopping_lists (user_id, name) VALUES ($1, $2) RETURNING id
      `, [req.user.userId, 'Recipe Shopping List']);
      shoppingListId = listResult.rows[0].id;
    }
    
    // Add missing ingredients to shopping list
    const addedItems = [];
    for (const ing of ingredientsResult.rows) {
      const inPantry = pantryMap.has(ing.item_name.toLowerCase());
      
      if (!inPantry && !ing.is_optional) {
        await db.query(`
          INSERT INTO shopping_list_items (shopping_list_id, item_name, quantity, unit)
          VALUES ($1, $2, $3, $4)
        `, [shoppingListId, ing.item_name, ing.quantity, ing.unit]);
        
        addedItems.push(ing.item_name);
      }
    }
    
    res.json({
      shopping_list_id: shoppingListId,
      added_items: addedItems,
      message: `Added ${addedItems.length} items to shopping list`
    });
  } catch (error) {
    console.error('Recipe to shopping list error:', error);
    res.status(500).json({ error: 'Failed to create shopping list from recipe' });
  }
});

module.exports = router;
