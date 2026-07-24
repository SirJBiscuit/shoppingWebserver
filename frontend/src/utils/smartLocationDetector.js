/**
 * Smart Location Detector
 * Automatically determines the best storage location for food items
 * Learns from user preferences over time
 */

const LOCATION_RULES = {
  fridge: {
    keywords: [
      // Dairy
      'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese',
      'cheddar', 'mozzarella', 'parmesan', 'brie', 'feta', 'ricotta',
      
      // Produce (fresh)
      'lettuce', 'spinach', 'kale', 'arugula', 'cabbage', 'broccoli', 'cauliflower',
      'carrots', 'celery', 'cucumber', 'bell pepper', 'peppers', 'tomato', 'tomatoes',
      'berries', 'strawberries', 'blueberries', 'raspberries', 'grapes',
      'apple', 'apples', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes',
      
      // Beverages
      'juice', 'orange juice', 'apple juice', 'soda', 'beer', 'wine', 'champagne',
      
      // Condiments
      'ketchup', 'mustard', 'mayo', 'mayonnaise', 'salad dressing', 'ranch',
      'bbq sauce', 'hot sauce', 'soy sauce', 'teriyaki', 'salsa', 'hummus',
      'pickles', 'relish', 'jam', 'jelly', 'peanut butter',
      
      // Proteins
      'eggs', 'bacon', 'ham', 'deli meat', 'turkey', 'chicken breast',
      
      // Leftovers
      'leftover', 'leftovers', 'meal prep'
    ],
    
    subCategories: {
      'Top Shelf': ['leftover', 'leftovers', 'meal prep', 'ready to eat'],
      'Middle Shelf': ['milk', 'juice', 'yogurt', 'cheese', 'butter'],
      'Bottom Shelf': ['raw meat', 'chicken', 'beef', 'pork', 'fish'],
      'Door': ['ketchup', 'mustard', 'mayo', 'salad dressing', 'soda', 'beer'],
      'Crisper': ['lettuce', 'spinach', 'carrots', 'celery', 'cucumber', 'berries', 'apple', 'orange']
    }
  },
  
  freezer: {
    keywords: [
      // Frozen meals
      'frozen', 'ice cream', 'popsicle', 'popsicles', 'frozen pizza', 'frozen dinner',
      'frozen meal', 'tv dinner', 'hot pocket',
      
      // Frozen vegetables
      'frozen vegetables', 'frozen peas', 'frozen corn', 'frozen broccoli',
      'frozen green beans', 'frozen mixed vegetables',
      
      // Smoothie ingredients
      'frozen fruit', 'frozen berries', 'frozen banana', 'frozen mango',
      'protein powder', 'smoothie mix',
      
      // Meat (long-term)
      'frozen chicken', 'frozen beef', 'frozen pork', 'frozen fish',
      'ground beef', 'steak', 'chicken thighs',
      
      // Frozen treats
      'ice', 'ice cubes', 'frozen yogurt', 'gelato', 'sorbet'
    ],
    
    subCategories: {
      'Top Drawer': ['ice cream', 'popsicle', 'frozen yogurt', 'gelato', 'sorbet'],
      'Middle Drawer': ['frozen meal', 'frozen pizza', 'frozen vegetables', 'frozen fruit'],
      'Bottom Drawer': ['frozen chicken', 'frozen beef', 'frozen pork', 'frozen fish', 'ground beef', 'steak']
    }
  },
  
  pantry: {
    keywords: [
      // Canned goods
      'canned', 'can', 'soup', 'beans', 'tomato sauce', 'tomato paste',
      'canned vegetables', 'canned fruit', 'tuna', 'chicken noodle',
      
      // Grains & Pasta
      'pasta', 'spaghetti', 'penne', 'macaroni', 'rice', 'quinoa', 'couscous',
      'noodles', 'ramen', 'cereal', 'oatmeal', 'granola',
      
      // Snacks
      'chips', 'crackers', 'pretzels', 'popcorn', 'cookies', 'candy',
      'chocolate', 'nuts', 'trail mix', 'granola bar',
      
      // Baking
      'flour', 'sugar', 'brown sugar', 'baking soda', 'baking powder',
      'vanilla extract', 'cocoa powder', 'chocolate chips',
      
      // Spices & Oils
      'salt', 'pepper', 'garlic powder', 'onion powder', 'paprika',
      'cinnamon', 'oregano', 'basil', 'thyme', 'cumin',
      'olive oil', 'vegetable oil', 'canola oil', 'vinegar',
      
      // Condiments (shelf-stable)
      'honey', 'maple syrup', 'peanut butter', 'nutella',
      
      // Beverages (shelf-stable)
      'coffee', 'tea', 'hot chocolate', 'protein shake'
    ],
    
    subCategories: {
      'Top Shelf': ['special occasion', 'rarely used', 'baking supplies'],
      'Eye Level': ['cereal', 'pasta', 'rice', 'snacks', 'coffee', 'tea'],
      'Bottom Shelf': ['canned goods', 'flour', 'sugar', 'oil', 'vinegar', 'bulk items']
    }
  }
};

/**
 * Detect the best storage location for an item
 * @param {string} itemName - Name of the item
 * @param {string} category - Category of the item (optional)
 * @returns {object} - { location, subCategory, confidence }
 */
export const detectLocation = (itemName, category = '') => {
  const searchText = `${itemName} ${category}`.toLowerCase();
  const scores = { fridge: 0, freezer: 0, pantry: 0 };
  let detectedSubCategory = null;
  
  // Check each location's keywords
  Object.keys(LOCATION_RULES).forEach(location => {
    const rules = LOCATION_RULES[location];
    
    // Check main keywords
    rules.keywords.forEach(keyword => {
      if (searchText.includes(keyword.toLowerCase())) {
        scores[location] += 1;
        
        // Check sub-categories
        if (!detectedSubCategory) {
          Object.keys(rules.subCategories).forEach(subCat => {
            if (rules.subCategories[subCat].some(sub => searchText.includes(sub.toLowerCase()))) {
              detectedSubCategory = subCat;
            }
          });
        }
      }
    });
  });
  
  // Find location with highest score
  const maxScore = Math.max(...Object.values(scores));
  const detectedLocation = Object.keys(scores).find(loc => scores[loc] === maxScore);
  
  // Calculate confidence (0-100)
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.round((maxScore / totalScore) * 100) : 0;
  
  return {
    location: detectedLocation || 'pantry', // Default to pantry
    subCategory: detectedSubCategory,
    confidence,
    allScores: scores
  };
};

/**
 * Get category-based suggestions
 */
export const getCategorySuggestions = (category) => {
  const categoryMap = {
    'Dairy & Eggs': 'fridge',
    'Meat & Seafood': 'fridge',
    'Produce': 'fridge',
    'Frozen Foods': 'freezer',
    'Bakery & Bread': 'pantry',
    'Canned & Jarred': 'pantry',
    'Grains & Pasta': 'pantry',
    'Spices & Seasonings': 'pantry',
    'Snacks & Sweets': 'pantry',
    'Beverages': 'pantry',
    'Condiments & Sauces': 'fridge',
    'Leftovers': 'fridge'
  };
  
  return categoryMap[category] || 'pantry';
};

/**
 * Get icon for location
 */
export const getLocationIcon = (location) => {
  const icons = {
    fridge: '🧊',
    freezer: '❄️',
    pantry: '🥫'
  };
  return icons[location] || '📦';
};

/**
 * Get color for location
 */
export const getLocationColor = (location) => {
  const colors = {
    fridge: '#3B82F6', // Blue
    freezer: '#06B6D4', // Cyan
    pantry: '#F59E0B'  // Amber
  };
  return colors[location] || '#6B7280';
};

export default {
  detectLocation,
  getCategorySuggestions,
  getLocationIcon,
  getLocationColor,
  LOCATION_RULES
};
