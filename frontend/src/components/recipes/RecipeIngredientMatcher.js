import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Package } from 'lucide-react';
import inventoryAPI from '../../services/inventoryAPI';

/**
 * RecipeIngredientMatcher - Shows which recipe ingredients you have in inventory
 * Phase 2 of Recipe/Seasoning System
 */
const RecipeIngredientMatcher = ({ ingredients, recipeId }) => {
  const [matchedIngredients, setMatchedIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ have: 0, need: 0, low: 0, total: 0 });

  useEffect(() => {
    matchIngredients();
  }, [ingredients]);

  const matchIngredients = async () => {
    if (!ingredients || ingredients.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all inventory items
      const inventory = await inventoryAPI.getAll();
      
      // Match each ingredient with inventory
      const matched = ingredients.map(ingredient => {
        const match = findBestMatch(ingredient.item_name, inventory);
        return {
          ...ingredient,
          inventoryMatch: match,
          status: getIngredientStatus(ingredient, match)
        };
      });

      setMatchedIngredients(matched);
      
      // Calculate stats
      const have = matched.filter(i => i.status === 'have').length;
      const low = matched.filter(i => i.status === 'low').length;
      const need = matched.filter(i => i.status === 'need').length;
      
      setStats({
        have,
        low,
        need,
        total: matched.length,
        percentage: Math.round((have / matched.length) * 100)
      });
    } catch (error) {
      console.error('Error matching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const findBestMatch = (ingredientName, inventory) => {
    const normalized = ingredientName.toLowerCase().trim();
    
    // Try exact match first
    let match = inventory.find(item => 
      item.item_name?.toLowerCase() === normalized
    );
    
    if (match) return match;
    
    // Try partial match
    match = inventory.find(item =>
      item.item_name?.toLowerCase().includes(normalized) ||
      normalized.includes(item.item_name?.toLowerCase())
    );
    
    return match || null;
  };

  const getIngredientStatus = (ingredient, inventoryItem) => {
    if (!inventoryItem) return 'need';
    
    // If we have the item, check quantity
    const required = parseFloat(ingredient.amount) || 1;
    const available = inventoryItem.current_quantity || 0;
    
    if (available >= required) return 'have';
    if (available > 0 && available < required) return 'low';
    return 'need';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'have':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'low':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'need':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (ingredient) => {
    const { status, inventoryMatch, amount } = ingredient;
    
    switch (status) {
      case 'have':
        return `Have ${inventoryMatch.current_quantity} ${inventoryMatch.unit || ''}`;
      case 'low':
        return `Only have ${inventoryMatch.current_quantity} ${inventoryMatch.unit || ''}, need ${amount}`;
      case 'need':
        return 'Need to buy';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Ingredient Availability
          </h3>
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {stats.percentage}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-primary-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              {stats.have} have
            </span>
            {stats.low > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                {stats.low} low
              </span>
            )}
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              {stats.need} need
            </span>
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            {stats.total} total
          </span>
        </div>
      </div>

      {/* Ingredient List */}
      <div className="space-y-2">
        {matchedIngredients.map((ingredient, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              ingredient.status === 'have'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : ingredient.status === 'low'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(ingredient.status)}
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {ingredient.item_name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {getStatusText(ingredient)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">
                {ingredient.amount}
              </div>
              {ingredient.notes && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {ingredient.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shopping List Suggestion */}
      {stats.need > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Add Missing Ingredients to Shopping List?
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You need {stats.need} ingredient{stats.need !== 1 ? 's' : ''}. 
                Click "Add to Shopping List" to add only what you're missing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeIngredientMatcher;
