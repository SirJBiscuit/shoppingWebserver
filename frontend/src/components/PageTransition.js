import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/soundEffects';

const pageVariants = {
  initial: (direction) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.2
    }
  },
  exit: (direction) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
    transition: {
      duration: 0.15
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
