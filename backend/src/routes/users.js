const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database/db');
const { authenticateToken: auth, isAdmin } = require('../middleware/auth');

// Admin: Get all users
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, email, created_at, subscription_status, subscription_tier, is_admin
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Create new user
router.post('/admin/create', auth, isAdmin, async (req, res) => {
  try {
    const { username, email, password, isAdmin: makeAdmin } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, is_admin, subscription_status)
       VALUES ($1, $2, $3, $4, 'free')
       RETURNING id, username, email, created_at, is_admin`,
      [username, email || null, hashedPassword, makeAdmin || false]
    );

    res.json({ 
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin: Update user
router.put('/admin/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, isAdmin: makeAdmin } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (makeAdmin !== undefined) {
      updates.push(`is_admin = $${paramCount++}`);
      values.push(makeAdmin);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const result = await db.query(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING id, username, email, is_admin`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: Delete user
router.delete('/admin/:userId', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING username',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: `User ${result.rows[0].username} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Guest login - creates a temporary guest account
router.post('/guest-login', async (req, res) => {
  try {
    const guestUsername = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const guestPassword = Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(guestPassword, 10);

    const result = await db.query(
      `INSERT INTO users (username, password_hash, subscription_status, subscription_tier, is_guest)
       VALUES ($1, $2, 'free', 'guest', true)
       RETURNING id, username, is_guest`,
      [guestUsername, hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        isGuest: true
      }
    });
  } catch (error) {
    console.error('Error creating guest account:', error);
    res.status(500).json({ error: 'Failed to create guest account' });
  }
});

module.exports = router;
