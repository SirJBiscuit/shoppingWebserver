import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, X, Minus, Users } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';
import BtcsPanel from './BtcsPanel';
import BetaTesterManagementCFS from './BetaTesterManagementCFS';

const VIEWS = [
  { id: 'scores', label: 'Scores', Icon: Award },
  { id: 'testers', label: 'Testers', Icon: Users },
];

/**
 * BtcsFloatPanel — the BTCS panel as a floating, draggable window so the
 * admin never has to leave the page they're on. Opened from the admin
 * rail's Award button (BetaPinLayer). Header drag moves it; the panel
 * body scrolls internally.
 *
 * The title bar carries a slide switcher between two views: Scores (the
 * BTCS leaderboard panel) and Testers (a compact mount of the full beta
 * tester management page — same rows/sidebar/modals, trimmed chrome).
 */
const BtcsFloatPanel = ({ onClose }) => {
  const [pos, setPos] = useState(null); // {x, y} — null = default right-anchored
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState('scores');
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

  const active = VIEWS.find((v) => v.id === view) || VIEWS[0];

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
        {/* Title bar — drag handle + slide view switcher */}
        <div
          onPointerDown={onPointerDown}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-700 cursor-move select-none touch-none shrink-0"
        >
          <active.Icon className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {view === 'scores' ? 'BTCS Panel' : 'Beta Testers'}
          </span>

          {/* Slide switcher — the active label rides a spring pill */}
          <div className="flex items-center bg-slate-800/80 rounded-full p-0.5 text-[10px] font-bold">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                onPointerDown={(e) => e.stopPropagation()}
                className="relative px-3 py-1 rounded-full"
              >
                {view === v.id && (
                  <motion.span
                    layoutId="btcs-float-view-pill"
                    className="absolute inset-0 bg-amber-400 rounded-full"
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${view === v.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}>
                  {v.label}
                </span>
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-500 hidden sm:inline">drag to move · right-click a tester for controls</span>
          <div className="flex-1" />
          <button type="button" onClick={() => setMinimized((v) => !v)} onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title={minimized ? 'Expand' : 'Minimize'}>
            <Minus className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!minimized && (
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, x: view === 'testers' ? 56 : -56 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: view === 'testers' ? -56 : 56 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="h-full p-3"
              >
                {view === 'scores' ? (
                  <BtcsPanel onClose={onClose} />
                ) : (
                  <BetaTesterManagementCFS compact />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </Portal>
  );
};

export default BtcsFloatPanel;
