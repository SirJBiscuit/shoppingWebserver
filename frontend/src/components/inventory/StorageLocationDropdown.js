import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Package } from 'lucide-react';

/**
 * StorageLocationDropdown - Condensed dropdown for multiple storage locations
 * Shows dropdown with 3D scrollbar when > 3 custom locations exist
 * Otherwise shows tabs
 */
const StorageLocationDropdown = ({ 
  locations, 
  activeLocation, 
  onChange,
  itemCounts = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combine all locations
  const allLocations = [
    { id: null, name: 'All Items', icon: '📦', isDefault: true },
    ...(locations.default || []),
    ...(locations.custom || [])
  ];

  // Get active location display
  const activeLocationData = allLocations.find(loc => {
    if (activeLocation === null) return loc.id === null;
    if (typeof activeLocation === 'string') return loc.id === activeLocation;
    return loc.id === activeLocation?.id;
  }) || allLocations[0];

  const getLocationKey = (loc) => {
    if (loc.id === null) return 'total';
    if (loc.isDefault) return loc.id;
    return `custom_${loc.id}`;
  };

  const getCount = (loc) => {
    const key = getLocationKey(loc);
    return itemCounts[key] || 0;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{activeLocationData.icon}</span>
          <div className="text-left">
            <div className="font-semibold text-gray-900 dark:text-white">
              {activeLocationData.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {getCount(activeLocationData)} items
            </div>
          </div>
        </div>
        <ChevronDown 
          size={20} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto custom-scrollbar">
          {allLocations.map((loc) => {
            const isActive = activeLocation === null 
              ? loc.id === null 
              : (typeof activeLocation === 'string' ? loc.id === activeLocation : loc.id === activeLocation?.id);
            const count = getCount(loc);

            return (
              <button
                key={loc.id || 'all'}
                onClick={() => {
                  onChange(loc.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{loc.icon}</span>
                  <span className={`font-medium ${
                    isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {loc.name}
                  </span>
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StorageLocationDropdown;
