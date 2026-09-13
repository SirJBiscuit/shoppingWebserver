import React, { createContext, useContext, useState, useEffect } from 'react';

const OptimizationContext = createContext();

export const useOptimization = () => {
  const context = useContext(OptimizationContext);
  if (!context) {
    throw new Error('useOptimization must be used within OptimizationProvider');
  }
  return context;
};

export const OptimizationProvider = ({ children }) => {
  const [optimizationMode, setOptimizationMode] = useState(() => {
    // Check localStorage first - user preference takes priority
    const saved = localStorage.getItem('optimizationMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Auto-enable for tablets/mobile ONLY on first visit
    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Set localStorage so this only happens once
      localStorage.setItem('optimizationMode', 'true');
      return true;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('optimizationMode', optimizationMode);
    
    // Apply optimization class to body
    if (optimizationMode) {
      document.body.classList.add('optimization-mode');
    } else {
      document.body.classList.remove('optimization-mode');
    }
  }, [optimizationMode]);

  const toggleOptimization = () => {
    setOptimizationMode(prev => !prev);
  };

  return (
    <OptimizationContext.Provider value={{ optimizationMode, toggleOptimization }}>
      {children}
    </OptimizationContext.Provider>
  );
};

export default OptimizationContext;
