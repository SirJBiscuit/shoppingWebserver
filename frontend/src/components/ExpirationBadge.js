import React from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, Skull } from 'lucide-react';

/**
 * ExpirationBadge - Color-coded expiration status indicator
 * 
 * @param {Date|string} expiryDate - The expiration date
 * @param {Date|string} purchaseDate - Optional purchase date
 * @param {boolean} compact - Show compact version
 */
const ExpirationBadge = ({ expiryDate, purchaseDate, compact = false }) => {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  // Determine status
  let status, color, bgColor, borderColor, icon, message;

  if (daysUntilExpiry > 7) {
    status = 'fresh';
    color = 'text-green-700 dark:text-green-400';
    bgColor = 'bg-green-50 dark:bg-green-900/20';
    borderColor = 'border-green-200 dark:border-green-800';
    icon = <CheckCircle className="w-4 h-4" />;
    message = 'Fresh & Good';
  } else if (daysUntilExpiry >= 3) {
    status = 'use_soon';
    color = 'text-yellow-700 dark:text-yellow-400';
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
    borderColor = 'border-yellow-200 dark:border-yellow-800';
    icon = <Clock className="w-4 h-4" />;
    message = 'Use This Week';
  } else if (daysUntilExpiry >= 1) {
    status = 'urgent';
    color = 'text-orange-700 dark:text-orange-400';
    bgColor = 'bg-orange-50 dark:bg-orange-900/20';
    borderColor = 'border-orange-200 dark:border-orange-800';
    icon = <AlertTriangle className="w-4 h-4" />;
    message = 'Use Today/Tomorrow';
  } else if (daysUntilExpiry === 0) {
    status = 'expired';
    color = 'text-red-700 dark:text-red-400';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    borderColor = 'border-red-200 dark:border-red-800';
    icon = <XCircle className="w-4 h-4" />;
    message = 'Check Before Using';
  } else {
    status = 'discard';
    color = 'text-gray-900 dark:text-gray-100';
    bgColor = 'bg-gray-800 dark:bg-gray-900';
    borderColor = 'border-gray-900 dark:border-gray-700';
    icon = <Skull className="w-4 h-4" />;
    message = 'Throw Out - Unsafe';
  }

  // Compact version (just colored dot + days)
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium">
          {daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : daysUntilExpiry === 0 ? 'Today' : 'Expired'}
        </span>
      </div>
    );
  }

  // Full version
  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className={color}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-semibold ${color}`}>
          {message}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {daysUntilExpiry > 0 
            ? `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} left`
            : daysUntilExpiry === 0
            ? 'Expires today'
            : `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`
          }
        </span>
      </div>
    </div>
  );
};

/**
 * Get expiration status data (for use in logic)
 */
export const getExpirationStatus = (expiryDate) => {
  if (!expiryDate) return null;

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry > 7) return { status: 'fresh', color: 'green', days: daysUntilExpiry };
  if (daysUntilExpiry >= 3) return { status: 'use_soon', color: 'yellow', days: daysUntilExpiry };
  if (daysUntilExpiry >= 1) return { status: 'urgent', color: 'orange', days: daysUntilExpiry };
  if (daysUntilExpiry === 0) return { status: 'expired', color: 'red', days: 0 };
  return { status: 'discard', color: 'black', days: daysUntilExpiry };
};

export default ExpirationBadge;
