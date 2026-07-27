import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Trash2, Home, Package, Droplet, Snowflake } from 'lucide-react';

/**
 * LocationNavigator - Left panel for location selection and navigation
 * Features:
 * - Dropdown location selector
 * - Search bar
 * - View mode toggle
 * - Quick clear buttons
 */
const LocationNavigator = ({ 
  locations = [], 
  activeLocation, 
  onLocationChange,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onClearLocation,
  itemCounts = {}
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get icon for location
  const getLocationIcon = (location) => {
    if (!location) return <Home className="w-5 h-5" />;
    
    const iconMap = {
      '🥫': Package,
      '❄️': Droplet,
      '🧊': Snowflake,
      '🛁': Home,
      '💊': Package,
      '🚗': Package,
      '🐾': Package,
      '🧺': Package,
    };
    
    const IconComponent = iconMap[location.icon] || Home;
    return <IconComponent className="w-5 h-5" />;
  };

  // View mode options
  const viewModes = [
    { id: 'grid', label: 'Grid', icon: '▦' },
    { id: 'list', label: 'List', icon: '☰' },
    { id: 'map', label: 'Map', icon: '🗺️' },
    { id: 'category', label: 'Category', icon: '📁' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
      {/* Location Dropdown */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Location
        </label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            {activeLocation ? (
              <>
                <span className="text-2xl">{activeLocation.icon || '📦'}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {activeLocation.name}
                </span>
              </>
            ) : (
              <>
                <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  All Locations
                </span>
              </>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {/* All Locations Option */}
            <button
              onClick={() => {
                onLocationChange(null);
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
            >
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">All Locations</span>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                ({Object.values(itemCounts).reduce((a, b) => a + b, 0)})
              </span>
            </button>

            {/* Location List */}
            {locations.map((location) => (
              <button
                key={location.id}
                onClick={() => {
                  onLocationChange(location);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  activeLocation?.id === location.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <span className="text-2xl">{location.icon || '📦'}</span>
                <span className="font-medium text-gray-900 dark:text-white">{location.name}</span>
                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                  ({itemCounts[location.id] || 0})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-primary-500 dark:focus:border-primary-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* View Mode Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          View Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                viewMode === mode.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Clear Buttons */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Quick Clear
        </label>
        <div className="space-y-2">
          {locations.slice(0, 3).map((location) => (
            <button
              key={location.id}
              onClick={() => onClearLocation(location)}
              disabled={!itemCounts[location.id]}
              className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{location.icon || '📦'}</span>
                <span className="text-sm font-medium">{location.name}</span>
              </div>
              <span className="text-xs">({itemCounts[location.id] || 0})</span>
            </button>
          ))}
          
          {/* Clear All Button */}
          <button
            onClick={() => onClearLocation(null)}
            disabled={Object.values(itemCounts).reduce((a, b) => a + b, 0) === 0}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border-2 border-red-300 dark:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-bold">Clear All</span>
            <span className="text-xs">({Object.values(itemCounts).reduce((a, b) => a + b, 0)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationNavigator;
