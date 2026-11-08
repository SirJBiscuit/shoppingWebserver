import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * PickerSearchBar — lightweight themed search input for pickers/menus.
 * Shared by the icon picker modal and the notepad glyph/icon dropdown.
 *
 * @param value      current query string
 * @param onChange   (v: string) => void
 * @param placeholder
 * @param autoFocus  focus on mount
 * @param className  extra classes for the wrapper (theme-aware parent styles allowed)
 */
const PickerSearchBar = ({ value, onChange, placeholder = 'Search…', autoFocus = false, className = '' }) => (
  <div
    className={`flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/60 px-3 py-1.5 transition-shadow focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent ${className}`}
  >
    <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
    <input
      type="text"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
        title="Clear"
      >
        <X className="w-3.5 h-3.5 text-gray-400" />
      </button>
    )}
  </div>
);

export default PickerSearchBar;
