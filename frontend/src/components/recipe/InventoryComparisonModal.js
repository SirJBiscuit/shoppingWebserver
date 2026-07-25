import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, ShoppingCart, Package } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import api from '../../services/api';

/**
 * InventoryComparisonModal - Shows what ingredients you have vs need
 * Integrates with kitchen inventory system
 */
const InventoryComparisonModal = ({ 
  isOpen, 
  onClose, 
  recipeId, 
  recipeName,
  onAddToShoppingList 
}) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (isOpen && recipeId) {
      loadComparison();
    }
  }, [isOpen, recipeId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/recipes/${recipeId}/inventory-comparison`);
      setComparison(response.data);
      
      // Auto-select missing and insufficient items
      const autoSelect = new Set();
      response.data.missing.forEach(item => autoSelect.add(item.id));
      response.data.insufficient.forEach(item => autoSelect.add(item.id));
      setSelectedItems(autoSelect);
    } catch (error) {
      console.error('Failed to load comparison:', error);
      showError('Failed to compare with inventory');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddToShoppingList = () => {
    const itemsToAdd = [
      ...comparison.missing.filter(item => selectedItems.has(item.id)),
      ...comparison.insufficient.filter(item => selectedItems.has(item.id))
    ];
    
    onAddToShoppingList(itemsToAdd);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ingredient Check
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {recipeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Checking your inventory...</p>
            </div>
          ) : comparison ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Match Percentage</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {comparison.matchPercentage}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {comparison.matched.length} of {comparison.totalIngredients} ingredients
                    </p>
                    {comparison.canMake && (
                      <p className="text-green-600 dark:text-green-400 font-semibold mt-1">
                        ✓ You can make this!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Matched Ingredients */}
              {comparison.matched.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    You Have ({comparison.matched.length})
                  </h3>
                  <div className="space-y-2">
                    {comparison.matched.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="text-green-600 dark:text-green-400" size={18} />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.item_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Need: {item.needed} {item.unit} • Have: {item.available} {item.unit}
                            </p>
                          </div>
                        </div>
                        <Package className="text-green-600 dark:text-green-400" size={18} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insufficient Ingredients */}
              {comparison.insufficient.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-orange-600" size={20} />
                    Need More ({comparison.insufficient.length})
                  </h3>
                  <div className="space-y-2">
                    {comparison.insufficient.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.item_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Need: {item.needed} {item.unit} • Have: {item.available} {item.unit} • 
                              <span className="text-orange-600 dark:text-orange-400 font-semibold ml-1">
                                Get {item.shortage} more
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Ingredients */}
              {comparison.missing.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <XCircle className="text-red-600" size={20} />
                    Don't Have ({comparison.missing.length})
                  </h3>
                  <div className="space-y-2">
                    {comparison.missing.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.item_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Need: {item.needed} {item.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No comparison data available
            </div>
          )}
        </div>

        {/* Footer */}
        {comparison && (comparison.missing.length > 0 || comparison.insufficient.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedItems.size} items selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToShoppingList}
                  disabled={selectedItems.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Add {selectedItems.size} to Shopping List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryComparisonModal;
