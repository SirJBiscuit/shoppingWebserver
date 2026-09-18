import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Phone, Star, DollarSign, TrendingDown } from 'lucide-react';

const StoreLocator = ({ onSelectStore }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          findNearbyStores(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
          // Use mock location for demo
          const mockLocation = { lat: 40.7128, lng: -74.0060 }; // NYC
          setUserLocation(mockLocation);
          findNearbyStores(mockLocation);
        }
      );
    } else {
      setLoading(false);
      alert('Geolocation is not supported by your browser');
    }
  };

  const findNearbyStores = (location) => {
    // Mock store data - in production, use Google Places API
    const mockStores = [
      {
        id: 1,
        name: 'Walmart Supercenter',
        address: '123 Main St, New York, NY 10001',
        distance: 0.8,
        rating: 4.2,
        phone: '(555) 123-4567',
        hours: 'Open until 11:00 PM',
        priceLevel: 1, // 1-4 scale
        hasDeals: true,
        avgSavings: 15
      },
      {
        id: 2,
        name: 'Target',
        address: '456 Broadway, New York, NY 10002',
        distance: 1.2,
        rating: 4.5,
        phone: '(555) 234-5678',
        hours: 'Open until 10:00 PM',
        priceLevel: 2,
        hasDeals: true,
        avgSavings: 12
      },
      {
        id: 3,
        name: 'Whole Foods Market',
        address: '789 Park Ave, New York, NY 10003',
        distance: 1.5,
        rating: 4.7,
        phone: '(555) 345-6789',
        hours: 'Open until 9:00 PM',
        priceLevel: 4,
        hasDeals: false,
        avgSavings: 5
      },
      {
        id: 4,
        name: 'Trader Joe\'s',
        address: '321 5th Ave, New York, NY 10004',
        distance: 2.1,
        rating: 4.6,
        phone: '(555) 456-7890',
        hours: 'Open until 9:00 PM',
        priceLevel: 2,
        hasDeals: true,
        avgSavings: 18
      },
      {
        id: 5,
        name: 'Aldi',
        address: '654 Lexington Ave, New York, NY 10005',
        distance: 2.3,
        rating: 4.3,
        phone: '(555) 567-8901',
        hours: 'Open until 8:00 PM',
        priceLevel: 1,
        hasDeals: true,
        avgSavings: 22
      }
    ];

    setStores(mockStores);
    setLoading(false);
  };

  const getPriceLevelText = (level) => {
    return '$'.repeat(level) + '·'.repeat(4 - level);
  };

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    if (onSelectStore) {
      onSelectStore(store);
    }
  };

  const openDirections = (store) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <MapPin className="w-6 h-6 mr-2 text-primary-600" />
            Nearby Stores
          </h2>
          {userLocation && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing stores near you
            </p>
          )}
        </div>
        <button
          onClick={getUserLocation}
          disabled={loading}
          className="btn-secondary flex items-center"
        >
          <Navigation className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Finding...' : 'Refresh'}
        </button>
      </div>

      {/* Store List */}
      <div className="space-y-3">
        {stores.map((store) => (
          <div
            key={store.id}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              selectedStore?.id === store.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
            onClick={() => handleSelectStore(store)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {store.name}
                  </h3>
                  {store.hasDeals && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded">
                      DEALS
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {store.address}
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {store.distance} mi
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {store.rating}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {getPriceLevelText(store.priceLevel)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDirections(store);
                }}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{store.hours}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{store.phone}</span>
              </div>
            </div>

            {store.hasDeals && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Avg savings: {store.avgSavings}%
                  </span>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400">
                  Based on your list
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compare Prices Button */}
      {selectedStore && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Shopping at {selectedStore.name}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Estimated total: $45.67 • Save ${(45.67 * selectedStore.avgSavings / 100).toFixed(2)}
              </p>
            </div>
            <button className="btn-primary text-sm">
              Compare Prices
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreLocator;
