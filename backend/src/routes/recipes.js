const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { 
  scrapeRecipe,
  scrapeFoodNetworkRecipe, 
  searchFoodNetworkRecipes,
  searchRecipes,
  searchAllRecipes,
  getSupportedSites
} = require('../utils/recipeScraper');

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
    `, [req.user.id]);
    
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
    `, [req.params.id, req.user.id]);
    
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
    `, [req.user.id, name, description, servings, prep_time, cook_time, instructions, image_url]);
    
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
    `, [name, description, servings, prep_time, cook_time, instructions, image_url, is_favorite, req.params.id, req.user.id]);
    
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
    `, [req.params.id, req.user.id]);
    
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
    `, [req.user.id]);
    
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
    `, [req.user.id]);
    
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
    `, [req.user.id]);
    
    const pantryMap = new Map(pantryResult.rows.map(r => [r.item_name, r.quantity]));
    
    // Create shopping list if not provided
    let shoppingListId = list_id;
    if (!shoppingListId) {
      const listResult = await db.query(`
        INSERT INTO shopping_lists (user_id, name) VALUES ($1, $2) RETURNING id
      `, [req.user.id, 'Recipe Shopping List']);
      shoppingListId = listResult.rows[0].id;
    }
    
    // Track this recipe in the shopping list
    await db.query(`
      INSERT INTO shopping_list_recipes (shopping_list_id, recipe_id)
      VALUES ($1, $2)
      ON CONFLICT (shopping_list_id, recipe_id) DO NOTHING
    `, [shoppingListId, req.params.id]);
    
    // Add missing ingredients to shopping list with recipe tracking
    const addedItems = [];
    for (const ing of ingredientsResult.rows) {
      const inPantry = pantryMap.has(ing.item_name.toLowerCase());
      
      if (!inPantry && !ing.is_optional) {
        // Store original recipe amounts for reference
        await db.query(`
          INSERT INTO shopping_list_items (
            shopping_list_id, item_name, quantity, unit,
            recipe_id, original_recipe_quantity, original_recipe_unit, is_converted
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          shoppingListId, 
          ing.item_name, 
          ing.quantity,  // Will add smart conversion in frontend
          ing.unit,
          req.params.id,  // Track which recipe this came from
          ing.quantity,   // Original recipe amount
          ing.unit,       // Original recipe unit
          false           // Not converted yet (frontend will handle)
        ]);
        
        addedItems.push(ing.item_name);
      }
    }
    
    res.json({
      shopping_list_id: shoppingListId,
      recipe_id: req.params.id,
      added_items: addedItems,
      message: `Added ${addedItems.length} items to shopping list`
    });
  } catch (error) {
    console.error('Recipe to shopping list error:', error);
    res.status(500).json({ error: 'Failed to create shopping list from recipe' });
  }
});

// Get recipes associated with a shopping list
router.get('/shopping-list/:listId/recipes', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.*,
        slr.added_at,
        slr.is_completed,
        COUNT(DISTINCT sli.id) as ingredient_count,
        COUNT(DISTINCT CASE WHEN sli.is_checked THEN sli.id END) as checked_count
      FROM shopping_list_recipes slr
      JOIN recipes r ON r.id = slr.recipe_id
      LEFT JOIN shopping_list_items sli ON sli.recipe_id = r.id AND sli.shopping_list_id = slr.shopping_list_id
      WHERE slr.shopping_list_id = $1
      GROUP BY r.id, slr.added_at, slr.is_completed
      ORDER BY slr.added_at DESC
    `, [req.params.listId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get shopping list recipes error:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
});

// Get supported recipe sites
router.get('/supported-sites', authenticateToken, async (req, res) => {
  try {
    const sites = getSupportedSites();
    res.json(sites);
  } catch (error) {
    console.error('Get supported sites error:', error);
    res.status(500).json({ error: 'Failed to get supported sites' });
  }
});

// Universal recipe search (searches multiple sites)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = await searchRecipes(q);
    res.json(results);
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

// Search for recipes on Food Network
router.get('/search/foodnetwork', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = await searchFoodNetworkRecipes(q);
    res.json(results);
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

// Search AllRecipes
router.get('/search/allrecipes', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = await searchAllRecipes(q);
    res.json(results);
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

// Universal recipe import (works with any supported site)
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Recipe URL required' });
    }
    
    // Use universal scraper
    const recipeData = await scrapeRecipe(url);
    
    // Save recipe to database
    const recipeResult = await db.query(`
      INSERT INTO recipes (
        user_id, name, description, servings, prep_time, cook_time, 
        instructions, image_url, source_url, category, cuisine, author
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      req.user.id,
      recipeData.name,
      recipeData.description,
      recipeData.servings,
      recipeData.prep_time,
      recipeData.cook_time,
      recipeData.instructions,
      recipeData.image_url,
      recipeData.source_url,
      recipeData.category || null,
      recipeData.cuisine || null,
      recipeData.author || 'Unknown'
    ]);
    
    const recipe = recipeResult.rows[0];
    
    // Add ingredients
    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      for (const ing of recipeData.ingredients) {
        await db.query(`
          INSERT INTO recipe_ingredients (
            recipe_id, item_name, quantity, unit, is_optional, notes, sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          recipe.id,
          ing.item_name,
          ing.quantity,
          ing.unit,
          ing.is_optional || false,
          ing.notes || '',
          ing.sort_order
        ]);
      }
    }
    
    // Fetch complete recipe with ingredients
    const ingredientsResult = await db.query(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC
    `, [recipe.id]);
    
    recipe.ingredients = ingredientsResult.rows;
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Recipe import error:', error);
    res.status(500).json({ error: 'Failed to import recipe: ' + error.message });
  }
});

// Import recipe from Food Network URL (legacy endpoint)
router.post('/import/foodnetwork', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Recipe URL required' });
    }
    
    // Scrape recipe data
    const recipeData = await scrapeFoodNetworkRecipe(url);
    
    // Save recipe to database
    const recipeResult = await db.query(`
      INSERT INTO recipes (
        user_id, name, description, servings, prep_time, cook_time, 
        instructions, image_url, source_url, category, cuisine, author
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      req.user.id,
      recipeData.name,
      recipeData.description,
      recipeData.servings,
      recipeData.prep_time,
      recipeData.cook_time,
      recipeData.instructions,
      recipeData.image_url,
      recipeData.source_url,
      recipeData.category || null,
      recipeData.cuisine || null,
      recipeData.author || 'Food Network'
    ]);
    
    const recipe = recipeResult.rows[0];
    
    // Add ingredients
    if (recipeData.ingredients && recipeData.ingredients.length > 0) {
      for (const ing of recipeData.ingredients) {
        await db.query(`
          INSERT INTO recipe_ingredients (
            recipe_id, item_name, quantity, unit, is_optional, notes, sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          recipe.id,
          ing.item_name,
          ing.quantity,
          ing.unit,
          ing.is_optional || false,
          ing.notes || '',
          ing.sort_order
        ]);
      }
    }
    
    // Fetch complete recipe with ingredients
    const ingredientsResult = await db.query(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC
    `, [recipe.id]);
    
    recipe.ingredients = ingredientsResult.rows;
    
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Recipe import error:', error);
    res.status(500).json({ error: 'Failed to import recipe: ' + error.message });
  }
});

module.exports = router;
