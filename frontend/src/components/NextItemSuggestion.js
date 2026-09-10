import React, { useState } from 'react';
import { MapPin, ArrowRight, Check, SkipForward, EyeOff, Copy, Edit2, Undo, X, Plus, Minus, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatQuantityPlain } from '../utils/formatQuantity';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [], onCheck, onSkip, onHide, onCopyMove, onJumpToItem, onEdit, onUndo, onDeferItem, onQuantityChange, peekNextItem }) => {
  const [showGuide, setShowGuide] = useState(() => {
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
      className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-lg relative overflow-hidden"
    >
      {/* Visual Guide Banner */}
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👋</span>
              <div>
                <p className="font-bold text-sm">Looking for Next helps you shop faster!</p>
                <p className="text-xs text-blue-100 mt-0.5">✓ Check off • ⏭️ Skip • ✏️ Edit • 🔢 Adjust quantity</p>
              </div>
            </div>
            <button onClick={hideGuide} className="hover:bg-blue-700 rounded-lg p-2 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-green-500 text-white rounded-full p-1.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wide">
              Looking for Next
            </span>
          </div>
          <button
            onClick={onHide}
            className="p-1.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors group"
          >
            <EyeOff className="w-4 h-4 text-green-700 dark:text-green-300" />
            <span className="hidden group-hover:block absolute right-0 top-full mt-1 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
              Hide this feature
            </span>
          </button>
        </div>

        {/* Item Info Row */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{nextItem.item_icon || '📦'}</span>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {nextItem.item_name}
            </h3>
            {nextItem.aisle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Aisle {nextItem.aisle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons - Organized in Groups */}
        <div className="space-y-3">
          {/* Primary Actions Row */}
          <div className="flex items-center gap-2">
            {/* Checkbox - Large and prominent */}
            <motion.button
              key={`${nextItem.id}-${nextItem.is_checked}`}
              onClick={onCheck}
              whileTap={{ scale: 0.95 }}
              animate={nextItem.is_checked ? {
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              } : { scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 font-semibold transition-all ${
                nextItem.is_checked
                  ? 'bg-green-500 border-green-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {nextItem.is_checked ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Found!</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 border-2 border-current rounded"></div>
                  <span>Mark as Found</span>
                </>
              )}
            </motion.button>

            {/* Quantity Controls */}
            {onQuantityChange && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-300 dark:border-gray-600 px-2 py-2">
                <button
                  onClick={() => onQuantityChange(nextItem, -1)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="px-3 font-bold text-gray-900 dark:text-white min-w-[50px] text-center">
                  {formatQuantityPlain(nextItem.quantity || 1)}
                </div>
                <button
                  onClick={() => onQuantityChange(nextItem, 1)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Secondary Actions Row - Compact but touch-friendly (44px min) */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={onEdit}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg transition-all min-h-[44px]"
            >
              <Edit2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Edit</span>
            </button>

            <button
              onClick={onJumpToItem}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-lg transition-all min-h-[44px]"
            >
              <Eye className="w-5 h-5" />
              <span className="text-[10px] font-medium">Go To</span>
            </button>

            <button
              onClick={onSkip}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-lg transition-all min-h-[44px]"
            >
              <SkipForward className="w-5 h-5" />
              <span className="text-[10px] font-medium">Skip</span>
            </button>

            {onDeferItem && (
              <button
                onClick={() => onDeferItem(nextItem)}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-lg transition-all min-h-[44px]"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-medium">Remove</span>
              </button>
            )}

            {onUndo && (
              <button
                onClick={onUndo}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg transition-all min-h-[44px]"
              >
                <Undo className="w-5 h-5" />
                <span className="text-[10px] font-medium">Undo</span>
              </button>
            )}
          </div>
        </div>

        {/* Next Item Preview */}
        {peekNextItem && (
          <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-green-700 dark:text-green-300">Up Next:</span>
              <span className="text-xl">{peekNextItem.item_icon || '📦'}</span>
              <span className="font-medium text-gray-900 dark:text-white">{peekNextItem.item_name}</span>
              {peekNextItem.aisle && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                  Aisle {peekNextItem.aisle}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Same Aisle Items */}
        {sameAisleItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
              <span>💡</span>
              <span>Also in this aisle:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {sameAisleItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2"
                >
                  <span className="text-lg">{item.item_icon || '📦'}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{item.item_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NextItemSuggestion;
