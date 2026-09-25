/**
 * CFS MDL (Machine Data Learning) Hook
 * 
 * Smart state management for MDL predictions and patterns
 */

import { useCallback } from 'react';
import useSmartState from './useSmartState';
import * as mdlAPI from '../api/mdl';

export const useMDLPatterns = (itemName) => {
  const {
    data: patterns,
    loading,
    error,
    invalidate,
  } = useSmartState(
    `mdl_patterns_${itemName}`,
    () => mdlAPI.getPatterns(itemName),
    {
      cacheExpiry: 60,
      optimistic: false,
      autoSync: true,
    }
  );

  return {
    patterns,
    loading,
    error,
    refresh: invalidate,
  };
};

export const useMDLSuggestions = () => {
  const {
    data: suggestions,
    loading,
    error,
    invalidate,
  } = useSmartState(
    'mdl_suggestions',
    mdlAPI.getSuggestions,
    {
      cacheExpiry: 15,
      optimistic: false,
      autoSync: true,
    }
  );

  return {
    suggestions: suggestions || [],
    loading,
    error,
    refresh: invalidate,
  };
};

export const useMDLPriceEstimate = (itemName) => {
  const {
    data: priceData,
    loading,
    error,
    invalidate,
  } = useSmartState(
    `mdl_price_${itemName}`,
    () => mdlAPI.getPriceEstimate(itemName),
    {
      cacheExpiry: 30,
      optimistic: false,
      autoSync: true,
    }
  );

  return {
    price: priceData?.price,
    confidence: priceData?.confidence,
    loading,
    error,
    refresh: invalidate,
  };
};

export const useMDLAislePrediction = (itemName, storeId) => {
  const {
    data: aisleData,
    loading,
    error,
    update,
    invalidate,
  } = useSmartState(
    `mdl_aisle_${itemName}_${storeId}`,
    () => mdlAPI.getAislePrediction(itemName, storeId),
    {
      cacheExpiry: 120,
      optimistic: true,
      autoSync: true,
    }
  );

  const reportAisle = useCallback(async (aisleNumber, wasCorrect) => {
    await mdlAPI.reportAisle(itemName, storeId, aisleNumber, wasCorrect);
    await invalidate();
  }, [itemName, storeId, invalidate]);

  return {
    aisle: aisleData?.aisle,
    confidence: aisleData?.confidence,
    loading,
    error,
    reportAisle,
    refresh: invalidate,
  };
};

export default useMDLPatterns;
