import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const FeatureFlagContext = createContext();

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
};

export const FeatureFlagProvider = ({ children }) => {
  const [features, setFeatures] = useState([]);
  const [limits, setLimits] = useState({});
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();
    fetchLimits();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await axios.get('/api/features/flags');
      setFeatures(response.data.features);
      setIsPremium(response.data.isPremium);
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await axios.get('/api/features/limits');
      setLimits(response.data.limits);
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  // Check if a feature is available to the current user
  const hasFeature = (featureKey) => {
    const feature = features.find(f => f.key === featureKey);
    return feature?.isAvailable || false;
  };

  // Check if a feature requires premium
  const requiresPremium = (featureKey) => {
    const feature = features.find(f => f.key === featureKey);
    return feature?.requiresPremium || false;
  };

  // Get a specific limit value
  const getLimit = (limitKey) => {
    return limits[limitKey]?.value || 0;
  };

  // Check if user has reached a limit
  const hasReachedLimit = (limitKey, currentCount) => {
    const limit = getLimit(limitKey);
    return currentCount >= limit;
  };

  // Refresh features (call after subscription changes)
  const refresh = async () => {
    await fetchFeatures();
    await fetchLimits();
  };

  const value = {
    features,
    limits,
    isPremium,
    loading,
    hasFeature,
    requiresPremium,
    getLimit,
    hasReachedLimit,
    refresh,
  };

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
