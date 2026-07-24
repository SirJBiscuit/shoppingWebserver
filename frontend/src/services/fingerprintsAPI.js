import api from './api';

/**
 * Fingerprints and Validation API Service
 */

// ============================================
// VALIDATION
// ============================================

/**
 * Validate item data without creating fingerprint
 */
export const validateItem = async (itemData) => {
  const response = await api.post('/fingerprints/validate', itemData);
  return response.data;
};

// ============================================
// FINGERPRINTS
// ============================================

/**
 * Create or find fingerprint for an item
 */
export const createFingerprint = async (itemData) => {
  const response = await api.post('/fingerprints/create', itemData);
  return response.data;
};

/**
 * Search for similar items
 */
export const searchItems = async (query, limit = 10) => {
  const response = await api.get('/fingerprints/search', {
    params: { q: query, limit }
  });
  return response.data;
};

/**
 * Get fingerprint by ID
 */
export const getFingerprint = async (id) => {
  const response = await api.get(`/fingerprints/${id}`);
  return response.data;
};

// ============================================
// INSTANCES
// ============================================

/**
 * Create item instance (track individual item)
 */
export const createInstance = async (inventoryId, fingerprintId, instanceData) => {
  const response = await api.post('/fingerprints/instances', {
    inventoryId,
    fingerprintId,
    instanceData
  });
  return response.data;
};

/**
 * Record item disposal
 */
export const recordDisposal = async (instanceId, disposalDate, disposalReason) => {
  const response = await api.patch(`/fingerprints/instances/${instanceId}/dispose`, {
    disposal_date: disposalDate,
    disposal_reason: disposalReason
  });
  return response.data;
};

// ============================================
// PREDICTIONS
// ============================================

/**
 * Get shelf life prediction
 */
export const getShelfLifePrediction = async (fingerprintId, storageLocation = 'pantry') => {
  const response = await api.get(`/fingerprints/${fingerprintId}/prediction`, {
    params: { storageLocation }
  });
  return response.data;
};

// ============================================
// STATISTICS
// ============================================

/**
 * Get global learning statistics
 */
export const getGlobalStats = async () => {
  const response = await api.get('/fingerprints/stats/global');
  return response.data;
};

/**
 * Get validation statistics
 */
export const getValidationStats = async () => {
  const response = await api.get('/fingerprints/stats/validation');
  return response.data;
};

// ============================================
// ADMIN - REVIEW QUEUE
// ============================================

/**
 * Get review queue items
 */
export const getReviewQueue = async (status = 'pending') => {
  const response = await api.get('/fingerprints/admin/review-queue', {
    params: { status }
  });
  return response.data;
};

/**
 * Approve flagged item
 */
export const approveItem = async (itemId, notes = '') => {
  const response = await api.post(`/fingerprints/admin/review-queue/${itemId}/approve`, {
    notes
  });
  return response.data;
};

/**
 * Reject flagged item
 */
export const rejectItem = async (itemId, notes = '') => {
  const response = await api.post(`/fingerprints/admin/review-queue/${itemId}/reject`, {
    notes
  });
  return response.data;
};

/**
 * Get review queue statistics
 */
export const getReviewQueueStats = async () => {
  const response = await api.get('/fingerprints/admin/review-queue/stats');
  return response.data;
};

export default {
  validateItem,
  createFingerprint,
  searchItems,
  getFingerprint,
  createInstance,
  recordDisposal,
  getShelfLifePrediction,
  getGlobalStats,
  getValidationStats,
  getReviewQueue,
  approveItem,
  rejectItem,
  getReviewQueueStats
};
