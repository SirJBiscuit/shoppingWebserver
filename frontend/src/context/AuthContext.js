import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Shared session handoff — quick login verifies server-side then lands here
  // with the same {token, user} shape the normal login produces.
  const loginWithToken = (token, nextUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(nextUser));
    // Set user state immediately to prevent double reload
    setUser(nextUser);
    return nextUser;
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const { token, user } = response.data;
      return { success: true, user: loginWithToken(token, user) };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (username, password) => {
    try {
      const response = await authAPI.register({ username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    // Preserve user preferences across logout
    const lastListId = localStorage.getItem('lastActiveListId');
    const adminToolbarHidden = localStorage.getItem('adminToolbarHidden');
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Restore preserved preferences
    if (lastListId) {
      localStorage.setItem('lastActiveListId', lastListId);
    }
    if (adminToolbarHidden) {
      localStorage.setItem('adminToolbarHidden', adminToolbarHidden);
    }
    
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
