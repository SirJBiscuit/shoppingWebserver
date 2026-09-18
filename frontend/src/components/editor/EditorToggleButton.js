import React from 'react';
import { motion } from 'framer-motion';
import { Edit3, X } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * EditorToggleButton - Floating button to toggle editor mode
 * 
 * Positioned bottom-right
 * Always visible (unless editor is active)
 * Multiple access methods: Click, Ctrl+E, Menu
 */

const EditorToggleButton = () => {
  const { isEditorActive, toggleEditor } = useEditor();
  
  return (
    <motion.button
      onClick={toggleEditor}
      className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 ${
        isEditorActive
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isEditorActive ? 'Exit Editor (Ctrl+E)' : 'Enter Editor Mode (Ctrl+E)'}
    >
      <div className="relative">
        {isEditorActive ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Edit3 className="w-6 h-6 text-white" />
        )}
        
        {/* Badge when editor is active */}
        {isEditorActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"
          />
        )}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isEditorActive ? 'Exit Editor' : 'Customize Layout'}
        <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1" />
      </div>
    </motion.button>
  );
};

export default EditorToggleButton;
