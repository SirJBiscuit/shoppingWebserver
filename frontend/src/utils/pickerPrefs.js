import { useState } from 'react';

/**
 * Per-picker user preferences, persisted to localStorage under
 * `qpicker_prefs_<pickerName>`. Powers the gear-menu on each quick
 * picker panel: animations, search bar, and suggestion rows can each
 * be toggled and the choice sticks.
 */
const DEFAULTS = {
  animations: true,  // spring-in tiles / popover motion
  search: true,      // show the search field
  suggestions: true, // learned/detected suggestion rows
};

const read = (name) => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(`qpicker_prefs_${name}`) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

export const usePickerPrefs = (name) => {
  const [prefs, setPrefs] = useState(() => read(name));
  const setPref = (key, value) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      try { localStorage.setItem(`qpicker_prefs_${name}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return { prefs, setPref };
};
