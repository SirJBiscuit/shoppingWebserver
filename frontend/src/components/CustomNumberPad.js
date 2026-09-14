import React from 'react';
import { motion } from 'framer-motion';
import { Delete, Check, X } from 'lucide-react';

const CustomNumberPad = ({ value, onChange, onSave, onCancel, maxDigits = 6 }) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl border-2 border-blue-200 dark:border-blue-800"
    >
      {/* Display */}
      <div className="mb-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-600 dark:text-gray-400 mr-2">$</span>
          <span className="text-4xl font-bold text-blue-600 dark:text-blue-400 min-w-[120px] text-right">
            {value || '0'}
          </span>
        </div>
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 mb-3">
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
          <span className="text-2xl">.</span>
        </ActionButton>
        <NumberButton number="0" onClick={() => handleNumberClick('0')} />
        <ActionButton icon={Delete} onClick={handleBackspace} />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Quick Clear Button */}
      <motion.button
        variants={buttonVariants}
        whileTap="tap"
        whileHover="hover"
        onClick={handleClear}
        className="w-full mt-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm transition-colors"
      >
        Clear All
      </motion.button>
    </motion.div>
  );
};

export default CustomNumberPad;
