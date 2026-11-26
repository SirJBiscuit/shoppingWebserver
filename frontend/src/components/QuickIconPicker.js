import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ImagePlus, Loader2, Check, AlertCircle, RotateCw, GripHorizontal, Globe } from 'lucide-react';
import { ICON_DATA } from './IconPicker';
import PickerSettingsButton from './PickerSettingsButton';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';
import { usePickerPrefs } from '../utils/pickerPrefs';
import { isImageIcon, normalizeIconFile, uploadIcon, fetchCustomIcons } from '../utils/iconUpload';

const ALL_ICONS = [...new Set(ICON_DATA.map((d) => d.icon))];
const GRID_LIMIT = 30;

// Re-export so existing consumers keep working from this module.
export { isImageIcon };

// icon -> human-readable label (first keyword) for tooltips
const ICON_LABEL = ICON_DATA.reduce((m, d) => {
  if (!m[d.icon]) m[d.icon] = d.keywords[0] || '';
  return m;
}, {});
const labelFor = (icon) => ICON_LABEL[icon] || '';

/**
 * QuickIconPicker - compact anchored popover for fast icon swaps.
 * Opens next to the clicked item icon in the list — search, smart
 * suggestions from the item name, and custom uploads (128×128 item_icon
 * images). Transparent backdrop, click-outside to close.
 */
const QuickIconPicker = ({ item, anchor, currentIcon, onSelect, onClose, zIndex = 70 }) => {
  const [query, setQuery] = useState('');
  const [customIcons, setCustomIcons] = useState([]);
  const [upload, setUpload] = useState({ state: 'idle', pct: 0, msg: '' });
  const { prefs, setPref } = usePickerPrefs('icon');
  const fileRef = useRef(null);
  const shareRef = useRef(false);
  const doneTimer = useRef(null);
  // Donate opt-in — remembered so sharing isn't asked every upload.
  // 'ask' (not chosen yet) | 'yes' | 'no'
  const [shareChoice, setShareChoice] = useState(
    () => localStorage.getItem('icon_share_optin') || 'ask'
  );
  const [shareAsk, setShareAsk] = useState(false);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  useEffect(() => {
    fetchCustomIcons().then(setCustomIcons);
  }, []);

  const itemName = (item?.item_name || item?.name || '').toLowerCase();
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

  const markDone = () => {
    clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(() => setUpload({ state: 'idle', pct: 0, msg: '' }), 2400);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const share = shareRef.current;
    shareRef.current = false;
    setUpload({ state: 'uploading', pct: 0, msg: '' });
    try {
      const payload = await normalizeIconFile(file);
      const img = await uploadIcon(payload, file.name.replace(/\.[a-z]+$/i, '') + '.png',
        (pct) => setUpload({ state: 'uploading', pct, msg: '' }), share);
      setCustomIcons((prev) => [img, ...prev].slice(0, 24));
      setUpload({ state: 'done', pct: 100, msg: share ? 'Icon donated — pending review' : 'Icon uploaded' });
      onSelect(img.image_url);
      markDone();
    } catch (err) {
      setUpload({ state: 'error', pct: 0, msg: err.message || 'Upload failed' });
      markDone();
    } finally {
      e.target.value = '';
    }
  };

  const rememberShare = (v) => {
    setShareChoice(v);
    localStorage.setItem('icon_share_optin', v);
  };

  // Shared auto-placement: below the clicked icon when it fits, above when
  // there's more room, height-capped on short screens; bottom sheet on mobile.
  const { pos, ref: anchorRef, maxHeight, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 380 });
  const dragControls = useDragControls();

  // Chrome (header+search+suggestions+upload row) ≈ 200px — cap the icon grid
  const gridMax = `${Math.max(96, maxHeight - 200)}px`;

  const pick = (icon) => {
    onSelect(icon);
    onClose();
  };

  const panelStyle = isMobile
    ? { zIndex: zIndex + 1 }
    : { zIndex: zIndex + 1, left: pos?.left ?? -9999, top: pos?.top ?? -9999, maxHeight };

  return (
    <Portal>
      {/* transparent backdrop — no dim, click outside closes */}
      <div className="fixed inset-0" style={{ zIndex }} onClick={onClose} />
      <motion.div
        ref={anchorRef}
        initial={prefs.animations ? (isMobile ? { opacity: 0, y: 60 } : { opacity: 0, scale: 0.9, y: 8 }) : false}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={prefs.animations ? (isMobile ? { opacity: 0, y: 60 } : { opacity: 0, scale: 0.9, y: 8 }) : { opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
        drag={!isMobile}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        className={`fixed bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
          isMobile
            ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[72vh] border-b-0'
            : 'w-72 max-w-[calc(100vw-16px)] rounded-2xl'
        }`}
        style={panelStyle}
      >
        {isMobile && (
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        {/* header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate flex items-center gap-1.5">
            {!isMobile && (
              <GripHorizontal
                className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            Icon for “{item?.item_name || item?.name || 'item'}”
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

        {/* search — autofocus only on non-touch so the OS keyboard stays
            down until the user taps the field */}
        {prefs.search && (
          <div className="px-3 pt-2">
            <input
              autoFocus={!isMobile}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
            />
          </div>
        )}

        {/* suggestions */}
        {suggestions.length > 0 && !query && prefs.suggestions && (
          <div className="px-3 pt-2">
            <div className="flex gap-1.5">
              {suggestions.map((icon, i) => (
                <motion.button
                  key={`s-${i}`}
                  initial={prefs.animations ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: prefs.animations ? i * 0.04 : 0 }}
                  onClick={() => pick(icon)}
                  title={`${labelFor(icon) || icon} — suggested for “${itemName}”`}
                  className="w-9 h-9 flex items-center justify-center text-xl rounded-lg bg-primary-50 dark:bg-primary-900/40 ring-1 ring-primary-300 dark:ring-primary-700 hover:scale-110 transition-transform"
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* icon grid */}
        <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: gridMax }}>
          <div className="grid grid-cols-6 gap-1.5">
            {filtered.map((icon, i) => (
              <motion.button
                key={`${icon}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.2) }}
                onClick={() => pick(icon)}
                title={labelFor(icon) ? `Use ${labelFor(icon)} icon` : `Use ${icon} icon`}
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

        {/* custom icons + upload with inline animated status.
            Local uploads stay private; Global donates to everyone after
            admin approval — the donate choice is remembered. */}
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => { shareRef.current = false; fileRef.current?.click(); }}
              disabled={upload.state === 'uploading'}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-primary-500 hover:text-primary-500 flex-shrink-0 transition-colors disabled:opacity-50"
              title="Upload a private icon — any image ≤128×128 works, larger images are auto-downscaled"
            >
              {upload.state === 'uploading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ImagePlus className="w-4 h-4" />}
            </button>
            {shareChoice !== 'no' && (
              <button
                type="button"
                onClick={() => {
                  // First donate click asks once — the choice sticks.
                  if (shareChoice === 'ask') { setShareAsk(true); return; }
                  shareRef.current = true; fileRef.current?.click();
                }}
                disabled={upload.state === 'uploading'}
                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-500 hover:border-emerald-500 hover:text-emerald-600 flex-shrink-0 transition-colors disabled:opacity-50"
                title="Donate an icon for everyone — goes live after admin approval"
              >
                <Globe className="w-4 h-4" />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {customIcons.slice(0, 8).map((img) => (
              <button
                type="button"
                key={img.id}
                onClick={() => pick(img.image_url)}
                title={
                  img.shared_status === 'pending' ? 'Your donated icon — awaiting admin approval'
                  : img.shared_status === 'approved' && img.mine ? 'Your donated icon — shared with everyone'
                  : img.shared_status === 'approved' ? 'Shared community icon'
                  : 'Custom icon you uploaded'
                }
                className={`relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1 transition-transform hover:scale-110 ${
                  currentIcon === img.image_url ? 'ring-primary-500' : 'ring-gray-200 dark:ring-gray-600'
                }`}
              >
                <img src={img.thumbnail_url || img.image_url} alt="custom icon" className="w-full h-full object-cover" />
                {img.shared_status === 'pending' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[9px] text-amber-300 font-bold">…</span>
                )}
                {img.shared_status === 'approved' && (
                  <Globe className="absolute bottom-0 right-0 w-3 h-3 p-[1px] bg-emerald-500 text-white rounded-tl" />
                )}
              </button>
            ))}

            {/* animated inline upload status badge */}
            <AnimatePresence mode="wait">
              {upload.state !== 'idle' && (
                <motion.span
                  key={upload.state}
                  initial={prefs.animations ? { opacity: 0, x: -6, scale: 0.85 } : { opacity: 1, x: 0, scale: 1 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 6, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${
                    upload.state === 'uploading'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300'
                      : upload.state === 'done'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300'
                  }`}
                  title={upload.state === 'error' ? upload.msg : undefined}
                >
                  {upload.state === 'uploading' && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{upload.pct}%</span>
                      <span className="w-10 h-1 rounded-full bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
                        <motion.span
                          className="block h-full bg-indigo-500"
                          animate={{ width: `${upload.pct}%` }}
                          transition={{ ease: 'easeOut', duration: 0.15 }}
                        />
                      </span>
                    </>
                  )}
                  {upload.state === 'done' && (
                    <>
                      <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                        <Check className="w-3 h-3" />
                      </motion.span>
                      <span>Uploaded</span>
                    </>
                  )}
                  {upload.state === 'error' && (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span className="max-w-[110px] truncate">{upload.msg || 'Failed'}</span>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-0.5 underline underline-offset-2"
                        title="Try again"
                      >
                        <RotateCw className="w-3 h-3" /> retry
                      </button>
                    </>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* One-time donate ask — remembered so it never repeats */}
          {shareAsk && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-800">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Share your icons with everyone?
              </span>
              <button
                type="button"
                onClick={() => { rememberShare('yes'); setShareAsk(false); shareRef.current = true; fileRef.current?.click(); }}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Always
              </button>
              <button
                type="button"
                onClick={() => { setShareAsk(false); shareRef.current = true; fileRef.current?.click(); }}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200"
              >
                This one
              </button>
              <button
                type="button"
                onClick={() => { rememberShare('no'); setShareAsk(false); }}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                No
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </Portal>
  );
};

export default QuickIconPicker;
