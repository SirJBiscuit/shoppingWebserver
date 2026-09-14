import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const ClearCacheButton = () => {
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearAllCaches = async () => {
    setShowConfirm(false);
    setClearing(true);

    try {
      console.log('🧹 Starting comprehensive cache clear...');
      
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`Found ${registrations.length} service worker(s)`);
        for (const registration of registrations) {
          await registration.unregister();
          console.log('✓ Unregistered service worker:', registration.scope);
        }
      }

      // 2. Clear all caches (Cache API)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`Found ${cacheNames.length} cache(s):`, cacheNames);
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log('✓ Deleted cache:', cacheName);
        }
      }

      // 3. Clear localStorage (preserve essential data)
      const userPrefs = localStorage.getItem('shopping_user_preferences');
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      console.log('Clearing localStorage...');
      localStorage.clear();
      // Restore essential data
      if (userPrefs) localStorage.setItem('shopping_user_preferences', userPrefs);
      if (token) localStorage.setItem('token', token);
      if (userId) localStorage.setItem('userId', userId);
      console.log('✓ localStorage cleared (preserved auth)');

      // 4. Clear sessionStorage
      sessionStorage.clear();
      console.log('✓ sessionStorage cleared');

      // 5. Clear IndexedDB (if any)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
              console.log('✓ Deleted IndexedDB:', db.name);
            }
          }
        } catch (e) {
          console.log('IndexedDB clear skipped (not supported)');
        }
      }

      // 6. Add cache-busting timestamp to force reload
      const timestamp = Date.now();
      console.log(`🔄 Cache cleared! Reloading with timestamp: ${timestamp}`);
      
      // 7. Force hard reload with cache bypass
      setTimeout(() => {
        window.location.href = window.location.href.split('?')[0] + '?_=' + timestamp;
      }, 500);
      
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      console.error('Try manually: Ctrl+Shift+Delete or Settings > Clear browsing data');
      setClearing(false);
      // Reload anyway to try to fix issues
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={clearing}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50"
        title="Clear all caches and reload to get the latest version"
      >
        <RefreshCw className={`w-4 h-4 ${clearing ? 'animate-spin' : ''}`} />
        <span>{clearing ? 'Clearing...' : 'Clear Cache'}</span>
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Clear Cache & Reload"
        message="This will clear all caches and reload the page to ensure you have the latest version. Continue?"
        onConfirm={clearAllCaches}
        onCancel={() => setShowConfirm(false)}
        confirmText="Clear & Reload"
        cancelText="Cancel"
        type="warning"
      />
    </>
  );
};

export default ClearCacheButton;
