import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const FeatureFlagContext = createContext();

/**
 * FeatureFlagProvider - Manages feature flags and tier-based access control
 * Fetches user's accessible features and limits from backend
 */
export const FeatureFlagProvider = ({ children }) => {
  const [features, setFeatures] = useState({});
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      // Fetch feature flags and limits from backend
      const [flagsResponse, limitsResponse] = await Promise.all([
        api.get('/api/features/flags'),
        api.get('/api/features/limits')
      ]);

      setFeatures(flagsResponse.data || {});
      setLimits(limitsResponse.data || {});
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Set default features if API fails
      setFeatures({
        shopping_lists: { enabled: true },
        pantry: { enabled: true },
        recipes: { enabled: true },
        meal_planner: { enabled: true },
        statistics: { enabled: true },
        voice_input: { enabled: true },
        barcode_scanner: { enabled: true },
        sharing: { enabled: true },
        widgets: { enabled: true }
      });
      setLimits({
        max_shopping_lists: 5,
        max_items_per_list: 50,
        max_pantry_items: 50,
        max_recipes: 10
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a feature is enabled for the current user
   * @param {string} featureKey - Feature identifier (e.g., 'pantry', 'voice_input')
   * @returns {boolean} - True if feature is enabled
   */
  const hasFeature = (featureKey) => {
    if (!features[featureKey]) return true; // Default to enabled if not found
    return features[featureKey].enabled === true;
  };

  /**
   * Check if user has reached a limit
   * @param {string} limitKey - Limit identifier (e.g., 'max_shopping_lists')
   * @param {number} currentCount - Current count to check against limit
   * @returns {boolean} - True if limit is reached
   */
  const hasReachedLimit = (limitKey, currentCount) => {
    const limit = limits[limitKey];
    if (!limit || limit === -1) return false; // -1 means unlimited
    return currentCount >= limit;
  };

  /**
   * Get the limit value for a specific limit key
   * @param {string} limitKey - Limit identifier
   * @returns {number} - Limit value (-1 for unlimited)
   */
  const getLimit = (limitKey) => {
    return limits[limitKey] || -1;
  };

  /**
   * Refresh feature flags and limits
   */
  const refresh = async () => {
    await loadFeatures();
  };

  const value = {
    features,
    limits,
    loading,
    hasFeature,
    hasReachedLimit,
    getLimit,
    refresh
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * Hook to access feature flags
 * @returns {object} Feature flag context
 */
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

export default FeatureFlagContext;
