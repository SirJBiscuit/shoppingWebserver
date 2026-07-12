import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { getAutocompleteSuggestions, getGhostText } from '../utils/autocomplete';

const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect,
  onAutoFill,
  previousItems = [],
  placeholder = "Type to search...",
  className = "",
  disableAutocomplete = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [ghostText, setGhostText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef(null);
  const prevValueRef = useRef('');

  useEffect(() => {
    if (disableAutocomplete) {
      setSuggestions([]);
      setGhostText('');
      setShowSuggestions(false);
      return;
    }
    
    // Check if user is deleting (value got shorter)
    const isCurrentlyDeleting = value.length < prevValueRef.current.length;
    setIsDeleting(isCurrentlyDeleting);
    prevValueRef.current = value;
    
    if (value && value.length >= 2) {
      const newSuggestions = getAutocompleteSuggestions(value, previousItems);
      setSuggestions(newSuggestions);
      setGhostText(getGhostText(value, previousItems));
      // Only show suggestions if NOT deleting
      setShowSuggestions(!isCurrentlyDeleting && newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setGhostText('');
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [value, previousItems, disableAutocomplete]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      // Tab or Right Arrow to accept ghost text
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostText) {
        e.preventDefault();
        const fullText = value + ghostText;
        onChange({ target: { value: fullText } });
        if (onSelect) onSelect(fullText);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      case 'Tab':
      case 'ArrowRight':
        if (ghostText) {
          e.preventDefault();
          const fullText = value + ghostText;
          onChange({ target: { value: fullText } });
          if (onSelect) onSelect(fullText);
          setShowSuggestions(false);
        }
        break;
      default:
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    onChange({ target: { value: suggestion } });
    if (onSelect) onSelect(suggestion);
    if (onAutoFill) onAutoFill(); // Trigger auto-fill for quantity
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
        
        {/* Ghost text overlay */}
        {ghostText && !showSuggestions && (
          <div className="absolute left-10 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500 whitespace-pre">
            <span className="invisible">{value}</span>
            <span>{ghostText}</span>
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && !isDeleting && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={`${className} relative z-20 bg-transparent`}
          autoComplete="off"
        />
      </div>

      {/* Dropdown suggestions - positioned above to avoid covering inputs below */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-30 w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-y-auto">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <div
              key={index}
              onClick={() => selectSuggestion(suggestion)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
