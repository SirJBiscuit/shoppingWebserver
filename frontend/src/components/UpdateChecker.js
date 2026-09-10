import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, AlertCircle } from 'lucide-react';

const UpdateChecker = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [serverVersion, setServerVersion] = useState(null);

  useEffect(() => {
    checkForUpdates();
    
    // Check for updates every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      // Get client version from localStorage
      const clientVersion = localStorage.getItem('appVersion');
      
      // Check server version
      const response = await fetch('/api/version/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientVersion })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.updateNeeded) {
          console.log('🔄 Update available!', data);
          setUpdateAvailable(true);
          setServerVersion(data.serverVersion);
          setShowBanner(true);
        } else {
          // Update client version if it's not set
          if (!clientVersion && data.serverVersion) {
            localStorage.setItem('appVersion', data.serverVersion);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleUpdate = () => {
    // Save the new version to localStorage
    if (serverVersion) {
      localStorage.setItem('appVersion', serverVersion);
    }
    
    // Reload the page to get the new version
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    
    // Show again in 30 minutes if dismissed
    setTimeout(() => {
      if (updateAvailable) {
        setShowBanner(true);
      }
    }, 30 * 60 * 1000);
  };

  return (
    <AnimatePresence>
      {showBanner && updateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 animate-pulse" />
                <div>
                  <p className="font-semibold">New Update Available!</p>
                  <p className="text-sm text-blue-100">
                    A new version of the app is ready. Refresh to get the latest features and fixes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUpdate}
                  className="flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Update Now</span>
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Remind me later"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateChecker;
