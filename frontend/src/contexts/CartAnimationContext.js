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
  const [animationsBlocked, setAnimationsBlocked] = useState(false);

  const triggerFlyingAnimation = (item, startElement) => {
    if (!startElement) return;
    
    // Block animations during list switches
    if (animationsBlocked) {
      console.log('Animation blocked during list switch');
      return;
    }

    const rect = startElement.getBoundingClientRect();
    
    // Validate that element is actually visible and positioned
    // Prevent animations from corner (0,0) or off-screen elements
    if (rect.left < 0 || rect.top < 0 || rect.width === 0 || rect.height === 0) {
      console.log('Skipping animation - element not properly positioned:', rect);
      return;
    }

    const flyingItem = {
      id: `flying-${item.id || Date.now()}-${Math.random()}`,
      icon: item.item_icon || '📦',
      name: item.item_name || item.name,
      startX: rect.left,
      startY: rect.top,
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

  // Clear all animations (useful when switching lists)
  const clearAnimations = () => {
    setFlyingItems([]);
    setFlyingCheckmarks([]);
    
    // Block new animations for 300ms to let DOM update
    setAnimationsBlocked(true);
    setTimeout(() => {
      setAnimationsBlocked(false);
    }, 300);
  };

  return (
    <CartAnimationContext.Provider value={{ flyingItems, flyingCheckmarks, triggerFlyingAnimation, triggerCheckmarkAnimation, clearAnimations }}>
      {children}
    </CartAnimationContext.Provider>
  );
};

export default CartAnimationContext;
