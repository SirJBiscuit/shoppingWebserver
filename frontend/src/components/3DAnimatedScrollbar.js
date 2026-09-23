import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * 3DAnimatedScrollbar - Beautiful 3D scrollbar with depth effects
 * 
 * Features:
 * - 3D depth effect on hover
 * - Animated thumb with glow
 * - Touch-friendly on tablets
 * - Auto-hide when not scrolling
 * - Customizable colors
 * - Smooth animations
 * - Dark mode support
 */
const AnimatedScrollbar3D = ({ 
  children, 
  className = '',
  thumbColor = 'bg-primary-500',
  trackColor = 'bg-gray-200 dark:bg-gray-700',
  glowColor = 'primary',
  autoHide = true,
  height = '100%',
  maxHeight,
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const thumbRef = useRef(null);
  
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  
  const scrollTimeoutRef = useRef(null);

  // Calculate thumb size and position
  useEffect(() => {
    const updateScrollbar = () => {
      if (!containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      
      const containerHeight = container.clientHeight;
      const contentHeight = content.scrollHeight;
      const scrollTop = container.scrollTop;

      // Show scrollbar only if content overflows
      setShowScrollbar(contentHeight > containerHeight);

      if (contentHeight > containerHeight) {
        // Calculate thumb height (proportional to visible content)
        const thumbHeightCalc = (containerHeight / contentHeight) * containerHeight;
        setThumbHeight(Math.max(thumbHeightCalc, 40)); // Min 40px

        // Calculate scroll percentage
        const maxScroll = contentHeight - containerHeight;
        const percentage = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        setScrollPercentage(percentage);
      }
    };

    updateScrollbar();
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollbar);
      window.addEventListener('resize', updateScrollbar);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', updateScrollbar);
      }
      window.removeEventListener('resize', updateScrollbar);
    };
  }, [children]);

  // Handle scroll event for auto-hide
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle thumb drag
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const mouseY = e.clientY - containerRect.top;
      const containerHeight = container.clientHeight;
      const contentHeight = content.scrollHeight;
      
      const scrollableHeight = containerHeight - thumbHeight;
      const percentage = Math.max(0, Math.min(100, (mouseY / scrollableHeight) * 100));
      
      const maxScroll = contentHeight - containerHeight;
      container.scrollTop = (percentage / 100) * maxScroll;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  const glowColors = {
    primary: 'shadow-primary-500/50',
    purple: 'shadow-purple-500/50',
    blue: 'shadow-blue-500/50',
    green: 'shadow-green-500/50',
    red: 'shadow-red-500/50',
    orange: 'shadow-orange-500/50',
  };

  const shouldShowScrollbar = showScrollbar && (!autoHide || isScrolling || isHovered || isDragging);

  return (
    <div 
      className={`relative ${className}`}
      style={{ height, maxHeight }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scrollable Content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ paddingRight: shouldShowScrollbar ? '12px' : '0' }}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>

      {/* Custom Scrollbar Track */}
      {showScrollbar && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ 
            opacity: shouldShowScrollbar ? 1 : 0,
            x: shouldShowScrollbar ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className={`absolute top-0 right-0 w-2 h-full ${trackColor} rounded-full`}
          style={{
            transform: isHovered || isDragging ? 'translateZ(0) scale(1.2)' : 'translateZ(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      )}

      {/* Custom Scrollbar Thumb */}
      {showScrollbar && (
        <motion.div
          ref={thumbRef}
          initial={{ opacity: 0, x: 10 }}
          animate={{ 
            opacity: shouldShowScrollbar ? 1 : 0,
            x: shouldShowScrollbar ? 0 : 10,
            y: `${scrollPercentage}%`,
          }}
          transition={{ 
            opacity: { duration: 0.2 },
            x: { duration: 0.2 },
            y: { duration: isDragging ? 0 : 0.1 },
          }}
          onMouseDown={handleThumbMouseDown}
          className={`absolute top-0 right-0 w-2 ${thumbColor} rounded-full cursor-grab active:cursor-grabbing`}
          style={{
            height: `${thumbHeight}px`,
            transform: isHovered || isDragging 
              ? 'translateZ(10px) scale(1.5)' 
              : 'translateZ(0)',
            boxShadow: isHovered || isDragging 
              ? `0 4px 20px ${glowColors[glowColor] || glowColors.primary}` 
              : 'none',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* 3D Effect Layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 rounded-full" />
          
          {/* Glow Effect */}
          {(isHovered || isDragging) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background: `radial-gradient(circle, ${thumbColor.replace('bg-', 'rgba(')} 0%, transparent 70%)`,
              }}
            />
          )}
        </motion.div>
      )}

      {/* Scroll Indicator (Top/Bottom) */}
      {showScrollbar && shouldShowScrollbar && (
        <>
          {scrollPercentage > 5 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.5, y: 0 }}
              className="absolute top-2 right-4 text-xs text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              ↑
            </motion.div>
          )}
          {scrollPercentage < 95 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              className="absolute bottom-2 right-4 text-xs text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              ↓
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default AnimatedScrollbar3D;
