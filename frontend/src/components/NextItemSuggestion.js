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
            className="p-1.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
            title="Hide this feature"
          >
            <EyeOff className="w-4 h-4 text-green-700 dark:text-green-300" />
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
                  title="Decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="px-3 font-bold text-gray-900 dark:text-white min-w-[50px] text-center">
                  {formatQuantityPlain(nextItem.quantity || 1)}
                </div>
                <button
                  onClick={() => onQuantityChange(nextItem, 1)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Secondary Actions Row - Labeled Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-medium text-sm"
              title="Edit item details"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>

            <button
              onClick={onJumpToItem}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-medium text-sm"
              title="Scroll to item in list"
            >
              <Eye className="w-4 h-4" />
              <span>Go To</span>
            </button>

            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all font-medium text-sm"
              title="Skip for now, come back later"
            >
              <SkipForward className="w-4 h-4" />
              <span>Skip</span>
            </button>

            {onDeferItem ? (
              <button
                onClick={() => onDeferItem(nextItem)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-medium text-sm"
                title="Don't need right now"
              >
                <X className="w-4 h-4" />
                <span>Don't Need</span>
              </button>
            ) : (
              <button
                onClick={onCopyMove}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all font-medium text-sm"
                title="Copy or move to another list"
              >
                <Copy className="w-4 h-4" />
                <span>Copy/Move</span>
              </button>
            )}
          </div>

          {/* Undo Button - If available */}
          {onUndo && (
            <button
              onClick={onUndo}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition-all font-medium text-sm"
            >
              <Undo className="w-4 h-4" />
              <span>Undo (Go Back)</span>
            </button>
          )}
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
