import React, { useState, useRef } from 'react';
import { MapPin, ArrowRight, Check, SkipForward, EyeOff, Copy, Edit2, Undo, X, Plus, Minus, Eye, FileText, AlertCircle, Store, HelpCircle, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatQuantityPlain } from '../utils/formatQuantity';
import { playSound } from '../utils/soundEffects';
import FormattedNote from './FormattedNote';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [], onCheck, onSkip, onHide, onCopyMove, onJumpToItem, onEdit, onUndo, onDeferItem, onQuantityChange, peekNextItem, storeName, onAddNote, onRemoveNote, onMarkUnavailable, onChangeStore, triggerCheckmarkAnimation, onPriceUpdate, triggerFlyingAnimation }) => {
  const [showGuide, setShowGuide] = useState(() => {
    return !localStorage.getItem('lookingForNextGuideShown');
  });
  const [showHelp, setShowHelp] = useState(false);
  const [isChecked, setIsChecked] = useState(nextItem?.is_checked || false);
  const [quickPrice, setQuickPrice] = useState(nextItem?.price || '');
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceSetTime, setPriceSetTime] = useState(null);
  const checkboxRef = useRef(null);
  const priceTrackingTimerRef = useRef(null);
  const sameAisleIconRefs = useRef({});
  
  // Update local state when nextItem changes
  React.useEffect(() => {
    setIsChecked(nextItem?.is_checked || false);
    setQuickPrice(nextItem?.price || '');
    setShowPriceInput(false);
    setPriceSetTime(null);
    // Clear any pending price tracking timer
    if (priceTrackingTimerRef.current) {
      clearTimeout(priceTrackingTimerRef.current);
      priceTrackingTimerRef.current = null;
    }
  }, [nextItem?.id, nextItem?.is_checked]);

  // Auto-save price to database after user keeps it for 3 seconds
  React.useEffect(() => {
    if (priceSetTime && quickPrice && parseFloat(quickPrice) > 0) {
      // Clear any existing timer
      if (priceTrackingTimerRef.current) {
        clearTimeout(priceTrackingTimerRef.current);
      }
      
      // Set new timer for 3 seconds
      priceTrackingTimerRef.current = setTimeout(() => {
        // Save price to database
        if (onPriceUpdate) {
          console.log(`Auto-saving price $${quickPrice} for ${nextItem.item_name} after 3 seconds`);
          onPriceUpdate(nextItem.id, parseFloat(quickPrice), true); // true = auto-save
        }
      }, 3000);
    }
    
    return () => {
      if (priceTrackingTimerRef.current) {
        clearTimeout(priceTrackingTimerRef.current);
      }
    };
  }, [priceSetTime, quickPrice, nextItem?.id, nextItem?.item_name, onPriceUpdate]);

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
      data-looking-for-next
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-lg relative overflow-hidden transition-all duration-300"
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
                      <span className="font-semibold text-gray-900 dark:text-white">Remove Item:</span>
                      <span className="text-gray-700 dark:text-gray-300"> Permanently delete item from list</span>
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

        {/* Item Info Row - Mobile Responsive */}
        <div className="flex items-start gap-3 sm:gap-4 mb-3">
          {/* Large Icon */}
          <span className="text-5xl sm:text-6xl flex-shrink-0">{nextItem.item_icon || '📦'}</span>
          
          <div className="flex-1 min-w-0">
            {/* Item Name */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
              {nextItem.item_name}
            </h3>

            {/* Mobile: Quantity and Checkbox stacked below name */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-md">
                <button
                  onClick={() => onQuantityChange && onQuantityChange(nextItem, -1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                >
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white min-w-[50px] sm:min-w-[70px] text-center">
                  {formatQuantityPlain(nextItem.quantity || 1)} {nextItem.unit || ''}
                </span>
                <button
                  onClick={() => onQuantityChange && onQuantityChange(nextItem, 1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Checkbox Button */}
              <motion.button
                ref={checkboxRef}
                onClick={async () => {
                  setIsChecked(true);
                  playSound('check');
                  if (quickPrice && onPriceUpdate) {
                    await onPriceUpdate(nextItem.id, parseFloat(quickPrice));
                  }
                  if (onCheck) onCheck();
                  if (triggerCheckmarkAnimation) triggerCheckmarkAnimation();
                }}
                className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all flex-shrink-0 shadow-md hover:shadow-lg ${
                  isChecked
                    ? 'bg-green-500'
                    : 'bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {isChecked && <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={4} />}
                <span className={`font-bold text-sm sm:text-base ${
                  isChecked ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {isChecked ? 'Found!' : 'Mark Found'}
                </span>
              </motion.button>
            </div>
            
            {/* Store, Aisle, Category, Price Row - VERY PROMINENT */}
            <div className="flex items-center gap-3 flex-wrap mt-2">
              {storeName && (
                <div className="flex items-center gap-2 bg-blue-500 px-4 py-2 rounded-xl shadow-md">
                  <Store className="w-5 h-5 text-white" />
                  <span className="text-base font-bold text-white">
                    {storeName}
                  </span>
                </div>
              )}
              
              {nextItem.aisle && (
                <div className="flex items-center gap-2 bg-purple-500 px-4 py-2 rounded-xl shadow-md">
                  <MapPin className="w-5 h-5 text-white" />
                  <div className="flex flex-col">
                    <span className="text-xs text-purple-100 leading-none">Aisle</span>
                    <span className="text-lg font-bold text-white leading-tight">
                      {nextItem.aisle}
                    </span>
                  </div>
                </div>
              )}
              
              {(nextItem.category_name || nextItem.category) && (
                <div className="flex items-center gap-2 bg-orange-500 px-4 py-2 rounded-xl shadow-md">
                  <span className="text-base font-bold text-white">
                    📍 {nextItem.category_name || nextItem.category}
                  </span>
                </div>
              )}
              
              {nextItem.price && (
                <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-xl shadow-md">
                  <DollarSign className="w-5 h-5 text-white" />
                  <div className="flex flex-col">
                    <span className="text-xs text-green-100 leading-none">
                      Default Price {nextItem.aisle && `• Aisle ${nextItem.aisle}`}
                    </span>
                    <span className={`text-lg font-bold text-white leading-tight`}>
                      ${(nextItem.price * (nextItem.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Note Display */}
            {nextItem.notes && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <FileText className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <FormattedNote 
                      text={nextItem.notes} 
                      className="text-sm text-yellow-800 dark:text-yellow-200"
                    />
                  </div>
                  {onRemoveNote && (
                    <button
                      onClick={() => onRemoveNote(nextItem)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition-colors flex-shrink-0"
                      title="Remove note"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Up Next Preview - Moved here */}
        {peekNextItem && (
          <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">Up Next:</span>
              <span className="text-2xl">{peekNextItem.item_icon || '📦'}</span>
              <span className="font-semibold text-gray-900 dark:text-white flex-1">{peekNextItem.item_name}</span>
              {peekNextItem.aisle && (
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-bold">
                  Aisle {peekNextItem.aisle}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Organized in Groups */}
        <div className="space-y-3">
          {/* Quick Price Entry - Redesigned */}
          {!isChecked && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Quick Price Entry
                  </label>
                </div>
                {quickPrice && (
                  <button
                    onClick={() => setQuickPrice('')}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Current Price Display - Clickable with Last Price */}
              <div 
                onClick={() => setShowPriceInput(true)}
                className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-2 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
              >
                {showPriceInput ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quickPrice}
                        onChange={(e) => setQuickPrice(e.target.value)}
                        autoFocus
                        placeholder="0.00"
                        className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-blue-600 dark:text-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowPriceInput(false);
                        if (quickPrice && onPriceUpdate) {
                          console.log(`Manual save: $${quickPrice} for ${nextItem.item_name}`);
                          onPriceUpdate(nextItem.id, parseFloat(quickPrice), false); // false = manual save
                          setPriceSetTime(Date.now()); // Start auto-save timer
                        }
                      }}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
                    >
                      ✓ Save Price
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${quickPrice || '0.00'}
                      </div>
                      {nextItem.price && (
                        <div className="text-base font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded">
                          Last: ${parseFloat(nextItem.price).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                        Buying {formatQuantityPlain(nextItem.quantity || 1)} {nextItem.unit || 'item'}{(nextItem.quantity || 1) > 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">• Click to edit</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Adjustment Buttons - Compact */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {/* Use Last Price Button */}
                {nextItem.price && (
                  <button
                    onClick={() => setQuickPrice(parseFloat(nextItem.price).toFixed(2))}
                    className="col-span-1 py-2 px-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all text-xs"
                    title="Use last price"
                  >
                    💡
                  </button>
                )}
                
                {/* Increment Buttons (Green) */}
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = (current + 5).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now()); // Start tracking
                  }}
                  className={`py-2 px-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold transition-all text-xs ${nextItem.price ? 'col-span-2' : 'col-span-2'}`}
                >
                  +$5
                </button>
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = (current + 1).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now());
                  }}
                  className={`py-2 px-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold transition-all text-xs ${nextItem.price ? 'col-span-2' : 'col-span-2'}`}
                >
                  +$1
                </button>
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = (current + 0.5).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now());
                  }}
                  className={`py-2 px-1 bg-green-500 hover:bg-green-600 text-white rounded font-bold transition-all text-xs ${nextItem.price ? 'col-span-2' : 'col-span-3'}`}
                >
                  +$0.50
                </button>
              </div>

              {/* Decrement Buttons (Red) */}
              <div className="grid grid-cols-6 gap-1 mb-2">
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = Math.max(0, current - 5).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now());
                  }}
                  className="col-span-2 py-2 px-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold transition-all text-xs"
                >
                  -$5
                </button>
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = Math.max(0, current - 1).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now());
                  }}
                  className="col-span-2 py-2 px-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold transition-all text-xs"
                >
                  -$1
                </button>
                <button
                  onClick={() => {
                    const current = parseFloat(quickPrice) || 0;
                    const newPrice = Math.max(0, current - 0.5).toFixed(2);
                    setQuickPrice(newPrice);
                    setPriceSetTime(Date.now());
                  }}
                  className="col-span-2 py-2 px-1 bg-red-500 hover:bg-red-600 text-white rounded font-bold transition-all text-xs"
                >
                  -$0.50
                </button>
              </div>
            </div>
          )}
          
          {/* Primary Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            
            {onJumpToItem && (
              <button
                onClick={() => onJumpToItem(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Go To</span>
              </button>
            )}
            
            {onSkip && (
              <button
                onClick={() => onSkip(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip</span>
              </button>
            )}
          </div>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {/* Undo button - always visible */}
            <button
              onClick={onUndo}
              disabled={!onUndo}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg font-semibold transition-colors text-sm ${
                onUndo 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Undo className="w-4 h-4" />
              <span>Undo</span>
            </button>
            
            {onDeferItem && (
              <button
                onClick={() => onDeferItem(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                <span>Remove Item</span>
              </button>
            )}
            
            {onAddNote && (
              <button
                onClick={() => onAddNote(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Add Note</span>
              </button>
            )}
            
            {onMarkUnavailable && (
              <button
                onClick={() => onMarkUnavailable(nextItem)}
                className="flex items-center justify-center gap-1.5 px-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Unavailable</span>
              </button>
            )}
          </div>
          
          {/* Tertiary Actions */}
          {onChangeStore && (
            <button
              onClick={() => onChangeStore(nextItem)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors text-sm"
            >
              <Store className="w-4 h-4" />
              <span>Change Store</span>
            </button>
          )}
        </div>

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
                    {sameAisleItems.length} more {sameAisleItems.length === 1 ? 'item' : 'items'} in {nextItem.aisle ? `Aisle ${nextItem.aisle}` : (nextItem.category_name || nextItem.category || 'this area')}
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar-thin custom-scrollbar-green">
              {sameAisleItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                  className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-3 flex items-center gap-3 ${
                    item.is_checked 
                      ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                  }`}
                >
                  {/* Checkbox */}
                  <motion.button
                    onClick={() => {
                      // Trigger flying animation before checking
                      if (!item.is_checked && triggerFlyingAnimation && sameAisleIconRefs.current[item.id]) {
                        triggerFlyingAnimation(item, sameAisleIconRefs.current[item.id]);
                        playSound('pop'); // Play pop sound when item flies to cart
                      }
                      onCheck && onCheck(item);
                    }}
                    whileTap={{ scale: 0.9 }}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.is_checked
                        ? 'bg-green-500 border-green-600 shadow-md shadow-green-500/50'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {item.is_checked && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Item Info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span 
                      ref={el => sameAisleIconRefs.current[item.id] = el}
                      className="text-2xl flex-shrink-0"
                    >
                      {item.item_icon || '📦'}
                    </span>
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
