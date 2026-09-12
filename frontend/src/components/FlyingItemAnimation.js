import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartAnimation } from '../contexts/CartAnimationContext';

const FlyingItemAnimation = () => {
  const { flyingItems, flyingCheckmarks } = useCartAnimation();
  const [cartPosition, setCartPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Find cart position - update whenever flying items change
    const updateCartPosition = () => {
      const cartElement = document.querySelector('[data-cart-target]');
      if (cartElement) {
        const rect = cartElement.getBoundingClientRect();
        // Target the center of the 3D cart basket (lower portion of the cart)
        setCartPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height * 0.65, // Target 65% down to hit the basket center
        });
      }
    };

    // IMMEDIATELY update position when flying items change (e.g., switching lists)
    if (flyingItems.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        updateCartPosition();
      });
    }

    updateCartPosition();
    window.addEventListener('resize', updateCartPosition);
    window.addEventListener('scroll', updateCartPosition, true); // Use capture phase

    return () => {
      window.removeEventListener('resize', updateCartPosition);
      window.removeEventListener('scroll', updateCartPosition, true);
    };
  }, [flyingItems]); // Update when items change

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <AnimatePresence>
        {/* Cart animations - items flying to cart */}
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX,
              y: item.startY,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: cartPosition.x - 30,
              y: cartPosition.y - 30,
              scale: 0.5,
              opacity: 0.8,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for smooth arc
            }}
            className="absolute"
            style={{
              width: '60px',
              height: '60px',
            }}
          >
            <div className="bg-white dark:bg-gray-700 rounded-lg p-2 shadow-2xl border-2 border-primary-500 flex items-center justify-center">
              <span className="text-3xl">{item.icon}</span>
            </div>
          </motion.div>
        ))}
        
        {/* Checkmark animations - checkmarks flying from "Looking for Next" to items */}
        {flyingCheckmarks.map((checkmark) => (
          <motion.div
            key={checkmark.id}
            initial={{
              x: checkmark.startX - 30,
              y: checkmark.startY - 30,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: checkmark.targetX - 30,
              y: checkmark.targetY - 30,
              scale: 1.5,
              opacity: 0.9,
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
            className="absolute"
            style={{
              width: '60px',
              height: '60px',
            }}
          >
            <div className="bg-green-500 rounded-full p-3 shadow-2xl border-4 border-green-600 flex items-center justify-center">
              <span className="text-4xl text-white font-bold">{checkmark.icon}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FlyingItemAnimation;
