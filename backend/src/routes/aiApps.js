const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get user's generated apps
router.get('/apps', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT * FROM ai_generated_apps 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({ apps: result.rows });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// Save generated app
router.post('/apps', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type, platform, features, code, prompt } = req.body;
    
    const result = await db.query(
      `INSERT INTO ai_generated_apps 
       (user_id, name, type, platform, features, code, prompt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [userId, name, type, platform, JSON.stringify(features), JSON.stringify(code), prompt]
    );
    
    res.json({ app: result.rows[0] });
  } catch (error) {
    console.error('Error saving app:', error);
    res.status(500).json({ error: 'Failed to save app' });
  }
});

// Update app
router.put('/apps/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    const { name, code, features } = req.body;
    
    const result = await db.query(
      `UPDATE ai_generated_apps 
       SET name = $1, code = $2, features = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, JSON.stringify(code), JSON.stringify(features), appId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    res.json({ app: result.rows[0] });
  } catch (error) {
    console.error('Error updating app:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// Delete app
router.delete('/apps/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const appId = req.params.id;
    
    await db.query(
      'DELETE FROM ai_generated_apps WHERE id = $1 AND user_id = $2',
      [appId, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// Get app templates
router.get('/templates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM app_templates 
       WHERE is_public = true 
       ORDER BY downloads DESC, created_at DESC`
    );
    
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get code snippets
router.get('/snippets', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM code_snippets WHERE is_public = true';
    const params = [];
    
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY usage_count DESC';
    
    const result = await db.query(query, params);
    
    res.json({ snippets: result.rows });
  } catch (error) {
    console.error('Error fetching snippets:', error);
    res.status(500).json({ error: 'Failed to fetch snippets' });
  }
});

// Save code snippet
router.post('/snippets', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, code, category, description, language } = req.body;
    
    const result = await db.query(
      `INSERT INTO code_snippets 
       (user_id, name, code, category, description, language, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, name, code, category, description, language]
    );
    
    res.json({ snippet: result.rows[0] });
  } catch (error) {
    console.error('Error saving snippet:', error);
    res.status(500).json({ error: 'Failed to save snippet' });
  }
});

// Log AI generation (for analytics)
router.post('/analytics/generation', async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, appType, features, success } = req.body;
    
    await db.query(
      `INSERT INTO ai_generation_logs 
       (user_id, prompt, app_type, features, success, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, prompt, appType, JSON.stringify(features), success]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging generation:', error);
    res.status(500).json({ error: 'Failed to log generation' });
  }
});

module.exports = router;
