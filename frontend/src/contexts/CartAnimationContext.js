import React, { createContext, useContext, useState } from 'react';

const CartAnimationContext = createContext();

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimation must be used within CartAnimationProvider');
  }
  return context;
};

export const CartAnimationProvider = ({ children }) => {
  const [flyingItems, setFlyingItems] = useState([]);
  const [flyingCheckmarks, setFlyingCheckmarks] = useState([]);

  const triggerFlyingAnimation = (item, startElement) => {
    if (!startElement) return;

    const flyingItem = {
      id: `flying-${item.id || Date.now()}-${Math.random()}`,
      icon: item.item_icon || '📦',
      name: item.item_name || item.name,
      startX: startElement.getBoundingClientRect().left,
      startY: startElement.getBoundingClientRect().top,
    };

    setFlyingItems(prev => [...prev, flyingItem]);

    // Remove after animation completes
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(i => i.id !== flyingItem.id));
    }, 1000);
  };

  const triggerCheckmarkAnimation = (item, startElement, targetElement) => {
    if (!startElement || !targetElement) return;

    const startRect = startElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    
    const flyingCheckmark = {
      id: `checkmark-${item.id || Date.now()}-${Math.random()}`,
      icon: '✓',
      name: item.item_name || item.name,
      startX: startRect.left + startRect.width / 2,
      startY: startRect.top + startRect.height / 2,
      targetX: targetRect.left + targetRect.width / 2,
      targetY: targetRect.top + targetRect.height / 2,
    };

    setFlyingCheckmarks(prev => [...prev, flyingCheckmark]);

    // Remove after animation completes
    setTimeout(() => {
      setFlyingCheckmarks(prev => prev.filter(i => i.id !== flyingCheckmark.id));
    }, 1000);
  };

  return (
    <CartAnimationContext.Provider value={{ flyingItems, flyingCheckmarks, triggerFlyingAnimation, triggerCheckmarkAnimation }}>
      {children}
    </CartAnimationContext.Provider>
  );
};

export default CartAnimationContext;
