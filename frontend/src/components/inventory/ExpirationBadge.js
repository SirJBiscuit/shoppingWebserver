import React from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';

/**
 * ExpirationBadge - Color-coded expiration status indicator
 * Shows days until expiry with appropriate color and icon
 */
const ExpirationBadge = ({ expirationStatus, size = 'md', showIcon = true, className = '' }) => {
  if (!expirationStatus) {
    return null;
  }

  const { status, color, daysUntilExpiry, message, urgent } = expirationStatus;

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
    xl: 'text-lg px-5 py-3' // For tablet
  };

  // Icon size
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24
  };

  // Get icon based on status
  const getIcon = () => {
    switch (status) {
      case 'fresh':
        return <CheckCircle size={iconSizes[size]} />;
      case 'use_soon':
        return <Clock size={iconSizes[size]} />;
      case 'urgent':
        return <AlertTriangle size={iconSizes[size]} />;
      case 'expired':
        return <XCircle size={iconSizes[size]} />;
      case 'discard':
        return <Trash2 size={iconSizes[size]} />;
      default:
        return <Clock size={iconSizes[size]} />;
    }
  };

  // Get status label
  const getLabel = () => {
    if (daysUntilExpiry === null) return 'Unknown';
    if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)}d ago`;
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return '1 day left';
    return `${daysUntilExpiry} days left`;
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full font-medium
        ${sizeClasses[size]}
        ${urgent ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        backgroundColor: `${color}20`, // 20% opacity
        color: color,
        border: `2px solid ${color}`
      }}
      title={message}
    >
      {showIcon && getIcon()}
      <span className="font-semibold">{getLabel()}</span>
    </div>
  );
};

/**
 * ExpirationStatusBar - Visual progress bar showing freshness
 */
export const ExpirationStatusBar = ({ expirationStatus, estimatedShelfLife }) => {
  if (!expirationStatus || !estimatedShelfLife) return null;

  const { daysUntilExpiry, color } = expirationStatus;
  const percentage = Math.max(0, Math.min(100, (daysUntilExpiry / estimatedShelfLife) * 100));

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Freshness</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

/**
 * ExpirationIcon - Just the icon, useful for compact displays
 */
export const ExpirationIcon = ({ expirationStatus, size = 16 }) => {
  if (!expirationStatus) return null;

  const { status, color } = expirationStatus;

  const getIcon = () => {
    switch (status) {
      case 'fresh':
        return <CheckCircle size={size} color={color} />;
      case 'use_soon':
        return <Clock size={size} color={color} />;
      case 'urgent':
        return <AlertTriangle size={size} color={color} />;
      case 'expired':
        return <XCircle size={size} color={color} />;
      case 'discard':
        return <Trash2 size={size} color={color} />;
      default:
        return <Clock size={size} color={color} />;
    }
  };

  return getIcon();
};

export default ExpirationBadge;
