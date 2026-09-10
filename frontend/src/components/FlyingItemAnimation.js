import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartAnimation } from '../contexts/CartAnimationContext';

const FlyingItemAnimation = () => {
  const { flyingItems } = useCartAnimation();
  const [cartPosition, setCartPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Find cart position - update whenever flying items change
    const updateCartPosition = () => {
      const cartElement = document.querySelector('[data-cart-target]');
      if (cartElement) {
        const rect = cartElement.getBoundingClientRect();
        setCartPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
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
        {flyingItems.map((item) => {
          // Calculate target position
          let targetX = cartPosition.x - 30;
          let targetY = cartPosition.y - 30;
          
          // If targetElement is provided, fly to it instead of cart
          if (item.targetElement) {
            const targetRect = item.targetElement.getBoundingClientRect();
            targetX = targetRect.left + targetRect.width / 2 - 30;
            targetY = targetRect.top + targetRect.height / 2 - 30;
          }
          
          return (
            <motion.div
              key={item.id}
              initial={{
                x: item.startX,
                y: item.startY,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: targetX,
                y: targetY,
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
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FlyingItemAnimation;
