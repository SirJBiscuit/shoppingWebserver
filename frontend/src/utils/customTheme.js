/**
 * CustomTheme - Centralized theme system for all custom components
 * 
 * Ensures consistent styling across:
 * - CustomPanel
 * - CustomKeypad
 * - CustomNotification
 * - CustomContextMenu
 * - CustomSearchBar
 * - CustomSwipeActions
 * - All future custom components
 * 
 * This makes AES integration faster and maintains design consistency
 */

export const customTheme = {
  // Color Schemes
  colors: {
    primary: {
      gradient: 'from-blue-500 to-blue-600',
      hover: 'from-blue-600 to-blue-700',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      solid: 'bg-blue-500',
      light: 'bg-blue-100 dark:bg-blue-900/30'
    },
    success: {
      gradient: 'from-green-500 to-green-600',
      hover: 'from-green-600 to-green-700',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      solid: 'bg-green-500',
      light: 'bg-green-100 dark:bg-green-900/30'
    },
    warning: {
      gradient: 'from-yellow-500 to-yellow-600',
      hover: 'from-yellow-600 to-yellow-700',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      solid: 'bg-yellow-500',
      light: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    error: {
      gradient: 'from-red-500 to-red-600',
      hover: 'from-red-600 to-red-700',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      solid: 'bg-red-500',
      light: 'bg-red-100 dark:bg-red-900/30'
    },
    info: {
      gradient: 'from-blue-500 to-blue-600',
      hover: 'from-blue-600 to-blue-700',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      solid: 'bg-blue-500',
      light: 'bg-blue-100 dark:bg-blue-900/30'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      hover: 'from-purple-600 to-purple-700',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-900 dark:text-purple-100',
      solid: 'bg-purple-500',
      light: 'bg-purple-100 dark:bg-purple-900/30'
    },
    amber: {
      gradient: 'from-amber-500 to-amber-600',
      hover: 'from-amber-600 to-amber-700',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-100',
      solid: 'bg-amber-500',
      light: 'bg-amber-100 dark:bg-amber-900/30'
    },
    gray: {
      gradient: 'from-gray-500 to-gray-600',
      hover: 'from-gray-600 to-gray-700',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      solid: 'bg-gray-500',
      light: 'bg-gray-100 dark:bg-gray-900/30'
    }
  },

  // Spacing
  spacing: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  },

  // Border Radius
  radius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full'
  },

  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    none: 'shadow-none'
  },

  // Z-Index Layers (consistent across all components)
  zIndex: {
    backdrop: 'z-[100]',
    panel: 'z-[101]',
    notification: 'z-[100]',
    notificationCenter: 'z-[151]',
    contextMenu: 'z-[110]',
    bottomSheet: 'z-[120]',
    modal: 'z-[150]',
    tooltip: 'z-[200]',
    dropdown: 'z-[105]'
  },

  // Animations (framer-motion variants)
  animations: {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slideUp: {
      hidden: { y: 100, opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: 100, opacity: 0 }
    },
    slideDown: {
      hidden: { y: -100, opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: -100, opacity: 0 }
    },
    slideLeft: {
      hidden: { x: -100, opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: -100, opacity: 0 }
    },
    slideRight: {
      hidden: { x: 100, opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: 100, opacity: 0 }
    },
    scale: {
      hidden: { scale: 0.8, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 }
    },
    spring: {
      type: 'spring',
      stiffness: 300,
      damping: 20
    },
    smooth: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeInOut'
    }
  },

  // Typography
  typography: {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-bold',
    h4: 'text-lg font-bold',
    body: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
    label: 'text-sm font-medium',
    caption: 'text-xs opacity-75'
  },

  // Buttons
  buttons: {
    primary: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
    secondary: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white',
    success: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white',
    danger: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
    warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white',
    outline: 'border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
    link: 'text-blue-500 hover:text-blue-600 underline'
  },

  // Inputs
  inputs: {
    base: 'px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    error: 'border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:ring-green-500',
    disabled: 'opacity-50 cursor-not-allowed'
  },

  // Badges
  badges: {
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-1 rounded-full text-xs font-medium',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-2 py-1 rounded-full text-xs font-medium',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 px-2 py-1 rounded-full text-xs font-medium',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 px-2 py-1 rounded-full text-xs font-medium',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-1 rounded-full text-xs font-medium'
  },

  // Cards
  cards: {
    base: 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg',
    hover: 'hover:shadow-xl transition-shadow',
    interactive: 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all'
  },

  // Backdrops
  backdrops: {
    light: 'bg-black/30 backdrop-blur-sm',
    medium: 'bg-black/50 backdrop-blur-md',
    dark: 'bg-black/70 backdrop-blur-lg',
    none: 'bg-transparent'
  },

  // Device Breakpoints
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  }
};

/**
 * Helper function to get color scheme
 */
export const getColorScheme = (type = 'primary') => {
  return customTheme.colors[type] || customTheme.colors.primary;
};

/**
 * Helper function to get button classes
 */
export const getButtonClasses = (variant = 'primary', size = 'md') => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  return `${customTheme.buttons[variant]} ${sizeClasses[size]} rounded-lg font-medium transition-all shadow-md hover:shadow-lg`;
};

/**
 * Helper function to get animation variants
 */
export const getAnimation = (type = 'fadeIn', transition = 'smooth') => {
  return {
    ...customTheme.animations[type],
    transition: customTheme.animations[transition]
  };
};

/**
 * Helper function to check device type
 */
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < customTheme.breakpoints.mobile) return 'mobile';
  if (width < customTheme.breakpoints.tablet) return 'tablet';
  return 'desktop';
};

/**
 * Helper function to get z-index
 */
export const getZIndex = (layer = 'panel') => {
  return customTheme.zIndex[layer] || customTheme.zIndex.panel;
};

export default customTheme;
