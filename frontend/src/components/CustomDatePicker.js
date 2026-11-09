import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

/**
 * CustomDatePicker - themed calendar popup replacing <input type="date">
 *
 * API-compatible with the native input: `value` is a 'YYYY-MM-DD' string,
 * `onChange` fires with the same format (or '' when cleared).
 *
 * - Month navigation + year jump (click month label)
 * - Today / selected highlighting
 * - Min-date support
 * - Dark mode, framer-motion, matches CustomDropdownList styling
 */
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseISO = (v) => {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDisplay = (v) => {
  const d = parseISO(v);
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
};

const CustomDatePicker = ({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  min,          // 'YYYY-MM-DD' earliest selectable date
  allowClear = true,
  className = '',
}) => {
  const today = useMemo(() => new Date(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISO(value) || today);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const ref = useRef(null);
  const popRef = useRef(null);

  // Re-sync view when opened
  useEffect(() => {
    if (isOpen) {
      setViewDate(parseISO(value) || today);
      setShowYearPicker(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const minDate = parseISO(min);
  const selected = parseISO(value);

  const isBeforeMin = (d) => minDate && toISODate(d) < toISODate(minDate);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewDate]);

  const shiftMonth = (delta) => {
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  };

  const pick = (d) => {
    if (!d || isBeforeMin(d)) return;
    onChange?.(toISODate(d));
    setIsOpen(false);
  };

  const todayISO = toISODate(today);
  const selectedISO = selected ? toISODate(selected) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-2 px-4 py-2.5 rounded-lg
          bg-white dark:bg-gray-800
          border-2 transition-all text-left
          ${disabled
            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
            : 'cursor-pointer hover:border-primary-500 dark:hover:border-primary-400'}
          ${isOpen
            ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20'
            : 'border-gray-300 dark:border-gray-600'}
        `}
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 truncate text-sm ${value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {formatDisplay(value) || placeholder}
        </span>
        {allowClear && value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange?.(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange?.(''); } }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="
              absolute z-[110] mt-2 p-3 w-72
              bg-white dark:bg-gray-800
              border-2 border-gray-200 dark:border-gray-700
              rounded-xl shadow-2xl
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowYearPicker((s) => !s)}
                className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {showYearPicker ? (
              /* Year picker */
              <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                {Array.from({ length: 24 }, (_, i) => viewDate.getFullYear() - 8 + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewDate(new Date(y, viewDate.getMonth(), 1)); setShowYearPicker(false); }}
                    className={`
                      px-1 py-2 rounded-lg text-sm transition-colors
                      ${y === viewDate.getFullYear()
                        ? 'bg-primary-500 text-white font-semibold'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {y}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Weekday header */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((d, i) => {
                    if (!d) return <div key={`e-${i}`} />;
                    const iso = toISODate(d);
                    const isSel = iso === selectedISO;
                    const isToday = iso === todayISO;
                    const blocked = isBeforeMin(d);
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={blocked}
                        onClick={() => pick(d)}
                        className={`
                          h-9 rounded-lg text-sm transition-all
                          ${isSel
                            ? 'bg-primary-500 text-white font-bold shadow-md scale-105'
                            : isToday
                              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold'
                              : blocked
                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        `}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Footer shortcuts */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => pick(today)}
                    className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Today
                  </button>
                  {allowClear && value && (
                    <button
                      type="button"
                      onClick={() => { onChange?.(''); setIsOpen(false); }}
                      className="text-xs font-medium text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDatePicker;
