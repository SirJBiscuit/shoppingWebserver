const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const db = require('../database/db');

class AutoUpdater {
  constructor() {
    this.isUpdating = false;
    this.lastCheck = null;
    this.currentCommit = null;
    this.updateInterval = null;
    this.checkIntervalMs = 30000; // 30 seconds
    this.isCheckingForUpdates = false; // Prevent concurrent checks
    this.dbPool = null; // Reuse DB connections
  }

  async initialize() {
    console.log('🔄 Auto-updater initialized');
    
    // Get current commit on startup
    await this.getCurrentCommit();
    
    // Start checking for updates
    this.startChecking();
  }

  async getCurrentCommit() {
    try {
      const { stdout } = await execPromise('git rev-parse HEAD');
      this.currentCommit = stdout.trim();
      console.log(`📌 Current commit: ${this.currentCommit.substring(0, 7)}`);
      return this.currentCommit;
    } catch (error) {
      console.error('❌ Error getting current commit:', error.message);
      return null;
    }
  }

  async checkForUpdates() {
    // Prevent concurrent checks (non-blocking)
    if (this.isCheckingForUpdates) {
      return { hasUpdate: false, reason: 'check_in_progress' };
    }
    
    if (this.isUpdating) {
      return { hasUpdate: false, reason: 'update_in_progress' };
    }

    this.isCheckingForUpdates = true;

    try {
      this.lastCheck = new Date();
      
      // Use spawn for non-blocking git fetch (runs in background)
      await new Promise((resolve, reject) => {
        const gitFetch = spawn('git', ['fetch', 'origin', 'main'], {
          stdio: 'ignore', // Don't capture output for performance
          detached: false
        });
        
        const timeout = setTimeout(() => {
          gitFetch.kill();
          reject(new Error('Git fetch timeout'));
        }, 10000); // 10 second timeout
        
        gitFetch.on('close', (code) => {
          clearTimeout(timeout);
          if (code === 0) resolve();
          else reject(new Error(`Git fetch failed with code ${code}`));
        });
        
        gitFetch.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      // Quick hash comparison (very fast)
      const { stdout: remoteCommit } = await execPromise('git rev-parse origin/main', {
        timeout: 2000,
        maxBuffer: 1024
      });
      const remote = remoteCommit.trim();
      
      const local = this.currentCommit || await this.getCurrentCommit();
      
      if (remote !== local) {
        console.log(`🆕 Update available: ${local.substring(0, 7)} → ${remote.substring(0, 7)}`);
        
        // Get commit messages (async, don't wait)
        setImmediate(async () => {
          try {
            const { stdout: commits } = await execPromise(`git log --oneline ${local}..${remote}`, {
              timeout: 3000
            });
            console.log('📝 Changes:', commits.trim().split('\n').slice(0, 5).join('\n   '));
          } catch (err) {
            // Ignore errors in commit message fetching
          }
        });
        
        return {
          hasUpdate: true,
          currentCommit: local,
          newCommit: remote
        };
      }
      
      return { hasUpdate: false, reason: 'up_to_date' };
    } catch (error) {
      console.error('❌ Error checking for updates:', error.message);
      return { hasUpdate: false, reason: 'check_failed', error: error.message };
    } finally {
      this.isCheckingForUpdates = false;
    }
  }

  async performUpdate() {
    if (this.isUpdating) {
      return { success: false, reason: 'update_in_progress' };
    }

    this.isUpdating = true;
    const startTime = Date.now();
    
    console.log('🚀 Starting automatic update...');

    try {
      // Log update attempt to database
      await this.logUpdateAttempt('started');

      // Run the update script
      const { stdout, stderr } = await execPromise('./update-server.sh', {
        cwd: process.cwd(),
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const duration = Date.now() - startTime;
      
      console.log('✅ Update completed successfully');
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);

      // Update current commit
      await this.getCurrentCommit();

      // Log success to database
      await this.logUpdateAttempt('success', {
        duration,
        output: stdout.substring(0, 5000) // Store first 5000 chars
      });

      // Notify all connected clients
      await this.notifyClients({
        type: 'update_success',
        message: 'Application updated successfully',
        timestamp: new Date()
      });

      return {
        success: true,
        duration,
        output: stdout
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('❌ Update failed:', error.message);

      // Log failure to database
      await this.logUpdateAttempt('failed', {
        duration,
        error: error.message,
        stderr: error.stderr?.substring(0, 5000)
      });

      // Notify admins of failure
      await this.notifyAdmins({
        type: 'update_failed',
        message: 'Automatic update failed',
        error: error.message,
        timestamp: new Date()
      });

      return {
        success: false,
        error: error.message,
        stderr: error.stderr
      };

    } finally {
      this.isUpdating = false;
    }
  }

  async logUpdateAttempt(status, details = {}) {
    // Non-blocking database write using setImmediate
    setImmediate(async () => {
      try {
        await db.query(
          `INSERT INTO update_log (status, details, created_at) 
           VALUES ($1, $2, NOW())`,
          [status, JSON.stringify(details)]
        );
      } catch (error) {
        console.error('Error logging update attempt:', error.message);
      }
    });
  }

  async notifyClients(notification) {
    // Non-blocking notification storage
    setImmediate(async () => {
      try {
        await db.query(
          `INSERT INTO system_notifications (type, message, data, created_at) 
           VALUES ($1, $2, $3, NOW())`,
          [notification.type, notification.message, JSON.stringify(notification)]
        );
      } catch (error) {
        console.error('Error storing notification:', error.message);
      }
    });
  }

  async notifyAdmins(notification) {
    // Non-blocking admin notification
    setImmediate(async () => {
      try {
        await db.query(
          `INSERT INTO admin_notifications (type, message, data, severity, created_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [notification.type, notification.message, JSON.stringify(notification), 'high']
        );
      } catch (error) {
        console.error('Error storing admin notification:', error.message);
      }
    });
  }

  startChecking() {
    console.log(`🔍 Starting update checks every ${this.checkIntervalMs / 1000}s`);
    
    this.updateInterval = setInterval(() => {
      // Run check in separate async context to prevent blocking
      setImmediate(async () => {
        try {
          const updateCheck = await this.checkForUpdates();
          
          if (updateCheck.hasUpdate) {
            console.log('📥 New update detected, starting automatic update...');
            
            // Perform update asynchronously without blocking
            const result = await this.performUpdate();
            
            if (result.success) {
              console.log('✨ Application is now up to date!');
            } else {
              console.error('⚠️  Update failed, admin intervention required');
            }
          }
        } catch (error) {
          console.error('❌ Error in update check cycle:', error.message);
          // Continue checking even if one cycle fails
        }
      });
    }, this.checkIntervalMs);
  }

  stopChecking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('🛑 Stopped checking for updates');
    }
  }

  async getStatus() {
    return {
      isUpdating: this.isUpdating,
      lastCheck: this.lastCheck,
      currentCommit: this.currentCommit,
      checkInterval: this.checkIntervalMs
    };
  }

  async getUpdateHistory(limit = 10) {
    try {
      const result = await db.query(
        `SELECT * FROM update_log 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting update history:', error.message);
      return [];
    }
  }
}

// Singleton instance
const autoUpdater = new AutoUpdater();

module.exports = autoUpdater;
