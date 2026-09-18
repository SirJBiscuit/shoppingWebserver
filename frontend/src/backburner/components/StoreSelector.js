import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Store, TrendingDown, Tag, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation, findNearestStores, calculateDistance } from '../services/storeLocationService';
import { getWeeklyDeals } from '../services/storeDealsService';

const StoreSelector = ({ selectedStore, onSelectStore, onClose }) => {
  const [stores, setStores] = useState([]);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showDeals, setShowDeals] = useState({});
  const [storeDeals, setStoreDeals] = useState({});

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stores/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      
      // Find nearby stores
      const nearby = await findNearestStores(location, stores, 25);
      setNearbyStores(nearby);
      
      // Load deals for nearby stores
      for (const store of nearby.slice(0, 5)) {
        loadStoreDeals(store.id, store.chain);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Could not get your location. Please enable location services.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadStoreDeals = async (storeId, chain) => {
    try {
      const deals = await getWeeklyDeals(storeId, chain);
      setStoreDeals(prev => ({
        ...prev,
        [storeId]: deals
      }));
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const toggleDeals = (storeId) => {
    setShowDeals(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }));
    
    // Load deals if not already loaded
    if (!storeDeals[storeId]) {
      const store = [...stores, ...nearbyStores].find(s => s.id === storeId);
      if (store) {
        loadStoreDeals(storeId, store.chain);
      }
    }
  };

  const displayStores = nearbyStores.length > 0 ? nearbyStores : stores;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Store className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Select Store</h2>
                <p className="text-sm text-primary-100">Choose your shopping location</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>

          {/* Location Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={loadingLocation}
            className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition"
          >
            <Navigation className={`w-5 h-5 ${loadingLocation ? 'animate-spin' : ''}`} />
            <span>
              {loadingLocation ? 'Finding nearby stores...' : 'Use Current Location'}
            </span>
          </button>
        </div>

        {/* Store List */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stores...</p>
            </div>
          ) : displayStores.length === 0 ? (
            <div className="text-center py-8">
              <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No stores found</p>
              <button
                onClick={() => window.location.href = '/system'}
                className="mt-4 btn-primary"
              >
                Add a Store
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayStores.map((store) => (
                <div key={store.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => onSelectStore(store)}
                    className={`w-full p-4 text-left transition ${
                      selectedStore?.id === store.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {store.name}
                          </h3>
                          {store.chain && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                              {store.chain}
                            </span>
                          )}
                        </div>
                        
                        {store.address && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {store.address}
                            {store.city && `, ${store.city}`}
                          </p>
                        )}
                        
                        {store.distance !== undefined && (
                          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1 font-medium">
                            📍 {store.distance.toFixed(1)} miles away
                          </p>
                        )}
                      </div>

                      {/* Deal Count Badge */}
                      {store.deal_count > 0 && (
                        <div className="ml-4 flex flex-col items-end space-y-1">
                          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {store.deal_count} deals
                          </span>
                          {store.coupon_count > 0 && (
                            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                              <Tag className="w-3 h-3 mr-1" />
                              {store.coupon_count} coupons
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Show Deals Toggle */}
                  {(storeDeals[store.id]?.length > 0 || store.deal_count > 0) && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => toggleDeals(store.id)}
                        className="w-full px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between"
                      >
                        <span>View Weekly Deals</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDeals[store.id] ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showDeals[store.id] && storeDeals[store.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gray-50 dark:bg-gray-900/50 px-4 pb-4"
                          >
                            <div className="space-y-2 pt-2">
                              {storeDeals[store.id].slice(0, 5).map((deal, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">{deal.itemName}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500 line-through">${deal.originalPrice}</span>
                                    <span className="text-green-600 dark:text-green-400 font-bold">
                                      ${deal.salePrice}
                                    </span>
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">
                                      Save ${deal.savings}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StoreSelector;
