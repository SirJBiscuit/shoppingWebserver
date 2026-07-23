import React from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign, Calendar, Trash2 } from 'lucide-react';

/**
 * InventoryStats - Analytics dashboard showing inventory statistics
 */
const InventoryStats = ({ stats, expiringSoon = [] }) => {
  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading statistics...
      </div>
    );
  }

  const {
    total_items = 0,
    expiring_soon = 0,
    expired = 0,
    opened_items = 0,
    storage_locations_used = 0,
    total_value = 0
  } = stats;

  const statCards = [
    {
      title: 'Total Items',
      value: total_items,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Expiring Soon',
      value: expiring_soon,
      icon: AlertTriangle,
      color: 'orange',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-600 dark:text-orange-400',
      urgent: expiring_soon > 0
    },
    {
      title: 'Expired',
      value: expired,
      icon: Trash2,
      color: 'red',
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-600 dark:text-red-400',
      urgent: expired > 0
    },
    {
      title: 'Opened Items',
      value: opened_items,
      icon: Calendar,
      color: 'yellow',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Storage Locations',
      value: storage_locations_used,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Total Value',
      value: `$${parseFloat(total_value || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-600 dark:text-green-400'
    }
  ];

  return (
    <div className="mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`
                ${stat.bgColor} rounded-xl p-4 transition-all hover:shadow-lg
                ${stat.urgent ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={stat.textColor} size={24} />
                {stat.urgent && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </div>
              <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expiring Soon List */}
      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900 dark:bg-opacity-20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-orange-600 dark:text-orange-400" size={24} />
            <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100">
              Items Expiring Soon
            </h3>
          </div>
          <div className="space-y-2">
            {expiringSoon.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {item.category === 'Dairy & Eggs' && '🥛'}
                    {item.category === 'Meat & Seafood' && '🥩'}
                    {item.category === 'Produce' && '🥬'}
                    {item.category === 'Bakery & Bread' && '🍞'}
                    {!item.category && '📦'}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {item.item_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.current_quantity} {item.unit}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-orange-600 dark:text-orange-400">
                    {item.expirationStatus?.daysUntilExpiry === 0
                      ? 'Today'
                      : `${item.expirationStatus?.daysUntilExpiry} days`
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.storage_location}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {expiringSoon.length > 5 && (
            <div className="mt-4 text-center text-sm text-orange-700 dark:text-orange-300">
              + {expiringSoon.length - 5} more items expiring soon
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryStats;
