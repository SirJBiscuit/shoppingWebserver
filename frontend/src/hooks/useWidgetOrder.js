import { useState, useEffect, useCallback, useRef } from 'react';
import { getPreference, savePreference } from '../api/mdl';

const PREF_KEY = 'widget_order';

/**
 * useWidgetOrder — persistent per-user widget ordering.
 *
 * Order is stored in mdl_user_preferences as a JSON map of
 * { groupId: [widgetId, ...] }, so a user's arrangement survives
 * refreshes, logouts, and other devices. Mirrors to localStorage
 * for instant paint before the fetch lands.
 *
 * Usage:
 *   const { orderedIds, reorder } = useWidgetOrder();
 *   const order = orderedIds('dashboard-sidebar', ['a', 'b', 'c']);
 *   <Reorder.Group values={order} onReorder={(ids) => reorder('dashboard-sidebar', ids)}>
 */
const useWidgetOrder = () => {
  const [orderMap, setOrderMap] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const loaded = useRef(false);

  // Hydrate from the server on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await getPreference(PREF_KEY);
        if (!alive) return;
        const parsed = raw ? JSON.parse(raw) : {};
        const map = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        setOrderMap(map);
        localStorage.setItem(PREF_KEY, JSON.stringify(map));
      } catch {
        // keep local mirror
      } finally {
        loaded.current = true;
      }
    })();
    return () => { alive = false; };
  }, []);

  const saveTimer = useRef(null);
  const persist = useCallback((map) => {
    localStorage.setItem(PREF_KEY, JSON.stringify(map));
    // Reorder.Group fires onReorder on every position change while a drag
    // is in flight — debounce the network save so one drag = one write.
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePreference(PREF_KEY, JSON.stringify(map)).catch(() => {});
    }, 800);
  }, []);

  // Merge a saved order with the defaults — saved ids first (in saved
  // order), then any default ids the save doesn't know about (new
  // widgets appended at the end), unknown saved ids dropped.
  const orderedIds = useCallback((groupId, defaultIds) => {
    const saved = Array.isArray(orderMap[groupId]) ? orderMap[groupId] : null;
    if (!saved) return defaultIds;
    const merged = saved.filter((id) => defaultIds.includes(id));
    defaultIds.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
    return merged;
  }, [orderMap]);

  const reorder = useCallback((groupId, ids) => {
    setOrderMap((prev) => {
      const next = { ...prev, [groupId]: ids };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetOrder = useCallback((groupId) => {
    setOrderMap((prev) => {
      const next = { ...prev };
      delete next[groupId];
      persist(next);
      return next;
    });
  }, [persist]);

  return { orderedIds, reorder, resetOrder };
};

export default useWidgetOrder;
