// Item Training Tracker - Tracks frequency of typed items and suggests training

const STORAGE_KEY = 'item_training_frequency';
const TRAINED_ITEMS_KEY = 'trained_items';
const ADMIN_THRESHOLD = 3; // Admins get prompted after 3 uses
const USER_THRESHOLD = 5; // Users get prompted after 5 uses

// Normalize item name for comparison (lowercase, trim, remove extra spaces)
export const normalizeItemName = (name) => {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Check if item is a variation of an existing item
export const isVariation = (newItem, existingItem) => {
  const normalized1 = normalizeItemName(newItem);
  const normalized2 = normalizeItemName(existingItem);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // One contains the other (e.g., "Bread" vs "Wheat Bread")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check for common variations
  const words1 = normalized1.split(' ');
  const words2 = normalized2.split(' ');
  
  // If they share most words, likely a variation
  const commonWords = words1.filter(word => words2.includes(word));
  if (commonWords.length >= Math.min(words1.length, words2.length) - 1) {
    return true;
  }
  
  return false;
};

// Get frequency data from localStorage
export const getFrequencyData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading frequency data:', error);
    return {};
  }
};

// Get trained items from localStorage
export const getTrainedItems = () => {
  try {
    const data = localStorage.getItem(TRAINED_ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading trained items:', error);
    return [];
  }
};

// Save frequency data to localStorage
const saveFrequencyData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving frequency data:', error);
  }
};

// Save trained items to localStorage
export const saveTrainedItem = (itemName) => {
  try {
    const trained = getTrainedItems();
    if (!trained.includes(normalizeItemName(itemName))) {
      trained.push(normalizeItemName(itemName));
      localStorage.setItem(TRAINED_ITEMS_KEY, JSON.stringify(trained));
    }
  } catch (error) {
    console.error('Error saving trained item:', error);
  }
};

// Track item usage
export const trackItemUsage = (itemName) => {
  const normalized = normalizeItemName(itemName);
  const frequencyData = getFrequencyData();
  
  if (!frequencyData[normalized]) {
    frequencyData[normalized] = {
      count: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      originalName: itemName
    };
  }
  
  frequencyData[normalized].count += 1;
  frequencyData[normalized].lastSeen = Date.now();
  
  saveFrequencyData(frequencyData);
  
  return frequencyData[normalized];
};

// Check if item should trigger training prompt
export const shouldPromptTraining = (itemName, isAdmin = false) => {
  const normalized = normalizeItemName(itemName);
  const frequencyData = getFrequencyData();
  const trainedItems = getTrainedItems();
  
  // Don't prompt if already trained
  if (trainedItems.includes(normalized)) {
    return false;
  }
  
  // Check if it's a variation of a trained item
  for (const trainedItem of trainedItems) {
    if (isVariation(itemName, trainedItem)) {
      // If it's a variation, only prompt if used frequently
      const itemData = frequencyData[normalized];
      if (itemData && itemData.count >= (isAdmin ? ADMIN_THRESHOLD * 2 : USER_THRESHOLD * 2)) {
        return true;
      }
      return false;
    }
  }
  
  // Check frequency threshold
  const itemData = frequencyData[normalized];
  if (!itemData) return false;
  
  const threshold = isAdmin ? ADMIN_THRESHOLD : USER_THRESHOLD;
  return itemData.count >= threshold;
};

// Get items that need training
export const getItemsNeedingTraining = (isAdmin = false) => {
  const frequencyData = getFrequencyData();
  const trainedItems = getTrainedItems();
  const threshold = isAdmin ? ADMIN_THRESHOLD : USER_THRESHOLD;
  
  return Object.entries(frequencyData)
    .filter(([normalized, data]) => {
      // Skip if already trained
      if (trainedItems.includes(normalized)) return false;
      
      // Skip if it's a simple variation of a trained item
      for (const trainedItem of trainedItems) {
        if (isVariation(normalized, trainedItem)) return false;
      }
      
      // Include if meets threshold
      return data.count >= threshold;
    })
    .map(([normalized, data]) => ({
      normalized,
      ...data
    }))
    .sort((a, b) => b.count - a.count); // Sort by frequency
};

// Clear frequency data for an item (after training)
export const clearItemFrequency = (itemName) => {
  const normalized = normalizeItemName(itemName);
  const frequencyData = getFrequencyData();
  
  delete frequencyData[normalized];
  saveFrequencyData(frequencyData);
};

// Get statistics
export const getTrainingStats = () => {
  const frequencyData = getFrequencyData();
  const trainedItems = getTrainedItems();
  
  return {
    totalTracked: Object.keys(frequencyData).length,
    totalTrained: trainedItems.length,
    needingTraining: getItemsNeedingTraining(false).length,
    mostFrequent: Object.entries(frequencyData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([normalized, data]) => ({
        name: data.originalName,
        count: data.count
      }))
  };
};
