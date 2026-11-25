import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, X, Minus } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';
import BtcsPanel from './BtcsPanel';

/**
 * BtcsFloatPanel — the BTCS panel as a floating, draggable window so the
 * admin never has to leave the page they're on. Opened from the admin
 * rail's Award button (BetaPinLayer). Header drag moves it; the panel
 * body scrolls internally.
 */
const BtcsFloatPanel = ({ onClose }) => {
  const [pos, setPos] = useState(null); // {x, y} — null = default right-anchored
  const [minimized, setMinimized] = useState(false);
  const drag = useRef(null);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    drag.current = { dx: startX - rect.left, dy: startY - rect.top };
    const move = (ev) => {
      if (!drag.current) return;
      setPos({
        x: Math.min(Math.max(0, ev.clientX - drag.current.dx), window.innerWidth - 200),
        y: Math.min(Math.max(0, ev.clientY - drag.current.dy), window.innerHeight - 60),
      });
    };
    const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[80] flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        style={pos
          ? { left: pos.x, top: pos.y, width: 'min(1080px, calc(100vw - 24px))', height: minimized ? 'auto' : 'min(760px, calc(100vh - 24px))' }
          : { right: 56, top: 12, width: 'min(1080px, calc(100vw - 72px))', height: minimized ? 'auto' : 'min(760px, calc(100vh - 24px))' }}
      >
        {/* Title bar — drag handle */}
        <div
          onPointerDown={onPointerDown}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-700 cursor-move select-none touch-none shrink-0"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">BTCS Panel</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">drag to move · right-click a tester for controls</span>
          <div className="flex-1" />
          <button type="button" onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title={minimized ? 'Expand' : 'Minimize'}>
            <Minus className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!minimized && (
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <BtcsPanel onClose={onClose} />
          </div>
        )}
      </motion.div>
    </Portal>
  );
};

export default BtcsFloatPanel;
