import React from 'react';
import { motion } from 'framer-motion';
import { WIDGET_TYPES } from '../utils/widgetConfig';

// Import all our existing custom components
import CustomPanel from './CustomPanel';
import CustomKeypad from './CustomKeypad';
import CustomNotification from './CustomNotification';
import CustomPriceBadge from './CustomPriceBadge';
import CustomRadialMenu from './CustomRadialMenu';
import CustomSearchBar from './CustomSearchBar';
import CustomSwipeActions from './CustomSwipeActions';
import CustomContextMenu from './CustomContextMenu';
import ItemList from './ItemList';
import NextItemSuggestion from './NextItemSuggestion';
import BudgetTracker from './BudgetTracker';
import PantryQuickView from './PantryQuickView';

/**
 * WidgetRenderer - Universal widget rendering system
 * 
 * Renders ANY widget based on CFS widget config
 * - Works with all existing components
 * - Supports new AES widgets
 * - Handles animations, responsive, conditions
 * - Backward compatible
 */
const WidgetRenderer = ({ 
  config, 
  children, 
  className = '',
  onUpdate,
  editorMode = false,
  ...props 
}) => {
  // Check conditions
  if (config.conditions) {
    if (config.conditions.hideIf && evaluateCondition(config.conditions.hideIf, props)) {
      return null;
    }
    if (config.conditions.showIf && !evaluateCondition(config.conditions.showIf, props)) {
      return null;
    }
  }

  // Get responsive config for current breakpoint
  const responsiveConfig = getResponsiveConfig(config);

  // Build style object from config
  const style = buildStyleFromConfig(responsiveConfig);

  // Build animation props
  const animationProps = buildAnimationProps(responsiveConfig);

  // Render the appropriate widget
  const widget = renderWidget(responsiveConfig, children, props);

  // Wrap with motion if animations enabled
  if (responsiveConfig.animation.enabled && !editorMode) {
    return (
      <motion.div
        {...animationProps}
        style={style}
        className={`widget-${config.type} ${className}`}
        data-widget-id={config.id}
        onClick={handleInteraction('onClick', config, props)}
        onMouseEnter={handleInteraction('onHover', config, props)}
        onFocus={handleInteraction('onFocus', config, props)}
      >
        {widget}
      </motion.div>
    );
  }

  // Static render for editor mode
  return (
    <div
      style={style}
      className={`widget-${config.type} ${className}`}
      data-widget-id={config.id}
      onClick={handleInteraction('onClick', config, props)}
    >
      {widget}
    </div>
  );
};

// Render specific widget type
const renderWidget = (config, children, props) => {
  const { type, content, interaction, data } = config;

  switch (type) {
    // === Existing Custom Components ===
    case WIDGET_TYPES.CUSTOM_PANEL:
      return (
        <CustomPanel
          title={content.title}
          isOpen={props.isOpen}
          onClose={interaction.onClose || props.onClose}
          position={config.layout.position}
          width={config.layout.width}
          {...props.customPanelProps}
        >
          {children || content.children}
        </CustomPanel>
      );

    case WIDGET_TYPES.CUSTOM_KEYPAD:
      return (
        <CustomKeypad
          value={props.value || content.value}
          onChange={interaction.onChange || props.onChange}
          onSubmit={interaction.onSubmit || props.onSubmit}
          maxDigits={content.maxDigits}
          {...props.customKeypadProps}
        />
      );

    case WIDGET_TYPES.CUSTOM_NOTIFICATION:
      return (
        <CustomNotification
          message={content.message}
          type={content.type}
          position={config.layout.position}
          onClose={interaction.onClose || props.onClose}
          {...props.customNotificationProps}
        />
      );

    case WIDGET_TYPES.CUSTOM_PRICE_BADGE:
      return (
        <CustomPriceBadge
          price={props.price || content.price}
          originalPrice={props.originalPrice || content.originalPrice}
          variant={content.variant}
          {...props.customPriceBadgeProps}
        />
      );

    case WIDGET_TYPES.CUSTOM_RADIAL_MENU:
      return (
        <CustomRadialMenu
          primaryAction={content.primaryAction}
          actions={content.actions || []}
          shape={content.shape}
          direction={content.direction}
          {...props.customRadialMenuProps}
        />
      );

    case WIDGET_TYPES.CUSTOM_SEARCH_BAR:
      return (
        <CustomSearchBar
          value={props.value || content.value}
          onChange={interaction.onChange || props.onChange}
          placeholder={content.placeholder}
          {...props.customSearchBarProps}
        />
      );

    case WIDGET_TYPES.CUSTOM_SWIPE_ACTIONS:
      return (
        <CustomSwipeActions
          leftActions={content.leftActions}
          rightActions={content.rightActions}
          {...props.customSwipeActionsProps}
        >
          {children}
        </CustomSwipeActions>
      );

    case WIDGET_TYPES.CUSTOM_CONTEXT_MENU:
      return (
        <CustomContextMenu
          items={content.items || []}
          {...props.customContextMenuProps}
        >
          {children}
        </CustomContextMenu>
      );

    case WIDGET_TYPES.ITEM_LIST:
      return (
        <ItemList
          items={props.items || data.items || []}
          onToggleCheck={props.onToggleCheck}
          onDelete={props.onDelete}
          {...props.itemListProps}
        />
      );

    case WIDGET_TYPES.NEXT_ITEM_SUGGESTION:
      return (
        <NextItemSuggestion
          nextItem={props.nextItem || data.nextItem}
          onEdit={props.onEdit}
          onMarkFound={props.onMarkFound}
          onSkip={props.onSkip}
          {...props.nextItemSuggestionProps}
        />
      );

    case WIDGET_TYPES.BUDGET_TRACKER:
      return (
        <BudgetTracker
          budget={props.budget || data.budget}
          spent={props.spent || data.spent}
          {...props.budgetTrackerProps}
        />
      );

    case WIDGET_TYPES.PANTRY_QUICK_VIEW:
      return (
        <PantryQuickView
          items={props.pantryItems || data.pantryItems || []}
          {...props.pantryQuickViewProps}
        />
      );

    // === Basic Widgets ===
    case WIDGET_TYPES.TEXT:
      return (
        <span style={{ color: config.style.textColor }}>
          {content.text || children}
        </span>
      );

    case WIDGET_TYPES.BUTTON:
      return (
        <button
          disabled={interaction.disabled}
          className={`
            inline-flex items-center justify-content gap-2
            ${interaction.loading ? 'opacity-50 cursor-wait' : ''}
          `}
        >
          {content.icon && content.iconPosition === 'left' && (
            <span className="icon">{content.icon}</span>
          )}
          {content.text || children}
          {content.icon && content.iconPosition === 'right' && (
            <span className="icon">{content.icon}</span>
          )}
          {interaction.loading && <span className="spinner">⏳</span>}
        </button>
      );

    case WIDGET_TYPES.INPUT:
      return (
        <input
          type={content.inputType || 'text'}
          value={props.value || content.value}
          placeholder={content.placeholder}
          disabled={interaction.disabled}
          onChange={(e) => handleInteraction('onChange', config, { ...props, value: e.target.value })}
        />
      );

    case WIDGET_TYPES.CONTAINER:
    case WIDGET_TYPES.SECTION:
    case WIDGET_TYPES.FLEX:
    case WIDGET_TYPES.GRID:
      return (
        <div className={getLayoutClass(config)}>
          {children || renderChildren(config.children, props)}
        </div>
      );

    case WIDGET_TYPES.BADGE:
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium">
          {content.icon && <span className="mr-1">{content.icon}</span>}
          {content.text || children}
        </span>
      );

    case WIDGET_TYPES.ICON:
      return (
        <span className="inline-flex items-center justify-center">
          {content.icon || children}
        </span>
      );

    case WIDGET_TYPES.IMAGE:
      return (
        <img
          src={content.src}
          alt={content.alt || ''}
          loading={content.lazy ? 'lazy' : 'eager'}
        />
      );

    case WIDGET_TYPES.SPACER:
      return <div style={{ height: config.layout.height, width: config.layout.width }} />;

    // === Custom Component Wrapper ===
    case WIDGET_TYPES.CUSTOM_COMPONENT:
      if (content.component) {
        const Component = content.component;
        return <Component {...props} {...content.props}>{children}</Component>;
      }
      return children;

    default:
      console.warn(`Unknown widget type: ${type}`);
      return children || <div>Unknown widget: {type}</div>;
  }
};

// Render child widgets recursively
const renderChildren = (children, props) => {
  if (!children || children.length === 0) return null;
  
  return children.map((childConfig, index) => (
    <WidgetRenderer
      key={childConfig.id || index}
      config={childConfig}
      {...props}
    />
  ));
};

// Build style object from widget config
const buildStyleFromConfig = (config) => {
  const { layout, spacing, style } = config;
  
  return {
    // Position & Size
    position: layout.position,
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
    minWidth: layout.minWidth,
    minHeight: layout.minHeight,
    maxWidth: layout.maxWidth,
    maxHeight: layout.maxHeight,
    aspectRatio: layout.aspectRatio,
    zIndex: layout.zIndex,
    
    // Spacing
    marginTop: spacing.margin.top,
    marginRight: spacing.margin.right,
    marginBottom: spacing.margin.bottom,
    marginLeft: spacing.margin.left,
    paddingTop: spacing.padding.top,
    paddingRight: spacing.padding.right,
    paddingBottom: spacing.padding.bottom,
    paddingLeft: spacing.padding.left,
    gap: spacing.gap,
    
    // Colors
    backgroundColor: style.backgroundColor,
    color: style.textColor,
    borderColor: style.borderColor,
    
    // Typography
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontFamily: style.fontFamily,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    
    // Border
    borderWidth: style.borderWidth,
    borderStyle: style.borderStyle,
    borderRadius: style.borderRadius,
    
    // Shadow
    boxShadow: style.boxShadow,
    
    // Effects
    opacity: style.opacity,
    filter: buildFilterString(style)
  };
};

// Build filter string from style config
const buildFilterString = (style) => {
  const filters = [];
  
  if (style.blur > 0) filters.push(`blur(${style.blur}px)`);
  if (style.brightness !== 100) filters.push(`brightness(${style.brightness}%)`);
  if (style.contrast !== 100) filters.push(`contrast(${style.contrast}%)`);
  if (style.saturate !== 100) filters.push(`saturate(${style.saturate}%)`);
  
  return filters.length > 0 ? filters.join(' ') : 'none';
};

// Build Framer Motion animation props
const buildAnimationProps = (config) => {
  if (!config.animation.enabled) return {};
  
  const { animation } = config;
  
  return {
    initial: animation.initial,
    animate: animation.animate,
    exit: animation.exit,
    whileHover: animation.whileHover,
    whileTap: animation.whileTap,
    whileFocus: animation.whileFocus,
    whileInView: animation.whileInView,
    transition: animation.transition
  };
};

// Get responsive config for current breakpoint
const getResponsiveConfig = (config) => {
  if (!config.responsive.enabled) return config;
  
  const width = window.innerWidth;
  let breakpoint = 'desktop';
  
  if (width <= config.responsive.breakpoints.mobile.maxWidth) {
    breakpoint = 'mobile';
  } else if (width <= config.responsive.breakpoints.tablet.maxWidth) {
    breakpoint = 'tablet';
  }
  
  // Merge breakpoint-specific config
  const responsiveOverrides = config.responsive[breakpoint] || {};
  
  return {
    ...config,
    layout: { ...config.layout, ...responsiveOverrides.layout },
    spacing: { ...config.spacing, ...responsiveOverrides.spacing },
    style: { ...config.style, ...responsiveOverrides.style },
    content: { ...config.content, ...responsiveOverrides.content }
  };
};

// Evaluate conditional expression
const evaluateCondition = (condition, props) => {
  if (!condition) return true;
  
  try {
    // Simple evaluation - can be enhanced with a proper expression parser
    const func = new Function('props', `return ${condition}`);
    return func(props);
  } catch (error) {
    console.warn('Failed to evaluate condition:', condition, error);
    return true;
  }
};

// Handle widget interactions
const handleInteraction = (eventType, config, props) => {
  const handler = config.interaction[eventType];
  
  if (!handler) return undefined;
  
  return (event) => {
    // If handler is a string (action name), look it up in props
    if (typeof handler === 'string') {
      const action = props[handler];
      if (typeof action === 'function') {
        action(event, config, props);
      }
    } else if (typeof handler === 'function') {
      handler(event, config, props);
    }
  };
};

// Get layout class based on widget type
const getLayoutClass = (config) => {
  const classes = [];
  
  if (config.type === WIDGET_TYPES.FLEX) {
    classes.push('flex');
    if (config.layout.direction) classes.push(`flex-${config.layout.direction}`);
    if (config.layout.wrap) classes.push('flex-wrap');
    if (config.layout.justify) classes.push(`justify-${config.layout.justify}`);
    if (config.layout.align) classes.push(`items-${config.layout.align}`);
  }
  
  if (config.type === WIDGET_TYPES.GRID) {
    classes.push('grid');
    if (config.layout.columns) classes.push(`grid-cols-${config.layout.columns}`);
    if (config.layout.rows) classes.push(`grid-rows-${config.layout.rows}`);
  }
  
  return classes.join(' ');
};

export default WidgetRenderer;
