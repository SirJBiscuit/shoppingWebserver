import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import Draggable from 'react-draggable';

/**
 * CustomKeypad - A reusable, responsive keypad component
 * 
 * Features:
 * - Works on mobile (bottom sheet), tablet (centered), desktop (draggable)
 * - Supports custom button layouts (numbers, aisles, letters, etc.)
 * - Touch-friendly 44px minimum height
 * - Responsive grid columns
 * - Auto-detects device type or accepts device prop
 * 
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Called when value changes
 * @param {function} props.onSave - Called when save/submit is clicked
 * @param {function} props.onCancel - Called when cancel/close is clicked
 * @param {string} props.device - Device type: 'mobile', 'tablet', 'desktop' (auto-detected if not provided)
 * @param {string} props.title - Title text for the keypad
 * @param {Array} props.buttons - Array of button configs: [{ label, value, className?, icon? }]
 * @param {Object} props.gridCols - Grid columns for different sizes: { mobile: 4, tablet: 5, desktop: 10 }
 * @param {string} props.placeholder - Placeholder for custom input
 * @param {boolean} props.allowCustomInput - Show custom input field (default: true)
 * @param {string} props.inputType - Input type: 'text', 'number' (default: 'text')
 * @param {string} props.inputMode - Input mode: 'numeric', 'text', 'decimal' (default: 'text')
 * @param {number} props.maxLength - Max length for input
 * @param {string} props.highlightValue - Value to highlight (e.g., predicted aisle)
 * @param {string} props.highlightHint - Hint text for highlighted value
 */
const CustomKeypad = ({
  value = '',
  onChange,
  onSave,
  onCancel,
  device: deviceProp,
  title = 'Select or Enter',
  buttons = [],
  gridCols = { mobile: 4, tablet: 5, desktop: 10 },
  placeholder = 'Enter custom value...',
  allowCustomInput = true,
  inputType = 'text',
  inputMode = 'text',
  maxLength,
  highlightValue,
  highlightHint
}) => {
  const [customInput, setCustomInput] = useState('');
  const [deviceType, setDeviceType] = useState(deviceProp || 'desktop');

  // Auto-detect device type if not provided
  useEffect(() => {
    if (!deviceProp) {
      const detectDevice = () => {
        const width = window.innerWidth;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (width < 640 || (isTouchDevice && width < 768)) {
          return 'mobile';
        } else if (width >= 640 && width < 1024) {
          return 'tablet';
        } else {
          return 'desktop';
        }
      };
      
      setDeviceType(detectDevice());
      
      const handleResize = () => setDeviceType(detectDevice());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [deviceProp]);

  const handleButtonClick = (buttonValue) => {
    if (onChange) {
      onChange(buttonValue);
    }
    if (onSave) {
      onSave(buttonValue);
    }
  };

  const handleCustomSubmit = () => {
    if (customInput && onSave) {
      onSave(customInput);
      setCustomInput('');
    }
  };

  const handleClose = () => {
    setCustomInput('');
    if (onCancel) {
      onCancel();
    }
  };

  // Grid column classes based on device
  const getGridClass = () => {
    if (deviceType === 'mobile') {
      return `grid-cols-${gridCols.mobile}`;
    } else if (deviceType === 'tablet') {
      return `grid-cols-${gridCols.tablet}`;
    } else {
      return `grid-cols-${gridCols.desktop}`;
    }
  };

  // Render the keypad content
  const renderKeypadContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-purple-300 dark:border-purple-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-purple-600 dark:bg-purple-700">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-white">
            {title}
          </h3>
          {highlightHint && highlightValue && (
            <p className="text-xs text-purple-100 mt-1">
              {highlightHint}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:text-purple-200 p-1 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Button Grid */}
      <div className="p-3 sm:p-4">
        <div className={`grid ${getGridClass()} gap-2 mb-3`}>
          {buttons.map((button, index) => {
            const isHighlighted = highlightValue && button.value === highlightValue;
            const buttonClass = button.className || 'bg-white dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900 border-2 border-purple-200 dark:border-purple-600';
            const highlightClass = isHighlighted 
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-400' 
              : buttonClass;
            
            return (
              <button
                key={button.value || index}
                onClick={() => handleButtonClick(button.value)}
                className={`px-2 py-2 sm:px-3 sm:py-2.5 rounded-lg font-bold text-purple-900 dark:text-purple-100 transition-all min-h-[44px] ${highlightClass}`}
                title={isHighlighted ? `${highlightHint} - ${button.label}` : button.label}
              >
                {button.icon && <span className="mr-1">{button.icon}</span>}
                {button.label}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        {allowCustomInput && (
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              type={inputType}
              inputMode={inputMode}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSubmit();
                }
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              className="flex-1 px-3 py-2.5 sm:py-2 border-2 border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customInput}
              className="px-4 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Submit</span>
            </button>
          </div>
        )}

        {/* Helper Text */}
        {highlightValue && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 text-center">
            💡 Tap a button or enter a custom value
          </p>
        )}
      </div>
    </div>
  );

  // Mobile: Bottom sheet (fixed at bottom)
  if (deviceType === 'mobile') {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={handleClose}
        />
        
        {/* Bottom Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-[101] animate-slide-up">
          {renderKeypadContent()}
        </div>
      </>
    );
  }

  // Tablet: Centered modal
  if (deviceType === 'tablet') {
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={handleClose}
        />
        
        {/* Centered Modal */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-2xl">
          {renderKeypadContent()}
        </div>
      </>
    );
  }

  // Desktop: Draggable widget
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-[100]"
        onClick={handleClose}
      />
      
      {/* Draggable Widget */}
      <Draggable
        handle=".drag-handle"
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
      >
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[600px] max-w-[90vw] cursor-move">
          <div className="drag-handle">
            {renderKeypadContent()}
          </div>
        </div>
      </Draggable>
    </>
  );
};

export default CustomKeypad;
