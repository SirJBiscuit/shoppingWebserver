import { useState, useEffect } from 'react';

/**
 * Custom hook to detect device type and provide responsive features
 * Returns: { isMobile, isTablet, isDesktop, isTouchDevice, screenSize }
 */
export const useDeviceType = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenSize: 'desktop',
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check if touch device
      const isTouchDevice = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );

      // Detect device type based on screen width
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;

      // Determine screen size category
      let screenSize = 'desktop';
      if (isMobile) screenSize = 'mobile';
      else if (isTablet) screenSize = 'tablet';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize,
        width,
        height
      });
    };

    // Initial detection
    detectDevice();

    // Listen for window resize
    window.addEventListener('resize', detectDevice);
    
    // Listen for orientation change
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceInfo;
};

/**
 * Get touch-optimized sizes based on device type
 */
export const getTouchSizes = (deviceInfo) => {
  if (deviceInfo.isMobile) {
    return {
      buttonSize: 'h-12 px-4 text-base', // 48px minimum for touch
      iconSize: 24,
      spacing: 'gap-3',
      cardPadding: 'p-4',
      fontSize: 'text-base',
      minTouchTarget: 44 // iOS minimum
    };
  }

  if (deviceInfo.isTablet) {
    return {
      buttonSize: 'h-14 px-6 text-lg', // 56px for tablet
      iconSize: 28,
      spacing: 'gap-4',
      cardPadding: 'p-5',
      fontSize: 'text-lg',
      minTouchTarget: 48
    };
  }

  // Desktop
  return {
    buttonSize: 'h-10 px-4 text-sm',
    iconSize: 20,
    spacing: 'gap-2',
    cardPadding: 'p-3',
    fontSize: 'text-sm',
    minTouchTarget: 32
  };
};

export default useDeviceType;
