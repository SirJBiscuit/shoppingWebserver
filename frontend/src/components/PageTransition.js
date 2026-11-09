import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/soundEffects';

// Optimization mode (tablet/mobile perf): check at mount — the body class
// is set by OptimizationContext when the user enables it.
const isOptimized = () =>
  typeof document !== 'undefined' && document.body.classList.contains('optimization-mode');

const pageVariants = {
  initial: (direction) => ({
    x: isOptimized() ? 0 : (direction > 0 ? 60 : -60),
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      // snappy woosh — short tween instead of spring so it can't lag
      type: 'tween',
      duration: 0.18,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: (direction) => ({
    x: isOptimized() ? 0 : (direction > 0 ? -60 : 60),
    opacity: 0,
    transition: {
      duration: 0.12,
      ease: 'easeIn'
    }
  })
};

const PageTransition = ({ children, direction = 0 }) => {
  useEffect(() => {
    // Woosh sound on page transition (playSound already skips it in optimization mode)
    playSound('woosh');
  }, []);

  return (
    <motion.div
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%', height: '100%', willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
