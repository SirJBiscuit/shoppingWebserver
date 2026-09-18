import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, DollarSign, Tag, MapPin, Calendar } from 'lucide-react';

const ItemTooltip = ({ item, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Don't show tooltip on mobile (touch devices)
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    return children;
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] pointer-events-none"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-2xl p-3 min-w-[200px] border border-gray-700">
              {/* Item Name */}
              <div className="font-bold text-sm mb-2 flex items-center">
                <span className="text-xl mr-2">{item.item_icon || '📦'}</span>
                {item.item_name}
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs">
                {/* Quantity */}
                {item.quantity && (
                  <div className="flex items-center text-gray-300">
                    <Package className="w-3 h-3 mr-1.5" />
                    <span>{item.quantity} {item.unit || 'units'}</span>
                  </div>
                )}

                {/* Price */}
                {item.price && item.price > 0 && (
                  <div className="flex items-center text-green-400">
                    <DollarSign className="w-3 h-3 mr-1.5" />
                    <span>${parseFloat(item.price).toFixed(2)}</span>
                  </div>
                )}

                {/* Category */}
                {(item.category || item.category_name) && (
                  <div className="flex items-center text-blue-400">
                    <Tag className="w-3 h-3 mr-1.5" />
                    <span>{item.category || item.category_name}</span>
                  </div>
                )}

                {/* Aisle */}
                {(item.aisle || item.aisle_name) && (
                  <div className="flex items-center text-purple-400">
                    <MapPin className="w-3 h-3 mr-1.5" />
                    <span>Aisle {item.aisle || item.aisle_name}</span>
                  </div>
                )}

                {/* Added Date */}
                {item.created_at && (
                  <div className="flex items-center text-gray-400 mt-2 pt-2 border-t border-gray-700">
                    <Calendar className="w-3 h-3 mr-1.5" />
                    <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 dark:border-t-gray-800"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItemTooltip;
