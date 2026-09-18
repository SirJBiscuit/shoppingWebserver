import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Check, X, ArrowRight, Zap, Clock, DollarSign } from 'lucide-react';

const SmartShoppingMode = ({ shoppingList, onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentAisle, setCurrentAisle] = useState(null);
  const [completedItems, setCompletedItems] = useState([]);
  const [route, setRoute] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [itemsFound, setItemsFound] = useState(0);

  useEffect(() => {
    if (isActive) {
      generateOptimalRoute();
    }
  }, [isActive, shoppingList]);

  const generateOptimalRoute = () => {
    // Group items by aisle and create optimal route
    const aisleMap = {
      'Produce': { number: 1, items: [], icon: '🥬' },
      'Bakery': { number: 2, items: [], icon: '🥖' },
      'Meat & Seafood': { number: 3, items: [], icon: '🥩' },
      'Dairy': { number: 4, items: [], icon: '🥛' },
      'Frozen': { number: 5, items: [], icon: '🧊' },
      'Pantry': { number: 6, items: [], icon: '🥫' },
      'Snacks': { number: 7, items: [], icon: '🍿' },
      'Beverages': { number: 8, items: [], icon: '🥤' },
      'Health & Beauty': { number: 9, items: [], icon: '💄' },
      'Household': { number: 10, items: [], icon: '🧹' }
    };

    // Mock: Assign items to aisles
    shoppingList.forEach(item => {
      const category = item.category || 'Pantry';
      if (aisleMap[category]) {
        aisleMap[category].items.push(item);
      }
    });

    // Create route from aisles with items
    const optimizedRoute = Object.entries(aisleMap)
      .filter(([_, aisle]) => aisle.items.length > 0)
      .sort((a, b) => a[1].number - b[1].number)
      .map(([name, aisle]) => ({
        name,
        number: aisle.number,
        icon: aisle.icon,
        items: aisle.items,
        completed: false
      }));

    setRoute(optimizedRoute);
    setCurrentAisle(optimizedRoute[0]);
    setEstimatedTime(optimizedRoute.length * 3); // 3 min per aisle estimate
  };

  const startShoppingMode = () => {
    setIsActive(true);
    setCompletedItems([]);
    setItemsFound(0);
  };

  const stopShoppingMode = () => {
    setIsActive(false);
    setCurrentAisle(null);
    setRoute([]);
  };

  const markItemFound = (itemId) => {
    setCompletedItems([...completedItems, itemId]);
    setItemsFound(itemsFound + 1);
  };

  const skipItem = (itemId) => {
    // Mark as skipped
    setCompletedItems([...completedItems, itemId]);
  };

  const moveToNextAisle = () => {
    const currentIndex = route.findIndex(a => a.number === currentAisle.number);
    if (currentIndex < route.length - 1) {
      setCurrentAisle(route[currentIndex + 1]);
    } else {
      // Shopping complete
      onComplete && onComplete(completedItems);
      stopShoppingMode();
    }
  };

  const getCurrentAisleItems = () => {
    return currentAisle?.items.filter(item => !completedItems.includes(item.id)) || [];
  };

  const getProgress = () => {
    const total = shoppingList.length;
    const found = completedItems.length;
    return total > 0 ? Math.round((found / total) * 100) : 0;
  };

  if (!isActive) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4">
            <Zap className="w-10 h-10 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Smart Shopping Mode
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Get guided through the store with optimal aisle navigation. Find items faster and never miss anything!
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Aisle by aisle</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Save time</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Check className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-600 dark:text-gray-400">Track progress</p>
            </div>
          </div>

          <button
            onClick={startShoppingMode}
            className="btn-primary px-8 py-3 text-lg"
            disabled={!shoppingList || shoppingList.length === 0}
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Shopping
          </button>

          {(!shoppingList || shoppingList.length === 0) && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-4">
              Add items to your list to start shopping mode
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentItems = getCurrentAisleItems();
  const progress = getProgress();

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Shopping in Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {itemsFound} of {shoppingList.length} items found
            </p>
          </div>
          <button
            onClick={stopShoppingMode}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {progress}% complete • Est. {estimatedTime - Math.floor(progress / 10)} min remaining
        </p>
      </div>

      {/* Current Aisle */}
      <div className="card bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-5xl">{currentAisle?.icon}</div>
            <div>
              <p className="text-sm opacity-90">Current Aisle</p>
              <h2 className="text-3xl font-bold">Aisle {currentAisle?.number}</h2>
              <p className="text-lg font-semibold">{currentAisle?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Items here</p>
            <p className="text-4xl font-bold">{currentItems.length}</p>
          </div>
        </div>

        {currentItems.length === 0 && (
          <button
            onClick={moveToNextAisle}
            className="w-full py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            Next Aisle
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>

      {/* Items in Current Aisle */}
      {currentItems.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Items to Find
          </h3>
          <div className="space-y-3">
            {currentItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-3xl">{item.item_icon || '📦'}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {item.item_name}
                      </h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span>Qty: {item.quantity || 1}</span>
                        {item.price && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {parseFloat(item.price).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => skipItem(item.id)}
                      className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => markItemFound(item.id)}
                      className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {currentItems.length > 0 && (
            <button
              onClick={moveToNextAisle}
              className="w-full mt-4 btn-primary py-3"
            >
              All items found - Next Aisle
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      )}

      {/* Route Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Shopping Route
        </h3>
        <div className="space-y-2">
          {route.map((aisle, index) => {
            const isCompleted = aisle.items.every(item => completedItems.includes(item.id));
            const isCurrent = aisle.number === currentAisle?.number;

            return (
              <div
                key={aisle.number}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  isCurrent
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : isCompleted
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{aisle.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Aisle {aisle.number} - {aisle.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {aisle.items.length} items
                    </p>
                  </div>
                </div>
                {isCompleted && (
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                )}
                {isCurrent && (
                  <span className="px-2 py-1 bg-primary-600 text-white text-xs font-bold rounded">
                    CURRENT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SmartShoppingMode;
