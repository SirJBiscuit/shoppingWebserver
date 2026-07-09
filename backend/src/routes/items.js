const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getItemPreferences, getItemPreference } = require('../services/itemPreferences');

const router = express.Router();

router.use(authenticateToken);

// Get all item preferences for the user
router.get('/preferences', async (req, res) => {
  try {
    const { search } = req.query;
    const items = await getItemPreferences(req.user.userId, search);
    res.json(items);
  } catch (error) {
    console.error('Error getting item preferences:', error);
    res.status(500).json({ error: 'Failed to get item preferences' });
  }
});

// Get specific item preference
router.get('/preferences/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const item = await getItemPreference(req.user.userId, name);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error getting item preference:', error);
    res.status(500).json({ error: 'Failed to get item preference' });
  }
});

module.exports = router;
