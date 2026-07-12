// Store Location and Layout Matching Service

/**
 * Get user's current location
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Find nearest stores based on user location
 */
export const findNearestStores = async (userLocation, stores, maxDistance = 25) => {
  const storesWithDistance = stores
    .filter(store => store.latitude && store.longitude)
    .map(store => ({
      ...store,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        store.latitude,
        store.longitude
      )
    }))
    .filter(store => store.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  return storesWithDistance;
};

/**
 * Geocode address to coordinates using OpenStreetMap Nominatim
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Reverse geocode coordinates to address
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    const data = await response.json();
    
    if (data && data.address) {
      return {
        street: data.address.road || '',
        city: data.address.city || data.address.town || data.address.village || '',
        state: data.address.state || '',
        zipCode: data.address.postcode || '',
        country: data.address.country || '',
        displayName: data.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

/**
 * Match store chain to known layouts
 */
export const getStoreLayoutTemplate = (chain) => {
  const templates = {
    'kroger': {
      name: 'Kroger Standard',
      aisles: [
        { number: 1, name: 'Produce', categories: ['Produce', 'Fruits', 'Vegetables'] },
        { number: 2, name: 'Bakery', categories: ['Bakery', 'Bread'] },
        { number: 3, name: 'Deli', categories: ['Deli', 'Prepared Foods'] },
        { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
        { number: 5, name: 'Dairy', categories: ['Dairy', 'Eggs'] },
        { number: 6, name: 'Frozen Foods', categories: ['Frozen'] },
        { number: 7, name: 'Beverages', categories: ['Beverages', 'Alcohol'] },
        { number: 8, name: 'Snacks', categories: ['Snacks', 'Candy'] },
        { number: 9, name: 'Cereal & Breakfast', categories: ['Breakfast', 'Cereal'] },
        { number: 10, name: 'Canned Goods', categories: ['Canned', 'Soup'] },
        { number: 11, name: 'Pasta & Rice', categories: ['Pantry', 'Pasta'] },
        { number: 12, name: 'Condiments', categories: ['Condiments', 'Sauces'] },
        { number: 13, name: 'Baking', categories: ['Baking'] },
        { number: 14, name: 'Paper & Cleaning', categories: ['Paper', 'Cleaning'] },
        { number: 15, name: 'Personal Care', categories: ['Personal Care', 'Health'] },
        { number: 16, name: 'Pet Supplies', categories: ['Pet'] }
      ]
    },
    'walmart': {
      name: 'Walmart Supercenter',
      aisles: [
        { number: 1, name: 'Produce', categories: ['Produce', 'Fruits', 'Vegetables'] },
        { number: 2, name: 'Bakery & Deli', categories: ['Bakery', 'Deli'] },
        { number: 3, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
        { number: 4, name: 'Dairy & Eggs', categories: ['Dairy', 'Eggs'] },
        { number: 5, name: 'Frozen', categories: ['Frozen'] },
        { number: 6, name: 'Beverages', categories: ['Beverages', 'Alcohol'] },
        { number: 7, name: 'Snacks & Candy', categories: ['Snacks', 'Candy'] },
        { number: 8, name: 'Breakfast & Cereal', categories: ['Breakfast', 'Cereal'] },
        { number: 9, name: 'Canned & Pantry', categories: ['Canned', 'Pantry'] },
        { number: 10, name: 'Condiments', categories: ['Condiments'] },
        { number: 11, name: 'Cleaning & Paper', categories: ['Cleaning', 'Paper'] },
        { number: 12, name: 'Personal Care', categories: ['Personal Care'] },
        { number: 13, name: 'Pet Supplies', categories: ['Pet'] }
      ]
    },
    'target': {
      name: 'Target Standard',
      aisles: [
        { number: 'A1', name: 'Produce', categories: ['Produce', 'Fruits', 'Vegetables'] },
        { number: 'A2', name: 'Bakery', categories: ['Bakery'] },
        { number: 'A3', name: 'Deli & Prepared', categories: ['Deli'] },
        { number: 'B1', name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
        { number: 'B2', name: 'Dairy', categories: ['Dairy', 'Eggs'] },
        { number: 'B3', name: 'Frozen', categories: ['Frozen'] },
        { number: 'C1', name: 'Beverages', categories: ['Beverages'] },
        { number: 'C2', name: 'Snacks', categories: ['Snacks'] },
        { number: 'C3', name: 'Breakfast', categories: ['Breakfast', 'Cereal'] },
        { number: 'D1', name: 'Pantry', categories: ['Pantry', 'Canned'] },
        { number: 'D2', name: 'Condiments', categories: ['Condiments'] },
        { number: 'E1', name: 'Household', categories: ['Cleaning', 'Paper'] },
        { number: 'E2', name: 'Personal Care', categories: ['Personal Care'] },
        { number: 'E3', name: 'Pet', categories: ['Pet'] }
      ]
    },
    'aldi': {
      name: 'Aldi Standard',
      aisles: [
        { number: 1, name: 'Produce & Fresh', categories: ['Produce', 'Fruits', 'Vegetables'] },
        { number: 2, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
        { number: 3, name: 'Dairy & Eggs', categories: ['Dairy', 'Eggs'] },
        { number: 4, name: 'Frozen', categories: ['Frozen'] },
        { number: 5, name: 'Pantry & Canned', categories: ['Pantry', 'Canned'] },
        { number: 6, name: 'Snacks & Beverages', categories: ['Snacks', 'Beverages'] },
        { number: 7, name: 'Household & Personal', categories: ['Cleaning', 'Personal Care'] }
      ]
    },
    'costco': {
      name: 'Costco Warehouse',
      aisles: [
        { number: 1, name: 'Produce', categories: ['Produce'] },
        { number: 2, name: 'Bakery', categories: ['Bakery'] },
        { number: 3, name: 'Deli & Prepared', categories: ['Deli'] },
        { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
        { number: 5, name: 'Dairy & Refrigerated', categories: ['Dairy'] },
        { number: 6, name: 'Frozen', categories: ['Frozen'] },
        { number: 7, name: 'Beverages', categories: ['Beverages', 'Alcohol'] },
        { number: 8, name: 'Snacks & Candy', categories: ['Snacks'] },
        { number: 9, name: 'Pantry Bulk', categories: ['Pantry', 'Canned'] },
        { number: 10, name: 'Household Bulk', categories: ['Cleaning', 'Paper'] },
        { number: 11, name: 'Personal Care', categories: ['Personal Care'] }
      ]
    }
  };

  const chainKey = chain.toLowerCase().replace(/\s+/g, '');
  return templates[chainKey] || null;
};

export default {
  getCurrentLocation,
  calculateDistance,
  findNearestStores,
  geocodeAddress,
  reverseGeocode,
  getStoreLayoutTemplate
};
