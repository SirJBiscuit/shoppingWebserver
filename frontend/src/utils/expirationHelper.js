/**
 * Expiration Helper - Calculate expiration status for inventory items
 */

/**
 * Calculate expiration status from expiry date
 * Returns object with status, color, daysUntilExpiry, message, urgent
 */
export const calculateExpirationStatus = (expiryDate) => {
  if (!expiryDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry - today;
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status, color, message, urgent;

  if (daysUntilExpiry < -3) {
    // Discard (more than 3 days expired)
    status = 'discard';
    color = '#000000';
    message = 'Discard immediately';
    urgent = true;
  } else if (daysUntilExpiry < 0) {
    // Expired (0-3 days ago)
    status = 'expired';
    color = '#EF4444'; // red-500
    message = 'Expired - check before using';
    urgent = true;
  } else if (daysUntilExpiry === 0) {
    // Expires today
    status = 'urgent';
    color = '#F97316'; // orange-500
    message = 'Expires today - use immediately';
    urgent = true;
  } else if (daysUntilExpiry <= 3) {
    // Urgent (1-3 days)
    status = 'urgent';
    color = '#F97316'; // orange-500
    message = 'Use within 3 days';
    urgent = true;
  } else if (daysUntilExpiry <= 7) {
    // Use soon (4-7 days)
    status = 'use_soon';
    color = '#EAB308'; // yellow-500
    message = 'Use within a week';
    urgent = false;
  } else {
    // Fresh (7+ days)
    status = 'fresh';
    color = '#22C55E'; // green-500
    message = 'Fresh';
    urgent = false;
  }

  return {
    status,
    color,
    daysUntilExpiry,
    message,
    urgent
  };
};

/**
 * Add expiration status to inventory items
 */
export const enrichItemsWithExpirationStatus = (items) => {
  return items.map(item => ({
    ...item,
    expirationStatus: calculateExpirationStatus(
      item.estimated_expiry_date || item.manual_expiry_date
    )
  }));
};

/**
 * Filter items by expiration status
 */
export const filterByExpirationStatus = (items, statusFilter) => {
  if (!statusFilter) return items;
  
  return items.filter(item => {
    if (!item.expirationStatus) return false;
    return item.expirationStatus.status === statusFilter;
  });
};

/**
 * Get items expiring within X days
 */
export const getItemsExpiringSoon = (items, days = 7) => {
  return items.filter(item => {
    if (!item.expirationStatus) return false;
    const { daysUntilExpiry } = item.expirationStatus;
    return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
  });
};

/**
 * Get expired items
 */
export const getExpiredItems = (items) => {
  return items.filter(item => {
    if (!item.expirationStatus) return false;
    return item.expirationStatus.daysUntilExpiry < 0;
  });
};

/**
 * Sort items by expiration date
 */
export const sortByExpiration = (items, order = 'asc') => {
  return [...items].sort((a, b) => {
    const aExpiry = a.estimated_expiry_date || a.manual_expiry_date;
    const bExpiry = b.estimated_expiry_date || b.manual_expiry_date;
    
    if (!aExpiry && !bExpiry) return 0;
    if (!aExpiry) return 1;
    if (!bExpiry) return -1;
    
    const diff = new Date(aExpiry) - new Date(bExpiry);
    return order === 'asc' ? diff : -diff;
  });
};

export default {
  calculateExpirationStatus,
  enrichItemsWithExpirationStatus,
  filterByExpirationStatus,
  getItemsExpiringSoon,
  getExpiredItems,
  sortByExpiration
};
