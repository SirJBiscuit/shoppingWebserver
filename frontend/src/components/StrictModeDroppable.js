import { useEffect, useState } from 'react';
import { Droppable } from 'react-beautiful-dnd';

/**
 * StrictModeDroppable — react-beautiful-dnd's <Droppable> registers its
 * droppable on mount and deregisters on unmount; React 18 StrictMode's
 * dev double-mount breaks that ordering, so drags never resolve in dev.
 * Deferring the real <Droppable> one tick past mount fixes it; in
 * production this renders immediately.
 */
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnabled(true));
    return () => { cancelAnimationFrame(raf); setEnabled(false); };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

export default StrictModeDroppable;
