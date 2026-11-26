import { useState } from 'react';
import { Settings2 } from 'lucide-react';

/**
 * Gear button for the quick-picker headers — opens a compact config
 * menu inside the panel. Toggles: entrance animations, the search
 * field, and suggestion rows (learned/detected). Persisted per picker
 * via usePickerPrefs.
 */
const TOGGLES = [
  { key: 'animations', label: 'Animations' },
  { key: 'search', label: 'Search bar' },
  { key: 'suggestions', label: 'Suggestions' },
];

const PickerSettingsButton = ({ prefs, setPref }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Picker settings"
        className={`p-1 rounded-lg transition-colors ${
          open
            ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Settings2 className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 w-36 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-1.5">
          {TOGGLES.map((t) => (
            <label
              key={t.key}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              {t.label}
              <input
                type="checkbox"
                checked={!!prefs[t.key]}
                onChange={(e) => setPref(t.key, e.target.checked)}
                className="w-3 h-3 accent-primary-500"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default PickerSettingsButton;
