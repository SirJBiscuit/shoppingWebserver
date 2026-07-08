// Smart quantity converter: Recipe amounts → Store purchase amounts
// Converts "1 cup flour" → "1 bag (5 lbs) flour"

const CONVERSION_RULES = {
  // Pasta & Grains
  pasta: {
    recipeUnit: ['oz', 'ounces', 'cup', 'cups'],
    storeUnit: 'box',
    storeQuantity: 1,
    storeSize: '16 oz',
    minRecipeAmount: 4, // If recipe needs 4+ oz, buy a box
  },
  rice: {
    recipeUnit: ['cup', 'cups', 'oz', 'ounces'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '2 lbs',
    minRecipeAmount: 1,
  },
  
  // Dairy
  milk: {
    recipeUnit: ['cup', 'cups', 'oz', 'ounces', 'ml'],
    storeUnit: 'gallon',
    storeQuantity: 0.5,
    storeSize: 'half gallon',
    minRecipeAmount: 8,
  },
  butter: {
    recipeUnit: ['tbsp', 'tablespoon', 'cup', 'stick'],
    storeUnit: 'box',
    storeQuantity: 1,
    storeSize: '4 sticks',
    minRecipeAmount: 2,
  },
  cheese: {
    recipeUnit: ['cup', 'cups', 'oz', 'ounces'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '8 oz',
    minRecipeAmount: 4,
  },
  
  // Produce
  onion: {
    recipeUnit: ['whole', 'medium', 'large', 'small'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '3 lb bag',
    minRecipeAmount: 1,
  },
  potato: {
    recipeUnit: ['whole', 'medium', 'large', 'lb', 'lbs'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '5 lb bag',
    minRecipeAmount: 2,
  },
  tomato: {
    recipeUnit: ['whole', 'medium', 'can'],
    storeUnit: 'can',
    storeQuantity: 1,
    storeSize: '28 oz',
    minRecipeAmount: 1,
  },
  
  // Baking
  flour: {
    recipeUnit: ['cup', 'cups', 'oz', 'ounces'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '5 lbs',
    minRecipeAmount: 2,
  },
  sugar: {
    recipeUnit: ['cup', 'cups', 'oz', 'ounces'],
    storeUnit: 'bag',
    storeQuantity: 1,
    storeSize: '4 lbs',
    minRecipeAmount: 1,
  },
  
  // Proteins
  chicken: {
    recipeUnit: ['lb', 'lbs', 'breast', 'thigh'],
    storeUnit: 'pack',
    storeQuantity: 1,
    storeSize: '2 lbs',
    minRecipeAmount: 1,
  },
  beef: {
    recipeUnit: ['lb', 'lbs', 'oz', 'ounces'],
    storeUnit: 'pack',
    storeQuantity: 1,
    storeSize: '1 lb',
    minRecipeAmount: 0.5,
  },
  eggs: {
    recipeUnit: ['whole', 'egg', 'eggs'],
    storeUnit: 'dozen',
    storeQuantity: 1,
    storeSize: '12 count',
    minRecipeAmount: 2,
  },
};

/**
 * Convert recipe ingredient to realistic store purchase
 * @param {string} ingredientName - Name of ingredient (e.g., "pasta", "milk")
 * @param {number} recipeQuantity - Amount needed for recipe (e.g., 8)
 * @param {string} recipeUnit - Unit from recipe (e.g., "oz", "cups")
 * @returns {object} - Store purchase details
 */
export const convertToStorePurchase = (ingredientName, recipeQuantity, recipeUnit) => {
  const normalizedName = ingredientName.toLowerCase().trim();
  
  // Find matching conversion rule
  let rule = null;
  for (const [key, value] of Object.entries(CONVERSION_RULES)) {
    if (normalizedName.includes(key)) {
      rule = value;
      break;
    }
  }
  
  // If no rule found, return original
  if (!rule) {
    return {
      quantity: recipeQuantity,
      unit: recipeUnit,
      size: '',
      isConverted: false,
      originalRecipe: `${recipeQuantity} ${recipeUnit}`,
    };
  }
  
  // Check if recipe unit matches rule
  const unitMatches = rule.recipeUnit.some(u => 
    recipeUnit.toLowerCase().includes(u)
  );
  
  if (!unitMatches) {
    return {
      quantity: recipeQuantity,
      unit: recipeUnit,
      size: '',
      isConverted: false,
      originalRecipe: `${recipeQuantity} ${recipeUnit}`,
    };
  }
  
  // Convert to store purchase
  return {
    quantity: rule.storeQuantity,
    unit: rule.storeUnit,
    size: rule.storeSize,
    isConverted: true,
    originalRecipe: `${recipeQuantity} ${recipeUnit}`,
    note: `Recipe calls for ${recipeQuantity} ${recipeUnit}`,
  };
};

/**
 * Batch convert recipe ingredients to shopping list
 * @param {Array} ingredients - Array of {name, quantity, unit}
 * @returns {Array} - Converted shopping list items
 */
export const convertRecipeToShoppingList = (ingredients) => {
  return ingredients.map(ingredient => {
    const converted = convertToStorePurchase(
      ingredient.name,
      ingredient.quantity,
      ingredient.unit
    );
    
    return {
      name: ingredient.name,
      ...converted,
    };
  });
};

/**
 * Smart grouping: Combine duplicate ingredients from multiple recipes
 * @param {Array} items - Shopping list items
 * @returns {Array} - Grouped items with recipe references
 */
export const groupRecipeIngredients = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    const key = item.name.toLowerCase();
    
    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        recipes: item.recipeId ? [item.recipeId] : [],
        totalQuantity: item.quantity,
      };
    } else {
      // Combine quantities if same unit
      if (grouped[key].unit === item.unit) {
        grouped[key].totalQuantity += item.quantity;
      }
      
      // Add recipe reference
      if (item.recipeId && !grouped[key].recipes.includes(item.recipeId)) {
        grouped[key].recipes.push(item.recipeId);
      }
    }
  });
  
  return Object.values(grouped);
};

export default {
  convertToStorePurchase,
  convertRecipeToShoppingList,
  groupRecipeIngredients,
};
