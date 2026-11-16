const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const db = require('../database/db');

class SimpleAutoUpdater {
  constructor() {
    this.checkIntervalMs = 60000; // Check every 60 seconds
    this.updateInterval = null;
    this.isChecking = false;
    this.githubRepo = 'SirJBiscuit/shoppingWebserver';
    this.githubBranch = 'main';
    // Host-side flag file consumed by update-server.sh (see docker-compose
    // volume mount). Configurable so non-/opt/cloudmc-shop deploys still work.
    this.updateFlagPath = process.env.UPDATE_FLAG_PATH || '/opt/cloudmc-shop/.update-requested';
    // Commit already flagged this boot — prevents writing/logging every cycle.
    this.requestedCommit = null;
  }

  async initialize() {
    console.log('🔄 Simple Auto-Updater initialized');
    console.log(`📡 Monitoring GitHub: ${this.githubRepo} (${this.githubBranch})`);
    console.log(`⏱️  Check interval: ${this.checkIntervalMs / 1000}s`);
    
    // Start checking
    this.startChecking();
  }

  startChecking() {
    // Check immediately
    this.checkForUpdates();
    
    // Then check periodically
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.checkIntervalMs);
  }

  async checkForUpdates() {
    if (this.isChecking) return;
    
    this.isChecking = true;
    
    try {
      // Get current commit from database
      const currentVersion = await this.getCurrentVersion();
      
      // Get latest commit from GitHub
      const latestCommit = await this.getLatestGitHubCommit();
      
      if (!latestCommit) {
        console.log('⚠️  Could not fetch latest commit from GitHub');
        return;
      }
      
      // Compare on short-sha prefix — the DB stores 7 chars while the
      // GitHub sha is 40, so a strict !== would report "update available"
      // forever (and leave the Update Now button stuck on).
      const cur = (currentVersion || '').substring(0, 7);
      const lat = latestCommit.sha.substring(0, 7);
      if (cur !== lat) {
        console.log('🆕 Update available!');
        console.log(`   Current: ${cur || 'unknown'}`);
        console.log(`   Latest:  ${lat}`);
        console.log(`   Message: ${latestCommit.message}`);

        // Request update by creating flag file (once per commit per boot)
        if (this.requestedCommit !== latestCommit.sha) {
          await this.requestUpdate(latestCommit);
        }
      } else {
        console.log('✅ Up to date');
        this.requestedCommit = null;
        // Clear any stale flag — host-side pulls never write back, so
        // update_available could otherwise stay true after updating.
        await db.query(
          'UPDATE system_status SET update_available = false WHERE id = 1 AND update_available = true'
        ).catch(() => {});
      }
      
    } catch (error) {
      console.error('❌ Error checking for updates:', error.message);
    } finally {
      this.isChecking = false;
    }
  }

  async getCurrentVersion() {
    // Prefer real git HEAD — a host-side update pulls the repo but only the
    // container's own perform path writes current_version back, so the DB row
    // can go permanently stale after an update.
    try {
      const { execSync } = require('child_process');
      const sha = execSync('git rev-parse HEAD', { timeout: 5000 }).toString().trim();
      if (sha) {
        // Keep the row in sync so /api/system/status reports the same value
        db.query('UPDATE system_status SET current_version = $1 WHERE id = 1', [sha]).catch(() => {});
        return sha;
      }
    } catch { /* git unavailable inside this container — fall back to DB */ }
    try {
      const result = await db.query('SELECT current_version FROM system_status WHERE id = 1');
      return result?.rows?.[0]?.current_version || null;
    } catch (error) {
      console.warn('Could not get current version from database');
      return null;
    }
  }

  async getLatestGitHubCommit() {
    try {
      const url = `https://api.github.com/repos/${this.githubRepo}/commits/${this.githubBranch}`;
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CloudMC-Shop-AutoUpdater'
        },
        timeout: 10000
      });
      
      return {
        sha: response.data.sha,
        message: response.data.commit.message.split('\n')[0],
        author: response.data.commit.author.name,
        date: response.data.commit.author.date
      };
    } catch (error) {
      if (error.response?.status === 403) {
        console.warn('⚠️  GitHub API rate limit exceeded');
      }
      return null;
    }
  }

  async requestUpdate(commitInfo) {
    try {
      // Write flag file to request update
      const flagContent = JSON.stringify({
        requested_at: new Date().toISOString(),
        commit: commitInfo.sha,
        message: commitInfo.message
      }, null, 2);
      
      await fs.writeFile(this.updateFlagPath, flagContent);
      console.log('📝 Update flag file created');
      console.log('   A cron job or manual run of ./update-server.sh will apply the update');

      // Also update database
      await db.query(`
        UPDATE system_status
        SET update_available = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `);

    } catch (error) {
      console.error('❌ Error requesting update:', error.message);
      console.error('   Update cannot be applied until the flag path is writable —');
      console.error('   mount the repo dir or set UPDATE_FLAG_PATH in docker-compose.');
    }
    // Whether it succeeded or not, don't re-attempt every 60s for this commit.
    this.requestedCommit = commitInfo.sha;
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('🛑 Auto-updater stopped');
    }
  }
}

// Create singleton
const autoUpdater = new SimpleAutoUpdater();

module.exports = autoUpdater;
