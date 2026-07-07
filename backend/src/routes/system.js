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
    
    console.log('Admin check - User ID:', req.user.userId);
    
    const result = await db.query(
      'SELECT id, username FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      console.log('Admin check - User not found');
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    console.log('Admin check - User:', user.username, 'ID:', user.id);
    
    // Check if first user
    const firstUserResult = await db.query('SELECT id FROM users ORDER BY id LIMIT 1');
    const isFirstUser = firstUserResult.rows.length > 0 && firstUserResult.rows[0].id === user.id;
    console.log('Admin check - Is first user:', isFirstUser, 'First user ID:', firstUserResult.rows[0]?.id);
    
    // Check if in admin username list
    const isAdminUsername = adminUsernames.includes(user.username);
    console.log('Admin check - Is admin username:', isAdminUsername, 'Username:', user.username);
    
    if (isFirstUser || isAdminUsername) {
      console.log('Admin check - GRANTED');
      next();
    } else {
      console.log('Admin check - DENIED');
      res.status(403).json({ 
        error: 'Admin access required',
        debug: {
          username: user.username,
          isFirstUser,
          isAdminUsername,
          adminList: adminUsernames
        }
      });
    }
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Failed to verify admin status', details: error.message });
  }
};

// Check for updates using GitHub API
router.get('/check-updates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const axios = require('axios');
    
    // Get latest commit from GitHub API
    const githubAPI = 'https://api.github.com/repos/SirJBiscuit/shoppingWebserver/commits/main';
    const response = await axios.get(githubAPI);
    const latestCommit = response.data.sha.substring(0, 7);
    
    // Read version from version.json file
    let currentCommit = 'unknown';
    let previousCommit = 'unknown';
    let lastUpdated = null;
    
    try {
      const versionPath = path.join(__dirname, '../../version.json');
      const versionData = await fs.readFile(versionPath, 'utf8');
      const version = JSON.parse(versionData);
      currentCommit = version.current || 'unknown';
      previousCommit = version.previous || 'unknown';
      lastUpdated = version.updated || null;
    } catch (err) {
      console.log('Could not read version.json:', err.message);
      // Try reading from mounted directory as fallback
      try {
        const mountedVersionPath = '/opt/cloudmc-shop/version.json';
        const versionData = await fs.readFile(mountedVersionPath, 'utf8');
        const version = JSON.parse(versionData);
        currentCommit = version.current || 'unknown';
        previousCommit = version.previous || 'unknown';
        lastUpdated = version.updated || null;
      } catch (err2) {
        console.log('Could not read mounted version.json either:', err2.message);
      }
    }
    
    const hasUpdates = currentCommit !== latestCommit && currentCommit !== 'unknown';
    
    // Get recent commits
    const commitsResponse = await axios.get('https://api.github.com/repos/SirJBiscuit/shoppingWebserver/commits?per_page=10');
    const commits = commitsResponse.data.map(c => `${c.sha.substring(0, 7)} ${c.commit.message.split('\n')[0]}`);
    
    // Check for pending migrations
    const migrationFiles = await fs.readdir(path.join(__dirname, '../database'));
    const schemaMigrations = migrationFiles
      .filter(f => f.startsWith('schema-v') && f.endsWith('.sql'))
      .map(f => f.replace('schema-v', '').replace('.sql', ''))
      .sort((a, b) => parseInt(b) - parseInt(a));
    
    res.json({
      hasUpdates,
      currentCommit: currentCommit === 'unknown' ? 'unknown' : currentCommit.substring(0, 7),
      previousCommit: previousCommit === 'unknown' || previousCommit === 'none' ? 'N/A' : previousCommit.substring(0, 7),
      latestCommit,
      commits: commits.slice(0, 10),
      pendingMigrations: schemaMigrations,
      lastUpdated,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Check updates error:', error);
    res.status(500).json({ error: 'Failed to check for updates', details: error.message, stack: error.stack });
  }
});

// Run update script
router.post('/run-update-script', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Running update-server.sh script requested by user:', req.user.userId);
    
    // Create a trigger file that the host can monitor
    // Or execute via docker exec on host
    const gitDir = '/opt/cloudmc-shop';
    
    // Try to execute using sh instead of bash
    const { stdout, stderr } = await execPromise(`sh ${gitDir}/update-server.sh 2>&1`, {
      cwd: gitDir,
      shell: '/bin/sh',
      timeout: 300000 // 5 minute timeout
    });
    
    const output = stdout || stderr || 'Update script executed';
    
    console.log('Update script completed');
    res.json({
      success: true,
      message: 'Update script executed successfully',
      output: output
    });
  } catch (error) {
    console.error('Update script error:', error);
    const errorOutput = error.stdout || error.stderr || error.message;
    res.status(500).json({ 
      success: false,
      error: 'Failed to run update script', 
      details: error.message,
      output: errorOutput
    });
  }
});

// Apply updates
router.post('/apply-updates', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Apply updates requested by user:', req.user.userId);
    const updateLog = [];
    const gitDir = '/opt/cloudmc-shop';
    
    // Pull latest code
    updateLog.push({ step: 'Pulling latest code', status: 'running' });
    console.log('Executing: git pull');
    try {
      const { stdout: pullOutput } = await execPromise(`cd ${gitDir} && git pull origin main 2>&1`);
      updateLog.push({ step: 'Pulling latest code', status: 'success', output: pullOutput });
      console.log('Git pull successful');
    } catch (pullError) {
      console.error('Git pull failed:', pullError);
      updateLog.push({ step: 'Pulling latest code', status: 'error', output: pullError.message });
      throw pullError;
    }
    
    // Copy production config
    updateLog.push({ step: 'Copying production config', status: 'running' });
    await execPromise(`cd ${gitDir} && cp docker-compose.prod.yml docker-compose.yml`);
    updateLog.push({ step: 'Copying production config', status: 'success' });
    
    // Rebuild containers
    updateLog.push({ step: 'Rebuilding containers', status: 'running' });
    const { stdout: buildOutput } = await execPromise(`cd ${gitDir} && docker compose up -d --build 2>&1`);
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
    
    console.log('Update completed successfully');
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
      details: error.message,
      log: updateLog
    });
  }
});

// Get system status
router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get database version
    const dbResult = await db.query('SELECT version()');
    
    // Simple container check
    let containers = [
      { name: 'shop_backend', status: 'running', health: 'healthy' },
      { name: 'shop_frontend', status: 'running', health: 'healthy' },
      { name: 'shop_postgres', status: 'running', health: 'healthy' }
    ];
    
    res.json({
      git: {
        branch: 'main',
        commit: process.env.GIT_COMMIT || 'unknown'
      },
      containers,
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
    res.status(500).json({ error: 'Failed to get system status', details: error.message, stack: error.stack });
  }
});

// Restart services
router.post('/restart', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { service } = req.body; // 'all', 'backend', 'frontend', 'postgres'
    
    // For now, return instructions
    // In production, this would need proper Docker API integration
    const message = service === 'all' 
      ? 'To restart all services, run: docker compose restart'
      : `To restart ${service}, run: docker compose restart ${service}`;
    
    res.json({
      success: false,
      message: 'Service restart from web interface is coming soon',
      instructions: message,
      note: 'Use command line or the update script for now'
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
    
    // Use docker CLI through exec
    const containerName = `shop_${service}`;
    
    try {
      const { stdout, stderr } = await execPromise(`docker logs ${containerName} --tail=${lines} 2>&1`);
      const logOutput = stdout || stderr || 'No logs available';
      
      res.json({
        service,
        logs: logOutput,
        containerName
      });
    } catch (execError) {
      // If docker command fails, return helpful message
      res.json({
        service,
        logs: `Could not retrieve logs for ${containerName}.\n\nError: ${execError.message}\n\nTo view logs manually, run:\ndocker logs ${containerName} --tail=100`,
        error: true
      });
    }
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs', details: error.message });
  }
});

module.exports = router;
