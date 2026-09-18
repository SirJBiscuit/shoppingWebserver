import React, { useState, useEffect } from 'react';
import { Store, Split, ArrowRight, DollarSign, Package, Check, X } from 'lucide-react';

const MultiStoreManager = ({ shoppingList, onSplit }) => {
  const [stores, setStores] = useState([]);
  const [splitLists, setSplitLists] = useState({});
  const [showSplitView, setShowSplitView] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  const availableStores = [
    { 
      id: 1, 
      name: 'Whole Foods', 
      icon: '🥬',
      specialty: 'Organic & Fresh Produce',
      avgPrice: 'High',
      color: 'green'
    },
    { 
      id: 2, 
      name: 'Trader Joe\'s', 
      icon: '🛒',
      specialty: 'Unique Items & Snacks',
      avgPrice: 'Medium',
      color: 'red'
    },
    { 
      id: 3, 
      name: 'Walmart', 
      icon: '🏪',
      specialty: 'Bulk & Household',
      avgPrice: 'Low',
      color: 'blue'
    },
    { 
      id: 4, 
      name: 'Target', 
      icon: '🎯',
      specialty: 'General & Home Goods',
      avgPrice: 'Medium',
      color: 'red'
    },
    { 
      id: 5, 
      name: 'Costco', 
      icon: '📦',
      specialty: 'Bulk Items',
      avgPrice: 'Low (Bulk)',
      color: 'blue'
    }
  ];

  useEffect(() => {
    if (showSplitView) {
      autoSplitByCategory();
    }
  }, [showSplitView, shoppingList]);

  const autoSplitByCategory = () => {
    const splits = {};
    
    // Auto-assign items to stores based on category
    shoppingList.forEach(item => {
      let assignedStore = 'Walmart'; // Default
      
      const category = item.category?.toLowerCase() || '';
      
      if (category.includes('produce') || category.includes('organic')) {
        assignedStore = 'Whole Foods';
      } else if (category.includes('snack') || category.includes('specialty')) {
        assignedStore = 'Trader Joe\'s';
      } else if (category.includes('bulk') || category.includes('pantry')) {
        assignedStore = 'Costco';
      } else if (category.includes('household') || category.includes('general')) {
        assignedStore = 'Target';
      }
      
      if (!splits[assignedStore]) {
        splits[assignedStore] = [];
      }
      splits[assignedStore].push(item);
    });
    
    setSplitLists(splits);
  };

  const moveItem = (item, fromStore, toStore) => {
    const newSplits = { ...splitLists };
    
    // Remove from old store
    if (newSplits[fromStore]) {
      newSplits[fromStore] = newSplits[fromStore].filter(i => i.id !== item.id);
      if (newSplits[fromStore].length === 0) {
        delete newSplits[fromStore];
      }
    }
    
    // Add to new store
    if (!newSplits[toStore]) {
      newSplits[toStore] = [];
    }
    newSplits[toStore].push(item);
    
    setSplitLists(newSplits);
  };

  const calculateStoreTotal = (storeName) => {
    const items = splitLists[storeName] || [];
    return items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  };

  const calculateTotalItems = (storeName) => {
    return (splitLists[storeName] || []).length;
  };

  const getStoreColor = (storeName) => {
    const store = availableStores.find(s => s.name === storeName);
    return store?.color || 'gray';
  };

  const getStoreIcon = (storeName) => {
    const store = availableStores.find(s => s.name === storeName);
    return store?.icon || '🏪';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const saveSplit = () => {
    onSplit && onSplit(splitLists);
    setShowSplitView(false);
  };

  if (!showSplitView) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4">
            <Split className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Multi-Store Shopping
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Split your shopping list across multiple stores to save money and find the best deals.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Save money</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Store className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Best prices</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Organize</p>
            </div>
          </div>

          <button
            onClick={() => setShowSplitView(true)}
            className="btn-primary px-8 py-3 text-lg"
            disabled={!shoppingList || shoppingList.length === 0}
          >
            <Split className="w-5 h-5 mr-2" />
            Split List by Store
          </button>

          {(!shoppingList || shoppingList.length === 0) && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-4">
              Add items to your list to enable multi-store splitting
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Split className="w-6 h-6 mr-2 text-primary-600" />
            Multi-Store Shopping
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {Object.keys(splitLists).length} stores • {shoppingList.length} total items
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSplitView(false)}
            className="btn-secondary"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </button>
          <button
            onClick={saveSplit}
            className="btn-primary"
          >
            <Check className="w-5 h-5 mr-2" />
            Save Split
          </button>
        </div>
      </div>

      {/* Store Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.keys(splitLists).map((storeName) => {
          const itemCount = calculateTotalItems(storeName);
          const total = calculateStoreTotal(storeName);
          const color = getStoreColor(storeName);
          const icon = getStoreIcon(storeName);
          
          return (
            <div
              key={storeName}
              onClick={() => setSelectedStore(storeName)}
              className={`card cursor-pointer transition-all ${
                selectedStore === storeName
                  ? 'ring-2 ring-primary-500 border-primary-500'
                  : 'hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {storeName}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {itemCount} items
                    </p>
                  </div>
                </div>
                {selectedStore === storeName && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Estimated Total
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Store Details */}
      {selectedStore && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <span className="text-2xl mr-2">{getStoreIcon(selectedStore)}</span>
              {selectedStore} - {calculateTotalItems(selectedStore)} Items
            </h3>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(calculateStoreTotal(selectedStore))}
            </span>
          </div>

          <div className="space-y-2">
            {(splitLists[selectedStore] || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{item.item_icon || '📦'}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.item_name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.category} • Qty: {item.quantity || 1}
                    </p>
                  </div>
                  {item.price && (
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(item.price)}
                    </span>
                  )}
                </div>

                {/* Move to Store Dropdown */}
                <select
                  value={selectedStore}
                  onChange={(e) => moveItem(item, selectedStore, e.target.value)}
                  className="ml-3 text-sm input py-1 px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value={selectedStore}>Keep here</option>
                  {availableStores
                    .filter(s => s.name !== selectedStore)
                    .map(store => (
                      <option key={store.id} value={store.name}>
                        Move to {store.name}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Shopping Summary
        </h3>
        
        <div className="space-y-3">
          {Object.keys(splitLists).map((storeName, index) => (
            <div key={storeName}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getStoreIcon(storeName)}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {storeName}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({calculateTotalItems(storeName)} items)
                  </span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(calculateStoreTotal(storeName))}
                </span>
              </div>
              {index < Object.keys(splitLists).length - 1 && (
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
              )}
            </div>
          ))}
          
          <div className="pt-3 border-t-2 border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Total
              </span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(
                  Object.keys(splitLists).reduce(
                    (sum, store) => sum + calculateStoreTotal(store),
                    0
                  )
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-sm text-green-900 dark:text-green-100">
            💡 <strong>Tip:</strong> Shopping at multiple stores can save you 15-25% on average!
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiStoreManager;
