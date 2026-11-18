import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Loader2, Wand2, StickyNote } from 'lucide-react';
import api from '../../services/api';
import { Portal } from '../../utils/autoPlacement';
import { playSound } from '../../utils/soundEffects';

/**
 * TasteRatingModal — "How was it?" after making a lab recipe.
 *
 * Captures a star rating, taste tags (too sweet / too thin / bland…),
 * how much was actually made, and a free note. Saving hits
 * POST /recipes/:id/rate; "Create improved recipe" additionally calls
 * POST /recipes/:id/variant which clones the recipe with adjusted
 * ingredient amounts — the variant lands in the lab's Can Create tab.
 *
 * Props:
 *  - recipe  : recipe object (or null to hide)
 *  - onClose : () => void
 *  - onSaved : () => void — parent reloads recipes/comparisons
 */

const TAGS = [
  { id: 'not-sweet-enough',   label: 'Needs sweeter' },
  { id: 'too-sweet',          label: 'Too sweet' },
  { id: 'too-thin',           label: 'Too thin / watery' },
  { id: 'too-thick',          label: 'Too thick' },
  { id: 'bland',              label: 'Bland' },
  { id: 'too-strong',         label: 'Too strong' },
  { id: 'wanted-more-protein',label: 'More protein' },
  { id: 'wanted-more-fruit',  label: 'More fruit' },
];

// Preview mirror of backend TASTE_RULES so the user sees the suggested
// tweaks before creating the improved variant
const SUGGEST = {
  'not-sweet-enough':    '＋ honey 1 tbsp',
  'too-sweet':           'halve the sweeteners',
  'too-thin':            '＋ banana ½ · ＋ oats 2 tbsp',
  'too-thick':           '＋ milk ½ cup',
  'bland':               '＋ vanilla ½ tsp · ＋ honey 1 tbsp',
  'too-strong':          '＋ milk ¼ cup',
  'wanted-more-protein': '＋ protein powder 1 scoop',
  'wanted-more-fruit':   '＋ mixed berries ½ cup',
};

const TasteRatingModal = ({ recipe, onClose, onSaved }) => {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [servings, setServings] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const toggleTag = (id) =>
    setTags((p) => (p.includes(id) ? p.filter((t) => t !== id) : [...p, id]));

  const suggestions = tags.map((t) => SUGGEST[t]).filter(Boolean);

  const saveRating = async () => {
    await api.post(`/recipes/${recipe.id}/rate`, {
      rating: rating || null,
      taste_tags: tags,
      note: note.trim() || null,
      servings_made: parseFloat(servings) || null,
    });
  };

  const submit = async (makeVariant) => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await saveRating();
      if (makeVariant) {
        await api.post(`/recipes/${recipe.id}/variant`, { taste_tags: tags });
        playSound('pop');
      } else {
        playSound('check');
      }
      onSaved && onSaved();
      onClose();
    } catch {
      setErr('Could not save — try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {recipe && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] bg-black/10 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                How was <span className="text-pink-600 dark:text-pink-400">{recipe.name}</span>?
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Stars */}
              <div className="flex items-center justify-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(rating === n ? 0 : n)}>
                    <Star
                      className={`w-8 h-8 transition-all ${
                        n <= rating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Taste tags */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">How did it taste?</p>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border-2 transition-colors ${
                        tags.includes(t.id)
                          ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-pink-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions preview */}
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-3 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500 dark:text-violet-400 mb-1">
                    Next time, try:
                  </p>
                  {suggestions.map((s) => (
                    <p key={s} className="text-[11px] text-violet-700 dark:text-violet-300">{s}</p>
                  ))}
                </motion.div>
              )}

              {/* How much did you put in */}
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex-1">How much did you make?</p>
                <input
                  type="number" min="0" step="0.5"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="servings"
                  className="w-24 px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* Note */}
              <div className="relative">
                <StickyNote className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Notes for next time (e.g. blend longer, more ice)…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 resize-none"
                />
              </div>

              {err && <p className="text-xs text-red-500">{err}</p>}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => submit(false)}
                  disabled={busy || (!rating && !tags.length && !note.trim())}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save feedback'}
                </button>
                <button
                  onClick={() => submit(true)}
                  disabled={busy}
                  title="Save feedback AND create an improved recipe with adjusted amounts — lands in Can Create"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-40 transition-colors"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Improved recipe
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TasteRatingModal;
