/**
 * CFS Context Menu Hook
 * 
 * Smart state management for context menus with position tracking
 * and automatic cleanup
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export const useContextMenu = () => {
  const [menuState, setMenuState] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    target: null,
    data: null,
  });

  const menuRef = useRef(null);

  const openMenu = useCallback((event, target, data = null) => {
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX;
    const y = event.clientY;

    setMenuState({
      isOpen: true,
      position: { x, y },
      target,
      data,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState({
      isOpen: false,
      position: { x: 0, y: 0 },
      target: null,
      data: null,
    });
  }, []);

  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuState.isOpen, closeMenu]);

  return {
    menuState,
    openMenu,
    closeMenu,
    menuRef,
  };
};

export default useContextMenu;
