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
    console.log('ThemeContext: Loading theme from localStorage');
    const loadTheme = () => {
      try {
        // Use localStorage for theme preference
        const savedTheme = localStorage.getItem('darkMode');
        console.log('ThemeContext: Saved theme:', savedTheme);
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
    
    console.log('ThemeContext: Applying theme, isDark:', isDark);
    
    const currentTheme = document.documentElement.classList.contains('dark');
    const shouldBeDark = isDark;
    
    // Only update if theme actually changed
    if (currentTheme !== shouldBeDark) {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Save to localStorage
      localStorage.setItem('darkMode', isDark.toString());
      console.log('ThemeContext: Theme updated to', isDark ? 'dark' : 'light');
    }
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
