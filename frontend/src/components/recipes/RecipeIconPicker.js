import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Link, Smile } from 'lucide-react';
import ModalShell from '../ui/ModalShell';

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

  const title = (
    <span className="flex items-center gap-2">
      <Smile className="w-5 h-5 text-primary-500" /> Recipe icon
    </span>
  );

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md" bodyClass="p-4">
      <div className="space-y-4 max-h-[70vh]">
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
    </ModalShell>
  );
};

export default RecipeIconPicker;
