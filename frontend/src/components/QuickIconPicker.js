import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ImagePlus } from 'lucide-react';
import { ICON_DATA } from './IconPicker';
import { Portal } from '../utils/autoPlacement';

const ALL_ICONS = [...new Set(ICON_DATA.map((d) => d.icon))];
const GRID_LIMIT = 30;

/**
 * QuickIconPicker - compact anchored popover for fast icon swaps.
 * Opens next to the clicked item icon in the list — search, smart
 * suggestions from the item name, and custom uploads (128×128 item_icon
 * images). Transparent backdrop, click-outside to close.
 */
const QuickIconPicker = ({ item, anchor, currentIcon, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [customIcons, setCustomIcons] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/images?image_type=item_icon', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setCustomIcons(await res.json());
      } catch {
        // non-critical
      }
    })();
  }, []);

  const itemName = (item?.item_name || '').toLowerCase();
  const nameWords = itemName.split(/\s+/).filter(Boolean);
  const suggestions = nameWords.length
    ? [...new Set(ICON_DATA
        .filter((d) => d.keywords.some((kw) => nameWords.some((w) => kw.includes(w) || w.includes(kw))))
        .map((d) => d.icon))]
        .slice(0, 6)
    : [];

  const filtered = query.trim()
    ? [...new Set(ICON_DATA
        .filter((d) => d.keywords.some((kw) => kw.includes(query.trim().toLowerCase())))
        .map((d) => d.icon))]
        .slice(0, GRID_LIMIT)
    : ALL_ICONS.slice(0, GRID_LIMIT);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('image_type', 'item_icon');
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (res.ok) {
        const img = await res.json();
        onSelect(img.image_url);
      }
    } catch (err) {
      console.error('Icon upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Anchored placement near the clicked icon (desktop); centered fallback.
  const pos = (() => {
    if (!anchor || window.innerWidth < 640) return null;
    const M = 8;
    const W = 288; // w-72
    const H = 380; // approx panel height
    const left = Math.min(Math.max(anchor.cx - W / 2, M), window.innerWidth - W - M);
    if (anchor.bottom + 8 + H <= window.innerHeight - M) return { left, top: anchor.bottom + 8 };
    if (anchor.top - 8 - H >= M) return { left, bottom: window.innerHeight - anchor.top + 8 };
    return { left, top: M };
  })();

  const pick = (icon) => {
    onSelect(icon);
    onClose();
  };

  return (
    <Portal>
      {/* transparent backdrop — no dim, click outside closes */}
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        className="fixed z-[71] w-72 max-w-[calc(100vw-16px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={pos ? { left: pos.left, top: pos.top, bottom: pos.bottom } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
            Icon for “{item?.item_name || 'item'}”
          </span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* search */}
        <div className="px-3 pt-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
          />
        </div>

        {/* suggestions */}
        {suggestions.length > 0 && !query && (
          <div className="px-3 pt-2">
            <div className="flex gap-1.5">
              {suggestions.map((icon, i) => (
                <motion.button
                  key={`s-${i}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => pick(icon)}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-lg bg-primary-50 dark:bg-primary-900/40 ring-1 ring-primary-300 dark:ring-primary-700 hover:scale-110 transition-transform"
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* icon grid */}
        <div className="px-3 py-2 max-h-44 overflow-y-auto">
          <div className="grid grid-cols-6 gap-1.5">
            {filtered.map((icon, i) => (
              <motion.button
                key={`${icon}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.2) }}
                onClick={() => pick(icon)}
                className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg transition-all hover:bg-primary-100 dark:hover:bg-primary-900 hover:scale-110 active:scale-95 ${
                  currentIcon === icon ? 'bg-primary-200 dark:bg-primary-800 ring-1 ring-primary-500' : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                {icon}
              </motion.button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-6 text-center text-xs text-gray-400 py-3">No matches</p>
            )}
          </div>
        </div>

        {/* custom icons */}
        {(customIcons.length > 0 || true) && (
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-primary-500 hover:text-primary-500 flex-shrink-0 transition-colors"
                title="Upload custom icon (resized to 128×128)"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {customIcons.slice(0, 8).map((img) => (
                <button
                  key={img.id}
                  onClick={() => pick(img.image_url)}
                  className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1 transition-transform hover:scale-110 ${
                    currentIcon === img.image_url ? 'ring-primary-500' : 'ring-gray-200 dark:ring-gray-600'
                  }`}
                >
                  <img src={img.image_url} alt="custom" className="w-full h-full object-cover" />
                </button>
              ))}
              {uploading && <span className="text-xs text-gray-400">Uploading…</span>}
            </div>
          </div>
        )}
      </motion.div>
    </Portal>
  );
};

export default QuickIconPicker;
