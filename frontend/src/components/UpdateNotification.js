import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Zap, Star, CheckCircle, Smartphone, Monitor, Tablet } from 'lucide-react';

const UpdateNotification = () => {
  const [showModal, setShowModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [platform, setPlatform] = useState('web');

  useEffect(() => {
    detectPlatform();
    checkForUpdates();
    
    // Check for updates every 2 minutes (more frequent for better UX)
    const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  const detectPlatform = () => {
    // Detect if running as native app (future)
    if (window.ReactNativeWebView) {
      setPlatform('native-mobile');
    } else if (window.AndroidInterface) {
      setPlatform('android');
    } else if (window.webkit?.messageHandlers?.iOS) {
      setPlatform('ios');
    } else {
      // Web platform - detect device type
      const width = window.innerWidth;
      if (width < 768) {
        setPlatform('web-mobile');
      } else if (width < 1024) {
        setPlatform('web-tablet');
      } else {
        setPlatform('web-desktop');
      }
    }
  };

  const checkForUpdates = async () => {
    try {
      // Check for system notifications from backend
      const token = localStorage.getItem('token');
      if (!token) return; // Only check if user is logged in
      
      const response = await fetch('/api/system/notifications?limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const notifications = await response.json();
        
        // Look for update_success notification
        const updateNotification = notifications.find(n => n.type === 'update_success');
        
        if (updateNotification) {
          const localVersion = localStorage.getItem('app_version');
          const serverVersion = updateNotification.data?.version || updateNotification.data?.newCommit;
          
          // If versions don't match, show mandatory update notification
          if (!localVersion || localVersion !== serverVersion) {
            console.log('🔔 New update detected from server:', {
              current: serverVersion,
              previous: localVersion,
              notification: updateNotification
            });
            
            setUpdateInfo({
              current: serverVersion?.substring(0, 7) || 'latest',
              previous: localVersion?.substring(0, 7) || 'old',
              updated: updateNotification.created_at,
              message: updateNotification.message || 'New features and improvements available!',
              notificationId: updateNotification.id
            });
            setShowModal(true);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Mark notification as read
      if (updateInfo?.notificationId) {
        const token = localStorage.getItem('token');
        await fetch(`/api/system/notifications/${updateInfo.notificationId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      // Update stored version
      if (updateInfo?.current) {
        localStorage.setItem('app_version', updateInfo.current);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    
    // Platform-specific update logic
    if (platform.startsWith('native-') || platform === 'android' || platform === 'ios') {
      // Native app update - trigger app store update or in-app update
      if (window.AndroidInterface?.checkForUpdate) {
        window.AndroidInterface.checkForUpdate();
      } else if (window.webkit?.messageHandlers?.checkForUpdate) {
        window.webkit.messageHandlers.checkForUpdate.postMessage({});
      } else if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CHECK_UPDATE' }));
      }
      setIsUpdating(false);
      setShowModal(false);
    } else {
      // Web platform - aggressive cache clearing and forced reload
      console.log('🔄 Clearing all caches and reloading...');
      
      setTimeout(async () => {
        // Clear Service Worker caches
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            console.log(`🗑️  Deleting ${cacheNames.length} caches...`);
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          } catch (err) {
            console.error('Error clearing caches:', err);
          }
        }
        
        // Unregister service workers
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            console.log('🗑️  Service workers unregistered');
          } catch (err) {
            console.error('Error unregistering service workers:', err);
          }
        }
        
        // Clear localStorage except auth token
        const token = localStorage.getItem('token');
        localStorage.clear();
        if (token) localStorage.setItem('token', token);
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Force hard reload from server (bypasses all caches)
        console.log('🚀 Forcing hard reload...');
        window.location.href = window.location.href + '?v=' + Date.now();
      }, 1000);
    }
  };

  const getPlatformIcon = () => {
    if (platform.includes('mobile')) return Smartphone;
    if (platform.includes('tablet')) return Tablet;
    return Monitor;
  };

  const getPlatformText = () => {
    if (platform.startsWith('native-') || platform === 'android' || platform === 'ios') {
      return 'App Update';
    }
    if (platform === 'web-mobile') return 'Mobile Web';
    if (platform === 'web-tablet') return 'Tablet Web';
    return 'Desktop Web';
  };

  if (!showModal || !updateInfo) return null;

  const PlatformIcon = getPlatformIcon();
  const isMobile = platform.includes('mobile');
  const isNative = platform.startsWith('native-') || platform === 'android' || platform === 'ios';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] ${
          isMobile ? 'flex items-end' : 'flex items-center justify-center p-4'
        }`}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary-400/30 rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
              }}
              animate={{
                y: [null, Math.random() * window.innerHeight],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: isMobile ? 100 : 50 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={`relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-2xl w-full overflow-hidden ${
            isMobile 
              ? 'rounded-t-3xl max-w-full' 
              : 'rounded-2xl max-w-md'
          }`}
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 opacity-20 blur-xl" />

          {/* Content */}
          <div className={`relative ${isMobile ? 'p-6' : 'p-8'}`}>
            {/* Platform Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                <PlatformIcon className="w-3.5 h-3.5" />
                {getPlatformText()}
              </div>
            </motion.div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`mx-auto bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg ${
                isMobile ? 'w-16 h-16' : 'w-20 h-20'
              }`}
            >
              <Sparkles className={`text-white ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`} />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"
            >
              New Update Available! 🎉
            </motion.h2>

            {/* Version info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-6"
            >
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {updateInfo.message}
              </p>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-mono">
                  {updateInfo.previous}
                </span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Zap className="w-4 h-4 text-primary-600" />
                </motion.div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-mono">
                  {updateInfo.current}
                </span>
              </div>
            </motion.div>

            {/* Features list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  What's New
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Performance improvements and bug fixes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>New features and enhancements</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Updated UI and better user experience</span>
                </li>
              </ul>
            </motion.div>

            {/* Action button - Single mandatory update */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {isNative ? 'Opening Store...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    {isNative ? 'Update from Store' : 'Update App'}
                  </>
                )}
              </button>
            </motion.div>

            {/* Update time */}
            {updateInfo.updated && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xs text-center text-gray-500 dark:text-gray-500 mt-4"
              >
                Released: {new Date(updateInfo.updated).toLocaleString()}
              </motion.p>
            )}
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-400/20 to-purple-400/20 rounded-full blur-3xl" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotification;
