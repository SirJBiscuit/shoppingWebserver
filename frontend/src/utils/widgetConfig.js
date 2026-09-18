/**
 * CFS (Custom Feature Scripts) - Widget Configuration System
 * 
 * Universal widget configuration that works with:
 * - All existing components (CustomPanel, CustomKeypad, CustomNotification, etc.)
 * - New AES widgets
 * - Backward compatible with current implementation
 * - Full AES features (drag-drop, animations, responsive, etc.)
 */

// Widget Types - Comprehensive list
export const WIDGET_TYPES = {
  // Layout Widgets
  CONTAINER: 'container',
  SECTION: 'section',
  SPACER: 'spacer',
  FLEX: 'flex',
  GRID: 'grid',
  
  // Content Widgets
  TEXT: 'text',
  ICON: 'icon',
  IMAGE: 'image',
  BADGE: 'badge',
  
  // Interactive Widgets
  BUTTON: 'button',
  INPUT: 'input',
  DROPDOWN: 'dropdown',
  CHECKBOX: 'checkbox',
  SLIDER: 'slider',
  TOGGLE: 'toggle',
  
  // Complex Widgets (Our Custom Components)
  CUSTOM_PANEL: 'custom_panel',           // CustomPanel.js
  CUSTOM_KEYPAD: 'custom_keypad',         // CustomKeypad.js
  CUSTOM_NOTIFICATION: 'custom_notification', // CustomNotification.js
  CUSTOM_PRICE_BADGE: 'custom_price_badge',   // CustomPriceBadge.js
  CUSTOM_RADIAL_MENU: 'custom_radial_menu',   // CustomRadialMenu.js
  CUSTOM_SEARCH_BAR: 'custom_search_bar',     // CustomSearchBar.js
  CUSTOM_SWIPE_ACTIONS: 'custom_swipe_actions', // CustomSwipeActions.js
  CUSTOM_CONTEXT_MENU: 'custom_context_menu',   // CustomContextMenu.js
  
  // Shopping List Widgets
  ITEM_CARD: 'item_card',
  ITEM_LIST: 'item_list',
  NEXT_ITEM_SUGGESTION: 'next_item_suggestion',
  PRICE_ENTRY: 'price_entry',
  QUANTITY_CONTROL: 'quantity',
  CATEGORY_FILTER: 'category_filter',
  SEARCH_BAR: 'search_bar',
  
  // Special Widgets
  LOOKING_FOR_NEXT: 'looking_for_next',
  SHOPPING_TIMER: 'shopping_timer',
  BUDGET_TRACKER: 'budget_tracker',
  PANTRY_QUICK_VIEW: 'pantry_quick_view',
  
  // Advanced Widgets
  TABS: 'tabs',
  ACCORDION: 'accordion',
  MODAL: 'modal',
  TOOLTIP: 'tooltip',
  POPOVER: 'popover',
  CAROUSEL: 'carousel',
  PROGRESS_BAR: 'progress_bar',
  CHART: 'chart',
  TABLE: 'table',
  CARD: 'card',
  LIST: 'list',
  
  // Animation Wrapper
  ANIMATION_WRAPPER: 'animation',
  
  // Custom Component Wrapper
  CUSTOM_COMPONENT: 'custom'
};

// Default widget configuration schema
export const createWidgetConfig = (type, overrides = {}) => {
  const baseConfig = {
    id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: overrides.name || `${type} Widget`,
    version: '1.0.0',
    
    // Position & Size
    layout: {
      position: 'relative',
      x: 0,
      y: 0,
      width: 'auto',
      height: 'auto',
      minWidth: null,
      minHeight: null,
      maxWidth: null,
      maxHeight: null,
      aspectRatio: null,
      zIndex: 'auto',
      ...overrides.layout
    },
    
    // Spacing
    spacing: {
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      gap: 0,
      ...overrides.spacing
    },
    
    // Styling
    style: {
      // Colors
      backgroundColor: 'transparent',
      textColor: 'inherit',
      borderColor: 'transparent',
      
      // Typography
      fontSize: 'inherit',
      fontWeight: 'normal',
      fontFamily: 'inherit',
      textAlign: 'left',
      lineHeight: 'normal',
      letterSpacing: 'normal',
      
      // Border
      borderWidth: '0px',
      borderStyle: 'solid',
      borderRadius: '0px',
      
      // Shadow
      boxShadow: 'none',
      
      // Effects
      opacity: 1,
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      
      // Custom CSS
      customCSS: '',
      
      ...overrides.style
    },
    
    // Content
    content: {
      text: '',
      icon: null,
      iconPosition: 'left',
      iconSize: 20,
      html: null,
      ...overrides.content
    },
    
    // Animation (Framer Motion compatible)
    animation: {
      enabled: true,
      type: 'fade',
      duration: 0.3,
      delay: 0,
      easing: 'easeInOut',
      
      // Framer Motion props
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      whileHover: null,
      whileTap: null,
      whileFocus: null,
      whileInView: null,
      
      // Transition
      transition: {
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      },
      
      ...overrides.animation
    },
    
    // Interaction
    interaction: {
      onClick: null,
      onHover: null,
      onFocus: null,
      onBlur: null,
      onChange: null,
      disabled: false,
      loading: false,
      ...overrides.interaction
    },
    
    // Responsive (Auto-adaptation system)
    responsive: {
      enabled: true,
      autoAdapt: true,
      breakpoints: {
        mobile: { maxWidth: 640 },
        tablet: { minWidth: 641, maxWidth: 1024 },
        desktop: { minWidth: 1025 }
      },
      mobile: {},
      tablet: {},
      desktop: {},
      ...overrides.responsive
    },
    
    // Conditional Display
    conditions: {
      showIf: null,
      hideIf: null,
      requiredRole: null,
      requiredFeatureFlag: null,
      ...overrides.conditions
    },
    
    // Data Binding
    data: {
      source: null,
      field: null,
      transform: null,
      ...overrides.data
    },
    
    // Children (for containers)
    children: overrides.children || [],
    
    // Metadata
    metadata: {
      category: 'general',
      tags: [],
      description: '',
      author: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides.metadata
    }
  };
  
  return baseConfig;
};

// Animation Presets (from AES.md)
export const ANIMATION_PRESETS = {
  // Entrance
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
  slideInLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  slideInRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  slideInUp: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  slideInDown: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  scaleIn: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 400, damping: 20 }
  },
  bounceIn: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { type: 'spring', stiffness: 500, damping: 10 }
  },
  
  // Exit
  fadeOut: {
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  slideOutLeft: {
    exit: { x: -100, opacity: 0 },
    transition: { duration: 0.3 }
  },
  slideOutRight: {
    exit: { x: 100, opacity: 0 },
    transition: { duration: 0.3 }
  },
  
  // Hover
  hoverScale: {
    whileHover: { scale: 1.05 },
    transition: { duration: 0.2 }
  },
  hoverLift: {
    whileHover: { y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' },
    transition: { duration: 0.2 }
  },
  hoverGlow: {
    whileHover: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
    transition: { duration: 0.3 }
  },
  
  // Tap
  tapShrink: {
    whileTap: { scale: 0.95 },
    transition: { duration: 0.1 }
  },
  tapBounce: {
    whileTap: { scale: 0.9 },
    transition: { type: 'spring', stiffness: 500 }
  },
  
  // Continuous
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity }
    }
  },
  rotate: {
    animate: {
      rotate: 360,
      transition: { duration: 2, repeat: Infinity, ease: 'linear' }
    }
  },
  float: {
    animate: {
      y: [0, -10, 0],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
    }
  },
  
  // Custom Panel Animations (from our existing components)
  panelSlideIn: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  panelSlideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

// Responsive Auto-Adaptation Rules
export const AUTO_RESPONSIVE_RULES = {
  autoSync: {
    colors: true,
    text: true,
    animations: true,
    icons: true,
    borders: true,
    shadows: true,
    fontSize: 'scale',
    spacing: 'scale',
    layout: 'adapt',
    width: 'adapt',
    columns: 'adapt',
    position: false,
    visibility: false
  },
  
  scalingRatios: {
    desktop: 1.0,
    tablet: 0.85,
    mobile: 0.75
  },
  
  layoutAdaptations: {
    'grid-cols-3': {
      tablet: 'grid-cols-2',
      mobile: 'grid-cols-1'
    },
    'grid-cols-4': {
      tablet: 'grid-cols-2',
      mobile: 'grid-cols-1'
    },
    'flex-row': {
      tablet: 'flex-row',
      mobile: 'flex-col'
    },
    'gap-4': {
      tablet: 'gap-3',
      mobile: 'gap-2'
    },
    'gap-6': {
      tablet: 'gap-4',
      mobile: 'gap-3'
    }
  }
};

// Apply animation preset to widget config
export const applyAnimationPreset = (widgetConfig, presetName) => {
  const preset = ANIMATION_PRESETS[presetName];
  if (!preset) return widgetConfig;
  
  return {
    ...widgetConfig,
    animation: {
      ...widgetConfig.animation,
      ...preset,
      type: presetName
    }
  };
};

// Auto-adapt widget for responsive breakpoints
export const autoAdaptWidget = (widgetConfig, breakpoint = 'mobile') => {
  if (!widgetConfig.responsive.autoAdapt) return widgetConfig;
  
  const ratio = AUTO_RESPONSIVE_RULES.scalingRatios[breakpoint];
  const adapted = { ...widgetConfig };
  
  // Scale font size
  if (widgetConfig.style.fontSize && widgetConfig.style.fontSize !== 'inherit') {
    const size = parseFloat(widgetConfig.style.fontSize);
    adapted.style.fontSize = `${size * ratio}px`;
  }
  
  // Scale spacing
  Object.keys(adapted.spacing.margin).forEach(key => {
    adapted.spacing.margin[key] = Math.round(widgetConfig.spacing.margin[key] * ratio);
  });
  Object.keys(adapted.spacing.padding).forEach(key => {
    adapted.spacing.padding[key] = Math.round(widgetConfig.spacing.padding[key] * ratio);
  });
  
  // Adapt layout
  if (breakpoint === 'mobile' && widgetConfig.layout.width && widgetConfig.layout.width !== 'auto') {
    adapted.layout.width = '100%';
  }
  
  return adapted;
};

// Merge widget configs (for extending/overriding)
export const mergeWidgetConfigs = (base, override) => {
  return {
    ...base,
    ...override,
    layout: { ...base.layout, ...override.layout },
    spacing: {
      ...base.spacing,
      ...override.spacing,
      margin: { ...base.spacing.margin, ...override.spacing?.margin },
      padding: { ...base.spacing.padding, ...override.spacing?.padding }
    },
    style: { ...base.style, ...override.style },
    content: { ...base.content, ...override.content },
    animation: { ...base.animation, ...override.animation },
    interaction: { ...base.interaction, ...override.interaction },
    responsive: { ...base.responsive, ...override.responsive },
    conditions: { ...base.conditions, ...override.conditions },
    data: { ...base.data, ...override.data },
    metadata: { ...base.metadata, ...override.metadata }
  };
};

// Validate widget config
export const validateWidgetConfig = (config) => {
  const errors = [];
  
  if (!config.id) errors.push('Widget ID is required');
  if (!config.type) errors.push('Widget type is required');
  if (!WIDGET_TYPES[config.type.toUpperCase()]) {
    errors.push(`Invalid widget type: ${config.type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Convert existing component props to widget config
export const propsToWidgetConfig = (componentName, props) => {
  const baseConfig = createWidgetConfig(componentName);
  
  // Map common props
  if (props.className) baseConfig.metadata.className = props.className;
  if (props.style) baseConfig.style = { ...baseConfig.style, ...props.style };
  if (props.onClick) baseConfig.interaction.onClick = props.onClick;
  if (props.disabled) baseConfig.interaction.disabled = props.disabled;
  
  // Component-specific mappings
  switch (componentName) {
    case WIDGET_TYPES.CUSTOM_PANEL:
      return {
        ...baseConfig,
        content: {
          title: props.title,
          children: props.children
        },
        layout: {
          ...baseConfig.layout,
          position: props.position || 'right',
          width: props.width || '400px'
        },
        animation: {
          ...baseConfig.animation,
          ...ANIMATION_PRESETS.panelSlideIn
        }
      };
      
    case WIDGET_TYPES.CUSTOM_NOTIFICATION:
      return {
        ...baseConfig,
        content: {
          message: props.message,
          type: props.type || 'info'
        },
        layout: {
          ...baseConfig.layout,
          position: props.position || 'top-right'
        },
        interaction: {
          ...baseConfig.interaction,
          onClose: props.onClose
        }
      };
      
    case WIDGET_TYPES.CUSTOM_KEYPAD:
      return {
        ...baseConfig,
        content: {
          value: props.value,
          maxDigits: props.maxDigits || 10
        },
        interaction: {
          ...baseConfig.interaction,
          onChange: props.onChange,
          onSubmit: props.onSubmit
        }
      };
      
    default:
      return baseConfig;
  }
};

// Export widget config to JSON
export const exportWidgetConfig = (config) => {
  return JSON.stringify(config, null, 2);
};

// Import widget config from JSON
export const importWidgetConfig = (jsonString) => {
  try {
    const config = JSON.parse(jsonString);
    const validation = validateWidgetConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid widget config: ${validation.errors.join(', ')}`);
    }
    return config;
  } catch (error) {
    console.error('Failed to import widget config:', error);
    return null;
  }
};
