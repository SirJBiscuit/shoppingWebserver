import React, { useState } from 'react';
import { MapPin, ArrowRight, Check, SkipForward, EyeOff, Copy, Edit2, Undo, X, Plus, Minus, Eye, FileText, AlertCircle, Store, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatQuantityPlain } from '../utils/formatQuantity';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [], onCheck, onSkip, onHide, onCopyMove, onJumpToItem, onEdit, onUndo, onDeferItem, onQuantityChange, peekNextItem, storeName, onAddNote, onMarkUnavailable, onChangeStore }) => {
  const [showGuide, setShowGuide] = useState(() => {
    return !localStorage.getItem('lookingForNextGuideShown');
  });
  const [showHelp, setShowHelp] = useState(false);

  const hideGuide = () => {
    setShowGuide(false);
    localStorage.setItem('lookingForNextGuideShown', 'true');
  };

  // Get price color based on comparison (future: compare with historical prices)
  const getPriceColor = (price, avgPrice) => {
    if (!price || !avgPrice) return 'text-gray-600 dark:text-gray-400';
    const ratio = price / avgPrice;
    if (ratio <= 0.8) return 'text-green-600 dark:text-green-400'; // Great price!
    if (ratio <= 0.95) return 'text-yellow-600 dark:text-yellow-400'; // Good price
    if (ratio <= 1.1) return 'text-orange-500 dark:text-orange-400'; // Fair price
    return 'text-red-600 dark:text-red-400'; // High price
  };

  // Get price badge background
  const getPriceBadgeColor = (price, avgPrice) => {
    if (!price || !avgPrice) return 'bg-gray-100 dark:bg-gray-700';
    const ratio = price / avgPrice;
    if (ratio <= 0.8) return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    if (ratio <= 0.95) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    if (ratio <= 1.1) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
    return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                showHelp 
                  ? 'bg-blue-500 text-white' 
                  : 'hover:bg-green-200 dark:hover:bg-green-800'
              }`}
              aria-label="Show help guide"
            >
              <HelpCircle className={`w-5 h-5 ${showHelp ? 'text-white' : 'text-green-700 dark:text-green-300'}`} />
            </button>
            <button
              onClick={onHide}
              className="p-3 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Hide Looking for Next"
            >
              <EyeOff className="w-5 h-5 text-green-700 dark:text-green-300" />
            </button>
          </div>
        </div>

        {/* Store Name */}
        {storeName && (
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Shopping at:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">🏪 {storeName}</span>
          </div>
        )}

        {/* Help Guide Panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Button Guide
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Checkbox:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Mark item as found in store</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Edit:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Change item details (name, quantity, price, etc.)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Go To:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Scroll to this item in your full list</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <SkipForward className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Skip:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Skip for now, come back to it later</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Remove:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Don't need this item right now</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Undo className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Undo:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Go back to previous item you skipped</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Add Note:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Quick reminder (e.g., "Get organic")</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Unavailable:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Item is out of stock at this store</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">Change Store:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Move item to a different store list</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex gap-1 mt-0.5">
                      <Minus className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      <Plus className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">+/- Buttons:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Quickly adjust quantity needed</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item Info Row - Redesigned */}
        <div className="flex items-start gap-4 mb-4">
          {/* Large Icon */}
          <span className="text-7xl">{nextItem.item_icon || '📦'}</span>
          
          <div className="flex-1 min-w-0">
            {/* Item Name & Aisle */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {nextItem.item_name}
              </h3>
              {nextItem.aisle && (
                <span className="text-lg font-bold bg-purple-500 text-white px-3 py-1 rounded-lg flex-shrink-0">
                  Aisle: {nextItem.aisle}
                </span>
              )}
            </div>
            
            {/* Compact Info Row */}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              {nextItem.category && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {nextItem.category}
                </span>
              )}
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatQuantityPlain(nextItem.quantity || 1)} {nextItem.unit || ''}
              </span>
              {nextItem.price && (
                <span className={`font-bold ${getPriceColor(nextItem.price, nextItem.avg_price)}`}>
                  ${(nextItem.price * (nextItem.quantity || 1)).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Organized in Groups */}
        <div className="space-y-3">
          {/* Primary Actions Row */}
          <div className="flex items-center gap-3">
            {/* Checkbox - Simple box with animation */}
            <motion.button
              onClick={onCheck}
              whileTap={{ scale: 0.9 }}
              className={`w-12 h-12 rounded-lg border-3 flex items-center justify-center transition-all ${
                nextItem.is_checked
                  ? 'bg-green-500 border-green-600'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500'
              }`}
            >
              {nextItem.is_checked && (
                <motion.div
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                >
                  <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
            
            {/* Label */}
            <span className={`text-base font-semibold flex-1 ${
              nextItem.is_checked 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {nextItem.is_checked ? '✓ Found!' : 'Mark as Found'}
            </span>

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

          {/* New Action Buttons Row */}
          <div className="grid grid-cols-3 gap-1.5">
            {onAddNote && (
              <button
                onClick={() => onAddNote(nextItem)}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white rounded-lg transition-all min-h-[44px]"
              >
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add Note</span>
              </button>
            )}

            {onMarkUnavailable && (
              <button
                onClick={() => onMarkUnavailable(nextItem)}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-lg transition-all min-h-[44px]"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="text-[10px] font-medium">Unavailable</span>
              </button>
            )}

            {onChangeStore && (
              <button
                onClick={() => onChangeStore(nextItem)}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg transition-all min-h-[44px]"
              >
                <Store className="w-5 h-5" />
                <span className="text-[10px] font-medium">Change Store</span>
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

        {/* Same Aisle Items - Grouped for efficiency */}
        {sameAisleItems.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10 -mx-4 px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    Grab These Too!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {sameAisleItems.length} more {sameAisleItems.length === 1 ? 'item' : 'items'} in {nextItem.aisle ? `Aisle ${nextItem.aisle}` : 'this area'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {sameAisleItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-3 flex items-center gap-3 ${
                    item.is_checked 
                      ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                  }`}
                >
                  {/* Checkbox */}
                  <motion.button
                    onClick={() => onCheck && onCheck(item)}
                    whileTap={{ scale: 0.9 }}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.is_checked
                        ? 'bg-green-500 border-green-600'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {item.is_checked && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      >
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Item Info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{item.item_icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        item.is_checked 
                          ? 'text-gray-500 dark:text-gray-400 line-through' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.item_name}
                      </p>
                      {item.quantity && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatQuantityPlain(item.quantity)} {item.unit || ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price if available */}
                  {item.price && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ${(item.price * (item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Total for aisle items */}
            {sameAisleItems.some(item => item.price) && (
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Aisle Total:
                </p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  ${sameAisleItems.reduce((sum, item) => 
                    sum + ((item.price || 0) * (item.quantity || 1)), 0
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NextItemSuggestion;
