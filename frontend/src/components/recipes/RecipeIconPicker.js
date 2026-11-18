import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link, Smile } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';

// Preset food emoji the user can tap to set as the recipe icon.
const PRESETS = [
  '🍳','🥞','🧇','🍩','🥐','🥯','🍞','🥓','🧀','🍔','🍟','🌭','🥪','🌮','🌯',
  '🥙','🧆','🍕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍚','🥗','🥘',
  '🫕','🍢','🍡','🍰','🧁','🎂','🍮','🍭','🍬','🍫','🍪','🍦','🍨','🥧',
  '🥤','🧋','🧃','🍹','🍸','☕','🫖','🍵','🥛','🍺','🍷','🥣','🥩','🍗',
  '🍖','🐟','🦐','🥦','🥕','🌽','🥑','🍅','🥒','🫑','🍆','🧄','🧅','🍋',
];

/**
 * RecipeIconPicker — modal to set a recipe's icon/image.
 * Emits an image_url-style value: 'emoji:X' for emojis, or a URL/data URL
 * for images. Caller PATCHes the recipe.
 */
const RecipeIconPicker = ({ isOpen, onClose, onPick, current }) => {
  const fileRef = useRef(null);
  const [urlText, setUrlText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const pickEmoji = (e) => {
    onPick(`emoji:${e}`);
    onClose();
  };

  const applyUrl = () => {
    const u = urlText.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u) && !u.startsWith('data:image')) {
      setError('Enter a full image URL (https://...)');
      return;
    }
    onPick(u);
    setUrlText('');
    setError('');
    onClose();
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onPick(reader.result); // data URL — stored in image_url (TEXT column)
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }} transition={{ type: 'spring', damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Smile className="w-5 h-5 text-primary-500" /> Recipe icon
              </h3>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Emoji</p>
                <div className="grid grid-cols-8 gap-1">
                  {PRESETS.map((e) => (
                    <button
                      key={e}
                      onClick={() => pickEmoji(e)}
                      className={`text-2xl p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors ${
                        current === `emoji:${e}` ? 'bg-primary-100 dark:bg-primary-900/50 ring-2 ring-primary-500' : ''
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Link className="w-3 h-3" /> Image URL
                </p>
                <div className="flex gap-2">
                  <input
                    value={urlText}
                    onChange={(e) => { setUrlText(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
                    placeholder="https://example.com/photo.jpg"
                    className="input-field flex-1 text-sm"
                  />
                  <button onClick={applyUrl} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700">
                    Set
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Upload image
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                >
                  Choose an image (max 2 MB)
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

export default RecipeIconPicker;
