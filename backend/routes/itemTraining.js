const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Submit item training (admin or user)
router.post('/submit', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      item_name,
      category,
      item_icon,
      preferred_unit,
      average_price,
      notes,
      frequency,
      trained_by
    } = req.body;
    
    const userId = req.user.id;
    const userIsAdmin = req.user.is_admin;
    
    // Validate required fields
    if (!item_name || !category) {
      return res.status(400).json({ error: 'Item name and category are required' });
    }
    
    await client.query('BEGIN');
    
    if (userIsAdmin) {
      // Admin training - add directly to item_preferences
      const result = await client.query(
        `INSERT INTO item_preferences 
         (name, category, preferred_icon, preferred_unit, average_price, notes, trained_by_admin, training_frequency)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (name) 
         DO UPDATE SET 
           category = EXCLUDED.category,
           preferred_icon = EXCLUDED.preferred_icon,
           preferred_unit = EXCLUDED.preferred_unit,
           average_price = EXCLUDED.average_price,
           notes = EXCLUDED.notes,
           trained_by_admin = true,
           training_frequency = item_preferences.training_frequency + EXCLUDED.training_frequency,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [item_name, category, item_icon, preferred_unit, average_price || null, notes, frequency || 1]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Item added to database successfully',
        item: result.rows[0],
        isAdmin: true
      });
    } else {
      // User training - add to pending review table
      const result = await client.query(
        `INSERT INTO item_training_submissions 
         (user_id, item_name, category, item_icon, preferred_unit, average_price, notes, frequency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         RETURNING *`,
        [userId, item_name, category, item_icon, preferred_unit, average_price || null, notes, frequency || 1]
      );
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Item submitted for review. Thank you for helping train the database!',
        submission: result.rows[0],
        isAdmin: false
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting item training:', error);
    res.status(500).json({ error: 'Failed to submit item training' });
  } finally {
    client.release();
  }
});

// Get pending training submissions (admin only)
router.get('/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        its.*,
        u.username,
        COUNT(*) OVER() as total_pending
       FROM item_training_submissions its
       JOIN users u ON its.user_id = u.id
       WHERE its.status = 'pending'
       ORDER BY its.frequency DESC, its.created_at DESC
       LIMIT 50`
    );
    
    res.json({
      submissions: result.rows,
      total: result.rows.length > 0 ? result.rows[0].total_pending : 0
    });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

// Approve training submission (admin only)
router.post('/approve/:id', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const submissionId = req.params.id;
    
    await client.query('BEGIN');
    
    // Get submission details
    const submission = await client.query(
      'SELECT * FROM item_training_submissions WHERE id = $1',
      [submissionId]
    );
    
    if (submission.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    const item = submission.rows[0];
    
    // Add to item_preferences
    await client.query(
      `INSERT INTO item_preferences 
       (name, category, preferred_icon, preferred_unit, average_price, notes, trained_by_admin, training_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)
       ON CONFLICT (name) 
       DO UPDATE SET 
         category = EXCLUDED.category,
         preferred_icon = EXCLUDED.preferred_icon,
         preferred_unit = EXCLUDED.preferred_unit,
         average_price = EXCLUDED.average_price,
         notes = EXCLUDED.notes,
         training_frequency = item_preferences.training_frequency + EXCLUDED.training_frequency,
         updated_at = CURRENT_TIMESTAMP`,
      [item.item_name, item.category, item.item_icon, item.preferred_unit, item.average_price, item.notes, item.frequency]
    );
    
    // Mark submission as approved
    await client.query(
      `UPDATE item_training_submissions 
       SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1
       WHERE id = $2`,
      [req.user.id, submissionId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Submission approved and added to database'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving submission:', error);
    res.status(500).json({ error: 'Failed to approve submission' });
  } finally {
    client.release();
  }
});

// Reject training submission (admin only)
router.post('/reject/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    await pool.query(
      `UPDATE item_training_submissions 
       SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1, rejection_reason = $2
       WHERE id = $3`,
      [req.user.id, reason, req.params.id]
    );
    
    res.json({
      success: true,
      message: 'Submission rejected'
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
});

// Get training statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE trained_by_admin = true) as admin_trained,
        COUNT(*) FILTER (WHERE trained_by_admin = false) as user_trained,
        COUNT(*) as total_items,
        SUM(training_frequency) as total_frequency
       FROM item_preferences`
    );
    
    const pending = await pool.query(
      'SELECT COUNT(*) as pending_count FROM item_training_submissions WHERE status = \'pending\''
    );
    
    res.json({
      ...stats.rows[0],
      pending: parseInt(pending.rows[0].pending_count)
    });
  } catch (error) {
    console.error('Error fetching training stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
