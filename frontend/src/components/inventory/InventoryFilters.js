import React, { useState } from 'react';
import { Search, Filter, SortAsc, SortDesc, X, Calendar, AlertTriangle } from 'lucide-react';

/**
 * InventoryFilters - Search, filter, and sort controls for inventory
 */
const InventoryFilters = ({ 
  onSearch, 
  onFilterChange, 
  onSortChange,
  categories = [],
  activeFilters = {},
  sortBy = 'name',
  sortOrder = 'asc'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  const handleFilterToggle = (filterType, value) => {
    const newFilters = { ...activeFilters };
    if (newFilters[filterType] === value) {
      delete newFilters[filterType];
    } else {
      newFilters[filterType] = value;
    }
    onFilterChange(newFilters);
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order
      onSortChange(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort field, default to asc
      onSortChange(newSortBy, 'asc');
    }
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Quick Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search Bar */}
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search items..."
            className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Quick Filter: Expiring Soon */}
        <button
          onClick={() => handleFilterToggle('expiring_soon', 'true')}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap
            ${activeFilters.expiring_soon === 'true'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <AlertTriangle size={20} />
          <span>Expiring Soon</span>
        </button>

        {/* Quick Filter: Opened Items */}
        <button
          onClick={() => handleFilterToggle('is_opened', 'true')}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap
            ${activeFilters.is_opened === 'true'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <Calendar size={20} />
          <span>Opened</span>
        </button>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap
            ${showFilters || activeFilterCount > 0
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <Filter size={20} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-sm">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="appearance-none px-6 py-3 pr-12 rounded-lg font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
          >
            <option value="name">Sort: Name</option>
            <option value="expiry">Sort: Expiration</option>
            <option value="date_added">Sort: Date Added</option>
            <option value="category">Sort: Category</option>
          </select>
          <button
            onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400"
          >
            {sortOrder === 'asc' ? <SortAsc size={20} /> : <SortDesc size={20} />}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Category
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeFilters.category === category}
                      onChange={() => handleFilterToggle('category', category)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Price Range
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_range"
                    checked={!activeFilters.price_range}
                    onChange={() => {
                      const newFilters = { ...activeFilters };
                      delete newFilters.price_range;
                      onFilterChange(newFilters);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">All Prices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_range"
                    checked={activeFilters.price_range === 'under_5'}
                    onChange={() => handleFilterToggle('price_range', 'under_5')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Under $5</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_range"
                    checked={activeFilters.price_range === '5_to_20'}
                    onChange={() => handleFilterToggle('price_range', '5_to_20')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">$5 - $20</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price_range"
                    checked={activeFilters.price_range === 'over_20'}
                    onChange={() => handleFilterToggle('price_range', 'over_20')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Over $20</span>
                </label>
              </div>
            </div>

            {/* Expiration Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Freshness Status
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.status === 'fresh'}
                    onChange={() => handleFilterToggle('status', 'fresh')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">🟢 Fresh (7+ days)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.status === 'use_soon'}
                    onChange={() => handleFilterToggle('status', 'use_soon')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">🟡 Use Soon (4-7 days)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.status === 'urgent'}
                    onChange={() => handleFilterToggle('status', 'urgent')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">🟠 Urgent (1-3 days)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.status === 'expired'}
                    onChange={() => handleFilterToggle('status', 'expired')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">🔴 Expired</span>
                </label>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onFilterChange({})}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryFilters;
