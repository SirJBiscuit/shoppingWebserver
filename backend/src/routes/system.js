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
    // authenticateToken sets req.user = { id, username, isAdmin }
    if (req.user?.isAdmin) {
      return next();
    }

    const userId = req.user?.id || req.user?.userId;
    console.log('Admin check - User ID:', userId);

    if (!userId) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Check if user is in admin list
    const adminUsernames = ['guy69']; // Add more admin usernames here

    const result = await db.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
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
    
    // Deployed commit — prefer the mounted repo's HEAD (accurate after ANY
    // host-side pull, even without update-server.sh), then version.json.
    let currentCommit = 'unknown';
    let previousCommit = 'unknown';
    let lastUpdated = null;

    try {
      const { execSync } = require('child_process');
      currentCommit = execSync(
        "git -c safe.directory='*' -C /opt/cloudmc-shop rev-parse HEAD",
        { timeout: 5000 }
      ).toString().trim() || 'unknown';
    } catch { /* repo not mounted — fall through to version.json */ }

    for (const versionPath of ['/opt/cloudmc-shop/version.json', path.join(__dirname, '../../version.json')]) {
      try {
        const version = JSON.parse(await fs.readFile(versionPath, 'utf8'));
        if (currentCommit === 'unknown') currentCommit = version.current || 'unknown';
        previousCommit = version.previous || 'unknown';
        lastUpdated = version.updated || null;
        break;
      } catch { /* file missing — try next */ }
    }

    // Short-sha compare: HEAD may be 7 or 40 chars depending on the source
    const hasUpdates = currentCommit !== 'unknown' &&
      latestCommitFull.substring(0, currentCommit.length) !== currentCommit;

    // Commits the update would bring — from the same git state the
    // auto-updater sees; falls back to recent GitHub history.
    const updater = require('../services/autoUpdaterSimple');
    let pending = updater.getStatus().pending;
    const commitsResponse = await axios.get('https://api.github.com/repos/SirJBiscuit/shoppingWebserver/commits?per_page=10');
    const commits = commitsResponse.data.map(c => `${c.sha.substring(0, 7)} ${c.commit.message.split('\n')[0]}`);
    if (!pending.length) pending = commits.slice(0, 5);

    // Real pending migrations: files in backend/migrations minus the
    // schema_migrations table (the old check scanned the wrong directory).
    let pendingMigrations = [];
    try {
      const migrationDir = path.join(__dirname, '../../migrations');
      const files = (await fs.readdir(migrationDir)).filter(f => f.endsWith('.sql'));
      const applied = await db.query('SELECT file FROM schema_migrations').then(r => r.rows.map(x => x.file)).catch(() => null);
      pendingMigrations = applied === null
        ? files // table not created yet — everything is pending
        : files.filter(f => !applied.includes(f));
    } catch { /* no migrations dir */ }

    res.json({
      hasUpdates,
      currentCommit: currentCommit === 'unknown' ? 'unknown' : currentCommit.substring(0, 7),
      previousCommit: previousCommit === 'unknown' || previousCommit === 'none' ? 'N/A' : previousCommit.substring(0, 7),
      latestCommit,
      commits: commits.slice(0, 10),
      pending,
      pendingMigrations,
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
    console.log('Update script requested by user:', req.user.id);
    
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
      logs: ['Update initiated by user ' + req.user.id]
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
          user: req.user.id
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
    console.log('Apply updates requested by user:', req.user.id);
    
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
      logs: ['Update initiated by user ' + req.user.id]
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

// Get system status (public version for version indicator)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Get version info from database
    const statusResult = await db.query('SELECT current_version, update_available FROM system_status WHERE id = 1');
    const status = statusResult.rows[0] || { current_version: 'unknown', update_available: false };

    // The live checker knows more than the DB row — repo HEAD + what the
    // pending update adds. DB stays the fallback when it hasn't run yet.
    let updaterStatus = null;
    try {
      updaterStatus = require('../services/autoUpdaterSimple').getStatus();
    } catch { /* checker not initialized */ }

    res.json({
      current_version: updaterStatus?.current || status.current_version || 'unknown',
      update_available: updaterStatus?.updateAvailable ?? (status.update_available || false),
      pending: updaterStatus?.pending || [],
      last_checked: updaterStatus?.lastCheck || null
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Failed to get system status', details: error.message });
  }
});

// Get detailed system status (admin only)
router.get('/status/detailed', authenticateToken, isAdmin, async (req, res) => {
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
    console.error('Get detailed system status error:', error);
    res.status(500).json({ error: 'Failed to get system status', details: error.message, stack: error.stack });
  }
});

// Service health — powers the admin Services panel. Each check runs with a
// short timeout and reports {key,label,status,detail,ms}; status is one of
// up | down | standby | unknown. docker.sock is bind-mounted so container
// states are real, not assumed.
const svcHttp = (url, ms) => {
  const t0 = Date.now();
  return fetch(url, { signal: AbortSignal.timeout(ms), redirect: 'manual' })
    .then((r) => ({ ok: r.status < 500, ms: Date.now() - t0, code: r.status, headers: r.headers }))
    .catch((err) => ({ ok: false, ms: Date.now() - t0, err: err.name === 'TimeoutError' ? 'timeout' : err.message }));
};

const svcDockerPs = () => new Promise((resolve) => {
  const http = require('http');
  const r = http.request({ socketPath: '/var/run/docker.sock', path: '/containers/json?all=true' }, (resp) => {
    let d = '';
    resp.on('data', (c) => { d += c; });
    resp.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
  });
  r.on('error', () => resolve([]));
  r.setTimeout(2000, () => r.destroy());
  r.end();
});

const dockerState = (containers, name) => {
  const c = containers.find((x) => (x.Names || []).some((n) => n === `/${name}`));
  if (!c) return { status: 'down', detail: 'container not found' };
  if (c.State !== 'running') return { status: 'down', detail: c.Status || c.State };
  const healthy = c.Status?.includes('healthy');
  const unhealthy = c.Status?.includes('unhealthy');
  return { status: unhealthy ? 'degraded' : 'up', detail: c.Status, health: healthy ? 'healthy' : (unhealthy ? 'unhealthy' : 'none') };
};

router.get('/services', authenticateToken, isAdmin, async (req, res) => {
  const out = [];
  const push = (key, label, status, detail, ms) => out.push({ key, label, status, detail, ms });

  const containers = await svcDockerPs();

  // Backend is answering this request — report self
  push('backend', 'Backend API', 'up', `uptime ${Math.round(process.uptime() / 60)}m`, 0);

  // Postgres — real query
  try {
    const t0 = Date.now();
    await db.query('SELECT 1');
    push('postgres', 'Postgres DB', 'up', 'query OK', Date.now() - t0);
  } catch (err) {
    push('postgres', 'Postgres DB', 'down', err.message, null);
  }

  // Frontend container — nginx listens on :80 inside; :3006 is host-side only
  const feProbe = await svcHttp('http://frontend:80', 3000);
  if (feProbe.ok) push('frontend', 'Frontend', 'up', `http ${feProbe.code}`, feProbe.ms);
  else push('frontend', 'Frontend', dockerState(containers, 'shop_frontend').status === 'up' ? 'degraded' : 'down',
    dockerState(containers, 'shop_frontend').detail || feProbe.err, feProbe.ms);

  // Maintenance placeholder — only runs DURING a deploy; idle is the norm
  const maint = dockerState(containers, 'shop_maintenance');
  push('maintenance', 'Maintenance page', 'standby',
    maint.status === 'up' ? 'serving :3006 (deploy in progress)' : 'idle — only serves during deploys', null);

  // ntfy push service — HEAD the base URL
  const ntfyBase = process.env.NTFY_BASE_URL || 'https://ntfy.sh';
  const ntfy = await svcHttp(ntfyBase, 4000);
  push('ntfy', 'ntfy push', ntfy.ok ? 'up' : 'down', ntfy.ok ? `${ntfyBase} ${ntfy.code}` : (ntfy.err || `http ${ntfy.code}`), ntfy.ms);

  // Public URL — distinguishes app-down from Cloudflare/tunnel-down. Probe
  // the domain the admin actually used (Host header) first, then configured
  // URLs — hardcoding a stale domain reports a false outage.
  const reqHost = (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0];
  const candidates = [
    reqHost && !/localhost|127\.0\.0\.1/.test(reqHost) ? `https://${reqHost}` : null,
    process.env.PUBLIC_URL || null,
    process.env.FRONTEND_URL || null,
    'https://shop.cloudmc.online',
    'https://listzy.app',
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // dedupe
  let pub = { ok: false, err: 'no candidate URLs' }; let pubUrl = candidates[0];
  for (const url of candidates) {
    const r = await svcHttp(url, 6000);
    if (r.ok) { pub = r; pubUrl = url; break; }
    pub = r;
  }
  push('public', 'Public URL', pub.ok ? 'up' : 'down',
    pub.ok ? `${pubUrl} ${pub.code}${pub.headers?.get('cf-ray') ? ' · via Cloudflare' : ''}` : (pub.err || `http ${pub.code}`), pub.ms);

  // Update webhook binds host loopback (127.0.0.1:9000) — a container can't
  // reach it; that's by design. Report it as unprobeable, not "offline".
  push('webhook', 'Update webhook', 'unknown', 'host loopback only — check `systemctl status shop-webhook` on the server', null);

  // GitHub reachability (update checking depends on it)
  const gh = await svcHttp('https://api.github.com', 4000);
  push('github', 'GitHub API', gh.ok ? 'up' : 'down', gh.ok ? `http ${gh.code}` : (gh.err || 'unreachable'), gh.ms);

  res.json({ services: out, checkedAt: new Date().toISOString() });
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

// ============================================
// AUTO-UPDATE SYSTEM ROUTES (Optimized)
// ============================================

// Get update status (lightweight, cached)
router.get('/update/status', authenticateToken, async (req, res) => {
  try {
    const autoUpdater = require('../services/autoUpdater');
    const status = await autoUpdater.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get update status' });
  }
});

// Get system notifications (for all users)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await db.query(
      `SELECT id, type, message, data, created_at 
       FROM system_notifications 
       WHERE is_read = FALSE 
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC 
       LIMIT $1`,
      [Math.min(limit, 50)] // Cap at 50 for performance
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read (non-blocking)
router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  // Respond immediately, update in background
  res.json({ success: true });
  
  setImmediate(async () => {
    try {
      await db.query(
        'UPDATE system_notifications SET is_read = TRUE WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
    }
  });
});

// Admin: Get update history
router.get('/update/history', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const autoUpdater = require('../services/autoUpdater');
    const history = await autoUpdater.getUpdateHistory(Math.min(limit, 100));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get update history' });
  }
});

// Admin: Get admin notifications
router.get('/admin/notifications', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 20, unread_only = 'true' } = req.query;
    
    let query = `SELECT * FROM admin_notifications `;
    if (unread_only === 'true') {
      query += `WHERE is_read = FALSE `;
    }
    query += `ORDER BY 
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      created_at DESC 
      LIMIT $1`;
    
    const result = await db.query(query, [Math.min(limit, 100)]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get admin notifications' });
  }
});

// Admin: Mark admin notification as read
router.post('/admin/notifications/:id/read', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  res.json({ success: true });
  
  setImmediate(async () => {
    try {
      await db.query(
        'UPDATE admin_notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('Error marking admin notification as read:', error.message);
    }
  });
});

// Admin: Manually trigger update check
router.post('/update/check', authenticateToken, isAdmin, async (req, res) => {
  try {
    const autoUpdater = require('../services/autoUpdater');
    const result = await autoUpdater.checkForUpdates();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

// Admin: Request an update — writes the flag file consumed by the host-side
// watcher (trigger-update.sh → update-server.sh). Same mechanism the
// auto-updater uses; safe to call manually since the container can't
// self-restart mid-script.
router.post('/update/request', authenticateToken, isAdmin, async (req, res) => {
  try {
    const flagPath = process.env.UPDATE_FLAG_PATH || '/opt/cloudmc-shop/.update-requested';
    await fs.writeFile(flagPath, JSON.stringify({
      requested_at: new Date().toISOString(),
      requested_by: req.user.id,
      manual: true
    }, null, 2));

    await db.query(
      `UPDATE system_status
       SET update_available = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );

    res.json({
      success: true,
      message: 'Update requested — the host watcher will pull and rebuild shortly. The app may restart briefly.'
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      error: 'Failed to request update',
      details: 'Flag path may not be writable — check the /opt/cloudmc-shop mount or UPDATE_FLAG_PATH.'
    });
  }
});

// Admin: Manually trigger update (use with caution)
router.post('/update/perform', authenticateToken, isAdmin, async (req, res) => {
  try {
    const autoUpdater = require('../services/autoUpdater');
    
    // Start update asynchronously
    res.json({ 
      success: true, 
      message: 'Update started in background',
      note: 'Check update history for results'
    });
    
    // Perform update without blocking response
    setImmediate(async () => {
      await autoUpdater.performUpdate();
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to start update' });
  }
});

// ============================================
// CHANGELOG & FEATURE TRACKER
// ============================================

// Get full changelog from git history
router.get('/changelog', authenticateToken, async (req, res) => {
  // TEMPORARY: Disable git commands to prevent crashes
  // TODO: Re-enable after debugging on server
  console.log('Changelog endpoint called - returning empty (disabled for debugging)');
  return res.json({ commits: [], total: 0, disabled: true });
  
  /* DISABLED TEMPORARILY
  try {
    // Get git log with custom format: hash|date|message|author
    // Run from project root (one level up from backend)
    const projectRoot = path.join(__dirname, '..', '..');
    
    // Check if git is available and directory is a git repo
    try {
      await execPromise('git --version', { cwd: projectRoot });
    } catch (gitError) {
      console.warn('Git not available, returning empty changelog');
      return res.json({ commits: [], total: 0, error: 'Git not available' });
    }
    
    const { stdout } = await execPromise(
      'git log --pretty=format:"%H|%ai|%s|%an" --reverse',
      { cwd: projectRoot, timeout: 5000 } // 5 second timeout
    );
    
    if (!stdout || !stdout.trim()) {
      return res.json({ commits: [], total: 0 });
    }
    
    const commits = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, date, message, author] = line.split('|');
        return {
          hash,
          date,
          message,
          author
        };
      });
    
    res.json({
      commits,
      total: commits.length
    });
  } catch (error) {
    console.error('Error getting changelog:', error.message);
    // Return empty array instead of error to prevent frontend crashes
    res.json({ commits: [], total: 0, error: error.message });
  }
  */
});

// Get changelog stats
router.get('/changelog/stats', authenticateToken, async (req, res) => {
  // TEMPORARY: Disabled
  return res.json({ total: 0, features: 0, fixes: 0, performance: 0, docs: 0, other: 0, disabled: true });
  /* DISABLED
  try {
    const projectRoot = path.join(__dirname, '..', '..');
    const { stdout } = await execPromise(
      'git log --pretty=format:"%s" --reverse',
      { cwd: projectRoot, timeout: 5000 }
    );
    
    const messages = stdout.split('\n').filter(line => line.trim());
    
    const stats = {
      total: messages.length,
      features: messages.filter(m => m.toLowerCase().startsWith('feat')).length,
      fixes: messages.filter(m => m.toLowerCase().startsWith('fix')).length,
      performance: messages.filter(m => m.toLowerCase().startsWith('perf')).length,
      docs: messages.filter(m => m.toLowerCase().startsWith('docs')).length,
      other: 0
    };
    
    stats.other = stats.total - stats.features - stats.fixes - stats.performance - stats.docs;
    
    // Get first and last commit dates
    const { stdout: firstDate } = await execPromise('git log --reverse --pretty=format:"%ai" | head -1');
    const { stdout: lastDate } = await execPromise('git log --pretty=format:"%ai" | head -1');
    
    stats.firstCommit = firstDate.trim();
    stats.lastCommit = lastDate.trim();
    
    // Calculate days of development
    const first = new Date(stats.firstCommit);
    const last = new Date(stats.lastCommit);
    stats.daysOfDevelopment = Math.floor((last - first) / (1000 * 60 * 60 * 24));
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting changelog stats:', error.message);
    // Return empty stats instead of error
    res.json({ total: 0, features: 0, fixes: 0, performance: 0, docs: 0, other: 0 });
  }
  */
});

// Get recent changes (last N commits)
router.get('/changelog/recent/:count?', authenticateToken, async (req, res) => {
  // TEMPORARY: Disabled
  return res.json({ commits: [], count: 0, disabled: true });
  /* DISABLED
  try {
    const count = parseInt(req.params.count) || 10;
    const projectRoot = path.join(__dirname, '..', '..');
    const { stdout } = await execPromise(
      `git log --pretty=format:"%H|%ai|%s|%an" -n ${count}`,
      { cwd: projectRoot, timeout: 5000 }
    );
    
    const commits = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, date, message, author] = line.split('|');
        return {
          hash,
          date,
          message,
          author
        };
      });
    
    res.json({
      commits,
      count: commits.length
    });
  } catch (error) {
    console.error('Error getting recent changelog:', error.message);
    // Return empty array instead of error
    res.json({ commits: [], count: 0, error: error.message });
  }
  */
});

module.exports = router;
