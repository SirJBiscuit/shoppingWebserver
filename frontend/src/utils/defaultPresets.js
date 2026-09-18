/**
 * Default Presets - Original layouts and configurations
 * 
 * These are the DEFAULT configurations that match our current implementation.
 * Admins can customize from these and RESET back to defaults anytime.
 */

import { createWidgetConfig, WIDGET_TYPES } from './widgetConfig';

/**
 * DEFAULT DASHBOARD LAYOUT
 * This matches our current Dashboard.js implementation
 */
export const DEFAULT_DASHBOARD_LAYOUT = {
  id: 'dashboard_default',
  name: 'Default Dashboard Layout',
  version: '1.0.0',
  description: 'Original dashboard layout - the starting point for all customizations',
  
  widgets: [
    // Looking for Next Section
    {
      id: 'looking_for_next_section',
      type: WIDGET_TYPES.SECTION,
      name: 'Looking for Next Section',
      layout: {
        position: 'relative',
        width: '100%',
        padding: { top: 16, right: 16, bottom: 16, left: 16 }
      },
      children: [
        {
          id: 'next_item_suggestion',
          type: WIDGET_TYPES.NEXT_ITEM_SUGGESTION,
          name: 'Next Item Suggestion',
          animation: {
            enabled: true,
            type: 'fadeIn',
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.3 }
          }
        }
      ]
    },
    
    // Shopping List Section
    {
      id: 'shopping_list_section',
      type: WIDGET_TYPES.SECTION,
      name: 'Shopping List Section',
      layout: {
        position: 'relative',
        width: '100%'
      },
      children: [
        {
          id: 'item_list',
          type: WIDGET_TYPES.ITEM_LIST,
          name: 'Shopping List Items',
          animation: {
            enabled: true,
            type: 'fadeIn'
          }
        }
      ]
    },
    
    // Budget Tracker Section
    {
      id: 'budget_tracker_section',
      type: WIDGET_TYPES.SECTION,
      name: 'Budget Tracker Section',
      layout: {
        position: 'relative',
        width: '100%',
        padding: { top: 16, right: 16, bottom: 16, left: 16 }
      },
      children: [
        {
          id: 'budget_tracker',
          type: WIDGET_TYPES.BUDGET_TRACKER,
          name: 'Budget Tracker',
          animation: {
            enabled: true,
            type: 'slideInUp'
          }
        }
      ]
    },
    
    // Pantry Quick View Section
    {
      id: 'pantry_section',
      type: WIDGET_TYPES.SECTION,
      name: 'Pantry Quick View Section',
      layout: {
        position: 'relative',
        width: '100%',
        padding: { top: 16, right: 16, bottom: 16, left: 16 }
      },
      children: [
        {
          id: 'pantry_quick_view',
          type: WIDGET_TYPES.PANTRY_QUICK_VIEW,
          name: 'Pantry Quick View'
        }
      ]
    }
  ]
};

/**
 * DEFAULT SIDEBAR LAYOUT
 * This matches our current Sidebar.js implementation
 */
export const DEFAULT_SIDEBAR_LAYOUT = {
  id: 'sidebar_default',
  name: 'Default Sidebar Layout',
  version: '1.0.0',
  description: 'Original sidebar layout with working features only',
  
  widgets: [
    // Dashboard Link
    {
      id: 'nav_dashboard',
      type: WIDGET_TYPES.BUTTON,
      name: 'Dashboard Navigation',
      content: {
        text: 'Dashboard',
        icon: 'Home',
        iconPosition: 'left'
      },
      interaction: {
        onClick: 'navigateToDashboard'
      },
      style: {
        backgroundColor: 'transparent',
        textColor: 'inherit'
      }
    },
    
    // Pantry Link
    {
      id: 'nav_pantry',
      type: WIDGET_TYPES.BUTTON,
      name: 'Pantry Navigation',
      content: {
        text: 'Pantry',
        icon: 'Package',
        iconPosition: 'left'
      },
      interaction: {
        onClick: 'navigateToPantry'
      }
    },
    
    // Recipes Link
    {
      id: 'nav_recipes',
      type: WIDGET_TYPES.BUTTON,
      name: 'Recipes Navigation',
      content: {
        text: 'Recipes',
        icon: 'ChefHat',
        iconPosition: 'left'
      },
      interaction: {
        onClick: 'navigateToRecipes'
      }
    },
    
    // Settings Link
    {
      id: 'nav_settings',
      type: WIDGET_TYPES.BUTTON,
      name: 'Settings Navigation',
      content: {
        text: 'Settings',
        icon: 'Settings',
        iconPosition: 'left'
      },
      interaction: {
        onClick: 'navigateToSettings'
      }
    },
    
    // Admin Link (conditional - only for admins)
    {
      id: 'nav_admin',
      type: WIDGET_TYPES.BUTTON,
      name: 'Admin Navigation',
      content: {
        text: 'Admin',
        icon: 'Shield',
        iconPosition: 'left'
      },
      interaction: {
        onClick: 'navigateToAdmin'
      },
      conditions: {
        showIf: 'props.user.role === "admin"'
      }
    }
  ]
};

/**
 * DEFAULT COMPONENT PRESETS
 * Default configurations for each custom component
 */
export const DEFAULT_COMPONENT_PRESETS = {
  // CustomPanel Default
  [WIDGET_TYPES.CUSTOM_PANEL]: createWidgetConfig(WIDGET_TYPES.CUSTOM_PANEL, {
    name: 'Default Panel',
    layout: {
      position: 'right',
      width: '400px',
      height: '100vh'
    },
    animation: {
      enabled: true,
      type: 'panelSlideIn',
      initial: { x: '100%', opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 },
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    style: {
      backgroundColor: '#ffffff',
      boxShadow: '-4px 0 6px rgba(0,0,0,0.1)'
    }
  }),
  
  // CustomKeypad Default
  [WIDGET_TYPES.CUSTOM_KEYPAD]: createWidgetConfig(WIDGET_TYPES.CUSTOM_KEYPAD, {
    name: 'Default Keypad',
    content: {
      maxDigits: 10
    },
    style: {
      backgroundColor: '#f9fafb'
    }
  }),
  
  // CustomNotification Default
  [WIDGET_TYPES.CUSTOM_NOTIFICATION]: createWidgetConfig(WIDGET_TYPES.CUSTOM_NOTIFICATION, {
    name: 'Default Notification',
    layout: {
      position: 'top-right'
    },
    animation: {
      enabled: true,
      type: 'slideInRight',
      initial: { x: 100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 100, opacity: 0 }
    }
  }),
  
  // CustomPriceBadge Default
  [WIDGET_TYPES.CUSTOM_PRICE_BADGE]: createWidgetConfig(WIDGET_TYPES.CUSTOM_PRICE_BADGE, {
    name: 'Default Price Badge',
    content: {
      variant: 'default'
    },
    animation: {
      enabled: true,
      type: 'scaleIn'
    }
  }),
  
  // CustomRadialMenu Default
  [WIDGET_TYPES.CUSTOM_RADIAL_MENU]: createWidgetConfig(WIDGET_TYPES.CUSTOM_RADIAL_MENU, {
    name: 'Default Radial Menu',
    content: {
      shape: 'circle',
      direction: 'auto',
      size: 'md'
    },
    animation: {
      enabled: true,
      type: 'scaleIn'
    }
  }),
  
  // Button Default
  [WIDGET_TYPES.BUTTON]: createWidgetConfig(WIDGET_TYPES.BUTTON, {
    name: 'Default Button',
    style: {
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600'
    },
    spacing: {
      padding: { top: 8, right: 16, bottom: 8, left: 16 }
    },
    animation: {
      enabled: true,
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 }
    }
  }),
  
  // Input Default
  [WIDGET_TYPES.INPUT]: createWidgetConfig(WIDGET_TYPES.INPUT, {
    name: 'Default Input',
    style: {
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderWidth: '1px',
      borderColor: '#d1d5db',
      borderRadius: '8px',
      fontSize: '14px'
    },
    spacing: {
      padding: { top: 8, right: 12, bottom: 8, left: 12 }
    }
  })
};

/**
 * Get default preset for a widget type
 */
export const getDefaultPreset = (widgetType) => {
  return DEFAULT_COMPONENT_PRESETS[widgetType] || createWidgetConfig(widgetType);
};

/**
 * Get default dashboard layout
 */
export const getDefaultDashboard = () => {
  return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT));
};

/**
 * Get default sidebar layout
 */
export const getDefaultSidebar = () => {
  return JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_LAYOUT));
};

/**
 * Reset widget to default
 */
export const resetToDefault = (widgetType) => {
  const defaultPreset = getDefaultPreset(widgetType);
  return {
    ...defaultPreset,
    id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    metadata: {
      ...defaultPreset.metadata,
      restoredFromDefault: true,
      restoredAt: new Date().toISOString()
    }
  };
};

/**
 * Check if widget has been modified from default
 */
export const isModifiedFromDefault = (widget) => {
  const defaultPreset = getDefaultPreset(widget.type);
  
  // Compare key properties (excluding id, metadata, timestamps)
  const compareKeys = ['layout', 'spacing', 'style', 'content', 'animation'];
  
  for (const key of compareKeys) {
    if (JSON.stringify(widget[key]) !== JSON.stringify(defaultPreset[key])) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get all default presets
 */
export const getAllDefaultPresets = () => {
  return {
    dashboard: DEFAULT_DASHBOARD_LAYOUT,
    sidebar: DEFAULT_SIDEBAR_LAYOUT,
    components: DEFAULT_COMPONENT_PRESETS
  };
};

/**
 * Export default preset as template
 */
export const exportDefaultAsTemplate = (presetName) => {
  const presets = getAllDefaultPresets();
  const preset = presets[presetName];
  
  if (!preset) {
    console.error(`Preset "${presetName}" not found`);
    return null;
  }
  
  return {
    ...preset,
    metadata: {
      ...preset.metadata,
      isTemplate: true,
      exportedAt: new Date().toISOString()
    }
  };
};

export default {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_SIDEBAR_LAYOUT,
  DEFAULT_COMPONENT_PRESETS,
  getDefaultPreset,
  getDefaultDashboard,
  getDefaultSidebar,
  resetToDefault,
  isModifiedFromDefault,
  getAllDefaultPresets,
  exportDefaultAsTemplate
};
