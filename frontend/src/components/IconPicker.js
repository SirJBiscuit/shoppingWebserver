import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

// Comprehensive icon library with keywords for search
const ICON_DATA = [
  // Fruits
  { icon: '🍎', keywords: ['apple', 'fruit', 'red', 'fresh'] },
  { icon: '🍊', keywords: ['orange', 'fruit', 'citrus', 'fresh'] },
  { icon: '🍋', keywords: ['lemon', 'fruit', 'citrus', 'yellow', 'fresh'] },
  { icon: '🍌', keywords: ['banana', 'fruit', 'yellow', 'fresh'] },
  { icon: '🍉', keywords: ['watermelon', 'fruit', 'melon', 'fresh'] },
  { icon: '🍇', keywords: ['grapes', 'fruit', 'purple', 'fresh'] },
  { icon: '🍓', keywords: ['strawberry', 'berry', 'fruit', 'red', 'fresh'] },
  { icon: '🫐', keywords: ['blueberry', 'berry', 'fruit', 'blue', 'fresh'] },
  { icon: '🍈', keywords: ['melon', 'fruit', 'cantaloupe', 'fresh'] },
  { icon: '🍒', keywords: ['cherry', 'fruit', 'red', 'fresh'] },
  { icon: '🍑', keywords: ['peach', 'fruit', 'fresh'] },
  { icon: '🥭', keywords: ['mango', 'fruit', 'tropical', 'fresh'] },
  { icon: '🍍', keywords: ['pineapple', 'fruit', 'tropical', 'fresh'] },
  { icon: '🥥', keywords: ['coconut', 'fruit', 'tropical', 'fresh'] },
  { icon: '🥝', keywords: ['kiwi', 'fruit', 'green', 'fresh'] },
  { icon: '🍅', keywords: ['tomato', 'vegetable', 'red', 'fresh', 'produce'] },
  { icon: '🥑', keywords: ['avocado', 'fruit', 'green', 'fresh'] },
  
  // Vegetables
  { icon: '🥬', keywords: ['lettuce', 'vegetable', 'green', 'leafy', 'salad', 'fresh', 'produce'] },
  { icon: '🥦', keywords: ['broccoli', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🥒', keywords: ['cucumber', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🌶️', keywords: ['pepper', 'chili', 'hot', 'spicy', 'vegetable', 'fresh'] },
  { icon: '🫑', keywords: ['bell pepper', 'pepper', 'vegetable', 'fresh', 'produce'] },
  { icon: '🌽', keywords: ['corn', 'vegetable', 'yellow', 'fresh', 'produce'] },
  { icon: '🥕', keywords: ['carrot', 'vegetable', 'orange', 'fresh', 'produce'] },
  { icon: '🫛', keywords: ['peas', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🧄', keywords: ['garlic', 'vegetable', 'seasoning', 'fresh'] },
  { icon: '🧅', keywords: ['onion', 'vegetable', 'fresh', 'produce'] },
  { icon: '🥔', keywords: ['potato', 'vegetable', 'fresh', 'produce'] },
  { icon: '🍠', keywords: ['sweet potato', 'yam', 'vegetable', 'fresh', 'produce'] },
  { icon: '🫚', keywords: ['ginger', 'root', 'spice', 'fresh'] },
  { icon: '🥗', keywords: ['salad', 'fresh', 'healthy', 'vegetable'] },
  { icon: '🍄', keywords: ['mushroom', 'vegetable', 'fresh', 'produce'] },
  
  // Meat & Seafood
  { icon: '🥩', keywords: ['meat', 'steak', 'beef', 'red meat', 'protein'] },
  { icon: '🍗', keywords: ['chicken', 'poultry', 'meat', 'drumstick', 'protein'] },
  { icon: '🍖', keywords: ['meat', 'bone', 'ribs', 'protein'] },
  { icon: '🥓', keywords: ['bacon', 'pork', 'meat', 'breakfast', 'protein'] },
  { icon: '🍤', keywords: ['shrimp', 'seafood', 'protein'] },
  { icon: '🦐', keywords: ['shrimp', 'seafood', 'protein'] },
  { icon: '🦞', keywords: ['lobster', 'seafood', 'protein'] },
  { icon: '🦀', keywords: ['crab', 'seafood', 'protein'] },
  { icon: '🐟', keywords: ['fish', 'seafood', 'protein'] },
  { icon: '🐠', keywords: ['fish', 'seafood', 'protein'] },
  { icon: '🦑', keywords: ['squid', 'seafood', 'protein'] },
  { icon: '🍣', keywords: ['sushi', 'fish', 'seafood', 'japanese'] },
  { icon: '🌭', keywords: ['hot dog', 'sausage', 'meat'] },
  { icon: '🍔', keywords: ['burger', 'hamburger', 'meat', 'beef'] },
  
  // Dairy & Eggs
  { icon: '🥛', keywords: ['milk', 'dairy', 'beverage', 'drink'] },
  { icon: '🧈', keywords: ['butter', 'dairy', 'spread'] },
  { icon: '🧀', keywords: ['cheese', 'dairy'] },
  { icon: '🥚', keywords: ['egg', 'protein', 'breakfast'] },
  { icon: '🍳', keywords: ['egg', 'fried', 'breakfast', 'cooking'] },
  
  // Bread & Bakery
  { icon: '🍞', keywords: ['bread', 'bakery', 'loaf'] },
  { icon: '🥖', keywords: ['baguette', 'bread', 'french', 'bakery'] },
  { icon: '🥯', keywords: ['bagel', 'bread', 'bakery', 'breakfast'] },
  { icon: '🥐', keywords: ['croissant', 'bread', 'bakery', 'french', 'breakfast'] },
  { icon: '🧇', keywords: ['waffle', 'breakfast', 'bakery'] },
  { icon: '🥞', keywords: ['pancake', 'breakfast', 'bakery'] },
  { icon: '🍰', keywords: ['cake', 'dessert', 'bakery', 'sweet'] },
  { icon: '🎂', keywords: ['cake', 'birthday', 'dessert', 'bakery', 'sweet'] },
  { icon: '🧁', keywords: ['cupcake', 'dessert', 'bakery', 'sweet'] },
  { icon: '🥧', keywords: ['pie', 'dessert', 'bakery', 'sweet'] },
  { icon: '🍪', keywords: ['cookie', 'dessert', 'bakery', 'sweet', 'snack'] },
  { icon: '🍩', keywords: ['donut', 'doughnut', 'dessert', 'bakery', 'sweet'] },
  { icon: '🥨', keywords: ['pretzel', 'snack', 'bakery'] },
  
  // Grains, Pasta & Dry Goods
  { icon: '🍚', keywords: ['rice', 'grain', 'dry goods', 'pantry'] },
  { icon: '🍝', keywords: ['pasta', 'spaghetti', 'noodles', 'dry goods', 'pantry'] },
  { icon: '🍜', keywords: ['noodles', 'ramen', 'soup', 'asian'] },
  { icon: '🍲', keywords: ['stew', 'soup', 'pot', 'cooking'] },
  { icon: '🥘', keywords: ['paella', 'rice', 'dish', 'cooking'] },
  { icon: '🫓', keywords: ['flatbread', 'bread', 'tortilla'] },
  { icon: '🌮', keywords: ['taco', 'mexican', 'tortilla'] },
  { icon: '🌯', keywords: ['burrito', 'wrap', 'mexican', 'tortilla'] },
  { icon: '🥙', keywords: ['pita', 'wrap', 'sandwich'] },
  { icon: '🧆', keywords: ['falafel', 'vegetarian'] },
  { icon: '🍕', keywords: ['pizza', 'italian', 'cheese'] },
  { icon: '🥗', keywords: ['salad', 'healthy', 'fresh'] },
  
  // Snacks & Sweets
  { icon: '🍿', keywords: ['popcorn', 'snack'] },
  { icon: '🥜', keywords: ['peanuts', 'nuts', 'snack', 'protein'] },
  { icon: '🌰', keywords: ['chestnut', 'nuts', 'snack'] },
  { icon: '🍫', keywords: ['chocolate', 'candy', 'sweet', 'snack'] },
  { icon: '🍬', keywords: ['candy', 'sweet', 'snack'] },
  { icon: '🍭', keywords: ['lollipop', 'candy', 'sweet', 'snack'] },
  { icon: '🍮', keywords: ['pudding', 'custard', 'dessert', 'sweet'] },
  { icon: '🍯', keywords: ['honey', 'sweet', 'condiment'] },
  { icon: '🍦', keywords: ['ice cream', 'dessert', 'frozen', 'sweet'] },
  { icon: '🍨', keywords: ['ice cream', 'dessert', 'frozen', 'sweet'] },
  { icon: '🍧', keywords: ['shaved ice', 'dessert', 'frozen', 'sweet'] },
  
  // Beverages
  { icon: '☕', keywords: ['coffee', 'beverage', 'drink', 'hot', 'caffeine'] },
  { icon: '🍵', keywords: ['tea', 'beverage', 'drink', 'hot'] },
  { icon: '🧃', keywords: ['juice box', 'juice', 'beverage', 'drink'] },
  { icon: '🥤', keywords: ['soda', 'drink', 'beverage', 'cup'] },
  { icon: '🧋', keywords: ['bubble tea', 'boba', 'drink', 'beverage'] },
  { icon: '🍶', keywords: ['sake', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍾', keywords: ['champagne', 'wine', 'alcohol', 'beverage'] },
  { icon: '🍷', keywords: ['wine', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍺', keywords: ['beer', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍻', keywords: ['beer', 'cheers', 'alcohol', 'beverage'] },
  { icon: '🥂', keywords: ['champagne', 'cheers', 'alcohol', 'beverage'] },
  { icon: '🧉', keywords: ['mate', 'tea', 'beverage', 'drink'] },
  { icon: '💧', keywords: ['water', 'drink', 'beverage', 'hydration'] },
  { icon: '🥛', keywords: ['milk', 'dairy', 'beverage', 'drink'] },
  
  // Condiments & Canned Goods
  { icon: '🧂', keywords: ['salt', 'seasoning', 'condiment', 'spice'] },
  { icon: '🫗', keywords: ['pour', 'liquid', 'oil', 'sauce'] },
  { icon: '🍯', keywords: ['honey', 'sweet', 'condiment', 'spread'] },
  { icon: '🥫', keywords: ['can', 'canned', 'soup', 'food', 'pantry'] },
  { icon: '🫙', keywords: ['jar', 'container', 'storage', 'pantry'] },
  
  // Frozen Foods
  { icon: '🧊', keywords: ['ice', 'frozen', 'cold'] },
  { icon: '🍦', keywords: ['ice cream', 'frozen', 'dessert', 'sweet'] },
  { icon: '🍨', keywords: ['ice cream', 'frozen', 'dessert', 'sweet'] },
  { icon: '❄️', keywords: ['frozen', 'cold', 'ice', 'freeze'] },
  
  // Cleaning Supplies
  { icon: '🧹', keywords: ['broom', 'cleaning', 'sweep', 'household'] },
  { icon: '🧺', keywords: ['basket', 'laundry', 'cleaning', 'household'] },
  { icon: '🧼', keywords: ['soap', 'cleaning', 'wash', 'hygiene'] },
  { icon: '🧽', keywords: ['sponge', 'cleaning', 'wash', 'dishes'] },
  { icon: '🧴', keywords: ['bottle', 'soap', 'lotion', 'cleaning', 'personal care'] },
  { icon: '🪣', keywords: ['bucket', 'cleaning', 'household'] },
  { icon: '🧻', keywords: ['toilet paper', 'paper', 'bathroom', 'household'] },
  { icon: '🗑️', keywords: ['trash', 'garbage', 'bin', 'waste'] },
  
  // Kitchen Items
  { icon: '🍴', keywords: ['fork', 'knife', 'utensils', 'kitchen', 'cutlery'] },
  { icon: '🥄', keywords: ['spoon', 'utensil', 'kitchen', 'cutlery'] },
  { icon: '🔪', keywords: ['knife', 'kitchen', 'cooking', 'cutlery'] },
  { icon: '🥢', keywords: ['chopsticks', 'utensils', 'kitchen', 'asian'] },
  { icon: '🍽️', keywords: ['plate', 'dish', 'kitchen', 'dining'] },
  { icon: '🥣', keywords: ['bowl', 'dish', 'kitchen', 'dining'] },
  { icon: '🥡', keywords: ['takeout', 'box', 'container', 'food'] },
  { icon: '🫙', keywords: ['jar', 'container', 'storage', 'kitchen'] },
  { icon: '🍳', keywords: ['pan', 'cooking', 'kitchen', 'frying'] },
  
  // Personal Care
  { icon: '🧴', keywords: ['lotion', 'soap', 'shampoo', 'personal care', 'hygiene'] },
  { icon: '🧻', keywords: ['toilet paper', 'tissue', 'paper', 'bathroom'] },
  { icon: '🪒', keywords: ['razor', 'shaving', 'personal care', 'grooming'] },
  { icon: '🪥', keywords: ['toothbrush', 'dental', 'hygiene', 'personal care'] },
  { icon: '🧽', keywords: ['sponge', 'bath', 'cleaning', 'personal care'] },
  { icon: '🧼', keywords: ['soap', 'hand soap', 'hygiene', 'personal care'] },
  { icon: '🪮', keywords: ['comb', 'hair', 'grooming', 'personal care'] },
  
  // Temperature Indicators
  { icon: '🔥', keywords: ['hot', 'fire', 'heat', 'spicy', 'warm'] },
  { icon: '♨️', keywords: ['hot', 'steam', 'heat', 'warm'] },
  { icon: '❄️', keywords: ['cold', 'frozen', 'ice', 'freeze'] },
  { icon: '🧊', keywords: ['ice', 'cold', 'frozen', 'freeze'] },
  { icon: '🥶', keywords: ['cold', 'frozen', 'freeze'] },
  
  // General & Other
  { icon: '📦', keywords: ['box', 'package', 'delivery', 'storage'] },
  { icon: '🛒', keywords: ['cart', 'shopping', 'store', 'grocery'] },
  { icon: '🏪', keywords: ['store', 'shop', 'convenience', 'market'] },
  { icon: '🎁', keywords: ['gift', 'present', 'box', 'wrapped'] },
  { icon: '📋', keywords: ['list', 'clipboard', 'notes', 'checklist'] },
  { icon: '✨', keywords: ['sparkle', 'clean', 'new', 'special'] },
  { icon: '⭐', keywords: ['star', 'favorite', 'special', 'important'] },
  { icon: '💚', keywords: ['heart', 'green', 'love', 'favorite'] },
  { icon: '💙', keywords: ['heart', 'blue', 'love', 'favorite'] },
  { icon: '❤️', keywords: ['heart', 'red', 'love', 'favorite'] },
  { icon: '🏠', keywords: ['home', 'house', 'household'] },
  { icon: '🌿', keywords: ['herb', 'plant', 'fresh', 'organic', 'green'] },
  { icon: '🥄', keywords: ['spoon', 'utensil', 'kitchen'] },
  { icon: '🍶', keywords: ['bottle', 'container', 'drink'] },
  { icon: '🧃', keywords: ['juice', 'drink', 'box', 'beverage'] }
];

// Organize icons by category for browsing
const ICON_LIBRARY = {
  'All': ICON_DATA.map(item => item.icon),
  'Fruits': ICON_DATA.filter(item => item.keywords.includes('fruit')).map(item => item.icon),
  'Vegetables': ICON_DATA.filter(item => item.keywords.includes('vegetable') || item.keywords.includes('produce')).map(item => item.icon),
  'Meat & Seafood': ICON_DATA.filter(item => item.keywords.includes('meat') || item.keywords.includes('seafood') || item.keywords.includes('protein')).map(item => item.icon),
  'Dairy & Eggs': ICON_DATA.filter(item => item.keywords.includes('dairy') || item.keywords.includes('egg')).map(item => item.icon),
  'Bread & Bakery': ICON_DATA.filter(item => item.keywords.includes('bread') || item.keywords.includes('bakery')).map(item => item.icon),
  'Grains & Pasta': ICON_DATA.filter(item => item.keywords.includes('grain') || item.keywords.includes('pasta') || item.keywords.includes('rice') || item.keywords.includes('noodles')).map(item => item.icon),
  'Snacks & Sweets': ICON_DATA.filter(item => item.keywords.includes('snack') || item.keywords.includes('sweet') || item.keywords.includes('candy') || item.keywords.includes('dessert')).map(item => item.icon),
  'Beverages': ICON_DATA.filter(item => item.keywords.includes('beverage') || item.keywords.includes('drink')).map(item => item.icon),
  'Condiments': ICON_DATA.filter(item => item.keywords.includes('condiment') || item.keywords.includes('sauce') || item.keywords.includes('seasoning')).map(item => item.icon),
  'Frozen': ICON_DATA.filter(item => item.keywords.includes('frozen')).map(item => item.icon),
  'Cleaning': ICON_DATA.filter(item => item.keywords.includes('cleaning')).map(item => item.icon),
  'Kitchen': ICON_DATA.filter(item => item.keywords.includes('kitchen') || item.keywords.includes('utensil') || item.keywords.includes('cooking')).map(item => item.icon),
  'Personal Care': ICON_DATA.filter(item => item.keywords.includes('personal care') || item.keywords.includes('hygiene')).map(item => item.icon),
  'Household': ICON_DATA.filter(item => item.keywords.includes('household')).map(item => item.icon)
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
    let icons = [];
    
    // Get icons from selected category
    if (selectedCategory === 'All') {
      icons = ICON_DATA.map(item => item.icon);
    } else {
      icons = ICON_LIBRARY[selectedCategory] || [];
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchedIcons = ICON_DATA
        .filter(item => 
          item.keywords.some(keyword => keyword.includes(search)) ||
          item.icon.includes(searchTerm)
        )
        .map(item => item.icon);
      
      // Return intersection of category and search results
      if (selectedCategory === 'All') {
        return matchedIcons;
      }
      return icons.filter(icon => matchedIcons.includes(icon));
    }
    
    return icons;
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
