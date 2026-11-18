import { useState, useEffect, useCallback, useRef } from 'react';
import { getPreference, savePreference } from '../api/mdl';

const PREF_KEY = 'hidden_widgets';

/**
 * useHiddenWidgets — persistent per-user widget visibility.
 *
 * Hidden widget ids are stored in mdl_user_preferences as a JSON array,
 * so the hidden state survives refreshes, logouts, and other devices.
 * Also mirrors to localStorage for instant paint before the fetch lands.
 *
 * Usage:
 *   const { isHidden, hide, unhide } = useHiddenWidgets();
 *   <HidableWidget id="budget-tracker" ... />
 */
const useHiddenWidgets = () => {
  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(PREF_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });
  const loaded = useRef(false);

  // Hydrate from the server on login/mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await getPreference(PREF_KEY);
        if (!alive) return;
        const ids = raw ? JSON.parse(raw) : [];
        setHiddenIds(new Set(Array.isArray(ids) ? ids : []));
        localStorage.setItem(PREF_KEY, JSON.stringify(Array.isArray(ids) ? ids : []));
      } catch {
        // keep local mirror
      } finally {
        loaded.current = true;
      }
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback((ids) => {
    const arr = [...ids];
    localStorage.setItem(PREF_KEY, JSON.stringify(arr));
    savePreference(PREF_KEY, JSON.stringify(arr)).catch(() => {});
  }, []);

  const hide = useCallback((id) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persist(next);
      return next;
    });
  }, [persist]);

  const unhide = useCallback((id) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      persist(next);
      return next;
    });
  }, [persist]);

  const unhideAll = useCallback(() => {
    setHiddenIds(new Set());
    persist(new Set());
  }, [persist]);

  const isHidden = useCallback((id) => hiddenIds.has(id), [hiddenIds]);

  return { hiddenIds, isHidden, hide, unhide, unhideAll };
};

export default useHiddenWidgets;
