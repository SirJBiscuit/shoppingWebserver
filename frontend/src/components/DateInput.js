import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Custom Date Input with Calendar Picker
 * Accepts flexible text input (MM/DD/YYYY, M/D/YY, etc.) and provides a calendar popup
 */
const DateInput = ({ value, onChange, name, placeholder = 'MM/DD/YYYY', className = '', disabled = false }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const calendarRef = useRef(null);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const date = parseDate(value);
      if (date) {
        setSelectedDate(date);
        setInputValue(formatDate(date));
      } else {
        setInputValue(value);
      }
    } else {
      setInputValue('');
      setSelectedDate(null);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);

  // Parse flexible date formats
  const parseDate = (str) => {
    if (!str) return null;
    
    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return new Date(str + 'T00:00:00');
    }

    // Try MM/DD/YYYY or M/D/YYYY or M/D/YY
    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let [month, day, year] = parts.map(p => parseInt(p));
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Try parsing as Date object
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date as MM/DD/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Convert to ISO format for backend
  const toISODate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse and update
    const parsed = parseDate(newValue);
    if (parsed) {
      setSelectedDate(parsed);
      onChange({ target: { name, value: toISODate(parsed) } });
    } else {
      onChange({ target: { name, value: newValue } });
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setInputValue(formatDate(date));
    onChange({ target: { name, value: toISODate(date) } });
    setShowCalendar(false);
  };

  const handleToday = () => {
    const today = new Date();
    handleDateSelect(today);
  };

  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleDateSelect(tomorrow);
  };

  // Calendar generation
  const generateCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate || today;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks = [];
    let week = new Array(7).fill(null);
    let dayCounter = 1;

    // Fill in the days
    for (let i = 0; i < 42; i++) {
      const dayOfWeek = i % 7;
      
      if (i >= startingDayOfWeek && dayCounter <= daysInMonth) {
        week[dayOfWeek] = new Date(year, month, dayCounter);
        dayCounter++;
      }

      if (dayOfWeek === 6) {
        weeks.push(week);
        week = new Array(7).fill(null);
      }
    }

    return { weeks, month, year };
  };

  const { weeks, month, year } = showCalendar ? generateCalendar() : { weeks: [], month: 0, year: 0 };
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const changeMonth = (delta) => {
    const newDate = new Date(year, month + delta, 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="relative" ref={calendarRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-10 ${className}`}
        />
        <button
          type="button"
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Calendar size={20} />
        </button>
      </div>

      {showCalendar && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={handleToday}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleTomorrow}
              className="flex-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
            >
              Tomorrow
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              ←
            </button>
            <span className="font-semibold text-gray-900 dark:text-white">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              →
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.map((week, weekIdx) => (
              week.map((date, dayIdx) => (
                <button
                  key={`${weekIdx}-${dayIdx}`}
                  type="button"
                  onClick={() => date && handleDateSelect(date)}
                  disabled={!date}
                  className={`
                    aspect-square p-1 text-sm rounded transition-all
                    ${!date ? 'invisible' : ''}
                    ${isToday(date) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                    ${isSelected(date) ? 'bg-primary-600 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  `}
                >
                  {date ? date.getDate() : ''}
                </button>
              ))
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateInput;
