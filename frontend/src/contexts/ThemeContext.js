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

  // Load theme preference from backend
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await api.get('/categories/preferences');
        if (response.data.dark_mode !== undefined) {
          setIsDark(response.data.dark_mode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        // Use localStorage as fallback
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'true');
        }
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

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Save to backend
    try {
      await api.post('/categories/preferences', {
        dark_mode: newTheme
      });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};
