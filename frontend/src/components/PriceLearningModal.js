import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, ChevronDown, Keyboard, Package, Store, X, Sparkles } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import CustomNumberPad from './CustomNumberPad';
import { searchProducts, getPriceEstimate } from '../api/mdl';

const STORES = ['Walmart', 'Target', 'Kroger', 'Aldi', 'Costco', 'Whole Foods', 'Safeway', 'Publix'];
const MAX_IMG_PX = 1024; // downscale captures/uploads — keeps photos light

const PriceLearningModal = ({ isOpen, onClose, onSubmit, storeLocation = null, onAddToList = null, device = 'desktop', isBetaTester = false }) => {
  const { success, error: showError, info } = useToast();
  const [store, setStore] = useState(storeLocation?.name || '');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [aisle, setAisle] = useState('');
  const [notes, setNotes] = useState('');
  const [addToList, setAddToList] = useState(true);
  const [keepGoing, setKeepGoing] = useState(true);
  const [loading, setLoading] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [useCamera, setUseCamera] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showNumpad, setShowNumpad] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nameBoxRef = useRef(null);

  /* ---------- open / store defaults ---------- */
  useEffect(() => {
    if (isOpen) setStore(storeLocation?.name || '');
  }, [isOpen, storeLocation]);

  /* ---------- MDL product autofill ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const q = name.trim();
    if (q.length < 2) { setSuggestions([]); setSuggestOpen(false); return; }
    const t = setTimeout(async () => {
      const rows = await searchProducts(q, '', 8);
      setSuggestions(rows || []);
      setSuggestOpen((rows || []).length > 0);
    }, 200);
    return () => clearTimeout(t);
  }, [name, isOpen]);

  // close suggestion dropdown on outside press
  useEffect(() => {
    const h = (e) => {
      if (nameBoxRef.current && !nameBoxRef.current.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, []);

  const pickSuggestion = async (p) => {
    const itemName = p.product_name || p.name || p.item_name || '';
    setName(itemName);
    setSuggestOpen(false);
    // autofill price from the MDL estimate (personal > state > global > catalog)
    if (!price) {
      const est = await getPriceEstimate(itemName);
      const val = est?.price ?? est?.average_price ?? est?.estimate;
      if (val != null) setPrice(String(val));
    }
  };

  /* ---------- camera ---------- */
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showError('Camera not available on this device');
      return;
    }
    try {
      // modest resolution — faster preview, smaller captures
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setUseCamera(true); // mount <video> first, stream attaches in the effect below
    } catch (err) {
      console.error('Camera error:', err);
      showError('Could not access camera. Check permissions.');
    }
  };

  // attach the stream once the <video> element is mounted
  useEffect(() => {
    if (useCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [useCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setUseCamera(false);
  }, []);

  // kill the stream whenever the modal closes or unmounts
  useEffect(() => { if (!isOpen) stopCamera(); }, [isOpen, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  /** Downscale any frame source to MAX_IMG_PX before preview/attach. */
  const downscaleToBlob = (source, w, h, done) => {
    const canvas = canvasRef.current;
    const scale = Math.min(1, MAX_IMG_PX / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(done, 'image/jpeg', 0.7);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    downscaleToBlob(video, video.videoWidth, video.videoHeight, (blob) => {
      if (!blob) return;
      setImagePreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      stopCamera();
      info('Photo captured — type the price from the tag');
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError('Image must be under 10MB'); return; }
    const url = URL.createObjectURL(file);
    const imgEl = new Image();
    imgEl.onload = () => {
      URL.revokeObjectURL(url);
      downscaleToBlob(imgEl, imgEl.naturalWidth, imgEl.naturalHeight, (blob) => {
        if (blob) setImagePreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      });
    };
    imgEl.src = url;
    e.target.value = '';
  };

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const priceVal = parseFloat(price);
    if (!name.trim()) { showError('Item name is required'); return; }
    if (!(priceVal > 0)) { showError('Enter a valid price'); return; }

    setLoading(true);
    try {
      await onSubmit({
        itemName: name.trim(),
        price: priceVal,
        store: store || null,
        aisleNumber: aisle.trim() || null,
        notes: notes.trim() || null,
      });

      if (addToList && onAddToList) {
        await onAddToList({
          itemName: name.trim(),
          quantity: 1,
          price: priceVal,
          category: '',
          notes: notes.trim(),
        });
      }

      success(isBetaTester ? 'Saved — +1 beta contribution' : `Price learned for ${name.trim()}`);

      // reset the quick fields; store + toggles stick for the next item
      setName(''); setPrice(''); setAisle(''); setNotes('');
      setImagePreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
      if (!keepGoing) { stopCamera(); onClose(); } else { info('Ready for the next item'); }
    } catch (err) {
      console.error('Error submitting price:', err);
      showError('Failed to save price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const close = () => { stopCamera(); onClose(); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm" onClick={close}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            <div>
              <h2 className="font-bold text-lg leading-tight">Learn a Price</h2>
              <p className="text-[11px] text-white/80">
                {isBetaTester ? 'Counts toward your beta contribution score' : 'Improves price predictions for everyone'}
              </p>
            </div>
          </div>
          <button onClick={close} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatedScrollbar3D className="flex-1 min-h-0" maxHeight="calc(92vh - 68px)">
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Store — auto-filled from the list's store, editable */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Store</label>
              <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select value={store} onChange={(e) => setStore(e.target.value)} className="input-field pl-9 text-sm appearance-none">
                  <option value="">No store</option>
                  {store && !STORES.includes(store) && <option value={store}>{store}</option>}
                  {STORES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Item name + MDL autofill */}
            <div ref={nameBoxRef} className="relative">
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Item *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
                className="input-field text-sm"
                placeholder="e.g. Organic Bananas"
                autoFocus
              />
              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((p, i) => {
                    const pname = p.product_name || p.name || p.item_name;
                    const pprice = p.average_price ?? p.price;
                    return (
                      <button
                        key={p.id ?? `${pname}-${i}`}
                        type="button"
                        onClick={() => pickSuggestion(p)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                      >
                        <span className="truncate">{pname}</span>
                        {pprice != null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${Number(pprice).toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price + numpad hybrid */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                  onFocus={() => device !== 'desktop' && setShowNumpad(true)}
                  className="input-field pl-7 pr-10 text-lg font-bold"
                  placeholder="3.99"
                />
                <button
                  type="button"
                  onClick={() => setShowNumpad(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Open numpad"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick aisle — optional, can be set later */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                Aisle <span className="font-normal text-gray-400">(optional — can set later)</span>
              </label>
              <input
                type="text"
                value={aisle}
                onChange={(e) => setAisle(e.target.value)}
                className="input-field text-sm"
                placeholder="e.g. 5"
              />
            </div>

            {/* Photo — optional reference shot of the price tag */}
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2.5">
              {!useCamera && !imagePreview && (
                <div className="flex gap-2">
                  <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                    <Camera className="w-4 h-4" /> Photo of tag
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                    <Package className="w-4 h-4" /> Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                </div>
              )}
              {useCamera && (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black max-h-48 object-cover" />
                  <div className="flex gap-2">
                    <button type="button" onClick={capturePhoto} className="flex-1 px-3 py-2 rounded-lg text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-medium">Capture</button>
                    <button type="button" onClick={stopCamera} className="px-3 py-2 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                  </div>
                </div>
              )}
              {imagePreview && (
                <div className="space-y-2">
                  <img src={imagePreview} alt="Price tag" className="w-full rounded-lg max-h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview((o) => { if (o) URL.revokeObjectURL(o); return null; })}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Quick toggles */}
            <div className="flex gap-2">
              {onAddToList && (
                <label className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 cursor-pointer">
                  <input type="checkbox" checked={addToList} onChange={(e) => setAddToList(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Add to list</span>
                </label>
              )}
              <label className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 cursor-pointer">
                <input type="checkbox" checked={keepGoing} onChange={(e) => setKeepGoing(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs font-medium text-green-800 dark:text-green-200">Scan next item</span>
              </label>
            </div>

            {/* Notes */}
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field text-sm"
              placeholder="Notes (optional — brand, size, sale…)"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? 'Saving…' : <><Check className="w-4 h-4" /> Save Price</>}
            </button>
          </form>
        </AnimatedScrollbar3D>
      </motion.div>

      {/* Price numpad — same quick-entry pad as the add-item price field */}
      {showNumpad && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0" onClick={() => setShowNumpad(false)} />
          <div className="relative z-[101]">
            <CustomNumberPad
              value={price}
              onChange={(v) => setPrice(v)}
              device={device}
              onSave={() => setShowNumpad(false)}
              onCancel={() => setShowNumpad(false)}
              maxDigits={6}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceLearningModal;
