/**
 * Ingredient Classification System
 * Automatically determines storage location, temperature requirements, and visual indicators
 */

// Storage temperature classifications
export const StorageTemp = {
  FROZEN: 'frozen',      // -18°C to 0°C (0°F to 32°F)
  COLD: 'cold',          // 0°C to 4°C (32°F to 40°F)
  COOL: 'cool',          // 4°C to 15°C (40°F to 59°F)
  ROOM: 'room',          // 15°C to 25°C (59°F to 77°F)
  DRY: 'dry',            // Room temp, low humidity
  HOT: 'hot'             // Requires heating/cooking
};

// Item type classifications
export const ItemType = {
  PRODUCE: 'produce',
  DAIRY: 'dairy',
  MEAT: 'meat',
  SEAFOOD: 'seafood',
  FROZEN: 'frozen',
  BAKERY: 'bakery',
  GRAIN: 'grain',
  CANNED: 'canned',
  CONDIMENT: 'condiment',
  BEVERAGE: 'beverage',
  SNACK: 'snack',
  SPICE: 'spice',
  CHEMICAL: 'chemical',
  OTHER: 'other'
};

// Visual indicators for storage types
export const StorageIndicators = {
  [StorageTemp.FROZEN]: {
    icon: '❄️',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    label: 'Frozen',
    location: 'freezer'
  },
  [StorageTemp.COLD]: {
    icon: '🧊',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-300 dark:border-cyan-700',
    label: 'Refrigerated',
    location: 'fridge'
  },
  [StorageTemp.COOL]: {
    icon: '🌡️',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    label: 'Cool Storage',
    location: 'pantry'
  },
  [StorageTemp.ROOM]: {
    icon: '🏠',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    label: 'Room Temp',
    location: 'pantry'
  },
  [StorageTemp.DRY]: {
    icon: '🌾',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    label: 'Dry Storage',
    location: 'pantry'
  },
  [StorageTemp.HOT]: {
    icon: '🔥',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    label: 'Requires Cooking',
    location: 'pantry'
  }
};

// Comprehensive ingredient database
const ingredientDatabase = {
  // FROZEN ITEMS
  'frozen': {
    type: ItemType.FROZEN,
    temp: StorageTemp.FROZEN,
    keywords: ['frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen dinner', 'frozen vegetables', 'frozen fruit']
  },
  
  // DAIRY & EGGS (COLD)
  'milk': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['milk', 'whole milk', '2% milk', 'skim milk', 'almond milk', 'oat milk', 'soy milk'] },
  'cheese': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'swiss', 'brie', 'feta'] },
  'yogurt': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['yogurt', 'greek yogurt', 'kefir'] },
  'butter': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['butter', 'margarine'] },
  'cream': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['cream', 'heavy cream', 'whipping cream', 'sour cream', 'half and half'] },
  'eggs': { type: ItemType.DAIRY, temp: StorageTemp.COLD, keywords: ['eggs', 'egg whites', 'egg substitute'] },
  
  // MEAT (COLD/FROZEN)
  'chicken': { type: ItemType.MEAT, temp: StorageTemp.COLD, keywords: ['chicken', 'chicken breast', 'chicken thigh', 'chicken wings', 'whole chicken'] },
  'beef': { type: ItemType.MEAT, temp: StorageTemp.COLD, keywords: ['beef', 'steak', 'ground beef', 'roast', 'brisket', 'ribeye'] },
  'pork': { type: ItemType.MEAT, temp: StorageTemp.COLD, keywords: ['pork', 'pork chop', 'bacon', 'ham', 'sausage', 'pork loin'] },
  'turkey': { type: ItemType.MEAT, temp: StorageTemp.COLD, keywords: ['turkey', 'turkey breast', 'ground turkey', 'deli turkey'] },
  'lamb': { type: ItemType.MEAT, temp: StorageTemp.COLD, keywords: ['lamb', 'lamb chop', 'leg of lamb'] },
  
  // SEAFOOD (COLD/FROZEN)
  'fish': { type: ItemType.SEAFOOD, temp: StorageTemp.COLD, keywords: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout'] },
  'shrimp': { type: ItemType.SEAFOOD, temp: StorageTemp.COLD, keywords: ['shrimp', 'prawns'] },
  'shellfish': { type: ItemType.SEAFOOD, temp: StorageTemp.COLD, keywords: ['crab', 'lobster', 'clams', 'mussels', 'oysters', 'scallops'] },
  
  // PRODUCE - COLD (Fridge)
  'lettuce': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['lettuce', 'romaine', 'iceberg', 'arugula', 'spinach', 'kale', 'mixed greens'] },
  'berries': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['strawberries', 'blueberries', 'raspberries', 'blackberries', 'cranberries'] },
  'grapes': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['grapes', 'green grapes', 'red grapes'] },
  'broccoli': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['broccoli', 'cauliflower', 'brussels sprouts'] },
  'carrots': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['carrots', 'baby carrots'] },
  'celery': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['celery'] },
  'cucumber': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['cucumber', 'english cucumber'] },
  'peppers': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['bell pepper', 'peppers', 'jalapeño', 'serrano'] },
  'mushrooms': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['mushrooms', 'button mushrooms', 'portobello', 'shiitake'] },
  'herbs_fresh': { type: ItemType.PRODUCE, temp: StorageTemp.COLD, keywords: ['cilantro', 'parsley', 'basil', 'mint', 'dill', 'fresh herbs'] },
  
  // PRODUCE - COOL/ROOM (Pantry/Counter)
  'tomatoes': { type: ItemType.PRODUCE, temp: StorageTemp.COOL, keywords: ['tomatoes', 'cherry tomatoes', 'roma tomatoes'] },
  'potatoes': { type: ItemType.PRODUCE, temp: StorageTemp.COOL, keywords: ['potatoes', 'russet potatoes', 'red potatoes', 'sweet potatoes', 'yams'] },
  'onions': { type: ItemType.PRODUCE, temp: StorageTemp.COOL, keywords: ['onions', 'red onion', 'white onion', 'yellow onion', 'shallots'] },
  'garlic': { type: ItemType.PRODUCE, temp: StorageTemp.COOL, keywords: ['garlic', 'garlic cloves'] },
  'bananas': { type: ItemType.PRODUCE, temp: StorageTemp.ROOM, keywords: ['bananas', 'plantains'] },
  'apples': { type: ItemType.PRODUCE, temp: StorageTemp.COOL, keywords: ['apples', 'gala apples', 'granny smith', 'honeycrisp'] },
  'oranges': { type: ItemType.PRODUCE, temp: StorageTemp.ROOM, keywords: ['oranges', 'tangerines', 'clementines', 'mandarins'] },
  'lemons': { type: ItemType.PRODUCE, temp: StorageTemp.ROOM, keywords: ['lemons', 'limes'] },
  'avocado': { type: ItemType.PRODUCE, temp: StorageTemp.ROOM, keywords: ['avocado', 'avocados'] },
  
  // BAKERY
  'bread': { type: ItemType.BAKERY, temp: StorageTemp.ROOM, keywords: ['bread', 'white bread', 'wheat bread', 'sourdough', 'baguette', 'rolls'] },
  'bagels': { type: ItemType.BAKERY, temp: StorageTemp.ROOM, keywords: ['bagels', 'english muffins'] },
  'tortillas': { type: ItemType.BAKERY, temp: StorageTemp.ROOM, keywords: ['tortillas', 'flour tortillas', 'corn tortillas', 'wraps'] },
  'pastries': { type: ItemType.BAKERY, temp: StorageTemp.ROOM, keywords: ['croissant', 'muffins', 'donuts', 'danish', 'pastries'] },
  
  // GRAINS & DRY GOODS
  'rice': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice'] },
  'pasta': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'noodles'] },
  'flour': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['flour', 'all-purpose flour', 'wheat flour', 'bread flour'] },
  'sugar': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['sugar', 'white sugar', 'brown sugar', 'powdered sugar'] },
  'cereal': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['cereal', 'oatmeal', 'granola', 'oats'] },
  'beans': { type: ItemType.GRAIN, temp: StorageTemp.DRY, keywords: ['beans', 'black beans', 'kidney beans', 'chickpeas', 'lentils'] },
  
  // CONDIMENTS & SAUCES
  'ketchup': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['ketchup', 'catsup'] },
  'mustard': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['mustard', 'dijon mustard', 'yellow mustard'] },
  'mayo': { type: ItemType.CONDIMENT, temp: StorageTemp.COLD, keywords: ['mayonnaise', 'mayo'] },
  'hot_sauce': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['hot sauce', 'sriracha', 'tabasco'] },
  'soy_sauce': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['soy sauce', 'tamari', 'teriyaki sauce'] },
  'oil': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['oil', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil'] },
  'vinegar': { type: ItemType.CONDIMENT, temp: StorageTemp.ROOM, keywords: ['vinegar', 'balsamic vinegar', 'apple cider vinegar', 'white vinegar'] },
  'salad_dressing': { type: ItemType.CONDIMENT, temp: StorageTemp.COLD, keywords: ['salad dressing', 'ranch', 'italian dressing', 'caesar dressing'] },
  
  // BEVERAGES
  'juice': { type: ItemType.BEVERAGE, temp: StorageTemp.COLD, keywords: ['juice', 'orange juice', 'apple juice', 'cranberry juice'] },
  'soda': { type: ItemType.BEVERAGE, temp: StorageTemp.COLD, keywords: ['soda', 'pop', 'cola', 'sprite', 'pepsi', 'coke'] },
  'water': { type: ItemType.BEVERAGE, temp: StorageTemp.ROOM, keywords: ['water', 'bottled water', 'sparkling water'] },
  'coffee': { type: ItemType.BEVERAGE, temp: StorageTemp.DRY, keywords: ['coffee', 'coffee beans', 'ground coffee'] },
  'tea': { type: ItemType.BEVERAGE, temp: StorageTemp.DRY, keywords: ['tea', 'tea bags', 'green tea', 'black tea'] },
  
  // CANNED GOODS
  'canned': { type: ItemType.CANNED, temp: StorageTemp.ROOM, keywords: ['canned', 'can of', 'soup', 'tomato sauce', 'tomato paste'] },
  
  // SPICES & SEASONINGS
  'spices': { type: ItemType.SPICE, temp: StorageTemp.DRY, keywords: ['salt', 'pepper', 'cinnamon', 'paprika', 'cumin', 'oregano', 'thyme', 'rosemary', 'bay leaves', 'spice', 'seasoning'] },
  
  // SNACKS
  'chips': { type: ItemType.SNACK, temp: StorageTemp.DRY, keywords: ['chips', 'potato chips', 'tortilla chips', 'crackers'] },
  'cookies': { type: ItemType.SNACK, temp: StorageTemp.DRY, keywords: ['cookies', 'biscuits'] },
  'candy': { type: ItemType.SNACK, temp: StorageTemp.ROOM, keywords: ['candy', 'chocolate', 'gummies', 'sweets'] },
  'nuts': { type: ItemType.SNACK, temp: StorageTemp.DRY, keywords: ['nuts', 'almonds', 'peanuts', 'cashews', 'walnuts', 'pecans'] },
  
  // CHEMICALS & CLEANING
  'cleaning': { type: ItemType.CHEMICAL, temp: StorageTemp.ROOM, keywords: ['bleach', 'cleaner', 'detergent', 'soap', 'disinfectant', 'wipes'] }
};

/**
 * Classify an ingredient and determine its storage requirements
 * @param {string} itemName - Name of the item/ingredient
 * @param {string} category - Optional category hint
 * @returns {object} Classification with storage temp, type, location, and indicator
 */
export const classifyIngredient = (itemName, category = '') => {
  const name = itemName.toLowerCase().trim();
  const cat = category.toLowerCase().trim();
  
  // Check for exact or keyword matches
  for (const [key, data] of Object.entries(ingredientDatabase)) {
    if (data.keywords) {
      for (const keyword of data.keywords) {
        if (name.includes(keyword.toLowerCase())) {
          return {
            ...data,
            storageLocation: StorageIndicators[data.temp].location,
            indicator: StorageIndicators[data.temp],
            confidence: 'high'
          };
        }
      }
    }
  }
  
  // Fallback based on category
  if (cat.includes('dairy') || cat.includes('egg')) {
    return {
      type: ItemType.DAIRY,
      temp: StorageTemp.COLD,
      storageLocation: 'fridge',
      indicator: StorageIndicators[StorageTemp.COLD],
      confidence: 'medium'
    };
  }
  
  if (cat.includes('meat') || cat.includes('seafood')) {
    return {
      type: cat.includes('seafood') ? ItemType.SEAFOOD : ItemType.MEAT,
      temp: StorageTemp.COLD,
      storageLocation: 'fridge',
      indicator: StorageIndicators[StorageTemp.COLD],
      confidence: 'medium'
    };
  }
  
  if (cat.includes('produce') || cat.includes('vegetable') || cat.includes('fruit')) {
    return {
      type: ItemType.PRODUCE,
      temp: StorageTemp.COLD,
      storageLocation: 'fridge',
      indicator: StorageIndicators[StorageTemp.COLD],
      confidence: 'low'
    };
  }
  
  if (cat.includes('frozen')) {
    return {
      type: ItemType.FROZEN,
      temp: StorageTemp.FROZEN,
      storageLocation: 'freezer',
      indicator: StorageIndicators[StorageTemp.FROZEN],
      confidence: 'high'
    };
  }
  
  if (cat.includes('grain') || cat.includes('pasta') || cat.includes('rice') || cat.includes('cereal')) {
    return {
      type: ItemType.GRAIN,
      temp: StorageTemp.DRY,
      storageLocation: 'pantry',
      indicator: StorageIndicators[StorageTemp.DRY],
      confidence: 'medium'
    };
  }
  
  // Default to room temp pantry storage
  return {
    type: ItemType.OTHER,
    temp: StorageTemp.ROOM,
    storageLocation: 'pantry',
    indicator: StorageIndicators[StorageTemp.ROOM],
    confidence: 'low'
  };
};

/**
 * Get storage badge component props
 * @param {string} itemName 
 * @param {string} category 
 * @returns {object} Badge props with icon, color, label
 */
export const getStorageBadge = (itemName, category) => {
  const classification = classifyIngredient(itemName, category);
  return classification.indicator;
};

export default {
  classifyIngredient,
  getStorageBadge,
  StorageTemp,
  ItemType,
  StorageIndicators
};
