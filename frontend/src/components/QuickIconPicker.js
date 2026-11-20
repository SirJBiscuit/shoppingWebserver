import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Loader2, Check, AlertCircle, RotateCw } from 'lucide-react';
import { ICON_DATA } from './IconPicker';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';

const ALL_ICONS = [...new Set(ICON_DATA.map((d) => d.icon))];
const GRID_LIMIT = 30;
const MAX_ICON_DIM = 128;

// icon -> human-readable label (first keyword) for tooltips
const ICON_LABEL = ICON_DATA.reduce((m, d) => {
  if (!m[d.icon]) m[d.icon] = d.keywords[0] || '';
  return m;
}, {});
const labelFor = (icon) => ICON_LABEL[icon] || '';

/** True when the "icon" is an uploaded image rather than an emoji. */
export const isImageIcon = (ic) =>
  typeof ic === 'string' && /^(https?:|\/|data:|blob:)/.test(ic.trim());

/**
 * Normalize an upload for the item_icon slot: images already ≤128×128 pass
 * through untouched; larger images are cover-cropped/downscaled to 128×128
 * PNG so the server never rejects a size and the bytes stay tiny.
 */
const normalizeIconFile = (file) => new Promise((resolve, reject) => {
  if (!file.type?.startsWith('image/')) {
    reject(new Error('That file is not an image'));
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const { width: w, height: h } = img;
    if (w <= MAX_ICON_DIM && h <= MAX_ICON_DIM) {
      resolve(file); // already icon-sized — no re-encode needed
      return;
    }
    const scale = MAX_ICON_DIM / Math.max(w, h);
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    // cover-crop to square like the server does (fit: 'cover')
    const side = Math.min(cw, ch);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (cw - side) / 2, (ch - side) / 2, side, side, 0, 0, side, side);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))),
      'image/png'
    );
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read that image'));
  };
  img.src = url;
});

/**
 * POST the icon with real upload progress (fetch has none).
 * Resolves with the created image row, rejects with a user-facing message.
 */
const uploadIcon = (payload, fileName, onProgress) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append('image', payload, fileName);
  fd.append('image_type', 'item_icon');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/images/upload');
  xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
  };
  xhr.onload = () => {
    let body = null;
    try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
    if (xhr.status >= 200 && xhr.status < 300 && body?.image_url) {
      resolve(body);
    } else {
      reject(new Error(body?.error || `Upload failed (HTTP ${xhr.status})`));
    }
  };
  xhr.onerror = () => reject(new Error('Network error — check your connection'));
  xhr.send(fd);
});

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
  const fileRef = useRef(null);
  const doneTimer = useRef(null);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

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
    setUpload({ state: 'uploading', pct: 0, msg: '' });
    try {
      const payload = await normalizeIconFile(file);
      const img = await uploadIcon(payload, file.name.replace(/\.[a-z]+$/i, '') + '.png',
        (pct) => setUpload({ state: 'uploading', pct, msg: '' }));
      setCustomIcons((prev) => [img, ...prev].slice(0, 24));
      setUpload({ state: 'done', pct: 100, msg: 'Icon uploaded' });
      onSelect(img.image_url);
      markDone();
    } catch (err) {
      setUpload({ state: 'error', pct: 0, msg: err.message || 'Upload failed' });
      markDone();
    } finally {
      e.target.value = '';
    }
  };

  // Shared auto-placement: below the clicked icon when it fits, above when
  // there's more room, height-capped on short screens; bottom sheet on mobile.
  const { pos, ref: anchorRef, maxHeight, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 380 });

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
        initial={isMobile ? { opacity: 0, y: 60 } : { opacity: 0, scale: 0.9, y: 8 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0, y: 60 } : { opacity: 0, scale: 0.9, y: 8 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
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
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
            Icon for “{item?.item_name || item?.name || 'item'}”
          </span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded" title="Close">
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

        {/* custom icons + upload with inline animated status */}
        <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={upload.state === 'uploading'}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-primary-500 hover:text-primary-500 flex-shrink-0 transition-colors disabled:opacity-50"
              title="Upload a custom icon — any image ≤128×128 works, larger images are auto-downscaled"
            >
              {upload.state === 'uploading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ImagePlus className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {customIcons.slice(0, 8).map((img) => (
              <button
                key={img.id}
                onClick={() => pick(img.image_url)}
                title="Custom icon you uploaded"
                className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1 transition-transform hover:scale-110 ${
                  currentIcon === img.image_url ? 'ring-primary-500' : 'ring-gray-200 dark:ring-gray-600'
                }`}
              >
                <img src={img.thumbnail_url || img.image_url} alt="custom icon" className="w-full h-full object-cover" />
              </button>
            ))}

            {/* animated inline upload status badge */}
            <AnimatePresence mode="wait">
              {upload.state !== 'idle' && (
                <motion.span
                  key={upload.state}
                  initial={{ opacity: 0, x: -6, scale: 0.85 }}
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
        </div>
      </motion.div>
    </Portal>
  );
};

export default QuickIconPicker;
