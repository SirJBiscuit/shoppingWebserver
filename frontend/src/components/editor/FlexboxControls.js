import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Columns, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * FlexboxControls - Visual Flexbox layout controls
 * 
 * Features:
 * - Direction controls (row/column)
 * - Justify content
 * - Align items
 * - Gap controls
 * - Wrap settings
 */

const FlexboxControls = ({ widget }) => {
  const { updateWidgetProperty } = useEditor();
  
  const [direction, setDirection] = useState(widget?.layout?.flexDirection || 'row');
  const [justify, setJustify] = useState(widget?.layout?.justifyContent || 'flex-start');
  const [align, setAlign] = useState(widget?.layout?.alignItems || 'flex-start');
  const [wrap, setWrap] = useState(widget?.layout?.flexWrap || 'nowrap');
  const [gap, setGap] = useState(widget?.layout?.gap || 16);
  
  const handleUpdate = (property, value) => {
    updateWidgetProperty(`layout.${property}`, value);
  };
  
  const justifyOptions = [
    { value: 'flex-start', label: 'Start', icon: '⬅' },
    { value: 'center', label: 'Center', icon: '↔' },
    { value: 'flex-end', label: 'End', icon: '➡' },
    { value: 'space-between', label: 'Between', icon: '⬌' },
    { value: 'space-around', label: 'Around', icon: '⟷' },
    { value: 'space-evenly', label: 'Evenly', icon: '⟺' }
  ];
  
  const alignOptions = [
    { value: 'flex-start', label: 'Start', icon: '⬆' },
    { value: 'center', label: 'Center', icon: '↕' },
    { value: 'flex-end', label: 'End', icon: '⬇' },
    { value: 'stretch', label: 'Stretch', icon: '⇕' },
    { value: 'baseline', label: 'Baseline', icon: '—' }
  ];
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Columns className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Flexbox Controls</h3>
      </div>
      
      {/* Preview */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div
          className="flex border-2 border-dashed border-purple-300 dark:border-purple-700 p-4"
          style={{
            flexDirection: direction,
            justifyContent: justify,
            alignItems: align,
            flexWrap: wrap,
            gap: `${gap}px`,
            minHeight: '150px'
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded px-4 py-2 text-purple-600 dark:text-purple-400 font-medium"
            >
              Item {i}
            </div>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="space-y-4">
        {/* Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['row', 'row-reverse', 'column', 'column-reverse'].map((dir) => (
              <button
                key={dir}
                onClick={() => {
                  setDirection(dir);
                  handleUpdate('flexDirection', dir);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  direction === dir
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {dir.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Justify Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Justify Content
          </label>
          <div className="grid grid-cols-3 gap-2">
            {justifyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setJustify(option.value);
                  handleUpdate('justifyContent', option.value);
                }}
                className={`px-2 py-2 rounded-lg text-sm transition-colors ${
                  justify === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={option.label}
              >
                <div className="text-lg">{option.icon}</div>
                <div className="text-xs mt-1">{option.label}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Align Items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Align Items
          </label>
          <div className="grid grid-cols-3 gap-2">
            {alignOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setAlign(option.value);
                  handleUpdate('alignItems', option.value);
                }}
                className={`px-2 py-2 rounded-lg text-sm transition-colors ${
                  align === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={option.label}
              >
                <div className="text-lg">{option.icon}</div>
                <div className="text-xs mt-1">{option.label}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Wrap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Wrap
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['nowrap', 'wrap', 'wrap-reverse'].map((w) => (
              <button
                key={w}
                onClick={() => {
                  setWrap(w);
                  handleUpdate('flexWrap', w);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  wrap === w
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {w.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Gap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gap: {gap}px
          </label>
          <input
            type="range"
            min="0"
            max="64"
            step="4"
            value={gap}
            onChange={(e) => {
              const val = Number(e.target.value);
              setGap(val);
              handleUpdate('gap', val);
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default FlexboxControls;
