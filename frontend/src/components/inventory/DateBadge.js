import React from 'react';
import { Calendar, Clock, ShoppingCart, AlertTriangle } from 'lucide-react';

/**
 * DateBadge - Visual date display component for inventory items
 * Shows bought date, expiration date, and "buy next" countdown
 */
const DateBadge = ({ type, date, daysUntil, size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  const iconSize = {
    small: 12,
    medium: 14,
    large: 16
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;
  const currentIconSize = iconSize[size] || iconSize.medium;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      formatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      short: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      daysAgo: Math.abs(diffDays),
      isPast: diffDays < 0,
      isFuture: diffDays > 0,
      diffDays
    };
  };

  const dateInfo = date ? formatDate(date) : null;

  // Bought Date Badge
  if (type === 'bought' && dateInfo) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${currentSize} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg font-medium`}>
        <Calendar size={currentIconSize} />
        <span>Bought {dateInfo.short}</span>
        <span className="text-xs opacity-75">({dateInfo.daysAgo}d ago)</span>
      </div>
    );
  }

  // Expiration Date Badge
  if (type === 'expiry' && dateInfo) {
    let bgColor = 'bg-green-100 dark:bg-green-900/30';
    let textColor = 'text-green-800 dark:text-green-300';
    let icon = <Clock size={currentIconSize} />;
    let label = 'Fresh';

    if (dateInfo.isPast) {
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
      icon = <AlertTriangle size={currentIconSize} />;
      label = 'EXPIRED';
    } else if (dateInfo.diffDays <= 3) {
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
      icon = <AlertTriangle size={currentIconSize} />;
      label = 'Urgent';
    } else if (dateInfo.diffDays <= 7) {
      bgColor = 'bg-orange-100 dark:bg-orange-900/30';
      textColor = 'text-orange-800 dark:text-orange-300';
      icon = <Clock size={currentIconSize} />;
      label = 'Soon';
    } else if (dateInfo.diffDays <= 14) {
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-800 dark:text-yellow-300';
      icon = <Clock size={currentIconSize} />;
      label = 'Use Soon';
    }

    return (
      <div className={`inline-flex items-center gap-1.5 ${currentSize} ${bgColor} ${textColor} rounded-lg font-medium`}>
        {icon}
        <span>{label}</span>
        <span className="font-bold">{dateInfo.short}</span>
        {!dateInfo.isPast && (
          <span className="text-xs opacity-75">({dateInfo.diffDays}d left)</span>
        )}
      </div>
    );
  }

  // Buy Next Badge (calculated from expiry or custom days)
  if (type === 'buyNext') {
    const days = daysUntil || 0;
    let bgColor = 'bg-purple-100 dark:bg-purple-900/30';
    let textColor = 'text-purple-800 dark:text-purple-300';
    let urgency = 'Later';

    if (days <= 0) {
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      textColor = 'text-red-800 dark:text-red-300';
      urgency = 'Buy Now!';
    } else if (days <= 3) {
      bgColor = 'bg-orange-100 dark:bg-orange-900/30';
      textColor = 'text-orange-800 dark:text-orange-300';
      urgency = 'Buy Soon';
    } else if (days <= 7) {
      bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
      textColor = 'text-yellow-800 dark:text-yellow-300';
      urgency = 'Plan Ahead';
    }

    return (
      <div className={`inline-flex items-center gap-1.5 ${currentSize} ${bgColor} ${textColor} rounded-lg font-medium`}>
        <ShoppingCart size={currentIconSize} />
        <span>{urgency}</span>
        {days > 0 && (
          <span className="font-bold">in {days}d</span>
        )}
      </div>
    );
  }

  return null;
};

export default DateBadge;
