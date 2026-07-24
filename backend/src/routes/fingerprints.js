const express = require('express');
const router = express.Router();
const fingerprintService = require('../services/itemFingerprintService');
const validationService = require('../services/itemValidationService');
const { authenticateToken } = require('../middleware/auth');

/**
 * Fingerprint and Validation API Routes
 */

// ============================================
// FINGERPRINT ROUTES
// ============================================

/**
 * GET /api/fingerprints/search
 * Search for similar items by name
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const results = await fingerprintService.findSimilarItems(q, parseInt(limit));
    
    res.json({
      query: q,
      count: results.length,
      items: results
    });
  } catch (error) {
    console.error('Error searching fingerprints:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

/**
 * GET /api/fingerprints/:id
 * Get fingerprint details by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM item_fingerprints WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fingerprint not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching fingerprint:', error);
    res.status(500).json({ error: 'Failed to fetch fingerprint' });
  }
});

/**
 * POST /api/fingerprints/validate
 * Validate item data without creating fingerprint
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const itemData = req.body;
    
    const validation = await validationService.validateAndEnhanceItem(itemData);
    
    res.json({
      valid: validation.valid,
      shouldCreateFingerprint: validation.shouldCreateFingerprint,
      reason: validation.reason,
      confidence: validation.confidence,
      enhancedData: validation.enhancedData
    });
  } catch (error) {
    console.error('Error validating item:', error);
    res.status(500).json({ error: 'Failed to validate item' });
  }
});

/**
 * POST /api/fingerprints/create
 * Create or find fingerprint for an item
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const itemData = req.body;
    
    const result = await fingerprintService.getOrCreateFingerprint(itemData);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.reason,
        confidence: result.confidence,
        requiresReview: result.requiresReview
      });
    }
    
    res.json({
      success: true,
      fingerprint: result.fingerprint,
      validation: result.validation
    });
  } catch (error) {
    console.error('Error creating fingerprint:', error);
    res.status(500).json({ error: 'Failed to create fingerprint' });
  }
});

// ============================================
// INSTANCE ROUTES
// ============================================

/**
 * POST /api/fingerprints/instances
 * Create an item instance (track individual item)
 */
router.post('/instances', authenticateToken, async (req, res) => {
  try {
    const { inventoryId, fingerprintId, instanceData } = req.body;
    const userId = req.user.id;
    
    const instance = await fingerprintService.createItemInstance(
      inventoryId,
      fingerprintId,
      userId,
      instanceData
    );
    
    res.json({
      success: true,
      instance
    });
  } catch (error) {
    console.error('Error creating instance:', error);
    res.status(500).json({ error: 'Failed to create item instance' });
  }
});

/**
 * PATCH /api/fingerprints/instances/:id/dispose
 * Record item disposal and contribute to learning
 */
router.patch('/instances/:id/dispose', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { disposal_date, disposal_reason } = req.body;
    
    const result = await fingerprintService.recordDisposal(id, {
      disposal_date,
      disposal_reason
    });
    
    res.json({
      success: true,
      actualShelfLife: result.actualShelfLife,
      contributed: result.contributed
    });
  } catch (error) {
    console.error('Error recording disposal:', error);
    res.status(500).json({ error: 'Failed to record disposal' });
  }
});

// ============================================
// PREDICTION ROUTES
// ============================================

/**
 * GET /api/fingerprints/:fingerprintId/prediction
 * Get shelf life prediction for an item
 */
router.get('/:fingerprintId/prediction', authenticateToken, async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const { storageLocation = 'pantry' } = req.query;
    
    const prediction = await fingerprintService.getShelfLifePrediction(
      fingerprintId,
      storageLocation
    );
    
    res.json(prediction);
  } catch (error) {
    console.error('Error getting prediction:', error);
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

// ============================================
// LEARNING STATS ROUTES
// ============================================

/**
 * GET /api/fingerprints/stats/global
 * Get global learning statistics
 */
router.get('/stats/global', authenticateToken, async (req, res) => {
  try {
    const stats = await fingerprintService.getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting global stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * GET /api/fingerprints/stats/validation
 * Get validation statistics
 */
router.get('/stats/validation', authenticateToken, async (req, res) => {
  try {
    const stats = await validationService.getValidationStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting validation stats:', error);
    res.status(500).json({ error: 'Failed to get validation statistics' });
  }
});

// ============================================
// ADMIN REVIEW ROUTES
// ============================================

/**
 * GET /api/fingerprints/admin/review-queue
 * Get items pending review (admin only)
 */
router.get('/admin/review-queue', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status = 'pending' } = req.query;
    
    const db = require('../database/db');
    const query = status === 'pending' 
      ? 'SELECT * FROM item_review_queue WHERE reviewed = FALSE ORDER BY flagged_at DESC'
      : 'SELECT * FROM item_review_queue WHERE reviewed = TRUE ORDER BY reviewed_at DESC';
    
    const result = await db.query(query);
    
    res.json({
      status,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

/**
 * POST /api/fingerprints/admin/review-queue/:id/approve
 * Approve a flagged item (admin only)
 */
router.post('/admin/review-queue/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { notes } = req.body;
    const db = require('../database/db');
    
    await db.query(
      `UPDATE item_review_queue 
       SET reviewed = TRUE, approved = TRUE, reviewer_notes = $1, 
           reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [notes, req.user.id, id]
    );
    
    res.json({ success: true, message: 'Item approved' });
  } catch (error) {
    console.error('Error approving item:', error);
    res.status(500).json({ error: 'Failed to approve item' });
  }
});

/**
 * POST /api/fingerprints/admin/review-queue/:id/reject
 * Reject a flagged item (admin only)
 */
router.post('/admin/review-queue/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { notes } = req.body;
    const db = require('../database/db');
    
    await db.query(
      `UPDATE item_review_queue 
       SET reviewed = TRUE, approved = FALSE, reviewer_notes = $1, 
           reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [notes, req.user.id, id]
    );
    
    res.json({ success: true, message: 'Item rejected' });
  } catch (error) {
    console.error('Error rejecting item:', error);
    res.status(500).json({ error: 'Failed to reject item' });
  }
});

/**
 * GET /api/fingerprints/admin/review-queue/stats
 * Get review queue statistics (admin only)
 */
router.get('/admin/review-queue/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const db = require('../database/db');
    
    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE reviewed = FALSE) as pending,
        COUNT(*) FILTER (WHERE reviewed = TRUE AND approved = TRUE) as approved,
        COUNT(*) FILTER (WHERE reviewed = TRUE AND approved = FALSE) as rejected,
        AVG(confidence_score) FILTER (WHERE reviewed = FALSE) as avg_confidence
      FROM item_review_queue
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
