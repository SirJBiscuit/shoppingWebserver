const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get current git status
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const { stdout: statusOutput } = await execAsync('git status --porcelain');
    const { stdout: branchOutput } = await execAsync('git branch --show-current');
    
    const changes = statusOutput
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2).trim();
        const path = line.substring(3);
        return {
          status: status === 'M' ? 'modified' : status === 'A' ? 'added' : 'deleted',
          path
        };
      });

    res.json({
      branch: branchOutput.trim(),
      changes
    });
  } catch (error) {
    console.error('Git status error:', error);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

// Get commit history
router.get('/commits', requireAdmin, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const { stdout } = await execAsync(
      `git log -${limit} --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`
    );
    
    const commits = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, author, email, date, message] = line.split('|');
        return { hash, author, email, date, message };
      });

    res.json({ commits });
  } catch (error) {
    console.error('Git log error:', error);
    res.status(500).json({ error: 'Failed to get commit history' });
  }
});

// Get branches
router.get('/branches', requireAdmin, async (req, res) => {
  try {
    const { stdout: localBranches } = await execAsync('git branch');
    const { stdout: remoteBranches } = await execAsync('git branch -r');
    
    const branches = localBranches
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const name = line.replace('*', '').trim();
        return { name, current: line.startsWith('*') };
      });

    // Get ahead/behind info for each branch
    for (const branch of branches) {
      try {
        const { stdout } = await execAsync(
          `git rev-list --left-right --count origin/${branch.name}...${branch.name}`
        );
        const [behind, ahead] = stdout.trim().split('\t').map(Number);
        branch.ahead = ahead || 0;
        branch.behind = behind || 0;
      } catch (e) {
        branch.ahead = 0;
        branch.behind = 0;
      }
    }

    res.json({ branches });
  } catch (error) {
    console.error('Git branches error:', error);
    res.status(500).json({ error: 'Failed to get branches' });
  }
});

// Commit changes
router.post('/commit', requireAdmin, async (req, res) => {
  try {
    const { message, files } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Commit message required' });
    }

    // Add files
    if (files && files.length > 0) {
      for (const file of files) {
        await execAsync(`git add "${file}"`);
      }
    } else {
      await execAsync('git add -A');
    }

    // Commit
    const author = req.user.email || 'admin@listzy.app';
    await execAsync(`git commit -m "${message}" --author="${req.user.username} <${author}>"`);

    // Log the commit
    await logAdminAction(req.user.id, 'git_commit', { message, files });

    res.json({ success: true, message: 'Changes committed' });
  } catch (error) {
    console.error('Git commit error:', error);
    res.status(500).json({ error: 'Failed to commit changes' });
  }
});

// Push changes
router.post('/push', requireAdmin, async (req, res) => {
  try {
    const { stdout: branch } = await execAsync('git branch --show-current');
    await execAsync(`git push origin ${branch.trim()}`);
    
    await logAdminAction(req.user.id, 'git_push', { branch: branch.trim() });
    
    res.json({ success: true, message: 'Changes pushed to GitHub' });
  } catch (error) {
    console.error('Git push error:', error);
    res.status(500).json({ error: 'Failed to push changes' });
  }
});

// Pull changes
router.post('/pull', requireAdmin, async (req, res) => {
  try {
    const { stdout } = await execAsync('git pull origin');
    
    await logAdminAction(req.user.id, 'git_pull', {});
    
    res.json({ success: true, message: 'Changes pulled from GitHub', output: stdout });
  } catch (error) {
    console.error('Git pull error:', error);
    res.status(500).json({ error: 'Failed to pull changes' });
  }
});

// Check for remote changes
router.get('/check-remote', requireAdmin, async (req, res) => {
  try {
    await execAsync('git fetch origin');
    const { stdout: branch } = await execAsync('git branch --show-current');
    const { stdout } = await execAsync(
      `git rev-list --count HEAD..origin/${branch.trim()}`
    );
    
    const behindCount = parseInt(stdout.trim());
    
    res.json({
      hasChanges: behindCount > 0,
      behindCount
    });
  } catch (error) {
    console.error('Git check remote error:', error);
    res.status(500).json({ error: 'Failed to check remote' });
  }
});

// Create branch
router.post('/branch', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name required' });
    }

    await execAsync(`git checkout -b ${name}`);
    
    await logAdminAction(req.user.id, 'git_create_branch', { name });
    
    res.json({ success: true, message: `Branch ${name} created` });
  } catch (error) {
    console.error('Git create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// Checkout branch
router.post('/checkout', requireAdmin, async (req, res) => {
  try {
    const { branch } = req.body;
    
    if (!branch) {
      return res.status(400).json({ error: 'Branch name required' });
    }

    await execAsync(`git checkout ${branch}`);
    
    await logAdminAction(req.user.id, 'git_checkout', { branch });
    
    res.json({ success: true, message: `Switched to branch ${branch}` });
  } catch (error) {
    console.error('Git checkout error:', error);
    res.status(500).json({ error: 'Failed to checkout branch' });
  }
});

// Get file diff
router.get('/diff', requireAdmin, async (req, res) => {
  try {
    const { file } = req.query;
    
    if (!file) {
      return res.status(400).json({ error: 'File path required' });
    }

    const { stdout } = await execAsync(`git diff HEAD "${file}"`);
    
    res.json({
      file,
      diff: stdout || 'No changes'
    });
  } catch (error) {
    console.error('Git diff error:', error);
    res.status(500).json({ error: 'Failed to get diff' });
  }
});

// Rollback to commit
router.post('/rollback', requireAdmin, async (req, res) => {
  try {
    const { commit } = req.body;
    
    if (!commit) {
      return res.status(400).json({ error: 'Commit hash required' });
    }

    await execAsync(`git reset --hard ${commit}`);
    
    await logAdminAction(req.user.id, 'git_rollback', { commit });
    
    res.json({ success: true, message: `Rolled back to ${commit}` });
  } catch (error) {
    console.error('Git rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback' });
  }
});

// Helper function to log admin actions
async function logAdminAction(userId, action, details) {
  try {
    const db = require('../database/db');
    await db.query(
      'INSERT INTO admin_actions (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, action, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

module.exports = router;
