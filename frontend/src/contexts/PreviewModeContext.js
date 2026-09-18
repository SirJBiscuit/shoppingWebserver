import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * PreviewModeContext - Manage preview mode state globally
 * 
 * Allows admins to preview the app as different user roles
 * without logging out or changing their actual role.
 */

const PreviewModeContext = createContext();

export const usePreviewMode = () => {
  const context = useContext(PreviewModeContext);
  if (!context) {
    throw new Error('usePreviewMode must be used within PreviewModeProvider');
  }
  return context;
};

export const PreviewModeProvider = ({ children, user }) => {
  const [previewRole, setPreviewRole] = useState(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  
  // Get effective role (preview role if active, otherwise actual role)
  const effectiveRole = isPreviewActive && previewRole ? previewRole : user?.role;
  
  // Check if user is admin (only admins can use preview mode)
  const canUsePreview = user?.role === 'admin' || user?.is_admin;
  
  const enterPreviewMode = (role) => {
    if (!canUsePreview) {
      console.warn('Only admins can use preview mode');
      return;
    }
    
    setPreviewRole(role);
    setIsPreviewActive(true);
    
    // Store in sessionStorage for persistence across page refreshes
    sessionStorage.setItem('previewMode', JSON.stringify({ role, active: true }));
  };
  
  const exitPreviewMode = () => {
    setPreviewRole(null);
    setIsPreviewActive(false);
    sessionStorage.removeItem('previewMode');
  };
  
  // Restore preview mode from sessionStorage on mount
  useEffect(() => {
    if (!canUsePreview) return;
    
    const stored = sessionStorage.getItem('previewMode');
    if (stored) {
      try {
        const { role, active } = JSON.parse(stored);
        if (active) {
          setPreviewRole(role);
          setIsPreviewActive(true);
        }
      } catch (error) {
        console.error('Failed to restore preview mode:', error);
        sessionStorage.removeItem('previewMode');
      }
    }
  }, [canUsePreview]);
  
  // Helper functions for role checks
  const isUser = () => effectiveRole === 'user';
  const isBeta = () => effectiveRole === 'beta' || effectiveRole === 'admin';
  const isAdmin = () => effectiveRole === 'admin';
  
  // Check if specific feature should be visible
  const canAccess = (requiredRole) => {
    if (requiredRole === 'user') return true;
    if (requiredRole === 'beta') return isBeta();
    if (requiredRole === 'admin') return isAdmin();
    return false;
  };
  
  const value = {
    // State
    previewRole,
    isPreviewActive,
    effectiveRole,
    actualRole: user?.role,
    canUsePreview,
    
    // Actions
    enterPreviewMode,
    exitPreviewMode,
    
    // Helpers
    isUser,
    isBeta,
    isAdmin,
    canAccess
  };
  
  return (
    <PreviewModeContext.Provider value={value}>
      {children}
    </PreviewModeContext.Provider>
  );
};

export default PreviewModeContext;
