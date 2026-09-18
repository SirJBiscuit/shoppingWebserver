import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid, Plus, Minus, Trash2, Copy } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * GridEditor - Visual CSS Grid layout builder
 * 
 * Features:
 * - Visual grid builder
 * - Add/remove rows and columns
 * - Adjust gap controls
 * - Template areas
 * - Drag to resize
 */

const GridEditor = ({ widget }) => {
  const { updateWidgetProperty } = useEditor();
  
  const [rows, setRows] = useState(widget?.layout?.gridRows || 3);
  const [columns, setColumns] = useState(widget?.layout?.gridColumns || 3);
  const [rowGap, setRowGap] = useState(widget?.layout?.rowGap || 16);
  const [columnGap, setColumnGap] = useState(widget?.layout?.columnGap || 16);
  const [autoFlow, setAutoFlow] = useState(widget?.layout?.gridAutoFlow || 'row');
  
  const handleUpdateGrid = (property, value) => {
    updateWidgetProperty(`layout.${property}`, value);
  };
  
  const addRow = () => {
    const newRows = rows + 1;
    setRows(newRows);
    handleUpdateGrid('gridRows', newRows);
  };
  
  const removeRow = () => {
    if (rows > 1) {
      const newRows = rows - 1;
      setRows(newRows);
      handleUpdateGrid('gridRows', newRows);
    }
  };
  
  const addColumn = () => {
    const newColumns = columns + 1;
    setColumns(newColumns);
    handleUpdateGrid('gridColumns', newColumns);
  };
  
  const removeColumn = () => {
    if (columns > 1) {
      const newColumns = columns - 1;
      setColumns(newColumns);
      handleUpdateGrid('gridColumns', newColumns);
    }
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Grid className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">CSS Grid Editor</h3>
      </div>
      
      {/* Grid preview */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div
          className="grid border-2 border-dashed border-blue-300 dark:border-blue-700"
          style={{
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${rowGap}px ${columnGap}px`,
            minHeight: '200px'
          }}
        >
          {Array.from({ length: rows * columns }).map((_, i) => (
            <div
              key={i}
              className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded flex items-center justify-center text-xs text-blue-600 dark:text-blue-400"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      
      {/* Controls */}
      <div className="space-y-4">
        {/* Rows */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rows: {rows}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={removeRow}
              disabled={rows <= 1}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="12"
              value={rows}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRows(val);
                handleUpdateGrid('gridRows', val);
              }}
              className="flex-1"
            />
            <button
              onClick={addRow}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Columns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Columns: {columns}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={removeColumn}
              disabled={columns <= 1}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="12"
              value={columns}
              onChange={(e) => {
                const val = Number(e.target.value);
                setColumns(val);
                handleUpdateGrid('gridColumns', val);
              }}
              className="flex-1"
            />
            <button
              onClick={addColumn}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Row Gap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Row Gap: {rowGap}px
          </label>
          <input
            type="range"
            min="0"
            max="64"
            step="4"
            value={rowGap}
            onChange={(e) => {
              const val = Number(e.target.value);
              setRowGap(val);
              handleUpdateGrid('rowGap', val);
            }}
            className="w-full"
          />
        </div>
        
        {/* Column Gap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Column Gap: {columnGap}px
          </label>
          <input
            type="range"
            min="0"
            max="64"
            step="4"
            value={columnGap}
            onChange={(e) => {
              const val = Number(e.target.value);
              setColumnGap(val);
              handleUpdateGrid('columnGap', val);
            }}
            className="w-full"
          />
        </div>
        
        {/* Auto Flow */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Auto Flow
          </label>
          <select
            value={autoFlow}
            onChange={(e) => {
              setAutoFlow(e.target.value);
              handleUpdateGrid('gridAutoFlow', e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="row">Row</option>
            <option value="column">Column</option>
            <option value="dense">Dense</option>
            <option value="row dense">Row Dense</option>
            <option value="column dense">Column Dense</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default GridEditor;
