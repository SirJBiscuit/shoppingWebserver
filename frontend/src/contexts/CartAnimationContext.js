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

  return (
    <CartAnimationContext.Provider value={{ flyingItems, triggerFlyingAnimation }}>
      {children}
    </CartAnimationContext.Provider>
  );
};

export default CartAnimationContext;
