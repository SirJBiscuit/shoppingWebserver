import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedCart = ({ items, sortedByZone = false }) => {
  const [flyingItems, setFlyingItems] = useState([]);
  const [initialized, setInitialized] = useState(false);
  
  // Calculate total cost
  const totalCost = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  // Initialize on first load - prevent reload animations
  useEffect(() => {
    if (!initialized && items.length > 0) {
      setInitialized(true);
      // Store initial items to prevent animation on reload
      sessionStorage.setItem('cart_item_ids', items.map(i => i.id).join(','));
    }
  }, [items.length, initialized]);

  // Only animate NEW items (not on reload)
  useEffect(() => {
    if (!initialized) return; // Skip initial load
    
    const itemIds = items.map(i => i.id).join(',');
    const storedIds = sessionStorage.getItem('cart_item_ids') || '';
    
    if (itemIds !== storedIds) {
      // Find new items
      const storedIdArray = storedIds.split(',').filter(Boolean);
      const newItems = items.filter(item => !storedIdArray.includes(item.id.toString()));
      
      // Animate only new items
      newItems.forEach((newItem, index) => {
        setTimeout(() => {
          const flyingItem = {
            id: `flying-${newItem.id}-${Date.now()}`,
            icon: newItem.item_icon || '📦',
            name: newItem.item_name,
          };
          
          setFlyingItems(prev => [...prev, flyingItem]);
          
          setTimeout(() => {
            setFlyingItems(prev => prev.filter(item => item.id !== flyingItem.id));
          }, 1000);
        }, index * 100);
      });
      
      sessionStorage.setItem('cart_item_ids', itemIds);
    }
  }, [items, initialized]);

  return (
    <div className="relative">
      {/* Flying Items Animation */}
      <AnimatePresence>
        {flyingItems.map((item) => (
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div
              animate={{ 
                rotate: flyingItems.length > 0 ? [0, -10, 10, -10, 0] : 0,
              }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <ShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              {items.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {items.length}
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
                    {items.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <ShoppingCart className="w-20 h-20 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Cart is empty</p>
                        <p className="text-xs mt-1">Add items to see them here!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {items.map((item, index) => (
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
                            className={`relative group ${
                              item.is_checked ? 'opacity-40' : ''
                            }`}
                            style={{
                              transform: `translateZ(${20 + (index % 3) * 10}px)`,
                            }}
                          >
                            {/* Item card */}
                            <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-lg border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform cursor-pointer relative">
                              <div className="text-4xl text-center mb-1">
                                {item.item_icon || '📦'}
                              </div>
                              <div className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate">
                                {item.item_name}
                              </div>
                              
                              {/* Quantity Badge - Always show as integer */}
                              {item.quantity && (
                                <div className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                  {Math.floor(item.quantity)}
                                </div>
                              )}
                              
                              {/* Price - Bottom left */}
                              {item.price && item.price > 0 && (
                                <div className="absolute -bottom-1 -left-1 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                                  ${(item.price * (item.quantity || 1)).toFixed(2)}
                                </div>
                              )}
                              
                              {/* Checked overlay */}
                              {item.is_checked && (
                                <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                  <Check className="w-8 h-8 text-green-600" />
                                </div>
                              )}
                            </div>
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
