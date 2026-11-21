import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMMON_GROCERY_ITEMS } from '../utils/autocomplete';
import { getAutocomplete } from '../api/mdl';

// Tier rank for merged ordering — learned data beats the static list
const TIER_RANK = { local: 0, user: 0, global: 1, common: 2 };
const SOURCE_TAG = { user: 'yours', global: 'popular', store: 'this store', proactive: 'suggested' };

const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect,
  onAutoFill,
  onEnter,
  getSuggestionIcon,
  previousItems = [],
  store = '',
  placeholder = "Type to search...",
  className = "",
  disableAutocomplete = false,
  proactiveItems = [] // [{ name, icon }] — smart suggestions shown on focus before typing
}) => {
  const [suggestions, setSuggestions] = useState([]); // [{ name, source, icon?, storeMatch? }]
  const [remote, setRemote] = useState([]);           // MDL user/global suggestions
  const remoteTimer = useRef(null);
  const latestQuery = useRef('');
  const [ghostText, setGhostText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const prevValueRef = useRef('');

  // Remote MDL suggestions — debounced, stale-guarded, degrades to local-only
  useEffect(() => {
    const term = value.trim();
    latestQuery.current = term;
    clearTimeout(remoteTimer.current);
    if (disableAutocomplete || term.length < 2) {
      setRemote([]);
      return;
    }
    remoteTimer.current = setTimeout(async () => {
      const data = await getAutocomplete(term, store);
      if (latestQuery.current === term) setRemote(data);
    }, 300);
    return () => clearTimeout(remoteTimer.current);
  }, [value, store, disableAutocomplete]);

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
    
    const term = value.trim().toLowerCase();
    if (term.length >= 2) {
      const seen = new Set();
      const merged = [];
      const push = (name, meta = {}) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({ name, ...meta });
      };

      previousItems
        .filter(n => n && n.toLowerCase().includes(term))
        .forEach(n => push(n, { source: 'local' }));
      remote.forEach(s => push(s.name, { source: s.source, icon: s.icon, storeMatch: s.storeMatch }));
      COMMON_GROCERY_ITEMS
        .filter(n => n.toLowerCase().includes(term))
        .forEach(n => push(n, { source: 'common' }));

      merged.sort((a, b) => {
        const aP = a.name.toLowerCase().startsWith(term);
        const bP = b.name.toLowerCase().startsWith(term);
        if (aP !== bP) return aP ? -1 : 1;
        if (a.storeMatch !== b.storeMatch) return a.storeMatch ? -1 : 1;
        const tr = (TIER_RANK[a.source] ?? 3) - (TIER_RANK[b.source] ?? 3);
        if (tr) return tr;
        return a.name.localeCompare(b.name);
      });

      const top = merged.slice(0, 5);
      setSuggestions(top);
      const ghost = top.find(m => m.name.toLowerCase().startsWith(term));
      setGhostText(ghost ? ghost.name.slice(value.trim().length) : '');
      // Only show suggestions if NOT deleting
      setShowSuggestions(!isCurrentlyDeleting && top.length > 0);
    } else if (isFocused && proactiveItems.length > 0) {
      // Proactive smart suggestions — shown on focus before typing.
      setSuggestions(
        proactiveItems.slice(0, 6).map((p) => ({ name: p.name, icon: p.icon, source: 'proactive' }))
      );
      setGhostText('');
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setGhostText('');
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  }, [value, previousItems, remote, disableAutocomplete, isFocused, proactiveItems]);

  const handleKeyDown = (e) => {
    // Enter always commits — selected suggestion if highlighted,
    // otherwise fire onEnter (add typed item) or let the form submit
    if (e.key === 'Enter') {
      if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      } else if (onEnter && value.trim()) {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        onEnter(value);
      }
      return;
    }

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
    onChange({ target: { value: suggestion.name } });
    if (onSelect) onSelect(suggestion.name);
    if (onAutoFill) onAutoFill(); // Trigger auto-fill for quantity
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
        
        {/* Ghost text overlay — live inline autocomplete while typing */}
        {ghostText && (
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
          onFocus={() => {
            setIsFocused(true);
            if (value.trim().length >= 2) {
              if (suggestions.length > 0 && !isDeleting) setShowSuggestions(true);
            } else if (proactiveItems.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => {
            setShowSuggestions(false);
            setIsFocused(false);
          }, 200)}
          placeholder={placeholder}
          className={`${className} relative z-20 bg-transparent`}
          autoComplete="off"
        />
      </div>

      {/* Dropdown suggestions - positioned above to avoid covering inputs below */}
      <AnimatePresence>
      {showSuggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="absolute z-30 w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto scrollbar-3d"
        >
          {value.trim().length < 2 && proactiveItems.length > 0 && (
            <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Suggested for you
            </div>
          )}
          {suggestions.map((suggestion, index) => {
            const icon = suggestion.icon || (getSuggestionIcon ? getSuggestionIcon(suggestion.name) : null);
            const name = suggestion.name;
            const matchLen = Math.min(value.length, name.length);
            const matchesPrefix = name.slice(0, matchLen).toLowerCase() === value.slice(0, matchLen).toLowerCase();
            const tag = suggestion.storeMatch ? SOURCE_TAG.store : SOURCE_TAG[suggestion.source];
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.15 }}
                onClick={() => selectSuggestion(suggestion)}
                className={`px-4 py-2 cursor-pointer transition-colors flex items-center gap-2 ${
                  index === selectedIndex
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
                <span className="flex-1 min-w-0 truncate">
                  {matchesPrefix ? (
                    <>
                      <span className="font-semibold text-primary-600 dark:text-primary-400">
                        {name.slice(0, matchLen)}
                      </span>
                      {name.slice(matchLen)}
                    </>
                  ) : name}
                </span>
                {tag && (
                  <span className={`flex-shrink-0 text-[10px] uppercase tracking-wide ${
                    suggestion.storeMatch ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {tag}
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default AutocompleteInput;
