import { useState, useCallback } from 'react';

/**
 * Custom units — per-user list of extra measurement units ("tray", "tube",
 * "case"…) that merge into every unit picker. localStorage-backed per user;
 * shared by all pickers so a unit added in one place shows up everywhere.
 */

const key = (userId) => `custom_units_${userId || 'guest'}`;

export const getCustomUnits = (userId) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) || '[]');
    return Array.isArray(raw) ? raw.filter((u) => typeof u === 'string' && u.trim()) : [];
  } catch {
    return [];
  }
};

const save = (userId, units) => {
  try { localStorage.setItem(key(userId), JSON.stringify(units)); } catch {}
};

export const addCustomUnit = (userId, unit) => {
  const u = (unit || '').trim().slice(0, 20);
  if (!u) return getCustomUnits(userId);
  const cur = getCustomUnits(userId);
  if (cur.some((x) => x.toLowerCase() === u.toLowerCase())) return cur;
  const next = [...cur, u];
  save(userId, next);
  return next;
};

export const removeCustomUnit = (userId, unit) => {
  const next = getCustomUnits(userId).filter(
    (x) => x.toLowerCase() !== (unit || '').toLowerCase()
  );
  save(userId, next);
  return next;
};

/** React state wrapper — same data, re-renders pickers on change. */
export const useCustomUnits = (userId) => {
  const [units, setUnits] = useState(() => getCustomUnits(userId));
  const add = useCallback(
    (u) => setUnits(addCustomUnit(userId, u)),
    [userId]
  );
  const remove = useCallback(
    (u) => setUnits(removeCustomUnit(userId, u)),
    [userId]
  );
  return [units, add, remove];
};
