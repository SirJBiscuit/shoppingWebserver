import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, Search } from 'lucide-react';

/**
 * CustomDropdownList - Animated dropdown component for CFS
 * 
 * Features:
 * - Smooth animations with Framer Motion
 * - Search/filter functionality
 * - Custom item rendering
 * - Keyboard navigation
 * - Dark mode support
 * - Mobile-friendly
 * - Matches CustomPanel/CustomKeypad design
 */
const CustomDropdownList = ({
  items = [],
  value,
  onChange,
  placeholder = 'Select an item',
  searchable = false,
  searchPlaceholder = 'Search...',
  renderItem,
  renderValue,
  onAddNew,
  addNewLabel = 'Add New',
  disabled = false,
  className = '',
  maxHeight = '300px',
  emptyMessage = 'No items found',
  showCheckmark = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter items based on search
  const filteredItems = searchable && searchQuery
    ? items.filter(item => {
        const searchText = typeof item === 'object' ? item.label || item.name : String(item);
        return searchText.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : items;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredItems[focusedIndex]) {
          handleSelect(filteredItems[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
      setIsOpen(false);
    }
  };

  // Get display value
  const getDisplayValue = () => {
    if (!value) return placeholder;
    if (renderValue) return renderValue(value);
    if (typeof value === 'object') return value.label || value.name || placeholder;
    return String(value);
  };

  // Get item key
  const getItemKey = (item, index) => {
    if (typeof item === 'object') return item.id || item.value || index;
    return index;
  };

  // Check if item is selected
  const isSelected = (item) => {
    if (!value) return false;
    if (typeof item === 'object' && typeof value === 'object') {
      return item.id === value.id || item.value === value.value;
    }
    return item === value;
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 
          bg-white dark:bg-gray-800 
          border-2 border-gray-300 dark:border-gray-600
          rounded-lg
          flex items-center justify-between gap-2
          transition-all duration-200
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer'
          }
          ${isOpen 
            ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20' 
            : ''
          }
        `}
      >
        <span className={`flex-1 text-left truncate ${!value ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
          {getDisplayValue()}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div
              className="overflow-y-auto custom-scrollbar"
              style={{ maxHeight }}
            >
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const selected = isSelected(item);
                  const focused = index === focusedIndex;

                  return (
                    <motion.button
                      key={getItemKey(item, index)}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`
                        w-full px-4 py-3 
                        flex items-center justify-between gap-2
                        transition-colors duration-150
                        ${selected 
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' 
                          : focused
                            ? 'bg-gray-100 dark:bg-gray-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }
                      `}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="flex-1 text-left">
                        {renderItem ? renderItem(item) : (
                          <span className="text-sm font-medium">
                            {typeof item === 'object' ? item.label || item.name : String(item)}
                          </span>
                        )}
                      </div>
                      {showCheckmark && selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Add New Button */}
            {onAddNew && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="w-full px-4 py-2 flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-150"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">{addNewLabel}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdownList;
