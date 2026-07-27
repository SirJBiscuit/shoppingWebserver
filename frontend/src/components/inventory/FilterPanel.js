import React from 'react';
import { AlertCircle, TrendingDown, AlertTriangle, Star, Package, BarChart3, ArrowUpCircle } from 'lucide-react';

/**
 * FilterPanel - Right panel for quick filters and actions
 * Features:
 * - Expiring soon filter
 * - Low stock filter
 * - Warning items
 * - Favorites
 * - All items
 * - Analytics view
 */
const FilterPanel = ({ 
  activeFilter,
  onFilterChange,
  counts = {}
}) => {
  const filters = [
    {
      id: 'expiring',
      label: 'Expiring Soon',
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-800',
      count: counts.expiring || 0,
      emoji: '🚨'
    },
    {
      id: 'low_stock',
      label: 'Low Stock',
      icon: TrendingDown,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      hoverColor: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
      count: counts.low_stock || 0,
      emoji: '📉'
    },
    {
      id: 'warning',
      label: 'Warnings',
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      hoverColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      count: counts.warning || 0,
      emoji: '⚠️'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Star,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      hoverColor: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      count: counts.favorites || 0,
      emoji: '⭐'
    },
    {
      id: 'all',
      label: 'All Items',
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      count: counts.all || 0,
      emoji: '📦'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      hoverColor: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      count: null,
      emoji: '📊'
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <ArrowUpCircle className="w-5 h-5 text-primary-600" />
        Quick Filters
      </h3>
      
      <div className="space-y-2">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? `${filter.bgColor} ${filter.borderColor} border-2 shadow-md`
                  : `bg-gray-50 dark:bg-gray-700 border-2 border-transparent ${filter.hoverColor}`
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{filter.emoji}</span>
                <div className="text-left">
                  <div className={`font-semibold text-sm ${isActive ? filter.color : 'text-gray-700 dark:text-gray-300'}`}>
                    {filter.label}
                  </div>
                  {filter.count !== null && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {filter.count} {filter.count === 1 ? 'item' : 'items'}
                    </div>
                  )}
                </div>
              </div>
              
              {filter.count !== null && (
                <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                  isActive 
                    ? `${filter.color} bg-white dark:bg-gray-800` 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {filter.count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Quick Stats
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
            <span className="font-bold text-gray-900 dark:text-white">{counts.all || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Categories:</span>
            <span className="font-bold text-gray-900 dark:text-white">{counts.categories || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Locations:</span>
            <span className="font-bold text-gray-900 dark:text-white">{counts.locations || 0}</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-800 dark:text-green-300">
            System Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
