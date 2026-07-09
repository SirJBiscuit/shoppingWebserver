import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync items
    checkPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingSync = () => {
    const pending = localStorage.getItem('pendingSync');
    if (pending) {
      try {
        const items = JSON.parse(pending);
        setPendingSync(items.length);
      } catch (e) {
        setPendingSync(0);
      }
    }
  };

  const syncPendingData = async () => {
    const pending = localStorage.getItem('pendingSync');
    if (!pending) return;

    try {
      const items = JSON.parse(pending);
      // Sync each pending item
      for (const item of items) {
        // Make API call to sync
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: JSON.stringify(item.data)
        });
      }
      // Clear pending sync
      localStorage.removeItem('pendingSync');
      setPendingSync(0);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (!showNotification && isOnline && pendingSync === 0) {
    return null;
  }

  return (
    <>
      {/* Persistent Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white py-2 px-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-5 h-5 animate-pulse" />
              <span className="font-medium">You're offline</span>
              <span className="text-sm opacity-90">- Changes will sync when reconnected</span>
            </div>
            {pendingSync > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <CloudOff className="w-4 h-4" />
                <span>{pendingSync} pending changes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Online Notification (temporary) */}
      {showNotification && isOnline && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white py-3 px-4 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in">
          <Wifi className="w-5 h-5" />
          <span className="font-medium">Back online!</span>
          {pendingSync > 0 && (
            <>
              <RefreshCw className="w-4 h-4 animate-spin ml-2" />
              <span className="text-sm">Syncing {pendingSync} changes...</span>
            </>
          )}
        </div>
      )}

      {/* Sync Status Indicator */}
      {isOnline && pendingSync > 0 && !showNotification && (
        <div className="fixed bottom-4 right-4 z-40 bg-blue-500 text-white py-2 px-4 rounded-full shadow-lg flex items-center space-x-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing...</span>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
