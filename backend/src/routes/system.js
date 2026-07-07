const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const execPromise = util.promisify(exec);

// Middleware to check if user is admin (first user, specific usernames, or has admin flag)
const isAdmin = async (req, res, next) => {
  try {
    // Check if user is in admin list
    const adminUsernames = ['guy69']; // Add more admin usernames here
    
    const result = await db.query(
      'SELECT id, username FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Check if first user
    const firstUserResult = await db.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const isFirstUser = firstUserResult.rows.length > 0 && firstUserResult.rows[0].id === user.id;
    
    // Check if in admin username list
    const isAdminUsername = adminUsernames.includes(user.username);
    
    if (isFirstUser || isAdminUsername) {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// Check for updates
router.get('/check-updates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { stdout: currentCommit } = await execPromise('git rev-parse HEAD');
    const { stdout: remoteFetch } = await execPromise('git fetch origin main 2>&1');
    const { stdout: remoteCommit } = await execPromise('git rev-parse origin/main');
    
    const hasUpdates = currentCommit.trim() !== remoteCommit.trim();
    
    // Get commit log if updates available
    let commits = [];
    if (hasUpdates) {
      const { stdout: log } = await execPromise('git log HEAD..origin/main --oneline --max-count=10');
      commits = log.trim().split('\n').filter(line => line);
    }
    
    // Check for pending migrations
    const migrationFiles = await fs.readdir(path.join(__dirname, '../database'));
    const schemaMigrations = migrationFiles
      .filter(f => f.startsWith('schema-v') && f.endsWith('.sql'))
      .map(f => f.replace('schema-v', '').replace('.sql', ''))
      .sort((a, b) => parseInt(b) - parseInt(a));
    
    res.json({
      hasUpdates,
      currentCommit: currentCommit.trim().substring(0, 7),
      latestCommit: remoteCommit.trim().substring(0, 7),
      commits,
      pendingMigrations: schemaMigrations,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check updates error:', error);
    res.status(500).json({ error: 'Failed to check for updates', details: error.message });
  }
});

// Apply updates
router.post('/apply-updates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const updateLog = [];
    
    // Pull latest code
    updateLog.push({ step: 'Pulling latest code', status: 'running' });
    const { stdout: pullOutput } = await execPromise('git pull origin main 2>&1');
    updateLog.push({ step: 'Pulling latest code', status: 'success', output: pullOutput });
    
    // Copy production config
    updateLog.push({ step: 'Copying production config', status: 'running' });
    await execPromise('cp docker-compose.prod.yml docker-compose.yml');
    updateLog.push({ step: 'Copying production config', status: 'success' });
    
    // Rebuild containers
    updateLog.push({ step: 'Rebuilding containers', status: 'running' });
    const { stdout: buildOutput } = await execPromise('docker compose up -d --build 2>&1');
    updateLog.push({ step: 'Rebuilding containers', status: 'success', output: buildOutput });
    
    // Wait for containers to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Auto-run migrations
    const migrationFiles = await fs.readdir(path.join(__dirname, '../database'));
    const schemaMigrations = migrationFiles
      .filter(f => f.startsWith('schema-v') && f.endsWith('.sql'))
      .map(f => f.replace('schema-v', '').replace('.sql', ''))
      .sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const version of schemaMigrations) {
      const migrationScript = `migrate-v${version}.js`;
      const scriptPath = path.join(__dirname, '../database', migrationScript);
      
      try {
        await fs.access(scriptPath);
        updateLog.push({ step: `Running migration v${version}`, status: 'running' });
        
        try {
          const { stdout: migOutput } = await execPromise(`docker exec shop_backend npm run migrate-v${version} 2>&1`);
          updateLog.push({ step: `Running migration v${version}`, status: 'success', output: migOutput });
        } catch (migError) {
          // Migration might already be applied
          updateLog.push({ step: `Running migration v${version}`, status: 'skipped', output: 'Already applied or failed' });
        }
      } catch {
        // Migration script doesn't exist
        continue;
      }
    }
    
    updateLog.push({ step: 'Update complete', status: 'success' });
    
    res.json({
      success: true,
      message: 'Updates applied successfully',
      log: updateLog
    });
  } catch (error) {
    console.error('Apply updates error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to apply updates', 
      details: error.message 
    });
  }
});

// Get system status
router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { stdout: containerStatus } = await execPromise('docker compose ps --format json 2>&1');
    const { stdout: gitBranch } = await execPromise('git branch --show-current');
    const { stdout: gitCommit } = await execPromise('git rev-parse --short HEAD');
    
    // Parse container status
    let containers = [];
    try {
      const lines = containerStatus.trim().split('\n');
      containers = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(c => c !== null);
    } catch {
      containers = [];
    }
    
    // Get database version
    const dbResult = await db.query('SELECT version()');
    
    res.json({
      git: {
        branch: gitBranch.trim(),
        commit: gitCommit.trim()
      },
      containers: containers.map(c => ({
        name: c.Name || c.name,
        status: c.State || c.status,
        health: c.Health || 'unknown'
      })),
      database: {
        connected: true,
        version: dbResult.rows[0].version
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Failed to get system status', details: error.message });
  }
});

// Restart services
router.post('/restart', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { service } = req.body; // 'all', 'backend', 'frontend', 'postgres'
    
    let command = 'docker compose restart';
    if (service && service !== 'all') {
      command += ` ${service}`;
    }
    
    const { stdout } = await execPromise(command);
    
    res.json({
      success: true,
      message: `Service(s) restarted successfully`,
      output: stdout
    });
  } catch (error) {
    console.error('Restart service error:', error);
    res.status(500).json({ error: 'Failed to restart service', details: error.message });
  }
});

// View logs
router.get('/logs/:service', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { service } = req.params;
    const { lines = 100 } = req.query;
    
    const { stdout } = await execPromise(`docker compose logs --tail=${lines} ${service}`);
    
    res.json({
      service,
      logs: stdout
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs', details: error.message });
  }
});

module.exports = router;
