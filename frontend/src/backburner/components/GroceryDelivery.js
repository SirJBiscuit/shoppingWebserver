import React, { useState } from 'react';
import { Truck, MapPin, Clock, DollarSign, Star, ShoppingBag, Check, AlertCircle, Crown } from 'lucide-react';

const GroceryDelivery = ({ shoppingList, isPremium, onUpgrade }) => {
  const [selectedStore, setSelectedStore] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState('asap');
  const [orderPlaced, setOrderPlaced] = useState(false);

  const stores = [
    {
      id: 1,
      name: 'Instacart',
      logo: '🛒',
      rating: 4.8,
      deliveryFee: 3.99,
      deliveryTime: '1-2 hours',
      minOrder: 10,
      available: true
    },
    {
      id: 2,
      name: 'Amazon Fresh',
      logo: '📦',
      rating: 4.6,
      deliveryFee: 0,
      deliveryTime: '2-4 hours',
      minOrder: 35,
      available: true
    },
    {
      id: 3,
      name: 'Walmart+',
      logo: '🏪',
      rating: 4.5,
      deliveryFee: 0,
      deliveryTime: 'Same day',
      minOrder: 35,
      available: true
    },
    {
      id: 4,
      name: 'Shipt',
      logo: '🚗',
      rating: 4.7,
      deliveryFee: 7.99,
      deliveryTime: '1 hour',
      minOrder: 0,
      available: true
    }
  ];

  const deliveryTimes = [
    { value: 'asap', label: 'ASAP (1-2 hours)' },
    { value: 'today', label: 'Later today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'schedule', label: 'Schedule for later' }
  ];

  const calculateTotal = () => {
    if (!shoppingList || !shoppingList.items) return 0;
    return shoppingList.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  };

  const handlePlaceOrder = () => {
    if (!isPremium) {
      onUpgrade();
      return;
    }

    if (!selectedStore) {
      alert('Please select a store');
      return;
    }

    // In production, this would integrate with actual delivery APIs
    setOrderPlaced(true);
    setTimeout(() => setOrderPlaced(false), 5000);
  };

  if (!isPremium) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full mb-4">
            <Crown className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Premium Feature
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Upgrade to Premium to order groceries directly from the app and get them delivered to your door!
          </p>
          <button onClick={onUpgrade} className="btn-primary inline-flex items-center">
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to Premium
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Starting at $4.99/month
          </p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-bounce">
            <Check className="w-16 h-16 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Order Placed Successfully!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your groceries are on the way from {selectedStore?.name}
          </p>
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Estimated delivery: {selectedStore?.deliveryTime}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Truck className="w-6 h-6 mr-2 text-primary-600" />
              Grocery Delivery
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Order from your favorite stores
            </p>
          </div>
          <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center">
            <Crown className="w-3 h-3 mr-1" />
            PREMIUM
          </div>
        </div>

        {/* Order Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Items in list:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {shoppingList?.items?.length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Estimated total:</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Delivery Time Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Delivery Time
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deliveryTimes.map((time) => (
              <button
                key={time.value}
                onClick={() => setDeliveryTime(time.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  deliveryTime === time.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <Clock className={`w-5 h-5 mx-auto mb-1 ${
                  deliveryTime === time.value ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className="text-sm font-medium text-gray-900 dark:text-white text-center">
                  {time.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Store Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Store
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedStore?.id === store.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-4xl">{store.logo}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{store.name}</h4>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{store.rating}</span>
                    </div>
                  </div>
                </div>
                {selectedStore?.id === store.id && (
                  <Check className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Fee:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {store.deliveryFee === 0 ? 'FREE' : `$${store.deliveryFee}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Time:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{store.deliveryTime}</span>
                </div>
                {store.minOrder > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Min Order:</span>
                    <span className="font-medium text-gray-900 dark:text-white">${store.minOrder}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Place Order */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order Total</h3>
            {selectedStore && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                via {selectedStore.name}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${calculateTotal().toFixed(2)}
            </p>
          </div>
        </div>

        {selectedStore && (
          <div className="space-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Delivery Fee:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {selectedStore.deliveryFee === 0 ? 'FREE' : `$${selectedStore.deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Service Fee:</span>
              <span className="font-medium text-gray-900 dark:text-white">$2.99</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Tax (est.):</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ${(calculateTotal() * 0.08).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                  ${(calculateTotal() + (selectedStore.deliveryFee || 0) + 2.99 + (calculateTotal() * 0.08)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={!selectedStore}
          className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingBag className="w-5 h-5 mr-2 inline" />
          Place Order
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-3">
          You'll be redirected to complete payment
        </p>
      </div>
    </div>
  );
};

export default GroceryDelivery;
