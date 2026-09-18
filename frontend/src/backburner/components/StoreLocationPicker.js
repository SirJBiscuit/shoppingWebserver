import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Star, Clock, Phone, ExternalLink } from 'lucide-react';

const StoreLocationPicker = ({ selectedStore, onSelectStore, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [useGPS, setUseGPS] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favoriteStores, setFavoriteStores] = useState([]);

  // Get user's current location
  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          searchNearbyStores(location);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enter an address or ZIP code.');
          setLoading(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setLoading(false);
    }
  };

  // Search for nearby stores
  const searchNearbyStores = async (location) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/stores/nearby?lat=${location.latitude}&lng=${location.longitude}&radius=10`);
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error('Error searching stores:', error);
    }
    setLoading(false);
  };

  // Search stores by address/ZIP
  const searchStoresByAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/stores/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error('Error searching stores:', error);
    }
    setLoading(false);
  };

  // Load favorite stores
  useEffect(() => {
    loadFavoriteStores();
  }, []);

  const loadFavoriteStores = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/stores/favorites');
      const data = await response.json();
      setFavoriteStores(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-primary-600 dark:text-primary-400" />
              Select Store Location
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* GPS Button */}
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full mb-4 btn-primary flex items-center justify-center"
          >
            <Navigation className="w-5 h-5 mr-2" />
            {loading ? 'Getting Location...' : 'Use My Current Location'}
          </button>

          {/* Search Input */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchStoresByAddress()}
                placeholder="Enter address, city, or ZIP code"
                className="input-field flex-1"
              />
              <button
                onClick={searchStoresByAddress}
                className="btn-secondary flex items-center"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Favorite Stores */}
          {favoriteStores.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-900 dark:text-white">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Favorite Stores
              </h3>
              <div className="space-y-2">
                {favoriteStores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    userLocation={userLocation}
                    onSelect={() => onSelectStore(store)}
                    isFavorite={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Nearby Stores */}
          {stores.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                {userLocation ? 'Nearby Stores' : 'Search Results'}
              </h3>
              <div className="space-y-2">
                {stores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    userLocation={userLocation}
                    onSelect={() => onSelectStore(store)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && stores.length === 0 && favoriteStores.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No stores found</p>
              <p className="text-sm">Use GPS or search by address to find stores near you</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Store Card Component
const StoreCard = ({ store, userLocation, onSelect, isFavorite = false }) => {
  const distance = userLocation 
    ? calculateDistance(userLocation.latitude, userLocation.longitude, store.latitude, store.longitude)
    : null;

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {store.name}
            </h4>
            {isFavorite && (
              <Star className="w-4 h-4 ml-2 text-yellow-500 fill-current" />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {store.address}
            {store.city && `, ${store.city}`}
            {store.state && `, ${store.state}`}
            {store.zip_code && ` ${store.zip_code}`}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            {distance && (
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {distance} mi
              </span>
            )}
            {store.phone && (
              <span className="flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {store.phone}
              </span>
            )}
            {store.hours && (
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Open today
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>
    </button>
  );
};

// Helper function (moved outside component to avoid recreation)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

export default StoreLocationPicker;
