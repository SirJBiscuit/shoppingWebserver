import React, { useState, useRef } from 'react';
import { X, Plus, Minus, Divide, Percent, Delete, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CalculatorWidget - Compact draggable calculator for shopping budget calculations
 * 
 * Features:
 * - Basic arithmetic (+, -, ×, ÷)
 * - Percentage calculations
 * - Clear and delete
 * - Draggable positioning
 * - Compact green theme
 * - No backdrop overlay
 */
const CalculatorWidget = ({ onClose, device = 'mobile' }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragConstraintsRef = useRef(null);
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

  // Compact draggable calculator (no backdrop)
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{
        left: -window.innerWidth + 300,
        right: window.innerWidth - 300,
        top: -100,
        bottom: window.innerHeight - 450
      }}
      initial={{ opacity: 0, scale: 0.8, x: device === 'mobile' ? 0 : 100, y: device === 'mobile' ? 100 : 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className="fixed top-20 right-4 z-[100] w-[280px] sm:w-[320px] cursor-move"
      style={{ touchAction: 'none' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-green-500 dark:border-green-600 overflow-hidden">
        {/* Draggable Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-white/70" />
            <h3 className="text-sm font-bold text-white">💰 Calculator</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white p-1 transition-colors hover:bg-white/20 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900">
          {operation && previousValue !== null && (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              {previousValue} {operation}
            </div>
          )}
          <div className="text-right text-2xl font-bold text-gray-900 dark:text-white">
            ${parseFloat(display).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Compact Buttons */}
        <div className="p-2">
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <button onClick={handleClear} className="col-span-2 py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg font-semibold text-sm shadow">C</button>
            <button onClick={handleDelete} className="py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg font-semibold shadow"><Delete className="w-4 h-4 mx-auto" /></button>
            <button onClick={() => handleOperation('÷')} className="py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold shadow">÷</button>
            
            {/* Row 2 */}
            {[7, 8, 9].map(num => (
              <button key={num} onClick={() => handleNumber(num)} className="py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-semibold shadow">{num}</button>
            ))}
            <button onClick={() => handleOperation('×')} className="py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold shadow">×</button>
            
            {/* Row 3 */}
            {[4, 5, 6].map(num => (
              <button key={num} onClick={() => handleNumber(num)} className="py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-semibold shadow">{num}</button>
            ))}
            <button onClick={() => handleOperation('-')} className="py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold shadow">−</button>
            
            {/* Row 4 */}
            {[1, 2, 3].map(num => (
              <button key={num} onClick={() => handleNumber(num)} className="py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-semibold shadow">{num}</button>
            ))}
            <button onClick={() => handleOperation('+')} className="py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold shadow">+</button>
            
            {/* Row 5 */}
            <button onClick={() => handleOperation('%')} className="py-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg font-semibold shadow">%</button>
            <button onClick={() => handleNumber(0)} className="py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-semibold shadow">0</button>
            <button onClick={handleDecimal} className="py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-semibold shadow">.</button>
            <button onClick={handleEquals} className="py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg font-bold shadow">=</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CalculatorWidget;
