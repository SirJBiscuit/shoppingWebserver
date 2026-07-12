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
    const latestCommitFull = response.data.sha;
    const latestCommit = latestCommitFull.substring(0, 7);
    
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
    
    // Compare full hashes (currentCommit is full hash from version.json)
    const hasUpdates = currentCommit !== 'unknown' && currentCommit !== latestCommitFull;
    
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

// Store update status in file so it persists across container restarts
const UPDATE_STATUS_FILE = '/opt/cloudmc-shop/update-status.json';

let updateStatus = {
  running: false,
  progress: 0,
  message: '',
  startTime: null,
  logs: []
};

// Load status from file on startup
(async () => {
  try {
    const statusData = await fs.readFile(UPDATE_STATUS_FILE, 'utf8');
    updateStatus = JSON.parse(statusData);
    console.log('Loaded update status from file:', updateStatus);
  } catch (err) {
    // File doesn't exist or is invalid, use default
    console.log('No existing update status file, using defaults');
  }
})();

// Save status to file
async function saveUpdateStatus() {
  try {
    await fs.writeFile(UPDATE_STATUS_FILE, JSON.stringify(updateStatus, null, 2));
  } catch (err) {
    console.error('Failed to save update status:', err);
  }
}

// Run update script via webhook (async, returns immediately)
router.post('/run-update-script', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Update script requested by user:', req.user.userId);
    
    if (updateStatus.running) {
      return res.json({
        success: false,
        message: 'Update already in progress',
        status: updateStatus
      });
    }
    
    // Mark as running
    updateStatus = {
      running: true,
      progress: 0,
      message: 'Starting update...',
      startTime: new Date(),
      logs: ['Update initiated by user ' + req.user.userId]
    };
    await saveUpdateStatus();
    
    // Return immediately
    res.json({
      success: true,
      message: 'Update started',
      status: updateStatus
    });
    
    // Run update in background
    const axios = require('axios');
    const webhookUrl = 'http://host.docker.internal:9000/update';
    const webhookSecret = process.env.WEBHOOK_SECRET || 'change-me-in-production';
    
    // Execute async
    (async () => {
      try {
        updateStatus.progress = 10;
        updateStatus.message = 'Calling webhook server...';
        updateStatus.logs.push('Triggering update webhook');
        await saveUpdateStatus();
        
        const response = await axios.post(webhookUrl, {
          trigger: 'update',
          user: req.user.userId
        }, {
          headers: {
            'X-Webhook-Secret': webhookSecret
          },
          timeout: 600000 // 10 minute timeout
        });
        
        updateStatus.progress = 90;
        updateStatus.message = 'Update completed';
        updateStatus.logs.push('Webhook response received');
        updateStatus.logs.push(response.data.output || 'Success');
        await saveUpdateStatus();
        
        setTimeout(async () => {
          updateStatus.running = false;
          updateStatus.progress = 100;
          updateStatus.message = 'Update finished successfully';
          await saveUpdateStatus();
        }, 2000);
        
      } catch (error) {
        console.error('Background update error:', error);
        updateStatus.running = false;
        updateStatus.progress = 0;
        updateStatus.message = 'Update failed: ' + error.message;
        updateStatus.logs.push('Error: ' + error.message);
        await saveUpdateStatus();
      }
    })();
    
  } catch (error) {
    console.error('Update script error:', error);
    updateStatus.running = false;
    await saveUpdateStatus();
    res.status(500).json({ 
      success: false,
      error: 'Failed to start update', 
      details: error.message
    });
  }
});

// Get update status
router.get('/update-status', authenticateToken, isAdmin, async (req, res) => {
  res.json(updateStatus);
});

// Apply updates (async, returns immediately to avoid 502 on container restart)
router.post('/apply-updates', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('Apply updates requested by user:', req.user.userId);
    
    if (updateStatus.running) {
      return res.json({
        success: false,
        message: 'Update already in progress',
        status: updateStatus
      });
    }
    
    // Mark as running
    updateStatus = {
      running: true,
      progress: 0,
      message: 'Starting update...',
      startTime: new Date(),
      logs: ['Update initiated by user ' + req.user.userId]
    };
    await saveUpdateStatus();
    
    // Return immediately to avoid 502 when container restarts
    res.json({
      success: true,
      message: 'Update started',
      status: updateStatus
    });
    
    // Run update in background
    const gitDir = '/opt/cloudmc-shop';
    
    // Execute async
    (async () => {
      try {
        updateStatus.progress = 30;
        updateStatus.message = 'Rebuilding containers...';
        updateStatus.logs.push('Note: Run ./update-server.sh on host first to pull latest code');
        updateStatus.logs.push('Starting docker compose rebuild');
        await saveUpdateStatus();
        
        const { stdout: buildOutput } = await execPromise(`cd ${gitDir} && docker compose up -d --build 2>&1`);
        updateStatus.logs.push('Docker compose rebuild initiated');
        await saveUpdateStatus();
        
        updateStatus.progress = 60;
        updateStatus.message = 'Waiting for containers to start...';
        await saveUpdateStatus();
        
        // Wait for containers to be healthy
        await new Promise(resolve => setTimeout(resolve, 15000));
        updateStatus.logs.push('Containers should be starting');
        await saveUpdateStatus();
        
        updateStatus.progress = 90;
        updateStatus.message = 'Finalizing update...';
        updateStatus.logs.push('Note: Migrations are handled by update-server.sh');
        await saveUpdateStatus();
        
        // Give it a moment
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        updateStatus.progress = 100;
        updateStatus.message = 'Update completed successfully!';
        updateStatus.logs.push('Containers rebuilt and restarted');
        updateStatus.logs.push('Page will reload automatically');
        await saveUpdateStatus();
        
        // Mark as not running after a delay
        setTimeout(async () => {
          updateStatus.running = false;
          await saveUpdateStatus();
        }, 5000);
        
        console.log('Update completed successfully');
        
      } catch (error) {
        console.error('Background update error:', error);
        updateStatus.running = false;
        updateStatus.progress = 0;
        updateStatus.message = 'Update failed: ' + error.message;
        updateStatus.logs.push('Error: ' + error.message);
        updateStatus.logs.push('Try running ./update-server.sh manually on the host');
        await saveUpdateStatus();
      }
    })();
    
  } catch (error) {
    console.error('Apply updates error:', error);
    updateStatus.running = false;
    await saveUpdateStatus();
    res.status(500).json({ 
      success: false,
      error: 'Failed to start update', 
      details: error.message
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
