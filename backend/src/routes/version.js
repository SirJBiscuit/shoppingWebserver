const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// version.json is written by the host update scripts at the repo root — in
// the container that root is the /opt/cloudmc-shop bind mount (the old code
// looked at /version.json, which is why prod always reported "unknown").
const VERSION_PATHS = [
  '/opt/cloudmc-shop/version.json',
  path.join(__dirname, '../../../version.json')
];

const readVersion = () => {
  for (const p of VERSION_PATHS) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { /* unreadable/corrupt — try next */ }
  }
  return null;
};

const DEFAULT_VERSION = {
  current: 'unknown',
  previous: 'none',
  updated: new Date().toISOString(),
  message: 'Welcome to Listzy!'
};

// Get version info (root route for UpdateNotification)
router.get('/', (req, res) => {
  try {
    res.json(readVersion() || DEFAULT_VERSION);
  } catch (error) {
    console.error('Error reading version:', error);
    res.status(500).json({ error: 'Failed to read version' });
  }
});

// Get current version info (legacy route)
router.get('/current', (req, res) => {
  try {
    res.json(readVersion() || DEFAULT_VERSION);
  } catch (error) {
    console.error('Error reading version:', error);
    res.status(500).json({ error: 'Failed to read version' });
  }
});

// Check if update is needed (compare with client version)
router.post('/check', (req, res) => {
  try {
    const { clientVersion } = req.body;
    const serverVersion = readVersion();

    if (!serverVersion) {
      return res.json({ updateNeeded: false });
    }

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
