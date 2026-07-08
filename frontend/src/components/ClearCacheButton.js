import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const ClearCacheButton = () => {
  const [clearing, setClearing] = useState(false);

  const clearAllCaches = async () => {
    if (!confirm('Clear all caches and reload? This will ensure you have the latest version.')) {
      return;
    }

    setClearing(true);

    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('Unregistered service worker:', registration);
        }
      }

      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('Deleted cache:', cacheName);
        }
      }

      // 3. Clear localStorage (except user preferences)
      const userPrefs = localStorage.getItem('shopping_user_preferences');
      localStorage.clear();
      if (userPrefs) {
        localStorage.setItem('shopping_user_preferences', userPrefs);
      }

      // 4. Clear sessionStorage
      sessionStorage.clear();

      // 5. Hard reload
      console.log('All caches cleared! Reloading...');
      window.location.reload(true);
    } catch (error) {
      console.error('Error clearing caches:', error);
      alert('Error clearing caches. Try manually: Ctrl+Shift+Delete');
      setClearing(false);
    }
  };

  return (
    <button
      onClick={clearAllCaches}
      disabled={clearing}
      className="flex items-center space-x-2 px-3 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50"
      title="Clear all caches and reload to get the latest version"
    >
      <RefreshCw className={`w-4 h-4 ${clearing ? 'animate-spin' : ''}`} />
      <span>{clearing ? 'Clearing...' : 'Clear Cache'}</span>
    </button>
  );
};

export default ClearCacheButton;
