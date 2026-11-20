import { useState, useEffect, useRef } from 'react';
import { X, Search, ImagePlus, Loader2 } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';
import { normalizeIconFile, uploadIcon, fetchCustomIcons } from '../../utils/iconUpload';

/**
 * IconPicker - Modal for selecting item icons
 * Shows all available icons in a searchable grid, plus the user's uploaded
 * custom icons and an upload control (any image; >128×128 auto-downscales).
 */
const IconPicker = ({ isOpen, onClose, onSelect, currentIcon }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customIcons, setCustomIcons] = useState([]);
  const [upload, setUpload] = useState({ state: 'idle', msg: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) fetchCustomIcons().then(setCustomIcons);
  }, [isOpen]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload({ state: 'uploading', msg: '' });
    try {
      const payload = await normalizeIconFile(file);
      const img = await uploadIcon(
        payload,
        file.name.replace(/\.[a-z]+$/i, '') + '.png',
        () => {}
      );
      setCustomIcons((prev) => [img, ...prev]);
      setUpload({ state: 'idle', msg: '' });
      onSelect(img.image_url);
      onClose();
    } catch (err) {
      setUpload({ state: 'error', msg: err.message || 'Upload failed' });
    } finally {
      e.target.value = '';
    }
  };

  // Comprehensive icon library organized by category
  const iconLibrary = {
    'Produce': [
      { emoji: '🍎', name: 'Apple' },
      { emoji: '🍊', name: 'Orange' },
      { emoji: '🍋', name: 'Lemon' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🍉', name: 'Watermelon' },
      { emoji: '🍇', name: 'Grapes' },
      { emoji: '🍓', name: 'Strawberry' },
      { emoji: '🫐', name: 'Blueberries' },
      { emoji: '🍑', name: 'Peach' },
      { emoji: '🍒', name: 'Cherries' },
      { emoji: '🍍', name: 'Pineapple' },
      { emoji: '🥝', name: 'Kiwi' },
      { emoji: '🍅', name: 'Tomato' },
      { emoji: '🥑', name: 'Avocado' },
      { emoji: '🥦', name: 'Broccoli' },
      { emoji: '🥬', name: 'Lettuce' },
      { emoji: '🥒', name: 'Cucumber' },
      { emoji: '🌶️', name: 'Pepper' },
      { emoji: '🫑', name: 'Bell Pepper' },
      { emoji: '🌽', name: 'Corn' },
      { emoji: '🥕', name: 'Carrot' },
      { emoji: '🧄', name: 'Garlic' },
      { emoji: '🧅', name: 'Onion' },
      { emoji: '🥔', name: 'Potato' },
      { emoji: '🍠', name: 'Sweet Potato' },
    ],
    'Dairy & Eggs': [
      { emoji: '🥛', name: 'Milk' },
      { emoji: '🧈', name: 'Butter' },
      { emoji: '🧀', name: 'Cheese' },
      { emoji: '🥚', name: 'Egg' },
      { emoji: '🍦', name: 'Ice Cream' },
      { emoji: '🧊', name: 'Ice' },
    ],
    'Meat & Seafood': [
      { emoji: '🥩', name: 'Steak' },
      { emoji: '🍗', name: 'Chicken' },
      { emoji: '🍖', name: 'Meat' },
      { emoji: '🥓', name: 'Bacon' },
      { emoji: '🍤', name: 'Shrimp' },
      { emoji: '🦞', name: 'Lobster' },
      { emoji: '🦀', name: 'Crab' },
      { emoji: '🐟', name: 'Fish' },
      { emoji: '🐠', name: 'Tropical Fish' },
      { emoji: '🦑', name: 'Squid' },
    ],
    'Bakery & Bread': [
      { emoji: '🍞', name: 'Bread' },
      { emoji: '🥖', name: 'Baguette' },
      { emoji: '🥨', name: 'Pretzel' },
      { emoji: '🥯', name: 'Bagel' },
      { emoji: '🥐', name: 'Croissant' },
      { emoji: '🧁', name: 'Cupcake' },
      { emoji: '🍰', name: 'Cake' },
      { emoji: '🎂', name: 'Birthday Cake' },
      { emoji: '🥧', name: 'Pie' },
      { emoji: '🍪', name: 'Cookie' },
      { emoji: '🍩', name: 'Donut' },
    ],
    'Grains & Pasta': [
      { emoji: '🍚', name: 'Rice' },
      { emoji: '🍝', name: 'Pasta' },
      { emoji: '🍜', name: 'Noodles' },
      { emoji: '🥣', name: 'Cereal' },
      { emoji: '🌾', name: 'Wheat' },
    ],
    'Beverages': [
      { emoji: '☕', name: 'Coffee' },
      { emoji: '🍵', name: 'Tea' },
      { emoji: '🧃', name: 'Juice Box' },
      { emoji: '🥤', name: 'Soda' },
      { emoji: '🧋', name: 'Bubble Tea' },
      { emoji: '🍷', name: 'Wine' },
      { emoji: '🍺', name: 'Beer' },
      { emoji: '🥂', name: 'Champagne' },
      { emoji: '🍾', name: 'Bottle' },
      { emoji: '🧉', name: 'Mate' },
    ],
    'Snacks & Sweets': [
      { emoji: '🍫', name: 'Chocolate' },
      { emoji: '🍬', name: 'Candy' },
      { emoji: '🍭', name: 'Lollipop' },
      { emoji: '🍮', name: 'Pudding' },
      { emoji: '🍯', name: 'Honey' },
      { emoji: '🍿', name: 'Popcorn' },
      { emoji: '🥜', name: 'Peanuts' },
      { emoji: '🌰', name: 'Chestnut' },
    ],
    'Prepared Foods': [
      { emoji: '🍕', name: 'Pizza' },
      { emoji: '🍔', name: 'Burger' },
      { emoji: '🌭', name: 'Hot Dog' },
      { emoji: '🥪', name: 'Sandwich' },
      { emoji: '🌮', name: 'Taco' },
      { emoji: '🌯', name: 'Burrito' },
      { emoji: '🥙', name: 'Pita' },
      { emoji: '🍱', name: 'Bento' },
      { emoji: '🍛', name: 'Curry' },
      { emoji: '🍲', name: 'Stew' },
      { emoji: '🥘', name: 'Paella' },
      { emoji: '🍳', name: 'Fried Egg' },
      { emoji: '🥗', name: 'Salad' },
      { emoji: '🍟', name: 'Fries' },
    ],
    'Condiments & Sauces': [
      { emoji: '🧂', name: 'Salt' },
      { emoji: '🫙', name: 'Jar' },
      { emoji: '🍶', name: 'Sake' },
    ],
    'Other': [
      { emoji: '📦', name: 'Package' },
      { emoji: '🥫', name: 'Canned Food' },
      { emoji: '🍽️', name: 'Plate' },
      { emoji: '🥄', name: 'Spoon' },
      { emoji: '🔪', name: 'Knife' },
    ]
  };

  const categories = Object.keys(iconLibrary);
  
  // Flatten all icons for search
  const allIcons = categories.flatMap(category =>
    iconLibrary[category].map(icon => ({ ...icon, category }))
  );

  // Filter icons based on search and category
  const filteredIcons = allIcons.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         icon.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <Portal><div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose an Icon</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Custom uploaded icons + upload control */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={upload.state === 'uploading'}
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-500 flex-shrink-0 transition-colors disabled:opacity-50"
              title="Upload a custom icon — any image ≤128×128 works, larger images are auto-downscaled"
            >
              {upload.state === 'uploading'
                ? <Loader2 size={18} className="animate-spin" />
                : <ImagePlus size={18} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {customIcons.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => { onSelect(img.image_url); onClose(); }}
                title="Custom icon you uploaded"
                className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-1 transition-transform hover:scale-110 ${
                  currentIcon === img.image_url ? 'ring-blue-500' : 'ring-gray-200 dark:ring-gray-600'
                }`}
              >
                <img src={img.thumbnail_url || img.image_url} alt="custom icon" className="w-full h-full object-cover" />
              </button>
            ))}
            {customIcons.length === 0 && upload.state !== 'error' && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Upload your own icon — it becomes available in every picker
              </span>
            )}
            {upload.state === 'error' && (
              <span className="text-xs text-red-500">{upload.msg}</span>
            )}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredIcons.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No icons found
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {filteredIcons.map((icon, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(icon.emoji);
                    onClose();
                  }}
                  className={`aspect-square p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all hover:scale-110 ${
                    currentIcon === icon.emoji
                      ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                  title={icon.name}
                >
                  <div className="text-3xl">{icon.emoji}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredIcons.length} icons available
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div></Portal>
  );
};

export default IconPicker;
