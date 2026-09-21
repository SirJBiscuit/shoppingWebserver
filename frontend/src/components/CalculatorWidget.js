import React, { useState } from 'react';
import { X, Plus, Minus, Divide, Percent, Delete } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CalculatorWidget - Simple calculator for shopping budget calculations
 * 
 * Features:
 * - Basic arithmetic (+, -, ×, ÷)
 * - Percentage calculations
 * - Clear and delete
 * - Running total display
 * - Mobile-friendly bottom sheet
 * - Tablet/desktop centered modal
 */
const CalculatorWidget = ({ onClose, device = 'mobile' }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(num.toString());
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num.toString() : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op) => {
    const current = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(current);
    } else if (operation) {
      const result = calculate(previousValue, current, operation);
      setDisplay(result.toString());
      setPreviousValue(result);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev, current, op) => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return current !== 0 ? prev / current : 0;
      case '%':
        return prev * (current / 100);
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(result.toString());
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  };

  const renderCalculator = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-green-300 dark:border-green-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-green-600 dark:bg-green-700">
        <h3 className="text-base sm:text-lg font-bold text-white">
          💰 Calculator
        </h3>
        <button
          onClick={onClose}
          className="text-white hover:text-green-200 p-1 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Display */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        {/* Operation Display */}
        {operation && previousValue !== null && (
          <div className="text-right text-sm text-gray-500 dark:text-gray-400 mb-1">
            {previousValue} {operation}
          </div>
        )}
        
        {/* Main Display */}
        <div className="text-right text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white break-all">
          ${parseFloat(display).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Buttons */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1: Clear, Delete, %, ÷ */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="col-span-2 px-3 py-3 sm:py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            Clear
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="px-3 py-3 sm:py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            <Delete className="w-5 h-5 mx-auto" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOperation('÷')}
            className="px-3 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            ÷
          </motion.button>

          {/* Row 2: 7, 8, 9, × */}
          {[7, 8, 9].map(num => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumber(num)}
              className="px-3 py-3 sm:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold shadow-lg min-h-[44px]"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOperation('×')}
            className="px-3 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            ×
          </motion.button>

          {/* Row 3: 4, 5, 6, - */}
          {[4, 5, 6].map(num => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumber(num)}
              className="px-3 py-3 sm:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold shadow-lg min-h-[44px]"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOperation('-')}
            className="px-3 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            -
          </motion.button>

          {/* Row 4: 1, 2, 3, + */}
          {[1, 2, 3].map(num => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumber(num)}
              className="px-3 py-3 sm:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold shadow-lg min-h-[44px]"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOperation('+')}
            className="px-3 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            +
          </motion.button>

          {/* Row 5: %, 0, ., = */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOperation('%')}
            className="px-3 py-3 sm:py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            %
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleNumber(0)}
            className="px-3 py-3 sm:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDecimal}
            className="px-3 py-3 sm:py-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            .
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleEquals}
            className="px-3 py-3 sm:py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg min-h-[44px]"
          >
            =
          </motion.button>
        </div>
      </div>
    </div>
  );

  // Mobile: Bottom sheet
  if (device === 'mobile') {
    return (
      <AnimatePresence>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100]"
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-0 left-0 right-0 z-[101] max-h-[90vh] overflow-y-auto"
        >
          {renderCalculator()}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Tablet/Desktop: Centered modal
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={onClose}
      />
      
      {/* Centered Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-md"
      >
        {renderCalculator()}
      </motion.div>
    </AnimatePresence>
  );
};

export default CalculatorWidget;
