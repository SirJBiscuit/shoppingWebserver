import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Layout Hotswap Hook
 * Dynamically loads and switches between role-based dashboard layouts
 * 
 * Supports:
 * - Admin layout (full access to all tools)
 * - Beta tester layout (simplified with feedback widget)
 * - User layout (standard dashboard)
 */
export const useLayoutHotswap = () => {
  const { user } = useAuth();
  const [currentLayout, setCurrentLayout] = useState(null);
  const [availableLayouts, setAvailableLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine user's role
  const getUserRole = () => {
    if (!user) return 'guest';
    if (user.is_admin) return 'admin';
    if (user.role === 'beta_tester') return 'beta_tester';
    return 'user';
  };

  // Fetch available layouts for user's role
  useEffect(() => {
    const fetchLayouts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const role = getUserRole();
        
        // Fetch layouts from API
        const response = await api.get(`/layouts/role/${role}`);
        const layouts = response.data;

        setAvailableLayouts(layouts);

        // Set default layout (first active layout for role)
        const defaultLayout = layouts.find(l => l.is_active && l.is_default) || layouts[0];
        if (defaultLayout) {
          setCurrentLayout(defaultLayout);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching layouts:', err);
        setError('Failed to load layout');
        
        // Fallback to default layout structure
        setCurrentLayout(getDefaultLayoutForRole(getUserRole()));
      } finally {
        setLoading(false);
      }
    };

    fetchLayouts();
  }, [user]);

  // Switch to a different layout
  const switchLayout = async (layoutId) => {
    try {
      const layout = availableLayouts.find(l => l.id === layoutId);
      if (!layout) {
        throw new Error('Layout not found');
      }

      setCurrentLayout(layout);

      // Save user's layout preference
      if (user) {
        await api.post('/layouts/user-preference', {
          layoutId: layoutId
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Error switching layout:', err);
      return { success: false, error: err.message };
    }
  };

  // Get default layout structure for a role (fallback)
  const getDefaultLayoutForRole = (role) => {
    const defaultLayouts = {
      admin: {
        id: 'default-admin',
        name: 'Admin Dashboard',
        role: 'admin',
        config: {
          sections: [
            { id: 'stats', component: 'StatsOverview', order: 1, enabled: true },
            { id: 'beta-analytics', component: 'BetaAnalyticsCFS', order: 2, enabled: true },
            { id: 'beta-codes', component: 'BetaCodeManagerCFS', order: 3, enabled: true },
            { id: 'beta-testers', component: 'BetaTesterManagementCFS', order: 4, enabled: true },
            { id: 'beta-feedback', component: 'BetaFeedbackDashboardCFS', order: 5, enabled: true },
            { id: 'user-management', component: 'UserManagement', order: 6, enabled: true },
            { id: 'system-settings', component: 'SystemSettings', order: 7, enabled: true }
          ],
          theme: 'professional',
          sidebar: true,
          compactMode: false
        }
      },
      beta_tester: {
        id: 'default-beta',
        name: 'Beta Tester Dashboard',
        role: 'beta_tester',
        config: {
          sections: [
            { id: 'shopping-list', component: 'ShoppingList', order: 1, enabled: true },
            { id: 'feedback-widget', component: 'BetaFeedbackWidget', order: 2, enabled: true },
            { id: 'contribution-stats', component: 'ContributionStats', order: 3, enabled: true },
            { id: 'thank-you-messages', component: 'ThankYouMessages', order: 4, enabled: true }
          ],
          theme: 'simplified',
          sidebar: false,
          compactMode: true,
          showBetaBadge: true
        }
      },
      user: {
        id: 'default-user',
        name: 'User Dashboard',
        role: 'user',
        config: {
          sections: [
            { id: 'shopping-list', component: 'ShoppingList', order: 1, enabled: true },
            { id: 'quick-add', component: 'QuickAdd', order: 2, enabled: true },
            { id: 'recent-items', component: 'RecentItems', order: 3, enabled: true },
            { id: 'suggestions', component: 'SmartSuggestions', order: 4, enabled: true }
          ],
          theme: 'standard',
          sidebar: false,
          compactMode: false
        }
      },
      guest: {
        id: 'default-guest',
        name: 'Guest Dashboard',
        role: 'guest',
        config: {
          sections: [
            { id: 'welcome', component: 'WelcomeMessage', order: 1, enabled: true },
            { id: 'demo-list', component: 'DemoShoppingList', order: 2, enabled: true }
          ],
          theme: 'minimal',
          sidebar: false,
          compactMode: true
        }
      }
    };

    return defaultLayouts[role] || defaultLayouts.guest;
  };

  // Get sections for current layout
  const getSections = () => {
    if (!currentLayout || !currentLayout.config) {
      return [];
    }

    return currentLayout.config.sections
      .filter(section => section.enabled)
      .sort((a, b) => a.order - b.order);
  };

  // Check if a specific section is enabled
  const isSectionEnabled = (sectionId) => {
    const sections = getSections();
    return sections.some(s => s.id === sectionId);
  };

  // Get layout theme
  const getTheme = () => {
    return currentLayout?.config?.theme || 'standard';
  };

  // Get layout settings
  const getSettings = () => {
    return {
      sidebar: currentLayout?.config?.sidebar || false,
      compactMode: currentLayout?.config?.compactMode || false,
      showBetaBadge: currentLayout?.config?.showBetaBadge || false
    };
  };

  return {
    currentLayout,
    availableLayouts,
    loading,
    error,
    role: getUserRole(),
    switchLayout,
    getSections,
    isSectionEnabled,
    getTheme,
    getSettings
  };
};

export default useLayoutHotswap;
