const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { resolveCategory } = require('../utils/categories');
const { 
  scrapeRecipe,
  scrapeFoodNetworkRecipe, 
  searchFoodNetworkRecipes,
  searchRecipes,
  searchAllRecipes,
  getSupportedSites
} = require('../utils/recipeScraper');
const {
  compareRecipeWithInventory,
  getMissingIngredients,
  deductIngredientsFromInventory,
  findMakeableRecipes
} = require('../services/recipeInventoryService');

const router = express.Router();

// Get all recipes for user with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, cuisine, difficulty, search, favorite, canMake, include_staged } = req.query;
    
    let query = `
      SELECT r.*, 
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count,
        (SELECT ROUND(AVG(rating)::numeric, 1) FROM recipe_ratings WHERE recipe_id = r.id) as avg_rating,
        (SELECT COUNT(*) FROM recipe_ratings WHERE recipe_id = r.id) as rating_count
      FROM recipes r
      WHERE (r.user_id = $1 OR r.is_public = true)
    `;
    const params = [req.user.id];
    let paramCount = 2;

    // Staged lab creations stay out of the Recipe Book unless explicitly
    // requested (the labs pass include_staged to see their "Can Create" shelf)
    if (include_staged !== 'true') {
      query += ` AND r.in_recipe_book IS DISTINCT FROM false`;
    }

    // Add filters
    if (category) {
      query += ` AND r.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    if (cuisine) {
      query += ` AND r.cuisine = $${paramCount}`;
      params.push(cuisine);
      paramCount++;
    }
    if (difficulty) {
      query += ` AND r.difficulty = $${paramCount}`;
      params.push(difficulty);
      paramCount++;
    }
    if (favorite === 'true') {
      query += ` AND r.is_favorite = true`;
    }
    if (search) {
      query += ` AND (r.name ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY r.created_at DESC`;
    
    const result = await db.query(query, params);
    let recipes = result.rows;

    // If canMake filter is enabled, check inventory
    if (canMake === 'true') {
      const makeableRecipes = await findMakeableRecipes(req.user.id, 100);
      const makeableIds = new Set(makeableRecipes.map(r => r.id));
      recipes = recipes.filter(r => makeableIds.has(r.id));
    }
    
    res.json(recipes);
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

// Create new recipe — recipe + its ingredients commit as one transaction so a
// bad ingredient row can never leave a saved recipe with no ingredients.
router.post('/', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, description, servings, prep_time, cook_time, instructions, image_url, ingredients,
            category, cuisine, difficulty, tags, temperature, in_recipe_book } = req.body;

    await client.query('BEGIN');

    const recipeResult = await client.query(`
      INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time, instructions, image_url, category, cuisine, difficulty, tags, temperature, in_recipe_book)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [req.user.id, name, description, servings, prep_time, cook_time, instructions, image_url,
        category || null, cuisine || null, difficulty || 'medium', Array.isArray(tags) ? tags : null,
        temperature || null, in_recipe_book !== false]);
    
    const recipe = recipeResult.rows[0];
    
    // Add ingredients — quantity_display keeps the user's typed format
    // ("1/2", "1 1/2") while quantity stores the parsed numeric value.
    if (ingredients && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, quantity_display, unit, is_optional, is_pantry_staple, notes, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [recipe.id, ing.item_name, ing.quantity, ing.quantity_display || null, ing.unit,
            ing.is_optional || false, ing.is_pantry_staple || false, ing.notes, i]);
      }
    }
    
    await client.query('COMMIT');
    res.status(201).json(recipe);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  } finally {
    client.release();
  }
});

// Copy a recipe (e.g. a public lab preset) into the user's own book
router.post('/:id/copy', authenticateToken, async (req, res) => {
  try {
    const src = await db.query(`
      SELECT * FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = true)
    `, [req.params.id, req.user.id]);

    if (src.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const s = src.rows[0];
    const recipeResult = await db.query(`
      INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time, total_time,
        instructions, image_url, category, cuisine, difficulty, tags, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [req.user.id, s.name, s.description, s.servings, s.prep_time, s.cook_time, s.total_time,
        s.instructions, s.image_url, s.category, s.cuisine, s.difficulty, s.tags, s.rating]);

    const recipe = recipeResult.rows[0];

    const ings = await db.query('SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC', [s.id]);
    for (let i = 0; i < ings.rows.length; i++) {
      const ing = ings.rows[i];
      await db.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, quantity_display, unit, is_optional, is_pantry_staple, notes, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [recipe.id, ing.item_name, ing.quantity, ing.quantity_display || null, ing.unit, ing.is_optional || false, ing.is_pantry_staple || false, ing.notes, i]);
    }

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Copy recipe error:', error);
    res.status(500).json({ error: 'Failed to copy recipe' });
  }
});

// ---------------- Taste feedback ----------------

// Taste tags -> how to tweak the recipe for next time.
//   scale: multiply every matching ingredient's quantity
//   add:   ingredients appended to the variant
//   drop:  ingredient names removed entirely
const TASTE_RULES = {
  'not-sweet-enough': { add: [{ item_name: 'honey', quantity: 1, unit: 'tbsp' }] },
  'too-sweet':        { scale: [/sugar|honey|syrup|maple|agave|sweetener/i, 0.5] },
  'too-thin':         { add: [{ item_name: 'banana', quantity: 0.5, unit: 'whole' }, { item_name: 'oats', quantity: 2, unit: 'tbsp' }] },
  'too-thick':        { add: [{ item_name: 'milk', quantity: 0.5, unit: 'cup' }] },
  'bland':            { add: [{ item_name: 'vanilla extract', quantity: 0.5, unit: 'tsp' }, { item_name: 'honey', quantity: 1, unit: 'tbsp' }] },
  'too-strong':       { add: [{ item_name: 'milk', quantity: 0.25, unit: 'cup' }] },
  'wanted-more-protein': { add: [{ item_name: 'protein powder', quantity: 1, unit: 'scoop' }] },
  'wanted-more-fruit':   { add: [{ item_name: 'mixed berries', quantity: 0.5, unit: 'cup' }] },
};

// Save (upsert) a user's rating / taste notes for a recipe
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, taste_tags, note, servings_made } = req.body;
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be 1–5' });
    }
    const result = await db.query(`
      INSERT INTO recipe_ratings (user_id, recipe_id, rating, taste_tags, note, servings_made, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, recipe_id)
      DO UPDATE SET rating = COALESCE($3, recipe_ratings.rating),
                    taste_tags = COALESCE($4, recipe_ratings.taste_tags),
                    note = COALESCE($5, recipe_ratings.note),
                    servings_made = COALESCE($6, recipe_ratings.servings_made),
                    updated_at = NOW()
      RETURNING *
    `, [req.user.id, req.params.id, rating ?? null, taste_tags || null, note ?? null, servings_made ?? null]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Rate recipe error:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Aggregate ratings for a recipe + the caller's own entry
router.get('/:id/ratings', authenticateToken, async (req, res) => {
  try {
    const agg = await db.query(`
      SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*)::int as count
      FROM recipe_ratings WHERE recipe_id = $1
    `, [req.params.id]);
    const mine = await db.query(
      'SELECT * FROM recipe_ratings WHERE recipe_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ avg: agg.rows[0].avg_rating, count: agg.rows[0].count, mine: mine.rows[0] || null });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Create an "improved" variant recipe from taste tags — clones the recipe
// and adjusts ingredient quantities/additions per TASTE_RULES. The variant
// is a user recipe so it lands in the labs' Can Create staging tab.
router.post('/:id/variant', authenticateToken, async (req, res) => {
  try {
    const { taste_tags = [], name } = req.body;
    const src = await db.query(
      'SELECT * FROM recipes WHERE id = $1 AND (user_id = $2 OR is_public = true)',
      [req.params.id, req.user.id]
    );
    if (src.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
    const s = src.rows[0];

    const ings = await db.query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC',
      [s.id]
    );

    // Apply the rule set: scale matching ingredients, collect additions + drops
    const adds = [];
    const drops = [];
    const scaled = ings.rows.map((ing) => {
      let qty = parseFloat(ing.quantity);
      for (const tag of taste_tags) {
        const rule = TASTE_RULES[tag];
        if (!rule) continue;
        (rule.add || []).forEach((a) => { if (!adds.some((x) => x.item_name === a.item_name)) adds.push(a); });
        (rule.drop || []).forEach((d) => { if (d.test(ing.item_name)) drops.push(ing.item_name); });
        if (rule.scale && rule.scale[0].test(ing.item_name) && Number.isFinite(qty)) {
          qty = Math.max(0, Math.round(qty * rule.scale[1] * 100) / 100);
        }
      }
      return { ...ing, quantity: Number.isFinite(qty) ? qty : ing.quantity };
    }).filter((ing) => !drops.includes(ing.item_name));

    const tagNotes = taste_tags.length ? `Tweaked from "${s.name}" based on your feedback (${taste_tags.join(', ')}).` : `Variant of "${s.name}".`;
    const variantName = name || `${s.name} (Improved)`;

    const recipeResult = await db.query(`
      INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time, total_time,
        instructions, image_url, category, cuisine, difficulty, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [req.user.id, variantName, `${s.description || ''} ${tagNotes}`.trim(), s.servings, s.prep_time, s.cook_time,
        s.total_time, s.instructions, s.image_url, s.category, s.cuisine, s.difficulty,
        [...(s.tags || []), 'variant', 'taste-improved']]);

    const recipe = recipeResult.rows[0];
    let order = 0;
    for (const ing of [...scaled, ...adds]) {
      await db.query(`
        INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [recipe.id, ing.item_name, ing.quantity, ing.unit, ing.is_optional || false, ing.is_pantry_staple || false, ing.notes || null, order++]);
    }

    recipe.ingredients = [...scaled, ...adds];
    res.status(201).json(recipe);
  } catch (error) {
    console.error('Variant recipe error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// 

// Update recipe
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, servings, prep_time, cook_time, instructions, image_url, is_favorite, ingredients, temperature,
            difficulty, category, cuisine, tags, rating, in_recipe_book } = req.body;
    
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
          temperature = COALESCE($9, temperature),
          difficulty = COALESCE($10, difficulty),
          category = COALESCE($11, category),
          cuisine = COALESCE($12, cuisine),
          tags = COALESCE($13, tags),
          rating = COALESCE($14, rating),
          in_recipe_book = COALESCE($15, in_recipe_book),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND user_id = $17
      RETURNING *
    `, [name, description, servings, prep_time, cook_time, instructions, image_url, is_favorite, temperature,
        difficulty, category, cuisine, Array.isArray(tags) ? tags : null, rating,
        in_recipe_book === undefined ? null : in_recipe_book, req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Update ingredients if provided
    if (ingredients && Array.isArray(ingredients)) {
      // Delete existing ingredients
      await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [req.params.id]);
      
      // Insert new ingredients
      for (const ingredient of ingredients) {
        await db.query(`
          INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, quantity_display, unit, is_optional, is_pantry_staple, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          req.params.id,
          ingredient.item_name,
          ingredient.quantity || 1,
          ingredient.quantity_display || null,
          ingredient.unit || '',
          ingredient.is_optional || false,
          ingredient.is_pantry_staple || false,
          ingredient.notes || ''
        ]);
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe — resilient to partially-migrated DBs where child-table FKs
// may lack ON DELETE CASCADE. Discovers every constraint pointing at
// recipes.id and clears dependents inside one transaction:
//   CASCADE           → nothing to do, Postgres handles it
//   SET NULL          → null the column explicitly (in case rule is stale)
//   NO ACTION/RESTRICT→ delete the child rows (ratings, history, etc.)
// shopping_list_items is always unlinked, never deleted — losing the item
// off a live list just because a recipe was removed would be destructive.
router.delete('/:id', authenticateToken, async (req, res) => {
  // A non-numeric id (e.g. a serialized object) would fail deep inside the
  // transaction as a 500 — reject it cheaply up front.
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'Invalid recipe id' });
  }
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const fkRows = await client.query(`
      SELECT DISTINCT tc.table_name, kcu.column_name, rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND ccu.table_name = 'recipes'
        AND ccu.column_name = 'id'
    `);

    for (const { table_name, column_name, delete_rule } of fkRows.rows) {
      const rel = `"${table_name.replace(/"/g, '""')}"`;
      const col = `"${column_name.replace(/"/g, '""')}"`;
      if (table_name === 'shopping_list_items' || delete_rule === 'SET NULL') {
        await client.query(`UPDATE ${rel} SET ${col} = NULL WHERE ${col} = $1`, [req.params.id]);
      } else if (delete_rule !== 'CASCADE') {
        await client.query(`DELETE FROM ${rel} WHERE ${col} = $1`, [req.params.id]);
      }
    }

    const result = await client.query(
      `DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipe not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  } finally {
    client.release();
  }
});

// "What can I make?" - Find recipes based on pantry
router.get('/can-make/check', authenticateToken, async (req, res) => {
  try {
    // Get user's pantry items from the live inventory table (item names
    // come via the items join; pantry_inventory is the deprecated schema)
    const pantryResult = await db.query(`
      SELECT LOWER(it.name) AS item_name
      FROM inventory i JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1
    `, [req.user.id]);
    
    const pantryItems = new Set(pantryResult.rows.map(r => r.item_name));
    
    // Get all recipes with ingredients. The in_recipe_book filter is
    // retried without that column if this DB predates migration 094.
    const recipesSql = (bookFilter) => `
      SELECT r.id, r.name, r.description, r.image_url, r.servings, r.prep_time, r.cook_time,
        json_agg(json_build_object(
          'item_name', ri.item_name,
          'quantity', ri.quantity,
          'unit', ri.unit,
          'is_optional', ri.is_optional
        )) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE (r.user_id = $1 OR r.is_public = true)
        ${bookFilter}
      GROUP BY r.id
    `;
    let recipesResult;
    try {
      recipesResult = await db.query(
        recipesSql('AND r.in_recipe_book IS DISTINCT FROM false'),
        [req.user.id]
      );
    } catch (e) {
      if (e.code !== '42703') throw e;
      recipesResult = await db.query(recipesSql(''), [req.user.id]);
    }
    
    // Check which recipes can be made
    const canMake = [];
    const canMakeWithMissing = [];
    
    for (const recipe of recipesResult.rows) {
      // LEFT JOIN emits a single all-null json object for ingredient-less
      // recipes — drop those before comparing names (was 500ing on
      // item_name.toLowerCase()).
      const ingredients = (recipe.ingredients || []).filter(i => i.item_name);
      const required = ingredients.filter(i => !i.is_optional);
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
    
    // Get user's pantry (live inventory table; pantry_inventory is deprecated)
    const pantryResult = await db.query(`
      SELECT LOWER(it.name) AS item_name, i.current_quantity AS quantity
      FROM inventory i JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1
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
            shopping_list_id, item_name, quantity, unit, category,
            recipe_id, original_recipe_quantity, original_recipe_unit, is_converted
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          shoppingListId, 
          ing.item_name, 
          ing.quantity,  // Will add smart conversion in frontend
          ing.unit,
          resolveCategory(null, ing.item_name),
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

// ============================================
// RECIPE-INVENTORY INTEGRATION ENDPOINTS
// ============================================

// Compare recipe with inventory
router.get('/:id/inventory-comparison', authenticateToken, async (req, res) => {
  try {
    const comparison = await compareRecipeWithInventory(req.params.id, req.user.id);
    res.json(comparison);
  } catch (error) {
    console.error('Recipe inventory comparison error:', error);
    res.status(500).json({ error: 'Failed to compare recipe with inventory' });
  }
});

// Get missing ingredients for shopping list
router.get('/:id/missing-ingredients', authenticateToken, async (req, res) => {
  try {
    const missing = await getMissingIngredients(req.params.id, req.user.id);
    res.json(missing);
  } catch (error) {
    console.error('Get missing ingredients error:', error);
    res.status(500).json({ error: 'Failed to get missing ingredients' });
  }
});

// Find recipes user can make with current inventory
router.get('/can-make/list', authenticateToken, async (req, res) => {
  try {
    const { minMatch = 100 } = req.query;
    const recipes = await findMakeableRecipes(req.user.id, parseInt(minMatch));
    res.json(recipes);
  } catch (error) {
    console.error('Find makeable recipes error:', error);
    res.status(500).json({ error: 'Failed to find makeable recipes' });
  }
});

// Mark recipe as cooked and optionally deduct from inventory
router.post('/:id/mark-cooked', authenticateToken, async (req, res) => {
  try {
    const { servings_made, rating, notes, deduct_inventory = false } = req.body;
    
    // Record cooking history
    const historyResult = await db.query(`
      INSERT INTO recipe_cooking_history 
        (user_id, recipe_id, servings_made, rating, notes, deducted_from_inventory)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, req.params.id, servings_made, rating, notes, deduct_inventory]);

    let deductionResult = null;
    if (deduct_inventory) {
      deductionResult = await deductIngredientsFromInventory(
        req.params.id, 
        req.user.id, 
        servings_made
      );
    }

    res.json({
      history: historyResult.rows[0],
      deduction: deductionResult,
      message: 'Recipe marked as cooked'
    });
  } catch (error) {
    console.error('Mark recipe cooked error:', error);
    res.status(500).json({ error: 'Failed to mark recipe as cooked' });
  }
});

// Get recipe categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM recipe_categories ORDER BY display_order ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get recipe cuisines
router.get('/meta/cuisines', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM recipe_cuisines ORDER BY display_order ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get cuisines error:', error);
    res.status(500).json({ error: 'Failed to get cuisines' });
  }
});

// Get recipe cooking history
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM recipe_cooking_history 
      WHERE recipe_id = $1 AND user_id = $2
      ORDER BY cooked_at DESC
    `, [req.params.id, req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get recipe history error:', error);
    res.status(500).json({ error: 'Failed to get recipe history' });
  }
});

module.exports = router;
