import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Tooltip = ({ content, position = 'top', children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${getPositionClasses()}`}
          >
            <div className="bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg px-3 py-2 shadow-lg max-w-xs">
              {content}
              <div
                className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
                  position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
                  position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                  position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' :
                  'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const HelpIcon = ({ content, position }) => (
  <Tooltip content={content} position={position}>
    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
  </Tooltip>
);

export default Tooltip;
