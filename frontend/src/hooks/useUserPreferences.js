/**
 * CFS User Preferences Hook
 * 
 * Smart state management for user preferences with instant updates
 */

import { useCallback } from 'react';
import useSmartState from './useSmartState';
import * as userAPI from '../api/user';

export const useUserPreferences = () => {
  const {
    data: preferences,
    loading,
    error,
    update,
    setData,
    invalidate,
  } = useSmartState(
    'user_preferences',
    userAPI.getPreferences,
    {
      cacheExpiry: 240,
      optimistic: true,
      autoSync: true,
    }
  );

  const updatePreference = useCallback(async (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
    
    try {
      await userAPI.updatePreference(key, value);
    } catch (error) {
      console.error('Failed to save preference:', error);
      await invalidate();
    }
  }, [setData, invalidate]);

  const updateTheme = useCallback(async (theme) => {
    await updatePreference('theme', theme);
  }, [updatePreference]);

  const updateNotifications = useCallback(async (enabled) => {
    await updatePreference('notifications_enabled', enabled);
  }, [updatePreference]);

  const updateSounds = useCallback(async (enabled) => {
    await updatePreference('sounds_enabled', enabled);
  }, [updatePreference]);

  const updateLanguage = useCallback(async (language) => {
    await updatePreference('language', language);
  }, [updatePreference]);

  return {
    preferences: preferences || {},
    loading,
    error,
    updatePreference,
    updateTheme,
    updateNotifications,
    updateSounds,
    updateLanguage,
    refresh: invalidate,
  };
};

export default useUserPreferences;
