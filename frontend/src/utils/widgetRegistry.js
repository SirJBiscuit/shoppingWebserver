/**
 * Widget Registry - Central system for tracking all customizable widgets
 * 
 * This registry assigns unique IDs to every widget in the app and tracks:
 * - Widget type and location
 * - Default configuration
 * - Custom modifications
 * - Reusable templates
 * 
 * Used by the AES (Admin Visual Editor) to manage widget customization
 */

// Widget Types
export const WIDGET_TYPES = {
  // Layout
  CONTAINER: 'container',
  SECTION: 'section',
  CARD: 'card',
  
  // Content
  TEXT: 'text',
  HEADING: 'heading',
  BADGE: 'badge',
  ICON: 'icon',
  
  // Interactive
  BUTTON: 'button',
  INPUT: 'input',
  CHECKBOX: 'checkbox',
  
  // Complex Components
  LOOKING_FOR_NEXT: 'looking_for_next',
  ITEM_CARD: 'item_card',
  PRICE_INPUT: 'price_input',
  AISLE_BADGE: 'aisle_badge',
  CATEGORY_BADGE: 'category_badge',
  QUANTITY_CONTROL: 'quantity_control',
  
  // Dashboard Specific
  ADD_ITEM_FORM: 'add_item_form',
  SHOPPING_LIST: 'shopping_list',
  SUGGESTIONS_PANEL: 'suggestions_panel',
  PANTRY_QUICK_VIEW: 'pantry_quick_view',
  BUDGET_TRACKER: 'budget_tracker',
  
  // Modals & Overlays
  MODAL: 'modal',
  NUMPAD: 'numpad',
  KEYPAD: 'keypad',
  DROPDOWN: 'dropdown'
};

// Widget Locations (pages/sections)
export const WIDGET_LOCATIONS = {
  DASHBOARD: 'dashboard',
  LOOKING_FOR_NEXT: 'looking_for_next',
  SHOPPING_LIST: 'shopping_list',
  ADD_ITEM_SECTION: 'add_item_section',
  SIDEBAR: 'sidebar',
  TOOLBAR: 'toolbar',
  MODAL: 'modal'
};

/**
 * Widget Registry - Maps widget IDs to their metadata
 * 
 * Format:
 * {
 *   widgetId: {
 *     id: 'unique-widget-id',
 *     type: WIDGET_TYPES.BUTTON,
 *     location: WIDGET_LOCATIONS.DASHBOARD,
 *     name: 'Human-readable name',
 *     description: 'What this widget does',
 *     defaultConfig: { ... },
 *     customizable: true,
 *     reusable: true,
 *     category: 'buttons' | 'inputs' | 'complex' | etc.
 *   }
 * }
 */
export const WIDGET_REGISTRY = {
  // ============================================================================
  // LOOKING FOR NEXT SECTION
  // ============================================================================
  
  'looking-for-next-container': {
    id: 'looking-for-next-container',
    type: WIDGET_TYPES.SECTION,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Looking for Next Container',
    description: 'Main container for the next item suggestion',
    defaultConfig: {
      layout: 'flex-col',
      padding: '4',
      gap: '4',
      background: 'gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900'
    },
    customizable: true,
    reusable: false,
    category: 'layout'
  },
  
  'looking-for-next-header': {
    id: 'looking-for-next-header',
    type: WIDGET_TYPES.HEADING,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Looking for Next Header',
    description: 'Title text for the next item section',
    defaultConfig: {
      text: 'Looking for Next',
      fontSize: 'text-2xl',
      fontWeight: 'font-bold',
      color: 'text-gray-900 dark:text-white'
    },
    customizable: true,
    reusable: true,
    category: 'text'
  },
  
  'next-item-icon': {
    id: 'next-item-icon',
    type: WIDGET_TYPES.ICON,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Next Item Icon',
    description: 'Category icon for the current item',
    defaultConfig: {
      size: 'w-16 h-16',
      animation: 'bounce'
    },
    customizable: true,
    reusable: true,
    category: 'icons'
  },
  
  'next-item-name': {
    id: 'next-item-name',
    type: WIDGET_TYPES.TEXT,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Next Item Name',
    description: 'Name of the current item',
    defaultConfig: {
      fontSize: 'text-3xl',
      fontWeight: 'font-bold',
      color: 'text-gray-900 dark:text-white'
    },
    customizable: true,
    reusable: true,
    category: 'text'
  },
  
  'next-item-quantity': {
    id: 'next-item-quantity',
    type: WIDGET_TYPES.QUANTITY_CONTROL,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Quantity Control',
    description: 'Plus/minus buttons to adjust quantity',
    defaultConfig: {
      buttonSize: 'w-10 h-10',
      fontSize: 'text-xl',
      color: 'purple'
    },
    customizable: true,
    reusable: true,
    category: 'interactive'
  },
  
  'aisle-badge-confirmed': {
    id: 'aisle-badge-confirmed',
    type: WIDGET_TYPES.AISLE_BADGE,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Confirmed Aisle Badge',
    description: 'Purple badge showing confirmed aisle number',
    defaultConfig: {
      background: 'bg-purple-500',
      textColor: 'text-white',
      fontSize: 'text-lg',
      padding: 'px-4 py-2',
      borderRadius: 'rounded-xl'
    },
    customizable: true,
    reusable: true,
    category: 'badges'
  },
  
  'aisle-badge-predicted': {
    id: 'aisle-badge-predicted',
    type: WIDGET_TYPES.AISLE_BADGE,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Predicted Aisle Badge',
    description: 'Amber badge showing MDL predicted aisle',
    defaultConfig: {
      background: 'bg-amber-500',
      textColor: 'text-white',
      fontSize: 'text-lg',
      padding: 'px-4 py-2',
      borderRadius: 'rounded-xl'
    },
    customizable: true,
    reusable: true,
    category: 'badges'
  },
  
  'category-badge': {
    id: 'category-badge',
    type: WIDGET_TYPES.CATEGORY_BADGE,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Category Badge',
    description: 'Badge showing item category',
    defaultConfig: {
      background: 'bg-blue-500',
      textColor: 'text-white',
      fontSize: 'text-sm',
      padding: 'px-3 py-1',
      borderRadius: 'rounded-lg'
    },
    customizable: true,
    reusable: true,
    category: 'badges'
  },
  
  'price-badge': {
    id: 'price-badge',
    type: WIDGET_TYPES.BADGE,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Price Badge',
    description: 'Badge showing item price',
    defaultConfig: {
      background: 'bg-green-500',
      textColor: 'text-white',
      fontSize: 'text-lg',
      padding: 'px-4 py-2',
      borderRadius: 'rounded-xl'
    },
    customizable: true,
    reusable: true,
    category: 'badges'
  },
  
  'mark-found-button': {
    id: 'mark-found-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Mark Found Button',
    description: 'Primary action button to mark item as found',
    defaultConfig: {
      text: 'Mark Found',
      icon: 'Check',
      background: 'bg-green-600 hover:bg-green-700',
      textColor: 'text-white',
      fontSize: 'text-base',
      fontWeight: 'font-semibold',
      padding: 'px-6 py-3',
      borderRadius: 'rounded-lg',
      minHeight: 'min-h-[44px]',
      animation: {
        whileTap: { scale: 0.95 }
      }
    },
    customizable: true,
    reusable: true,
    category: 'buttons'
  },
  
  'report-aisle-button': {
    id: 'report-aisle-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Report Aisle Button',
    description: 'Button to report which aisle item was found in',
    defaultConfig: {
      text: 'Found in Aisle',
      icon: 'MapPin',
      background: 'bg-purple-600 hover:bg-purple-700',
      textColor: 'text-white',
      fontSize: 'text-base',
      fontWeight: 'font-semibold',
      padding: 'px-4 py-2.5',
      borderRadius: 'rounded-lg',
      minHeight: 'min-h-[44px]'
    },
    customizable: true,
    reusable: true,
    category: 'buttons'
  },
  
  'skip-button': {
    id: 'skip-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Skip Button',
    description: 'Button to skip current item',
    defaultConfig: {
      text: 'Skip',
      icon: 'SkipForward',
      background: 'bg-gray-500 hover:bg-gray-600',
      textColor: 'text-white',
      fontSize: 'text-base',
      fontWeight: 'font-semibold',
      padding: 'px-4 py-2.5',
      borderRadius: 'rounded-lg',
      minHeight: 'min-h-[44px]'
    },
    customizable: true,
    reusable: true,
    category: 'buttons'
  },
  
  'quick-price-input': {
    id: 'quick-price-input',
    type: WIDGET_TYPES.PRICE_INPUT,
    location: WIDGET_LOCATIONS.LOOKING_FOR_NEXT,
    name: 'Quick Price Entry',
    description: 'Inline price input with numpad',
    defaultConfig: {
      placeholder: '$0.00',
      fontSize: 'text-lg',
      padding: 'px-4 py-2',
      borderRadius: 'rounded-lg',
      borderColor: 'border-green-300',
      numpadType: 'mobile' // mobile | tablet | desktop
    },
    customizable: true,
    reusable: true,
    category: 'inputs'
  },
  
  'aisle-report-keypad': {
    id: 'aisle-report-keypad',
    type: WIDGET_TYPES.KEYPAD,
    location: WIDGET_LOCATIONS.MODAL,
    name: 'Aisle Report Keypad',
    description: 'Number keypad for reporting aisle location',
    defaultConfig: {
      title: 'Which aisle did you find this in?',
      gridCols: { mobile: 4, tablet: 5, desktop: 10 },
      buttonCount: 20,
      allowCustomInput: true,
      maxHeight: { mobile: '85vh', tablet: '90vh', desktop: 'auto' }
    },
    customizable: true,
    reusable: true,
    category: 'modals'
  },
  
  // ============================================================================
  // ADD ITEM SECTION
  // ============================================================================
  
  'add-item-form': {
    id: 'add-item-form',
    type: WIDGET_TYPES.ADD_ITEM_FORM,
    location: WIDGET_LOCATIONS.ADD_ITEM_SECTION,
    name: 'Add Item Form',
    description: 'Form to add new items to the shopping list',
    defaultConfig: {
      layout: 'flex-col',
      gap: '3',
      padding: '4'
    },
    customizable: true,
    reusable: false,
    category: 'forms'
  },
  
  'item-name-input': {
    id: 'item-name-input',
    type: WIDGET_TYPES.INPUT,
    location: WIDGET_LOCATIONS.ADD_ITEM_SECTION,
    name: 'Item Name Input',
    description: 'Text input for item name with autocomplete',
    defaultConfig: {
      placeholder: 'Item name...',
      fontSize: 'text-base',
      padding: 'px-4 py-2',
      borderRadius: 'rounded-lg',
      autocomplete: true
    },
    customizable: true,
    reusable: true,
    category: 'inputs'
  },
  
  'add-item-button': {
    id: 'add-item-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.ADD_ITEM_SECTION,
    name: 'Add Item Button',
    description: 'Button to add item to list',
    defaultConfig: {
      text: 'Add',
      icon: 'Plus',
      background: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      fontSize: 'text-base',
      fontWeight: 'font-semibold',
      padding: 'px-6 py-2',
      borderRadius: 'rounded-lg'
    },
    customizable: true,
    reusable: true,
    category: 'buttons'
  },
  
  // ============================================================================
  // SHOPPING LIST
  // ============================================================================
  
  'shopping-list-container': {
    id: 'shopping-list-container',
    type: WIDGET_TYPES.SHOPPING_LIST,
    location: WIDGET_LOCATIONS.SHOPPING_LIST,
    name: 'Shopping List Container',
    description: 'Main container for the shopping list items',
    defaultConfig: {
      layout: 'flex-col',
      gap: '2',
      padding: '4'
    },
    customizable: true,
    reusable: false,
    category: 'layout'
  },
  
  'item-card': {
    id: 'item-card',
    type: WIDGET_TYPES.ITEM_CARD,
    location: WIDGET_LOCATIONS.SHOPPING_LIST,
    name: 'Shopping List Item Card',
    description: 'Individual item card in the shopping list',
    defaultConfig: {
      padding: 'p-3',
      borderRadius: 'rounded-lg',
      background: 'bg-white dark:bg-gray-800',
      border: 'border border-gray-200 dark:border-gray-700',
      hoverEffect: 'hover:shadow-md'
    },
    customizable: true,
    reusable: true,
    category: 'cards'
  },
  
  // ============================================================================
  // TOOLBAR
  // ============================================================================
  
  'version-button': {
    id: 'version-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.TOOLBAR,
    name: 'Version/Update Button',
    description: 'Shows app version and update status',
    defaultConfig: {
      fontSize: 'text-sm',
      padding: 'px-2 py-1',
      borderRadius: 'rounded-lg'
    },
    customizable: true,
    reusable: false,
    category: 'buttons'
  },
  
  'aes-toggle-button': {
    id: 'aes-toggle-button',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.TOOLBAR,
    name: 'AES Editor Toggle',
    description: 'Toggle button for AES Editor Mode (admin only)',
    defaultConfig: {
      text: { active: 'Editor', inactive: 'AES' },
      icon: 'Wand2',
      background: {
        active: 'bg-purple-100 dark:bg-purple-900/30',
        inactive: 'bg-transparent'
      },
      textColor: {
        active: 'text-purple-700 dark:text-purple-300',
        inactive: 'text-gray-600 dark:text-gray-400'
      },
      animation: {
        active: 'animate-pulse'
      }
    },
    customizable: true,
    reusable: false,
    category: 'buttons'
  },
  
  'optimization-toggle': {
    id: 'optimization-toggle',
    type: WIDGET_TYPES.BUTTON,
    location: WIDGET_LOCATIONS.TOOLBAR,
    name: 'Optimization Mode Toggle',
    description: 'Toggle for performance optimization mode',
    defaultConfig: {
      text: { active: 'Optimized', inactive: 'Full Mode' },
      icon: 'Zap',
      background: {
        active: 'bg-yellow-100 dark:bg-yellow-900/30',
        inactive: 'bg-transparent'
      }
    },
    customizable: true,
    reusable: false,
    category: 'buttons'
  }
};

/**
 * Get widget by ID
 */
export const getWidget = (widgetId) => {
  return WIDGET_REGISTRY[widgetId] || null;
};

/**
 * Get all widgets by location
 */
export const getWidgetsByLocation = (location) => {
  return Object.values(WIDGET_REGISTRY).filter(
    widget => widget.location === location
  );
};

/**
 * Get all widgets by type
 */
export const getWidgetsByType = (type) => {
  return Object.values(WIDGET_REGISTRY).filter(
    widget => widget.type === type
  );
};

/**
 * Get all reusable widgets
 */
export const getReusableWidgets = () => {
  return Object.values(WIDGET_REGISTRY).filter(
    widget => widget.reusable === true
  );
};

/**
 * Get all widgets by category
 */
export const getWidgetsByCategory = (category) => {
  return Object.values(WIDGET_REGISTRY).filter(
    widget => widget.category === category
  );
};

/**
 * Register a new custom widget
 */
export const registerWidget = (widgetConfig) => {
  if (!widgetConfig.id) {
    throw new Error('Widget must have an ID');
  }
  
  if (WIDGET_REGISTRY[widgetConfig.id]) {
    console.warn(`Widget ${widgetConfig.id} already exists, overwriting...`);
  }
  
  WIDGET_REGISTRY[widgetConfig.id] = {
    customizable: true,
    reusable: true,
    ...widgetConfig
  };
  
  return widgetConfig.id;
};

/**
 * Create a widget instance with custom config
 */
export const createWidgetInstance = (widgetId, customConfig = {}) => {
  const widget = getWidget(widgetId);
  
  if (!widget) {
    throw new Error(`Widget ${widgetId} not found in registry`);
  }
  
  return {
    ...widget,
    instanceId: `${widgetId}-${Date.now()}`,
    config: {
      ...widget.defaultConfig,
      ...customConfig
    },
    isCustom: Object.keys(customConfig).length > 0
  };
};

export default WIDGET_REGISTRY;
