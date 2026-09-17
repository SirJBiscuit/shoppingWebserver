import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Filter, Mic, Scan, History, Clock, 
  TrendingUp, MapPin, DollarSign, Tag, ChevronDown 
} from 'lucide-react';
import { customTheme, getColorScheme, getAnimation } from '../utils/customTheme';

/**
 * CustomSearchBar - Enhanced search with MDL integration, filters, and aisle support
 * 
 * Features:
 * - Live autocomplete with MDL predictions
 * - Price estimates from MDL
 * - Aisle suggestions
 * - Recent searches
 * - Voice search
 * - Barcode scanner
 * - Advanced filters
 * - Category suggestions
 * - Smart sorting
 * 
 * Integrations:
 * - MDL price predictions
 * - MDL aisle predictions
 * - MDL usage patterns
 * - Category system
 * - Store locations
 */
const CustomSearchBar = ({
  placeholder = 'Search items...',
  onSearch,
  onSelect,
  showFilters = true,
  showVoice = true,
  showBarcode = true,
  showRecent = true,
  mdlEnabled = true,
  aisleEnabled = true,
  currentStore = null,
  categories = [],
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 100 },
    sortBy: 'relevance',
    aisles: []
  });
  
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent.slice(0, 5));
  }, []);

  // Fetch MDL suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        // Simulate MDL API call
        // In real implementation, call /api/mdl/suggestions
        const mockSuggestions = [
          {
            name: query,
            type: 'item',
            price: 3.99,
            aisle: currentStore ? 5 : null,
            confidence: 0.95,
            category: 'Dairy',
            icon: '🥛',
            frequency: 'Often bought'
          },
          {
            name: `${query} (Organic)`,
            type: 'item',
            price: 5.49,
            aisle: currentStore ? 5 : null,
            confidence: 0.85,
            category: 'Dairy',
            icon: '🥛',
            frequency: 'Sometimes bought'
          }
        ];

        setSuggestions(mockSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query, currentStore, mdlEnabled]);

  // Handle search submission
  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const recent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(recent);
    localStorage.setItem('recentSearches', JSON.stringify(recent));

    // Execute search
    onSearch?.(searchQuery, filters);
    setShowSuggestions(false);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    setQuery(suggestion.name);
    onSelect?.(suggestion);
    setShowSuggestions(false);
  };

  // Handle voice search
  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSearch(transcript);
      };
      
      recognition.start();
    } else {
      alert('Voice search not supported in this browser');
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = () => {
    // Integrate with barcode scanner
    // This would open camera or barcode scanner component
    console.log('Open barcode scanner');
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colors = getColorScheme('primary');

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      {/* Search Input */}
      <div className={`
        relative flex items-center gap-2
        bg-white dark:bg-gray-800
        border-2 ${isFocused ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}
        rounded-xl shadow-md
        transition-all duration-200
        ${isFocused ? 'shadow-lg ring-2 ring-blue-500/20' : ''}
      `}>
        {/* Search Icon */}
        <Search className="w-5 h-5 text-gray-400 ml-4" />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') {
              setShowSuggestions(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className="flex-1 py-3 bg-transparent text-gray-900 dark:text-gray-100 outline-none"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 mr-2">
          {/* Clear Button */}
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleClear}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </motion.button>
          )}

          {/* Voice Search */}
          {showVoice && (
            <button
              onClick={handleVoiceSearch}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Voice Search"
            >
              <Mic className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {/* Barcode Scanner */}
          {showBarcode && (
            <button
              onClick={handleBarcodeScan}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Scan Barcode"
            >
              <Scan className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {/* Filters */}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`
                p-2 rounded-lg transition-colors
                ${showFilterPanel 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'
                }
              `}
              title="Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
          <motion.div
            {...getAnimation('slideDown', 'smooth')}
            className={`
              absolute top-full left-0 right-0 mt-2
              bg-white dark:bg-gray-800
              border-2 border-gray-200 dark:border-gray-700
              rounded-xl shadow-2xl
              max-h-96 overflow-y-auto
              ${customTheme.zIndex.dropdown}
            `}
          >
            {/* Recent Searches */}
            {showRecent && query.length < 2 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      handleSearch(search);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* MDL Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className="text-2xl">{suggestion.icon}</div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {suggestion.name}
                        </span>
                        {suggestion.frequency && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {suggestion.frequency}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1">
                        {/* Price */}
                        {mdlEnabled && suggestion.price && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <DollarSign className="w-3 h-3" />
                            ${suggestion.price.toFixed(2)}
                          </div>
                        )}

                        {/* Aisle */}
                        {aisleEnabled && suggestion.aisle && (
                          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                            <MapPin className="w-3 h-3" />
                            Aisle {suggestion.aisle}
                          </div>
                        )}

                        {/* Category */}
                        {suggestion.category && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <Tag className="w-3 h-3" />
                            {suggestion.category}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Confidence */}
                    {suggestion.confidence && (
                      <div className="text-xs text-gray-400">
                        {Math.round(suggestion.confidence * 100)}%
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            {...getAnimation('slideDown', 'smooth')}
            className={`
              absolute top-full left-0 right-0 mt-2
              bg-white dark:bg-gray-800
              border-2 border-gray-200 dark:border-gray-700
              rounded-xl shadow-2xl
              p-4
              ${customTheme.zIndex.dropdown}
            `}
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
              Filters
            </h3>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        const newCategories = filters.categories.includes(category)
                          ? filters.categories.filter(c => c !== category)
                          : [...filters.categories, category];
                        setFilters({ ...filters, categories: newCategories });
                      }}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium transition-colors
                        ${filters.categories.includes(category)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort By */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
                <option value="recent">Recently Added</option>
                <option value="frequency">Most Frequent</option>
              </select>
            </div>

            {/* Apply Filters */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleSearch();
                  setShowFilterPanel(false);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium text-sm transition-all"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({
                    categories: [],
                    priceRange: { min: 0, max: 100 },
                    sortBy: 'relevance',
                    aisles: []
                  });
                }}
                className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSearchBar;
