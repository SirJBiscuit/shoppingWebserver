const axios = require('axios');
const fs = require('fs').promises;
const { execSync } = require('child_process');
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
    // The host checkout is bind-mounted in — reading its HEAD reflects ANY
    // pull (update-server.sh or a manual `git pull && docker-compose up`),
    // unlike the DB row which only update-server.sh writes back.
    this.repoDir = process.env.REPO_DIR || '/opt/cloudmc-shop';
    // Commit already flagged this boot — prevents writing/logging every cycle.
    this.requestedCommit = null;
    // Latest check result, served by /api/system/status
    this.lastStatus = { updateAvailable: false, pending: [], current: null, latest: null, lastCheck: null };
  }

  // Run git inside the mounted host checkout. `-c safe.directory=*` silences
  // the dubious-ownership error when the host repo is owned by another uid.
  git(args) {
    return execSync(`git -c safe.directory='*' -C "${this.repoDir}" ${args}`, { timeout: 8000 })
      .toString().trim();
  }

  getStatus() {
    return this.lastStatus;
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
      // Get deployed commit — mounted repo HEAD first, DB as fallback
      const currentVersion = await this.getCurrentVersion();

      // Refresh origin/main so the comparison is as fresh as the last host
      // pull even when the GitHub API is rate-limited. Best-effort only.
      try { this.git('fetch --quiet origin main'); } catch { /* offline/ratelimited — keep old ref */ }

      // Latest: the fetched origin/main ref, GitHub API as fallback.
      const latestCommit = this.getLatestFromRepo() || await this.getLatestGitHubCommit();

      if (!latestCommit) {
        console.log('⚠️  Could not determine latest commit');
        return;
      }

      // Compare on short-sha prefix — the DB stores 7 chars while the
      // GitHub sha is 40, so a strict !== would report "update available"
      // forever (and leave the Update Now button stuck on).
      const cur = (currentVersion || '').substring(0, 7);
      const lat = latestCommit.sha.substring(0, 7);
      const hasUpdate = !!cur && cur !== lat;

      // What the update adds — commits between deployed HEAD and origin/main
      const pending = hasUpdate ? this.getPendingCommits() : [];
      this.lastStatus = {
        updateAvailable: hasUpdate,
        pending,
        current: currentVersion,
        latest: latestCommit.sha,
        lastCheck: new Date().toISOString()
      };

      if (hasUpdate) {
        console.log('🆕 Update available!');
        console.log(`   Current: ${cur}`);
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
    // Prefer the mounted repo's HEAD — a host-side update pulls the repo but
    // only update-server.sh writes current_version back, so the DB row goes
    // permanently stale after a manual `git pull && docker-compose up -d`.
    try {
      const sha = this.git('rev-parse HEAD');
      if (sha) {
        // Keep the row in sync so /api/system/status reports the same value
        db.query('UPDATE system_status SET current_version = $1 WHERE id = 1', [sha]).catch(() => {});
        return sha;
      }
    } catch { /* repo not mounted / git unavailable — fall back to DB */ }
    try {
      const result = await db.query('SELECT current_version FROM system_status WHERE id = 1');
      return result?.rows?.[0]?.current_version || null;
    } catch {
      console.warn('Could not get current version from database');
      return null;
    }
  }

  getLatestFromRepo() {
    try {
      const sha = this.git(`rev-parse origin/${this.githubBranch}`);
      if (!sha) return null;
      return { sha, message: this.getPendingCommits()[0] || 'Update available' };
    } catch { return null; }
  }

  getPendingCommits() {
    try {
      const log = this.git(`log --no-merges --pretty=format:'%h %s' HEAD..origin/${this.githubBranch}`);
      return log ? log.split('\n').slice(0, 8) : [];
    } catch { return []; }
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
