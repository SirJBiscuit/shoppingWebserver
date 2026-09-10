import React, { useState } from 'react';
import { MapPin, ArrowRight, Check, SkipForward, EyeOff, Copy, ArrowDown, Edit2, Undo, X, Plus, Minus, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatQuantityPlain } from '../utils/formatQuantity';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [], onCheck, onSkip, onHide, onCopyMove, onJumpToItem, onEdit, onUndo, onDeferItem, onQuantityChange, peekNextItem }) => {
  const [showGuide, setShowGuide] = useState(() => {
    // Show guide on first use
    return !localStorage.getItem('lookingForNextGuideShown');
  });

  const hideGuide = () => {
    setShowGuide(false);
    localStorage.setItem('lookingForNextGuideShown', 'true');
  };

  if (!nextItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 pr-14 shadow-lg relative"
    >
      {/* Visual Guide for first-time users */}
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-semibold z-20 whitespace-nowrap"
        >
          <div className="flex items-center gap-2">
            <span>👋 This helps you find items faster!</span>
            <button onClick={hideGuide} className="hover:bg-blue-700 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-blue-600"></div>
        </motion.div>
      )}

      {/* Hide button - absolute top-right, outside action buttons area */}
      <button
        onClick={onHide}
        className="absolute top-3 right-3 p-1.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors z-10"
        title="Hide 'Looking for Next' feature - You can re-enable it later"
      >
        <EyeOff className="w-5 h-5 text-green-700 dark:text-green-300" />
      </button>

      <div className="flex items-center justify-between pr-2">
        <div className="flex items-center space-x-3 flex-1">
          <div className="bg-green-500 text-white rounded-full p-2">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
              Looking for Next
            </p>
            <div className="flex items-center mt-1">
              <span className="text-3xl mr-2">{nextItem.item_icon || '📦'}</span>
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {nextItem.item_name}
                </p>
                {nextItem.aisle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    Aisle {nextItem.aisle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {/* Quick Quantity Adjust */}
          {onQuantityChange && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border-2 border-green-500 p-1">
              <button
                onClick={() => onQuantityChange(nextItem, -1)}
                className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                title="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-green-700 dark:text-green-300" />
              </button>
              <div className="px-2 font-bold text-green-700 dark:text-green-300 min-w-[40px] text-center">
                x{formatQuantityPlain(nextItem.quantity || 1)}
              </div>
              <button
                onClick={() => onQuantityChange(nextItem, 1)}
                className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                title="Increase quantity"
              >
                <Plus className="w-4 h-4 text-green-700 dark:text-green-300" />
              </button>
            </div>
          )}
          {/* Item Checkbox - synced with actual item */}
          <motion.button
            key={`${nextItem.id}-${nextItem.is_checked}`}
            onClick={onCheck}
            whileTap={{ scale: 0.9 }}
            animate={nextItem.is_checked ? {
              scale: [1, 1.3, 1],
              rotate: [0, 10, -10, 0],
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0)',
                '0 0 0 10px rgba(34, 197, 94, 0.3)',
                '0 0 0 20px rgba(34, 197, 94, 0)'
              ]
            } : { scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
              nextItem.is_checked
                ? 'bg-green-500 border-green-600 text-white'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}
            title={nextItem.is_checked ? "✓ Item found!" : "☐ Mark as found"}
          >
            {nextItem.is_checked && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="w-6 h-6" />
              </motion.div>
            )}
          </motion.button>
          {/* Undo Button */}
          {onUndo && (
            <button
              onClick={onUndo}
              className="bg-gray-400 hover:bg-gray-500 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
              title="⏮️ Go back to previous item"
            >
              <Undo className="w-5 h-5" />
            </button>
          )}
          
          {/* Edit Button - Opens Modal */}
          <button
            onClick={onEdit}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="✏️ Edit this item (opens modal)"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          
          {/* Go to Item Button - Scrolls to item */}
          <button
            onClick={onJumpToItem}
            className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="👁️ Go to item in list (scroll)"
          >
            <Eye className="w-5 h-5" />
          </button>
          
          {/* Copy/Move Button */}
          <button
            onClick={onCopyMove}
            className="bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="📋 Copy or Move to another list"
          >
            <Copy className="w-5 h-5" />
          </button>
          
          {/* Don't Need Right Now Button */}
          {onDeferItem && (
            <button
              onClick={() => onDeferItem(nextItem)}
              className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
              title="❌ Don't need right now - Cross off for next trip"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          {/* Skip Button */}
          <button
            onClick={onSkip}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="⏭️ Skip this item - Can't find it right now, I'll come back to it later"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Next Item Preview */}
      {peekNextItem && (
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
            <span className="font-semibold">Next:</span>
            <span className="text-xl">{peekNextItem.item_icon || '📦'}</span>
            <span className="font-medium">{peekNextItem.item_name}</span>
            {peekNextItem.aisle && (
              <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                Aisle {peekNextItem.aisle}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Same Aisle Items */}
      {sameAisleItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
            💡 Also in this aisle:
          </p>
          <div className="flex flex-wrap gap-2">
            {sameAisleItems.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1 text-sm flex items-center space-x-2"
              >
                <span className="text-lg">{item.item_icon || '📦'}</span>
                <span className="text-gray-700 dark:text-gray-300">{item.item_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NextItemSuggestion;
