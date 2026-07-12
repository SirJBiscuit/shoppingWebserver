import { useEffect } from 'react';
import { playSound } from '../utils/soundEffects';

let lastScrollTime = 0;
const SCROLL_SOUND_THROTTLE = 150; // ms

export const useScrollSound = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime > SCROLL_SOUND_THROTTLE) {
        playSound('scroll');
        lastScrollTime = now;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled]);
};

export default useScrollSound;
