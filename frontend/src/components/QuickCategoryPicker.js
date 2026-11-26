import { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Plus, X, Wand2, GripHorizontal, Trash2 } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import PickerSettingsButton from './PickerSettingsButton';
import QuickIconPicker, { isImageIcon } from './QuickIconPicker';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';
import { usePickerPrefs } from '../utils/pickerPrefs';
import { mergeDbCategories } from '../utils/categories';
import { categoriesAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../limbo/modals/ConfirmModal';
import {
  CANONICAL_CATEGORIES,
  canonicalizeCategory,
  detectCategory,
  getCategoryIcon,
} from '../utils/categoryDetector';

/**
 * QuickCategoryPicker — compact anchored popover for fast category changes.
 * Same interaction pattern as QuickIconPicker: transparent backdrop, anchored
 * near the clicked chip, staggered spring-in tiles, click-outside to close.
 *
 * Emits the canonical category name (matches the `categories` table).
 */
const QuickCategoryPicker = ({ itemName, currentCategory, anchor, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [dbRows, setDbRows] = useState(null);
  const [learned, setLearned] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [iconAnchor, setIconAnchor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const { user } = useAuth();
  const { prefs, setPref } = usePickerPrefs('category');
  // MDL share opt-in — remembered so users who don't want their custom
  // categories suggested to others aren't asked every time.
  const [shareMdl, setShareMdl] = useState(
    () => localStorage.getItem('mdl_share_categories') !== '0'
  );
  const canonical = canonicalizeCategory(currentCategory);
  const detected = detectCategory(itemName || '');

  // Merge user-created categories from the DB `categories` table into the
  // unified list so this picker and the inventory pickers always agree.
  useEffect(() => {
    let cancelled = false;
    categoriesAPI.getCategories()
      .then((r) => { if (!cancelled) setDbRows(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setDbRows([]); });
    api.get('/mdl/terms', { params: { kind: 'category' } })
      .then((r) => { if (!cancelled) setLearned(Array.isArray(r.data) ? r.data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allCats = (() => {
    const base = (dbRows ? mergeDbCategories(dbRows) : CANONICAL_CATEGORIES.map((c) => ({ label: c.name, icon: c.icon })))
      .map((c) => ({ name: c.label, icon: c.icon, id: c.id, user_id: c.user_id }));
    const seen = new Set(base.map((c) => c.name.toLowerCase()));
    // Learned custom categories (admin-approved + own pending) join the grid
    if (prefs.suggestions) {
      for (const t of learned) {
        if (!seen.has(t.term.toLowerCase())) {
          seen.add(t.term.toLowerCase());
          base.push({ name: t.term, icon: '🧠' });
        }
      }
    }
    return base;
  })();

  const list = query.trim()
    ? allCats.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : allCats;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const r = await categoriesAPI.createCategory({ name, icon: newIcon || '🏷️' });
      setDbRows((rows) => [...(rows || []), r.data]);
      // Teach MDL the custom category only when the user opted into
      // sharing — it pools as 'pending' until an admin approves it.
      if (shareMdl) {
        api.post('/mdl/terms', { kind: 'category', term: name }).catch(() => {});
      }
      setCreating(false);
      onSelect(name);
      onClose();
    } catch {
      // leave the form open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  // Anchored placement via the shared auto-placement API: below the chip
  // when it fits, above when there's more room, height-capped on short
  // screens. On mobile it's a bottom sheet — always reachable.
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 340 });
  const dragControls = useDragControls();

  const pick = (name) => {
    onSelect(name);
    onClose();
  };

  const toggleShare = (v) => {
    setShareMdl(v);
    localStorage.setItem('mdl_share_categories', v ? '1' : '0');
  };

  const removeCat = (cat) => {
    categoriesAPI.deleteCategory(cat.id)
      .then(() => setDbRows((rows) => (rows || []).filter((r) => r.id !== cat.id)))
      .catch(() => {})
      .finally(() => setConfirmDel(null));
  };

  // Header (~40px) + detected-pill (~40px) + search (~48px) + padding
  const scrollMax = `${Math.max(120, maxHeight - 130)}px`;

  const panelStyle = isMobile
    ? { transformStyle: 'preserve-3d' }
    : {
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        maxHeight,
        transformOrigin: side === 'above' ? 'bottom center' : 'top center',
        transformStyle: 'preserve-3d',
      };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <motion.div
        ref={ref}
        initial={prefs.animations ? (isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }) : false}
        animate={isMobile
          ? { opacity: 1, y: 0 }
          : { opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={prefs.animations ? (isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }) : { opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        drag={!isMobile}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        style={panelStyle}
        className={`fixed z-[71] bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
          isMobile
            ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[72vh] border-b-0'
            : 'w-72 max-w-[calc(100vw-16px)] rounded-2xl'
        }`}
      >
        {isMobile && (
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate flex items-center gap-1.5">
            {!isMobile && (
              <GripHorizontal
                className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            Category for “{itemName || 'item'}”
          </span>
          <div className="flex items-center gap-0.5">
            <PickerSettingsButton prefs={prefs} setPref={setPref} />
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {detected && detected !== canonical && prefs.suggestions && (
          <button
            type="button"
            onClick={() => pick(detected)}
            className="mx-3 mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/40 ring-1 ring-primary-300 dark:ring-primary-700 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
            title="Auto-detected category"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {getCategoryIcon(detected)} Detected: {detected}
          </button>
        )}

        {prefs.search && (
          <div className="px-3 pt-2">
            <input
              autoFocus={!isMobile}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
            />
          </div>
        )}

        <AnimatedScrollbar3D
          maxHeight={scrollMax}
          thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
          glowColor="primary"
          autoHide={false}
        >
          <div className="px-3 py-2">
            <div className="grid grid-cols-2 gap-1.5">
              {list.map((cat, i) => {
                const mine = cat.user_id && cat.user_id === user?.id;
                return (
                  <motion.div
                    key={cat.name}
                    initial={prefs.animations ? { opacity: 0, y: 6, scale: 0.9 } : { opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: prefs.animations ? Math.min(i * 0.025, 0.3) : 0, type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={() => pick(cat.name)}
                    title={mine ? 'Your custom category — click to pick' : cat.name}
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium cursor-pointer select-none transition-all hover:scale-[1.04] active:scale-95 ${
                      canonical === cat.name
                        ? 'bg-primary-100 dark:bg-primary-900/50 ring-1 ring-primary-500 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                    }`}
                  >
                    {isImageIcon(cat.icon)
                      ? <img src={cat.icon} alt="" className="w-5 h-5 object-contain" />
                      : <span className="text-base leading-none">{cat.icon}</span>}
                    <span className="truncate flex-1">{cat.name}</span>
                    {mine && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDel(cat); }}
                        title={`Remove "${cat.name}"`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
              {list.length === 0 && (
                <p className="col-span-2 text-center text-xs text-gray-400 py-3">No matches</p>
              )}
            </div>
          </div>
        </AnimatedScrollbar3D>

        {/* Custom category creator — saved to the shared categories table */}
        <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 dark:border-gray-700">
          {creating ? (
            <div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => setIconAnchor(e.currentTarget)}
                  title="Choose an icon"
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-primary-400 transition-colors overflow-hidden"
                >
                  {isImageIcon(newIcon)
                    ? <img src={newIcon} alt="" className="w-6 h-6 object-contain" />
                    : newIcon}
                </button>
                <input
                  autoFocus={!isMobile}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Category name"
                  className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <label
                className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
                title="Let the app suggest this category to other users after admin approval"
              >
                <input
                  type="checkbox"
                  checked={shareMdl}
                  onChange={(e) => toggleShare(e.target.checked)}
                  className="w-3 h-3 accent-primary-500"
                />
                Suggest to others — remembered
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New category
            </button>
          )}
        </div>
      </motion.div>
      {iconAnchor && (
        <QuickIconPicker
          item={{ item_name: newName }}
          anchor={iconAnchor}
          currentIcon={newIcon}
          onSelect={(ic) => { setNewIcon(ic); setIconAnchor(null); }}
          onClose={() => setIconAnchor(null)}
          zIndex={75}
        />
      )}
      {confirmDel && (
        <div className="relative z-[99999]">
          <ConfirmModal
            isOpen
            type="danger"
            title="Remove category?"
            message={`"${confirmDel.name}" will be removed from your account. Items keep their saved category.`}
            confirmText="Remove"
            onConfirm={() => removeCat(confirmDel)}
            onCancel={() => setConfirmDel(null)}
          />
        </div>
      )}
    </Portal>
  );
};

export default QuickCategoryPicker;
