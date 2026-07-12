// Store Deals and Promotions Service

/**
 * Fetch weekly deals for a specific store
 * In production, this would integrate with store APIs or web scraping
 */
export const getWeeklyDeals = async (storeId, chain) => {
  try {
    const response = await fetch(`/api/stores/${storeId}/deals`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // Fallback to mock data for demo
    return getMockDeals(chain);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return getMockDeals(chain);
  }
};

/**
 * Get digital coupons available at store
 */
export const getDigitalCoupons = async (storeId) => {
  try {
    const response = await fetch(`/api/stores/${storeId}/coupons`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
};

/**
 * Match items with available deals
 */
export const matchItemsWithDeals = (items, deals) => {
  return items.map(item => {
    const matchingDeals = deals.filter(deal => 
      deal.itemName.toLowerCase().includes(item.item_name.toLowerCase()) ||
      item.item_name.toLowerCase().includes(deal.itemName.toLowerCase()) ||
      (item.category && deal.category === item.category)
    );
    
    return {
      ...item,
      deals: matchingDeals,
      hasDeals: matchingDeals.length > 0,
      savings: matchingDeals.reduce((sum, deal) => sum + (deal.savings || 0), 0)
    };
  });
};

/**
 * Suggest recipes based on items on sale
 */
export const suggestRecipesFromDeals = (deals, recipes) => {
  const dealItems = deals.map(d => d.itemName.toLowerCase());
  
  return recipes
    .map(recipe => {
      const matchingIngredients = recipe.ingredients.filter(ing =>
        dealItems.some(dealItem => 
          ing.item_name.toLowerCase().includes(dealItem) ||
          dealItem.includes(ing.item_name.toLowerCase())
        )
      );
      
      return {
        ...recipe,
        matchingIngredients,
        matchCount: matchingIngredients.length,
        potentialSavings: matchingIngredients.reduce((sum, ing) => {
          const deal = deals.find(d => 
            d.itemName.toLowerCase().includes(ing.item_name.toLowerCase())
          );
          return sum + (deal?.savings || 0);
        }, 0)
      };
    })
    .filter(recipe => recipe.matchCount >= 3) // At least 3 ingredients on sale
    .sort((a, b) => b.matchCount - a.matchCount);
};

/**
 * Mock deals data (replace with real API integration)
 */
const getMockDeals = (chain) => {
  const baseDeals = [
    {
      itemName: 'Chicken Breast',
      category: 'Meat',
      originalPrice: 8.99,
      salePrice: 5.99,
      savings: 3.00,
      unit: 'lb',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Ground Beef',
      category: 'Meat',
      originalPrice: 6.99,
      salePrice: 4.99,
      savings: 2.00,
      unit: 'lb',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Strawberries',
      category: 'Produce',
      originalPrice: 4.99,
      salePrice: 2.99,
      savings: 2.00,
      unit: 'lb',
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      dealType: 'flash'
    },
    {
      itemName: 'Milk',
      category: 'Dairy',
      originalPrice: 4.49,
      salePrice: 2.99,
      savings: 1.50,
      unit: 'gallon',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Bread',
      category: 'Bakery',
      originalPrice: 3.49,
      salePrice: 1.99,
      savings: 1.50,
      unit: 'loaf',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Eggs',
      category: 'Dairy',
      originalPrice: 5.99,
      salePrice: 3.99,
      savings: 2.00,
      unit: 'dozen',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Pasta',
      category: 'Pantry',
      originalPrice: 2.49,
      salePrice: 0.99,
      savings: 1.50,
      unit: 'box',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Tomato Sauce',
      category: 'Canned',
      originalPrice: 2.99,
      salePrice: 1.49,
      savings: 1.50,
      unit: 'jar',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Cheese',
      category: 'Dairy',
      originalPrice: 6.99,
      salePrice: 4.99,
      savings: 2.00,
      unit: 'lb',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    },
    {
      itemName: 'Bananas',
      category: 'Produce',
      originalPrice: 0.69,
      salePrice: 0.49,
      savings: 0.20,
      unit: 'lb',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dealType: 'weekly'
    }
  ];

  return baseDeals;
};

/**
 * Get deal badge color based on savings
 */
export const getDealBadgeColor = (savings) => {
  if (savings >= 3) return 'bg-red-500'; // Hot deal
  if (savings >= 2) return 'bg-orange-500'; // Good deal
  if (savings >= 1) return 'bg-yellow-500'; // Decent deal
  return 'bg-green-500'; // Small savings
};

/**
 * Format deal expiration
 */
export const formatDealExpiration = (validUntil) => {
  const now = new Date();
  const expiration = new Date(validUntil);
  const daysLeft = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
  
  if (daysLeft === 0) return 'Expires today!';
  if (daysLeft === 1) return 'Expires tomorrow';
  if (daysLeft <= 3) return `${daysLeft} days left`;
  return `Valid until ${expiration.toLocaleDateString()}`;
};

export default {
  getWeeklyDeals,
  getDigitalCoupons,
  matchItemsWithDeals,
  suggestRecipesFromDeals,
  getDealBadgeColor,
  formatDealExpiration
};
