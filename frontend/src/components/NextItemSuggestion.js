import React from 'react';
import { MapPin, ArrowRight, Check, SkipForward, EyeOff, Copy, ArrowDown, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [], onCheck, onSkip, onHide, onCopyMove, onJumpToItem, onEdit }) => {
  if (!nextItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 shadow-lg relative"
    >
      {/* Hide button - absolute top-right */}
      <button
        onClick={onHide}
        className="absolute top-2 right-2 p-1.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors"
        title="Hide 'Looking for Next' feature - You can re-enable it later"
      >
        <EyeOff className="w-5 h-5 text-green-700 dark:text-green-300" />
      </button>

      <div className="flex items-center justify-between">
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
          {nextItem.quantity && (
            <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
              ×{nextItem.quantity}
            </div>
          )}
          {/* Item Checkbox - synced with actual item */}
          <motion.button
            key={`${nextItem.id}-${nextItem.is_checked}`}
            onClick={onCheck}
            whileTap={{ scale: 0.9 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
              nextItem.is_checked
                ? 'bg-green-500 border-green-600 text-white'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}
            title={nextItem.is_checked ? "✓ Item found!" : "☐ Mark as found"}
          >
            {nextItem.is_checked && <Check className="w-6 h-6" />}
          </motion.button>
          <button
            onClick={onJumpToItem}
            className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="🎯 Jump to this item in the list"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={onCopyMove}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="📋 Copy or Move to another list"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="✏️ Edit this item"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onSkip}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full transition-all transform hover:scale-110 shadow-lg"
            title="⏭️ Skip this item - Can't find it right now, I'll come back to it later"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

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
