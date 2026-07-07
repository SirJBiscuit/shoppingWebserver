// User preferences for learned icons and prices
const STORAGE_KEY = 'shopping_user_preferences';

// Get all user preferences
export const getUserPreferences = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { icons: {}, prices: {} };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return { icons: {}, prices: {} };
  }
};

// Save user preferences
const savePreferences = (preferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

// Learn icon for an item name
export const learnIcon = (itemName, icon) => {
  if (!itemName || !icon) return;
  
  const preferences = getUserPreferences();
  const normalizedName = itemName.toLowerCase().trim();
  
  preferences.icons[normalizedName] = icon;
  savePreferences(preferences);
  
  console.log(`Learned icon for "${itemName}": ${icon}`);
};

// Get learned icon for an item name
export const getLearnedIcon = (itemName) => {
  if (!itemName) return null;
  
  const preferences = getUserPreferences();
  const normalizedName = itemName.toLowerCase().trim();
  
  return preferences.icons[normalizedName] || null;
};

// Learn price for an item name
export const learnPrice = (itemName, price) => {
  if (!itemName || price === null || price === undefined) return;
  
  const preferences = getUserPreferences();
  const normalizedName = itemName.toLowerCase().trim();
  
  preferences.prices[normalizedName] = parseFloat(price);
  savePreferences(preferences);
  
  console.log(`Learned price for "${itemName}": $${price}`);
};

// Get learned price for an item name
export const getLearnedPrice = (itemName) => {
  if (!itemName) return null;
  
  const preferences = getUserPreferences();
  const normalizedName = itemName.toLowerCase().trim();
  
  return preferences.prices[normalizedName] || null;
};

// Clear all learned preferences (for settings/reset)
export const clearAllPreferences = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('Cleared all user preferences');
};

// Get statistics about learned preferences
export const getPreferencesStats = () => {
  const preferences = getUserPreferences();
  return {
    learnedIcons: Object.keys(preferences.icons).length,
    learnedPrices: Object.keys(preferences.prices).length,
    totalLearned: Object.keys(preferences.icons).length + Object.keys(preferences.prices).length,
  };
};

// Export all preferences (for backup/export)
export const exportPreferences = () => {
  return getUserPreferences();
};

// Import preferences (for restore/import)
export const importPreferences = (preferences) => {
  if (preferences && typeof preferences === 'object') {
    savePreferences(preferences);
    console.log('Imported user preferences');
    return true;
  }
  return false;
};
