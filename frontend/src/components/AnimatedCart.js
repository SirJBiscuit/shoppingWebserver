import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../utils/soundEffects';
import { EditableContainer } from './editor/EditorOverlay';
import { useEditor } from '../contexts/EditorContext';

const AnimatedCart = ({ items, sortedByZone = false }) => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const props = widgetProperties['animated-cart'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="Shopping Cart"
      onSelect={() => selectWidget('animated-cart')}
      isSelected={selectedWidget === 'animated-cart'}
    >
      <AnimatedCartContent 
        items={items}
        sortedByZone={sortedByZone}
        {...props}
      />
    </EditableContainer>
  );
};

const AnimatedCartContent = ({ 
  items, 
  sortedByZone = false,
  // AVE Properties
  showAnimation = true,
  maxItemsDisplay = 5,
  showImages = true,
  compactMode = false
}) => {
  const [flyingItems, setFlyingItems] = useState([]);
  const [initialized, setInitialized] = useState(false);
  
  // Only show checked items in the cart
  const checkedItems = items.filter(item => item.is_checked);
  
  // Calculate total cost of checked items only
  const totalCost = checkedItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  // Initialize on first load - prevent reload animations
  useEffect(() => {
    if (!initialized && items.length > 0) {
      setInitialized(true);
      // Store initial items to prevent animation on reload
      sessionStorage.setItem('cart_item_ids', items.map(i => i.id).join(','));
    }
  }, [items.length, initialized]);

  // DISABLED: AnimatedCart's internal flying animations
  // We now use CartAnimationContext for all flying animations
  // This prevents animation spam when switching lists
  // useEffect(() => {
  //   if (!initialized) return;
  //   const itemIds = items.map(i => i.id).join(',');
  //   const storedIds = sessionStorage.getItem('cart_item_ids') || '';
  //   if (itemIds !== storedIds) {
  //     const storedIdArray = storedIds.split(',').filter(Boolean);
  //     const newItems = items.filter(item => !storedIdArray.includes(item.id.toString()));
  //     newItems.forEach((newItem, index) => {
  //       setTimeout(() => {
  //         const flyingItem = {
  //           id: `flying-${newItem.id}-${Date.now()}`,
  //           icon: newItem.item_icon || '📦',
  //           name: newItem.item_name,
  //         };
  //         setFlyingItems(prev => [...prev, flyingItem]);
  //         setTimeout(() => {
  //           setFlyingItems(prev => prev.filter(item => item.id !== flyingItem.id));
  //         }, 1000);
  //       }, index * 100);
  //     });
  //     sessionStorage.setItem('cart_item_ids', itemIds);
  //   }
  // }, [items, initialized]);

  return (
    <div className="relative" data-animated-cart-target>
      {/* Flying Items Animation */}
      <AnimatePresence>
        {showAnimation && flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ x: -100, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: 200, y: -100, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-0 left-0 text-4xl pointer-events-none z-50"
          >
            {item.icon}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Visual Shopping Cart */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-900 border-2 border-primary-200 dark:border-primary-700"
      >
        {/* Cart Header */}
        <div className={`flex items-center justify-between ${compactMode ? 'mb-2' : 'mb-4'}`}>
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                rotate: flyingItems.length > 0 ? [0, -10, 10, -10, 0] : 0,
              }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <ShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              {checkedItems.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {checkedItems.length}
                </motion.div>
              )}
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Cart
              </h3>
              {totalCost > 0 && (
                <div className="flex items-center text-green-600 dark:text-green-400 font-bold text-xl mt-1">
                  <DollarSign className="w-5 h-5" />
                  {totalCost.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          {sortedByZone && (
            <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
              Optimized
            </span>
          )}
        </div>

        {/* 3D Cart Visualization */}
        <div className="relative min-h-[450px] bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 overflow-hidden">
          {/* Cart Base - 3D perspective */}
          <div className="absolute inset-0 flex items-end justify-center pb-8">
            <div className="relative w-full max-w-md">
              {/* Cart basket */}
              <div className="relative" style={{ perspective: '1000px' }}>
                <div 
                  className="bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600 rounded-lg border-4 border-gray-400 dark:border-gray-500 shadow-2xl"
                  style={{
                    transform: 'rotateX(5deg)',
                    transformStyle: 'preserve-3d',
                    minHeight: '320px',
                  }}
                >
                  {/* Cart rim */}
                  <div className="absolute -top-2 left-0 right-0 h-4 bg-gray-400 dark:bg-gray-500 rounded-t-lg border-2 border-gray-500 dark:border-gray-600" />
                  
                  {/* Items in cart */}
                  <div className="p-6 pt-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {checkedItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <ShoppingCart className="w-20 h-20 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Cart is empty</p>
                        <p className="text-xs mt-1">Check off items to add them to cart!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {checkedItems.map((item, index) => (
                          <motion.div
                            key={`cart-item-${item.id}-${index}`}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ 
                              scale: 1, 
                              rotate: 0,
                              y: [0, -5, 0],
                            }}
                            transition={{
                              delay: initialized ? 0 : index * 0.05,
                              y: {
                                repeat: Infinity,
                                duration: 2 + (index % 3) * 0.5,
                                ease: "easeInOut"
                              }
                            }}
                            className="relative group"
                            style={{
                              transform: `translateZ(${20 + (index % 3) * 10}px)`,
                            }}
                          >
                            {/* Item card */}
                            <div 
                              onClick={() => playSound('shake')}
                              className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-lg border-2 border-green-400 dark:border-green-600 hover:scale-110 transition-transform cursor-pointer relative"
                            >
                              <div className="text-4xl text-center mb-1">
                                {item.item_icon || '📦'}
                              </div>
                              <div className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate mb-1">
                                {item.item_name}
                              </div>
                              
                              {/* Quantity Badge - Always show as integer */}
                              {item.quantity && (
                                <div className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                  {Math.floor(item.quantity)}
                                </div>
                              )}
                              
                              {/* Check badge to show it's in cart */}
                              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                            
                            {/* Price - Below card */}
                            {item.price && item.price > 0 && (
                              <div className="text-center mt-1">
                                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg inline-block">
                                  ${(item.price * (item.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Cart wheels */}
              <div className="flex justify-between px-8 mt-2">
                <div className="w-12 h-12 bg-gray-800 dark:bg-gray-900 rounded-full border-4 border-gray-600 shadow-lg" />
                <div className="w-12 h-12 bg-gray-800 dark:bg-gray-900 rounded-full border-4 border-gray-600 shadow-lg" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AnimatedCart;
