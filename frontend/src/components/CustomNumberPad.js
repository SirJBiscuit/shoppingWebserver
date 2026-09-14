import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete, Check, X, Move } from 'lucide-react';

const CustomNumberPad = ({ value, onChange, onSave, onCancel, maxDigits = 6, device = 'desktop' }) => {
  // device can be: 'mobile', 'tablet', 'desktop'
  const constraintsRef = useRef(null);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    // Calculate constraints to keep number pad on screen
    const updateConstraints = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const padWidth = 320; // max-w-[320px]
      const padHeight = 400; // approximate height
      
      setDragConstraints({
        left: -(windowWidth / 2 - padWidth / 2 - 20),
        right: windowWidth / 2 - padWidth / 2 - 20,
        top: -(windowHeight / 2 - padHeight / 2 - 20),
        bottom: windowHeight / 2 - padHeight / 2 - 20
      });
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, []);
  const handleNumberClick = (num) => {
    const currentValue = value.toString();
    
    // Prevent adding more digits than maxDigits
    const digitsOnly = currentValue.replace('.', '');
    if (digitsOnly.length >= maxDigits) return;
    
    // Add the number
    const newValue = currentValue + num;
    onChange(newValue);
  };

  const handleDecimalClick = () => {
    const currentValue = value.toString();
    
    // Only add decimal if there isn't one already
    if (!currentValue.includes('.')) {
      onChange(currentValue + '.');
    }
  };

  const handleBackspace = () => {
    const currentValue = value.toString();
    if (currentValue.length > 0) {
      onChange(currentValue.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const buttonVariants = {
    tap: { scale: 0.95 },
    hover: { scale: 1.05 }
  };

  const NumberButton = ({ number, onClick }) => (
    <motion.button
      variants={buttonVariants}
      whileTap="tap"
      whileHover="hover"
      onClick={onClick}
      className="aspect-square rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold shadow-lg active:shadow-md transition-shadow"
    >
      {number}
    </motion.button>
  );

  const ActionButton = ({ icon: Icon, onClick, variant = 'default', children }) => {
    const variants = {
      default: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
      success: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      danger: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
    };

    return (
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={onClick}
        className={`aspect-square rounded-xl bg-gradient-to-br ${variants[variant]} text-white font-bold shadow-lg active:shadow-md transition-shadow flex items-center justify-center`}
      >
        {Icon ? <Icon className="w-6 h-6" /> : children}
      </motion.button>
    );
  };

  // Mobile horizontal layout (phones only)
  if (device === 'mobile') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border-t-2 border-blue-200 dark:border-blue-800 
                   w-full p-3 pb-safe"
      >
        {/* Device Indicator */}
        <div className="text-center mb-2">
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded font-medium">MOBILE</span>
        </div>
        
        {/* Display - Compact */}
        <div className="mb-2 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold text-gray-600 dark:text-gray-400 mr-1">$</span>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 min-w-[100px] text-right">
              {value || '0'}
            </span>
          </div>
        </div>

        {/* Horizontal Number Pad - 2 rows */}
        <div className="space-y-2">
          {/* Row 1: 1-5 */}
          <div className="grid grid-cols-5 gap-1.5">
            <NumberButton number="1" onClick={() => handleNumberClick('1')} />
            <NumberButton number="2" onClick={() => handleNumberClick('2')} />
            <NumberButton number="3" onClick={() => handleNumberClick('3')} />
            <NumberButton number="4" onClick={() => handleNumberClick('4')} />
            <NumberButton number="5" onClick={() => handleNumberClick('5')} />
          </div>
          
          {/* Row 2: 6-0 */}
          <div className="grid grid-cols-5 gap-1.5">
            <NumberButton number="6" onClick={() => handleNumberClick('6')} />
            <NumberButton number="7" onClick={() => handleNumberClick('7')} />
            <NumberButton number="8" onClick={() => handleNumberClick('8')} />
            <NumberButton number="9" onClick={() => handleNumberClick('9')} />
            <NumberButton number="0" onClick={() => handleNumberClick('0')} />
          </div>
          
          {/* Row 3: Actions */}
          <div className="grid grid-cols-5 gap-1.5">
            <ActionButton onClick={handleDecimalClick}>
              <span className="text-2xl">.</span>
            </ActionButton>
            <ActionButton icon={Delete} onClick={handleBackspace} />
            <ActionButton onClick={handleClear} variant="default">
              <span className="text-xs font-bold">CLR</span>
            </ActionButton>
            <ActionButton icon={X} onClick={onCancel} variant="danger" />
            <ActionButton icon={Check} onClick={onSave} variant="success" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Tablet layout - Same as desktop
  if (device === 'tablet') {
    return (
      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
        whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-blue-200 dark:border-blue-800 
                   w-full max-w-[300px] mx-auto
                   p-3 select-none touch-none"
        style={{ cursor: 'grab' }}
      >
        {/* Device Indicator */}
        <div className="text-center mb-1">
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded font-medium">TABLET</span>
        </div>
        
        {/* Drag Handle */}
        <div className="flex items-center justify-center mb-2 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          <Move className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Drag to move</span>
        </div>
        
        {/* Display */}
        <div className="mb-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2.5 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold text-gray-600 dark:text-gray-400 mr-1">$</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 min-w-[90px] text-right">
              {value || '0'}
            </span>
          </div>
        </div>

        {/* Number Pad - 3x4 Grid */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* Row 1: 7, 8, 9 */}
          <NumberButton number="7" onClick={() => handleNumberClick('7')} />
          <NumberButton number="8" onClick={() => handleNumberClick('8')} />
          <NumberButton number="9" onClick={() => handleNumberClick('9')} />
          
          {/* Row 2: 4, 5, 6 */}
          <NumberButton number="4" onClick={() => handleNumberClick('4')} />
          <NumberButton number="5" onClick={() => handleNumberClick('5')} />
          <NumberButton number="6" onClick={() => handleNumberClick('6')} />
          
          {/* Row 3: 1, 2, 3 */}
          <NumberButton number="1" onClick={() => handleNumberClick('1')} />
          <NumberButton number="2" onClick={() => handleNumberClick('2')} />
          <NumberButton number="3" onClick={() => handleNumberClick('3')} />
          
          {/* Row 4: ., 0, ← */}
          <ActionButton onClick={handleDecimalClick}>
            <span className="text-xl">.</span>
          </ActionButton>
          <NumberButton number="0" onClick={() => handleNumberClick('0')} />
          <ActionButton icon={Delete} onClick={handleBackspace} />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <ActionButton onClick={handleClear} variant="default">
            <span className="text-sm font-bold">CLR</span>
          </ActionButton>
          <ActionButton icon={X} onClick={onCancel} variant="danger" />
          <ActionButton icon={Check} onClick={onSave} variant="success" />
        </div>
      </motion.div>
    );
  }

  // Desktop layout - Full size with drag
  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragElastic={0.1}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-blue-200 dark:border-blue-800 
                 w-full max-w-[320px] mx-auto
                 p-3 select-none touch-none"
      style={{ cursor: 'grab' }}
    >
      {/* Device Indicator */}
      <div className="text-center mb-1">
        <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded font-medium">DESKTOP</span>
      </div>
      
      {/* Drag Handle */}
      <div className="flex items-center justify-center mb-1 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg -mx-1">
        <Move className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-medium">Drag to move</span>
      </div>
      
      {/* Display */}
      <div className="mb-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-center">
          <span className="text-xl font-bold text-gray-600 dark:text-gray-400 mr-1">$</span>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 min-w-[100px] text-right">
            {value || '0'}
          </span>
        </div>
      </div>

      {/* Number Pad - 3x4 Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Row 1: 7, 8, 9 */}
        <NumberButton number="7" onClick={() => handleNumberClick('7')} />
        <NumberButton number="8" onClick={() => handleNumberClick('8')} />
        <NumberButton number="9" onClick={() => handleNumberClick('9')} />
        
        {/* Row 2: 4, 5, 6 */}
        <NumberButton number="4" onClick={() => handleNumberClick('4')} />
        <NumberButton number="5" onClick={() => handleNumberClick('5')} />
        <NumberButton number="6" onClick={() => handleNumberClick('6')} />
        
        {/* Row 3: 1, 2, 3 */}
        <NumberButton number="1" onClick={() => handleNumberClick('1')} />
        <NumberButton number="2" onClick={() => handleNumberClick('2')} />
        <NumberButton number="3" onClick={() => handleNumberClick('3')} />
        
        {/* Row 4: ., 0, ← */}
        <ActionButton onClick={handleDecimalClick}>
          <span className="text-xl sm:text-2xl">.</span>
        </ActionButton>
        <NumberButton number="0" onClick={() => handleNumberClick('0')} />
        <ActionButton icon={Delete} onClick={handleBackspace} />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <ActionButton 
          onClick={handleClear}
          variant="default"
        >
          <span className="text-xs sm:text-sm font-bold">CLR</span>
        </ActionButton>
        <ActionButton 
          icon={X} 
          onClick={onCancel}
          variant="danger"
        />
        <ActionButton 
          icon={Check} 
          onClick={onSave}
          variant="success"
        />
      </div>
    </motion.div>
  );
};

export default CustomNumberPad;
