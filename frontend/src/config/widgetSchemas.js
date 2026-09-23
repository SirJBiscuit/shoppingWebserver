/**
 * Widget Schemas - Define editable properties for each widget
 * 
 * Schema Structure:
 * {
 *   widgetId: {
 *     name: 'Display Name',
 *     category: 'Category',
 *     properties: {
 *       propertyKey: {
 *         type: 'boolean' | 'color' | 'number' | 'select' | 'text' | 'range',
 *         label: 'Property Label',
 *         default: defaultValue,
 *         category: 'appearance' | 'layout' | 'behavior',
 *         // Type-specific options
 *       }
 *     }
 *   }
 * }
 */

export const widgetSchemas = {
  // Dashboard Main Card
  'dashboard': {
    name: 'Shopping List Dashboard',
    category: 'Main',
    properties: {
      showHeader: {
        type: 'boolean',
        label: 'Show Header',
        default: true,
        category: 'appearance',
      },
      backgroundColor: {
        type: 'color',
        label: 'Background Color',
        default: '#ffffff',
        category: 'appearance',
      },
      borderRadius: {
        type: 'range',
        label: 'Border Radius',
        default: 8,
        min: 0,
        max: 24,
        step: 1,
        category: 'appearance',
      },
      showStoreLocation: {
        type: 'boolean',
        label: 'Show Store Location',
        default: true,
        category: 'layout',
      },
      showListSelector: {
        type: 'boolean',
        label: 'Show List Selector',
        default: true,
        category: 'layout',
      },
      compactMode: {
        type: 'boolean',
        label: 'Compact Mode',
        default: false,
        category: 'layout',
      },
    },
  },

  // Sidebar
  'sidebar': {
    name: 'Navigation Sidebar',
    category: 'Navigation',
    properties: {
      backgroundColor: {
        type: 'color',
        label: 'Background Color',
        default: '#ffffff',
        category: 'appearance',
      },
      width: {
        type: 'number',
        label: 'Width (px)',
        default: 288,
        min: 200,
        max: 400,
        category: 'layout',
      },
      showIcons: {
        type: 'boolean',
        label: 'Show Icons',
        default: true,
        category: 'appearance',
      },
      iconColor: {
        type: 'color',
        label: 'Icon Color',
        default: '#6366f1',
        category: 'appearance',
      },
    },
  },

  // Budget Tracker
  'budget-tracker': {
    name: 'Budget Tracker',
    category: 'Stats',
    properties: {
      showChart: {
        type: 'boolean',
        label: 'Show Chart',
        default: true,
        category: 'appearance',
      },
      chartColor: {
        type: 'color',
        label: 'Chart Color',
        default: '#6366f1',
        category: 'appearance',
      },
      maxBudget: {
        type: 'number',
        label: 'Default Max Budget',
        default: 500,
        min: 0,
        max: 10000,
        category: 'behavior',
      },
      showPercentage: {
        type: 'boolean',
        label: 'Show Percentage',
        default: true,
        category: 'appearance',
      },
      warningThreshold: {
        type: 'range',
        label: 'Warning Threshold (%)',
        default: 80,
        min: 0,
        max: 100,
        category: 'behavior',
      },
    },
  },

  // Animated Cart
  'animated-cart': {
    name: 'Shopping Cart',
    category: 'Display',
    properties: {
      showAnimation: {
        type: 'boolean',
        label: 'Show Animations',
        default: true,
        category: 'behavior',
      },
      maxItemsDisplay: {
        type: 'number',
        label: 'Max Items to Display',
        default: 5,
        min: 1,
        max: 20,
        category: 'layout',
      },
      showImages: {
        type: 'boolean',
        label: 'Show Item Images',
        default: true,
        category: 'appearance',
      },
      compactMode: {
        type: 'boolean',
        label: 'Compact Mode',
        default: false,
        category: 'layout',
      },
    },
  },

  // Leveling System
  'leveling-system': {
    name: 'Leveling System',
    category: 'Gamification',
    properties: {
      showXPBar: {
        type: 'boolean',
        label: 'Show XP Progress Bar',
        default: true,
        category: 'appearance',
      },
      xpBarColor: {
        type: 'color',
        label: 'XP Bar Color',
        default: '#10b981',
        category: 'appearance',
      },
      showLevel: {
        type: 'boolean',
        label: 'Show Level Number',
        default: true,
        category: 'appearance',
      },
      showBadges: {
        type: 'boolean',
        label: 'Show Achievement Badges',
        default: true,
        category: 'appearance',
      },
      animateXPGain: {
        type: 'boolean',
        label: 'Animate XP Gains',
        default: true,
        category: 'behavior',
      },
    },
  },

  // Smart Suggestions
  'smart-suggestions': {
    name: 'Smart Suggestions',
    category: 'AI',
    properties: {
      maxSuggestions: {
        type: 'number',
        label: 'Max Suggestions',
        default: 5,
        min: 1,
        max: 20,
        category: 'layout',
      },
      showIcons: {
        type: 'boolean',
        label: 'Show Priority Icons',
        default: true,
        category: 'appearance',
      },
      showQuantity: {
        type: 'boolean',
        label: 'Show Suggested Quantity',
        default: true,
        category: 'appearance',
      },
      showReason: {
        type: 'boolean',
        label: 'Show Suggestion Reason',
        default: true,
        category: 'appearance',
      },
      showConfidence: {
        type: 'boolean',
        label: 'Show Confidence Score',
        default: false,
        category: 'appearance',
      },
      compactMode: {
        type: 'boolean',
        label: 'Compact Mode',
        default: false,
        category: 'layout',
      },
      maxHeight: {
        type: 'range',
        label: 'Max Height (px)',
        default: 384,
        min: 200,
        max: 800,
        step: 50,
        category: 'layout',
      },
      autoRefresh: {
        type: 'boolean',
        label: 'Auto Refresh',
        default: true,
        category: 'behavior',
      },
      refreshInterval: {
        type: 'number',
        label: 'Refresh Interval (seconds)',
        default: 30,
        min: 10,
        max: 300,
        category: 'behavior',
      },
      groupByPriority: {
        type: 'boolean',
        label: 'Group by Priority',
        default: false,
        category: 'behavior',
      },
    },
  },

  // Pantry Quick View
  'pantry-quick-view': {
    name: 'Pantry Quick View',
    category: 'Inventory',
    properties: {
      showExpiringOnly: {
        type: 'boolean',
        label: 'Show Expiring Items Only',
        default: false,
        category: 'behavior',
      },
      expiringDays: {
        type: 'number',
        label: 'Expiring Within (days)',
        default: 7,
        min: 1,
        max: 30,
        category: 'behavior',
      },
      maxItems: {
        type: 'number',
        label: 'Max Items to Display',
        default: 10,
        min: 1,
        max: 50,
        category: 'layout',
      },
      showCategories: {
        type: 'boolean',
        label: 'Group by Categories',
        default: true,
        category: 'layout',
      },
    },
  },

  // Next Item Suggestion
  'next-item-suggestion': {
    name: 'Looking for Next',
    category: 'Shopping',
    properties: {
      showAisle: {
        type: 'boolean',
        label: 'Show Aisle Information',
        default: true,
        category: 'appearance',
      },
      showCategory: {
        type: 'boolean',
        label: 'Show Category',
        default: true,
        category: 'appearance',
      },
      showPrice: {
        type: 'boolean',
        label: 'Show Price',
        default: true,
        category: 'appearance',
      },
      showQuantity: {
        type: 'boolean',
        label: 'Show Quantity',
        default: true,
        category: 'appearance',
      },
      showNotes: {
        type: 'boolean',
        label: 'Show Notes',
        default: true,
        category: 'appearance',
      },
      showSameAisleItems: {
        type: 'boolean',
        label: 'Show "Grab These Too" Section',
        default: true,
        category: 'appearance',
      },
      showPeekNext: {
        type: 'boolean',
        label: 'Show "Peek Next" Button',
        default: true,
        category: 'appearance',
      },
      highlightColor: {
        type: 'color',
        label: 'Highlight Color',
        default: '#6366f1',
        category: 'appearance',
      },
      compactMode: {
        type: 'boolean',
        label: 'Compact Mode',
        default: false,
        category: 'layout',
      },
      autoAdvance: {
        type: 'boolean',
        label: 'Auto Advance to Next Item',
        default: true,
        category: 'behavior',
      },
      showQuickActions: {
        type: 'boolean',
        label: 'Show Quick Action Buttons',
        default: true,
        category: 'behavior',
      },
    },
  },

  // Item List
  'item-list': {
    name: 'Shopping List Items',
    category: 'Main',
    properties: {
      showCheckboxes: {
        type: 'boolean',
        label: 'Show Checkboxes',
        default: true,
        category: 'appearance',
      },
      showPrices: {
        type: 'boolean',
        label: 'Show Prices',
        default: true,
        category: 'appearance',
      },
      showQuantities: {
        type: 'boolean',
        label: 'Show Quantities',
        default: true,
        category: 'appearance',
      },
      showCategories: {
        type: 'boolean',
        label: 'Show Categories',
        default: true,
        category: 'appearance',
      },
      showIcons: {
        type: 'boolean',
        label: 'Show Item Icons',
        default: true,
        category: 'appearance',
      },
      showAisles: {
        type: 'boolean',
        label: 'Show Aisle Numbers',
        default: true,
        category: 'appearance',
      },
      strikethroughCompleted: {
        type: 'boolean',
        label: 'Strikethrough Completed Items',
        default: true,
        category: 'behavior',
      },
      hideCompleted: {
        type: 'boolean',
        label: 'Hide Completed Items',
        default: false,
        category: 'behavior',
      },
      sortBy: {
        type: 'select',
        label: 'Default Sort',
        default: 'manual',
        options: [
          { value: 'manual', label: 'Manual Order' },
          { value: 'category', label: 'By Category' },
          { value: 'aisle', label: 'By Aisle' },
          { value: 'price', label: 'By Price' },
          { value: 'name', label: 'Alphabetical' },
        ],
        category: 'behavior',
      },
      compactView: {
        type: 'boolean',
        label: 'Compact View',
        default: false,
        category: 'layout',
      },
      itemSpacing: {
        type: 'range',
        label: 'Item Spacing',
        default: 8,
        min: 0,
        max: 24,
        step: 2,
        category: 'layout',
      },
      fontSize: {
        type: 'select',
        label: 'Font Size',
        default: 'medium',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        category: 'appearance',
      },
    },
  },
  
  // Floating Buttons (Active List & Apps)
  'floating-buttons': {
    name: 'Floating Action Buttons',
    category: 'Navigation',
    properties: {
      position: {
        type: 'select',
        label: 'Position',
        default: 'right',
        options: [
          { value: 'left', label: 'Left Side' },
          { value: 'right', label: 'Right Side' },
        ],
        category: 'layout',
      },
      showActiveList: {
        type: 'boolean',
        label: 'Show Active List Button',
        default: true,
        category: 'appearance',
      },
      showApps: {
        type: 'boolean',
        label: 'Show Apps Button',
        default: true,
        category: 'appearance',
      },
      buttonSize: {
        type: 'select',
        label: 'Button Size',
        default: 'medium',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
        ],
        category: 'appearance',
      },
      buttonColor: {
        type: 'color',
        label: 'Button Color',
        default: '#6366f1',
        category: 'appearance',
      },
      spacing: {
        type: 'range',
        label: 'Button Spacing',
        default: 16,
        min: 8,
        max: 32,
        step: 4,
        category: 'layout',
      },
    },
  },

  // Shopping List Recipes
  'shopping-list-recipes': {
    name: 'Recipe Suggestions',
    category: 'Recipes',
    properties: {
      maxRecipes: {
        type: 'number',
        label: 'Max Recipes to Show',
        default: 3,
        min: 1,
        max: 10,
        category: 'layout',
      },
      showImages: {
        type: 'boolean',
        label: 'Show Recipe Images',
        default: true,
        category: 'appearance',
      },
      showCookTime: {
        type: 'boolean',
        label: 'Show Cook Time',
        default: true,
        category: 'appearance',
      },
      showDifficulty: {
        type: 'boolean',
        label: 'Show Difficulty',
        default: true,
        category: 'appearance',
      },
    },
  },
};

/**
 * Get schema for a specific widget
 */
export const getWidgetSchema = (widgetId) => {
  return widgetSchemas[widgetId] || null;
};

/**
 * Get all widget schemas
 */
export const getAllWidgetSchemas = () => {
  return widgetSchemas;
};

/**
 * Get default properties for a widget
 */
export const getDefaultProperties = (widgetId) => {
  const schema = widgetSchemas[widgetId];
  if (!schema || !schema.properties) return {};

  const defaults = {};
  Object.entries(schema.properties).forEach(([key, prop]) => {
    defaults[key] = prop.default;
  });
  return defaults;
};

export default widgetSchemas;
