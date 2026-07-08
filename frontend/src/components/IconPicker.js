import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

// Comprehensive icon library organized by category
const ICON_LIBRARY = {
  'Fruits': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑'],
  'Vegetables': ['🥬', '🥦', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫛', '🧄', '🧅', '🥔', '🍠', '🫚', '🥗', '🥬'],
  'Meat & Seafood': ['🥩', '🍗', '🍖', '🥓', '🍤', '🦐', '🦞', '🦀', '🐟', '🐠', '🦑', '🍣'],
  'Dairy & Eggs': ['🥛', '🧈', '🧀', '🥚', '🍳'],
  'Bread & Bakery': ['🍞', '🥖', '🥯', '🥐', '🧇', '🥞', '🍰', '🎂', '🧁', '🥧', '🍪', '🍩', '🥨'],
  'Grains & Pasta': ['🍚', '🍝', '🍜', '🍲', '🥘', '🫓', '🌮', '🌯', '🥙', '🧆'],
  'Snacks': ['🍿', '🥜', '🌰', '🍫', '🍬', '🍭', '🍮', '🍯'],
  'Beverages': ['☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍾', '🍷', '🍺', '🍻', '🥂', '🧉', '💧'],
  'Condiments': ['🧂', '🫗', '🍯', '🥫'],
  'Frozen': ['🧊', '🍦', '🍨', '🧁'],
  'Cleaning': ['🧹', '🧺', '🧼', '🧽', '🧴', '🪣'],
  'Kitchen': ['🍴', '🥄', '🔪', '🥢', '🍽️', '🥣', '🥡', '🫙'],
  'Personal Care': ['🧴', '🧻', '🪒', '🪥', '🧽'],
  'Hot Items': ['🔥', '♨️', '🌶️'],
  'Cold Items': ['❄️', '🧊', '🥶'],
  'Other': ['📦', '🛒', '🏪', '🎁', '📋', '✨', '⭐', '💚', '💙', '❤️']
};

// Broad tags for categorization
const ITEM_TAGS = [
  { name: 'Food', icon: '🍽️', color: 'bg-green-100 text-green-800' },
  { name: 'Cold', icon: '❄️', color: 'bg-blue-100 text-blue-800' },
  { name: 'Hot', icon: '🔥', color: 'bg-red-100 text-red-800' },
  { name: 'Frozen', icon: '🧊', color: 'bg-cyan-100 text-cyan-800' },
  { name: 'Fresh', icon: '🌿', color: 'bg-green-100 text-green-800' },
  { name: 'Cleaning', icon: '🧹', color: 'bg-purple-100 text-purple-800' },
  { name: 'Kitchen', icon: '🍴', color: 'bg-orange-100 text-orange-800' },
  { name: 'Personal Care', icon: '🧴', color: 'bg-pink-100 text-pink-800' },
  { name: 'Household', icon: '🏠', color: 'bg-gray-100 text-gray-800' },
  { name: 'Beverage', icon: '🥤', color: 'bg-blue-100 text-blue-800' },
  { name: 'Snack', icon: '🍿', color: 'bg-yellow-100 text-yellow-800' },
  { name: 'Meat', icon: '🥩', color: 'bg-red-100 text-red-800' },
  { name: 'Produce', icon: '🥬', color: 'bg-green-100 text-green-800' },
  { name: 'Dairy', icon: '🥛', color: 'bg-blue-100 text-blue-800' },
  { name: 'Bakery', icon: '🍞', color: 'bg-amber-100 text-amber-800' }
];

const IconPicker = ({ currentIcon, currentTags = [], onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState(currentTags);

  const categories = ['All', ...Object.keys(ICON_LIBRARY)];

  const getFilteredIcons = () => {
    if (selectedCategory === 'All') {
      return Object.values(ICON_LIBRARY).flat();
    }
    return ICON_LIBRARY[selectedCategory] || [];
  };

  const handleIconSelect = (icon) => {
    onSelect(icon);
    onClose();
  };

  const toggleTag = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Icon</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-50 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Categories</h3>
          <div className="flex space-x-2 min-w-max pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '400px' }}>
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {getFilteredIcons().map((icon, index) => (
              <button
                key={index}
                onClick={() => handleIconSelect(icon)}
                className={`w-12 h-12 flex items-center justify-center text-3xl rounded-lg transition-all hover:bg-primary-100 dark:hover:bg-primary-900 hover:scale-110 ${
                  currentIcon === icon ? 'bg-primary-200 dark:bg-primary-800 ring-2 ring-primary-500' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                title={icon}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-end items-center">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconPicker;
export { ICON_LIBRARY, ITEM_TAGS };
