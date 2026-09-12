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
    this.updateFlagPath = '/opt/cloudmc-shop/.update-requested';
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
      
      // Compare
      if (currentVersion !== latestCommit.sha) {
        console.log('🆕 Update available!');
        console.log(`   Current: ${currentVersion ? currentVersion.substring(0, 7) : 'unknown'}`);
        console.log(`   Latest:  ${latestCommit.sha.substring(0, 7)}`);
        console.log(`   Message: ${latestCommit.message}`);
        
        // Request update by creating flag file
        await this.requestUpdate(latestCommit);
      } else {
        console.log('✅ Up to date');
      }
      
    } catch (error) {
      console.error('❌ Error checking for updates:', error.message);
    } finally {
      this.isChecking = false;
    }
  }

  async getCurrentVersion() {
    try {
      const result = await db.get('SELECT current_version FROM system_status WHERE id = 1');
      return result?.current_version || null;
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
      await db.run(`
        UPDATE system_status 
        SET update_available = true, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `);
      
    } catch (error) {
      console.error('❌ Error requesting update:', error.message);
    }
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
