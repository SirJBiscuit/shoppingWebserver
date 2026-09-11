import React, { useState, useRef } from 'react';
import { Bold, Italic, Smile, X, Type, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RichNoteEditor = ({ value, onChange, placeholder }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef(null);

  const commonEmojis = [
    '🛒', '✅', '❌', '⚠️', '💰', '🔥', '❄️', '🌟', '💡', '📝',
    '🎯', '⏰', '📅', '🏷️', '💳', '🎁', '🍎', '🥛', '🍞', '🥩',
    '🥗', '🍕', '🍰', '☕', '🧃', '🧊', '🔴', '🟢', '🟡', '🔵'
  ];

  const colors = [
    { name: 'Red', value: '#ef4444', class: 'text-red-500' },
    { name: 'Orange', value: '#f97316', class: 'text-orange-500' },
    { name: 'Yellow', value: '#eab308', class: 'text-yellow-500' },
    { name: 'Green', value: '#22c55e', class: 'text-green-500' },
    { name: 'Blue', value: '#3b82f6', class: 'text-blue-500' },
    { name: 'Purple', value: '#a855f7', class: 'text-purple-500' },
    { name: 'Pink', value: '#ec4899', class: 'text-pink-500' },
    { name: 'Gray', value: '#6b7280', class: 'text-gray-500' },
  ];

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + emoji + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after emoji
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    }, 0);
    
    setShowEmojiPicker(false);
  };

  const wrapSelection = (prefix, suffix = prefix) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      onChange(newValue);
      
      // Select the wrapped text
      setTimeout(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = end + prefix.length + suffix.length;
        textarea.focus();
      }, 0);
    } else {
      // No selection, just insert markers
      const newValue = value.substring(0, start) + prefix + suffix + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
        textarea.focus();
      }, 0);
    }
  };

  const applyColor = (colorClass) => {
    wrapSelection(`<span class="${colorClass}">`, '</span>');
    setShowColorPicker(false);
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-wrap">
        <button
          type="button"
          onClick={() => wrapSelection('**')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => wrapSelection('*')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowColorPicker(false);
            }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Insert Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 z-50 w-64"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Insert Emoji</span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
                  {commonEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowEmojiPicker(false);
            }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3 z-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Text Color</span>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => applyColor(color.class)}
                      className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />

        <span className="text-xs text-gray-500 dark:text-gray-400">
          {value.length} chars
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
        rows="4"
        placeholder={placeholder}
      />

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <p><strong>Formatting:</strong> **bold**, *italic*, emojis, and colors</p>
      </div>
    </div>
  );
};

export default RichNoteEditor;
