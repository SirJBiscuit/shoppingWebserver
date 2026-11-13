import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Store, Repeat, EyeOff, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

/**
 * StoreUsuals — "You usually buy these here" quick-add chips.
 * Backed by GET /api/mdl/store-usuals (per-store history, global fallback).
 *
 * Props:
 *   storeName - active list's store (drives per-store ranking)
 *   items     - current list items (already-on-list chips are hidden)
 *   onAdd     - ({ item, quantity, unit }) => void — reuse Dashboard's addSuggestion
 *   limit     - chip count (default 8)
 */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const timeOfDay = (h) => (h < 11 ? 'mornings' : h < 15 ? 'afternoons' : h < 19 ? 'evenings' : 'nights');

const StoreUsuals = ({ storeName, items = [], onAdd, limit = 8 }) => {
  const [usuals, setUsuals] = useState([]);
  const [shopTime, setShopTime] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data }, pref] = await Promise.all([
          api.get('/mdl/store-usuals', {
            params: { store: storeName || undefined, limit: limit * 2 },
          }),
          api.get('/mdl/preferences/hide_store_usuals').catch(() => null),
        ]);
        if (!cancelled) {
          setUsuals(data?.items || data || []);
          setShopTime(data?.shop_time || null);
          if (pref?.data?.value === '1') setHidden(true);
        }
      } catch {
        // predictions are non-critical — render nothing on failure
      }
    })();
    return () => { cancelled = true; };
  }, [storeName, limit]);

  const onList = useMemo(
    () => new Set(items.map((i) => (i.item_name || '').toLowerCase())),
    [items]
  );

  const visible = usuals.filter(
    (u) => !onList.has(u.item_name.toLowerCase()) && !dismissed.has(u.item_name)
  ).slice(0, limit);

  if (!visible.length || hidden) return null;

  const hideForever = () => {
    setHidden(true);
    api.post('/mdl/preferences', { key: 'hide_store_usuals', value: '1' }).catch(() => {});
  };

  const dismiss = (e, name) => {
    e.stopPropagation();
    setDismissed((s) => new Set([...s, name]));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Store className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {storeName ? `Your usuals at ${storeName}` : 'Your usuals'}
        </span>
        {shopTime && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400" title="When you typically add items">
            <Clock className="w-3 h-3" />
            usually shops {DOW[shopTime.dow]} {timeOfDay(shopTime.hour)}
          </span>
        )}
        <button
          onClick={hideForever}
          className="ml-auto p-1 text-gray-300 hover:text-gray-500 transition-colors"
          title="Hide these suggestions"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {visible.map((u, i) => (
            <motion.button
              key={u.item_name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onAdd({
                item: u.item_name,
                quantity: u.last_quantity || 1,
                unit: u.last_unit || '',
              })}
              className={`group flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm ${
                u.store_match
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
              }`}
              title={`Bought ${u.times_bought}×${u.store_match ? ` at ${storeName}` : ''}${u.last_price ? ` · last $${parseFloat(u.last_price).toFixed(2)}` : ''}`}
            >
              <span>{u.predicted_icon || '🛒'}</span>
              <span className="capitalize">{u.item_name}</span>
              {u.last_price != null && (
                <span className="text-[10px] text-gray-400">${parseFloat(u.last_price).toFixed(2)}</span>
              )}
              {!u.store_match && (
                <Repeat className="w-3 h-3 text-gray-400" />
              )}
              <span className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3" />
              </span>
              <span
                role="button"
                onClick={(e) => dismiss(e, u.item_name)}
                className="text-gray-300 hover:text-gray-500 px-0.5 text-[10px]"
                title="Hide this suggestion"
              >
                ✕
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StoreUsuals;
