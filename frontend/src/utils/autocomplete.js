// Common grocery items database
const COMMON_GROCERY_ITEMS = [
  // Produce
  'Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries', 'Blueberries', 'Raspberries',
  'Tomatoes', 'Lettuce', 'Spinach', 'Kale', 'Broccoli', 'Cauliflower', 'Carrots', 'Celery',
  'Cucumbers', 'Bell Peppers', 'Onions', 'Garlic', 'Potatoes', 'Sweet Potatoes', 'Avocados',
  'Lemons', 'Limes', 'Mushrooms', 'Green Beans', 'Asparagus', 'Zucchini', 'Squash',
  
  // Dairy
  'Milk', 'Eggs', 'Butter', 'Cheese', 'Cheddar Cheese', 'Mozzarella Cheese', 'Cream Cheese',
  'Sour Cream', 'Yogurt', 'Greek Yogurt', 'Heavy Cream', 'Half and Half', 'Cottage Cheese',
  
  // Meat & Seafood
  'Chicken Breast', 'Ground Beef', 'Steak', 'Pork Chops', 'Bacon', 'Sausage', 'Ham',
  'Turkey', 'Salmon', 'Tuna', 'Shrimp', 'Tilapia', 'Ground Turkey', 'Chicken Thighs',
  
  // Bakery
  'Bread', 'Whole Wheat Bread', 'Bagels', 'English Muffins', 'Tortillas', 'Pita Bread',
  'Croissants', 'Dinner Rolls', 'Hamburger Buns', 'Hot Dog Buns',
  
  // Pantry Staples
  'Rice', 'Pasta', 'Spaghetti', 'Penne', 'Flour', 'Sugar', 'Brown Sugar', 'Salt', 'Pepper',
  'Olive Oil', 'Vegetable Oil', 'Cooking Spray', 'Baking Soda', 'Baking Powder',
  'Vanilla Extract', 'Honey', 'Maple Syrup', 'Peanut Butter', 'Jelly', 'Jam',
  
  // Canned & Jarred
  'Tomato Sauce', 'Pasta Sauce', 'Salsa', 'Chicken Broth', 'Beef Broth', 'Vegetable Broth',
  'Canned Tomatoes', 'Canned Beans', 'Black Beans', 'Kidney Beans', 'Chickpeas',
  'Canned Corn', 'Canned Tuna', 'Pickles', 'Olives', 'Mayo', 'Mustard', 'Ketchup',
  
  // Frozen
  'Frozen Pizza', 'Ice Cream', 'Frozen Vegetables', 'Frozen Fruit', 'Frozen Chicken',
  'Frozen Fries', 'Frozen Waffles', 'Frozen Berries',
  
  // Beverages
  'Water', 'Sparkling Water', 'Soda', 'Juice', 'Orange Juice', 'Apple Juice', 'Coffee',
  'Tea', 'Energy Drinks', 'Sports Drinks', 'Almond Milk', 'Oat Milk', 'Coconut Milk',
  
  // Snacks
  'Chips', 'Crackers', 'Cookies', 'Pretzels', 'Popcorn', 'Granola Bars', 'Protein Bars',
  'Nuts', 'Trail Mix', 'Candy', 'Chocolate', 'Gum',
  
  // Household
  'Paper Towels', 'Toilet Paper', 'Tissues', 'Trash Bags', 'Dish Soap', 'Laundry Detergent',
  'Fabric Softener', 'Bleach', 'All-Purpose Cleaner', 'Glass Cleaner', 'Sponges',
  
  // Personal Care
  'Shampoo', 'Conditioner', 'Body Wash', 'Soap', 'Toothpaste', 'Toothbrush', 'Deodorant',
  'Razors', 'Shaving Cream', 'Lotion', 'Sunscreen', 'Hand Sanitizer'
];

// Get autocomplete suggestions
export const getAutocompleteSuggestions = (input, previousItems = []) => {
  if (!input || input.length < 2) return [];
  
  const searchTerm = input.toLowerCase().trim();
  const suggestions = new Set();
  
  // First, add matching previous items (highest priority)
  previousItems
    .filter(item => item.toLowerCase().includes(searchTerm))
    .forEach(item => suggestions.add(item));
  
  // Then add matching common items
  COMMON_GROCERY_ITEMS
    .filter(item => item.toLowerCase().includes(searchTerm))
    .forEach(item => suggestions.add(item));
  
  // Convert to array and sort by relevance
  return Array.from(suggestions)
    .sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Exact match first
      if (aLower === searchTerm) return -1;
      if (bLower === searchTerm) return 1;
      
      // Starts with search term
      const aStarts = aLower.startsWith(searchTerm);
      const bStarts = bLower.startsWith(searchTerm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Alphabetical
      return a.localeCompare(b);
    })
    .slice(0, 5); // Limit to top 5 suggestions
};

// Get ghost text (first suggestion for inline autocomplete)
export const getGhostText = (input, previousItems = []) => {
  const suggestions = getAutocompleteSuggestions(input, previousItems);
  if (suggestions.length === 0) return '';
  
  const firstSuggestion = suggestions[0];
  const inputLower = input.toLowerCase();
  
  // Only show ghost text if the suggestion starts with the input
  if (firstSuggestion.toLowerCase().startsWith(inputLower)) {
    return firstSuggestion.substring(input.length);
  }
  
  return '';
};

export default { getAutocompleteSuggestions, getGhostText };
