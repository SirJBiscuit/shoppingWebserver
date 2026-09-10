import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/soundEffects';

const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 600,
      damping: 30,
      duration: 0.15
    }
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    transition: {
      duration: 0.1
    }
  })
};

const PageTransition = ({ children, direction = 0 }) => {
  useEffect(() => {
    // Play woosh sound on page transition
    playSound('woosh');
  }, []);

  return (
    <motion.div
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
