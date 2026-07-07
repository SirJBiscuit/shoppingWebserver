import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize from localStorage synchronously
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved === 'false' ? false : true; // Default to dark
    } catch {
      return true;
    }
  });

  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('darkMode', String(newValue));
        if (newValue) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
      return newValue;
    });
  };

  // Apply initial theme immediately
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Only run once on mount

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, loading: false }}>
      {children}
    </ThemeContext.Provider>
  );
};
