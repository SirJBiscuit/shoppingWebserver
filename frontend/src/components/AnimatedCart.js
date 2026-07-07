import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedCart = ({ items, sortedByZone = false }) => {
  const [flyingItems, setFlyingItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [lastItemCount, setLastItemCount] = useState(0);

  // Detect when a new item is added
  useEffect(() => {
    if (items.length > lastItemCount) {
      const newItem = items[items.length - 1];
      
      // Create flying animation for the new item
      const flyingItem = {
        id: `flying-${Date.now()}`,
        icon: newItem.item_icon || '📦',
        startX: Math.random() * 100, // Random start position
        startY: 100,
      };
      
      setFlyingItems(prev => [...prev, flyingItem]);
      
      // Add to cart after animation
      setTimeout(() => {
        setCartItems(prev => [...prev, {
          id: newItem.id,
          icon: newItem.item_icon || '📦',
          name: newItem.item_name,
          category: newItem.category_name || newItem.category,
        }]);
        
        // Remove flying item
        setFlyingItems(prev => prev.filter(item => item.id !== flyingItem.id));
      }, 800);
    }
    
    setLastItemCount(items.length);
  }, [items.length, lastItemCount]);

  // Update cart items when items change (for sorting)
  useEffect(() => {
    setCartItems(items.map(item => ({
      id: item.id,
      icon: item.item_icon || '📦',
      name: item.item_name,
      category: item.category_name || item.category,
      checked: item.is_checked,
    })));
  }, [items]);

  // Group items by category if sorted
  const groupedItems = sortedByZone ? cartItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {}) : { 'All Items': cartItems };

  return (
    <div className="relative">
      {/* Flying Items Animation */}
      <AnimatePresence>
        {flyingItems.map(item => (
          <motion.div
            key={item.id}
            initial={{ 
              x: `${item.startX}vw`, 
              y: `${item.startY}vh`,
              scale: 1,
              opacity: 1,
            }}
            animate={{ 
              x: '50vw',
              y: '10vh',
              scale: 0.5,
              opacity: 0.8,
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
            }}
            transition={{ 
              duration: 0.8,
              ease: 'easeInOut',
            }}
            className="fixed z-50 pointer-events-none text-4xl"
            style={{ 
              left: 0,
              top: 0,
            }}
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
              {cartItems.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                >
                  {cartItems.length}
                </motion.div>
              )}
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Cart
            </h3>
          </div>
          
          {sortedByZone && (
            <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
              Optimized
            </span>
          )}
        </div>

        {/* Cart Items */}
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {cartItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Your cart is empty</p>
              <p className="text-xs mt-1">Add items to see them here!</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-2">
                {sortedByZone && Object.keys(groupedItems).length > 1 && (
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {category}
                  </div>
                )}
                
                <div className="space-y-1">
                  <AnimatePresence>
                    {categoryItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center space-x-2 p-2 rounded-lg transition-all ${
                          item.checked 
                            ? 'bg-gray-100 dark:bg-gray-700 opacity-50' 
                            : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <span className="text-2xl">{item.icon}</span>
                        <span className={`text-sm flex-1 ${
                          item.checked 
                            ? 'line-through text-gray-500 dark:text-gray-400' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {item.name}
                        </span>
                        {item.checked && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-green-500"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-primary-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {cartItems.filter(i => i.checked).length} / {cartItems.length} collected
              </span>
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`w-2 h-2 rounded-full ${
                      i < Math.ceil((cartItems.filter(i => i.checked).length / cartItems.length) * 5)
                        ? 'bg-primary-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AnimatedCart;
