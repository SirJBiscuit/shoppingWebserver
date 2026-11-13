import React from 'react';
import { motion } from 'framer-motion';
import { Portal } from '../utils/autoPlacement';

/**
 * MixingOverlay - shared "combining ingredients" animation for the labs.
 * Ingredient icons spiral inward into a bowl, then a sparkle burst fires.
 *
 * Props:
 *   icons   - array of emoji glyphs (max 8 shown)
 *   bowl    - center emoji (default 🥣)
 *   text    - caption under the bowl (default 'Mixing your blend…')
 *   onDone  - fired ~1.4s after the swirl animation starts
 */
const MixingOverlay = ({ icons = ['🧂', '🌶️', '🌿'], bowl = '🥣', text = 'Mixing your blend…', onDone }) => (
  <Portal><motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { duration: 0.2 } }}
      onAnimationComplete={() => setTimeout(onDone, 1400)}
      className="relative w-64 h-64 flex items-center justify-center"
    >
      {/* swirling ingredient icons */}
      {icons.slice(0, 8).map((ic, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl"
          animate={{
            rotate: [0, 720],
            x: [80 * Math.cos((i / icons.length) * Math.PI * 2), 0],
            y: [80 * Math.sin((i / icons.length) * Math.PI * 2), 0],
            scale: [1, 0.4],
            opacity: [1, 0.6],
          }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
        >
          {ic}
        </motion.span>
      ))}
      {/* bowl */}
      <motion.div
        className="text-7xl"
        animate={{ rotate: [0, -6, 6, -4, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 1.3, ease: 'easeInOut' }}
      >
        {bowl}
      </motion.div>
      {/* sparkle burst at the end */}
      <motion.span
        className="absolute text-4xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
        transition={{ delay: 1.15, duration: 0.5 }}
      >
        ✨
      </motion.span>
      <p className="absolute -bottom-8 text-white font-semibold text-sm tracking-wide">
        {text}
      </p>
    </motion.div>
  </motion.div></Portal>
);

export default MixingOverlay;
