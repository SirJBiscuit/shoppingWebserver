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
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [loading, setLoading] = useState(true);

  // Load theme preference from localStorage (don't call API on login page)
  useEffect(() => {
    const loadTheme = () => {
      try {
        // Use localStorage for theme preference
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'true');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (loading) return;
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage as backup
    localStorage.setItem('darkMode', isDark.toString());
  }, [isDark, loading]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    // Theme is automatically saved to localStorage via the useEffect above
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};
