const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get current version info
router.get('/current', (req, res) => {
  try {
    const versionPath = path.join(__dirname, '../../../version.json');
    
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      res.json(versionData);
    } else {
      // If version.json doesn't exist, create a default one
      const defaultVersion = {
        current: 'unknown',
        previous: 'none',
        updated: new Date().toISOString()
      };
      res.json(defaultVersion);
    }
  } catch (error) {
    console.error('Error reading version:', error);
    res.status(500).json({ error: 'Failed to read version' });
  }
});

// Check if update is needed (compare with client version)
router.post('/check', (req, res) => {
  try {
    const { clientVersion } = req.body;
    const versionPath = path.join(__dirname, '../../../version.json');
    
    if (!fs.existsSync(versionPath)) {
      return res.json({ updateNeeded: false });
    }
    
    const serverVersion = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    
    // If client version doesn't match server version, update is needed
    const updateNeeded = clientVersion !== serverVersion.current;
    
    res.json({
      updateNeeded,
      serverVersion: serverVersion.current,
      clientVersion,
      updated: serverVersion.updated
    });
  } catch (error) {
    console.error('Error checking version:', error);
    res.status(500).json({ error: 'Failed to check version' });
  }
});

module.exports = router;
