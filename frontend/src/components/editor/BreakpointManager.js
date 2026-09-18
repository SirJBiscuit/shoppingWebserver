import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Plus, X, Eye } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * BreakpointManager - Manage responsive breakpoints
 * 
 * Features:
 * - Add/edit/delete breakpoints
 * - Preview at different sizes
 * - Device presets
 * - Responsive overrides
 */

const DEVICE_PRESETS = [
  { name: 'Mobile', icon: Smartphone, width: 375, height: 667 },
  { name: 'Tablet', icon: Tablet, width: 768, height: 1024 },
  { name: 'Desktop', icon: Monitor, width: 1920, height: 1080 }
];

const BreakpointManager = () => {
  const { aesManager } = useEditor();
  
  const [breakpoints, setBreakpoints] = useState([
    { id: 1, name: 'Mobile', minWidth: 0, maxWidth: 767 },
    { id: 2, name: 'Tablet', minWidth: 768, maxWidth: 1023 },
    { id: 3, name: 'Desktop', minWidth: 1024, maxWidth: null }
  ]);
  
  const [previewSize, setPreviewSize] = useState({ width: 1920, height: 1080 });
  const [showPreview, setShowPreview] = useState(false);
  
  const addBreakpoint = () => {
    const newBreakpoint = {
      id: Date.now(),
      name: 'New Breakpoint',
      minWidth: 0,
      maxWidth: null
    };
    setBreakpoints([...breakpoints, newBreakpoint]);
  };
  
  const deleteBreakpoint = (id) => {
    setBreakpoints(breakpoints.filter(bp => bp.id !== id));
  };
  
  const updateBreakpoint = (id, field, value) => {
    setBreakpoints(breakpoints.map(bp =>
      bp.id === id ? { ...bp, [field]: value } : bp
    ));
  };
  
  const setPreset = (preset) => {
    setPreviewSize({ width: preset.width, height: preset.height });
    setShowPreview(true);
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Breakpoint Manager</h3>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          title="Toggle Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
      
      {/* Device Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Device Presets
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DEVICE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setPreset(preset)}
              className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <preset.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {preset.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {preset.width}×{preset.height}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Preview Window */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview: {previewSize.width}×{previewSize.height}
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div
            className="border-2 border-dashed border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 mx-auto"
            style={{
              width: `${Math.min(previewSize.width, 600)}px`,
              height: `${Math.min(previewSize.height, 400)}px`,
              transform: previewSize.width > 600 ? `scale(${600 / previewSize.width})` : 'none',
              transformOrigin: 'top left'
            }}
          >
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Preview Area
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Breakpoints List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Breakpoints
          </label>
          <button
            onClick={addBreakpoint}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        
        {breakpoints.map((bp) => (
          <div
            key={bp.id}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={bp.name}
                onChange={(e) => updateBreakpoint(bp.id, 'name', e.target.value)}
                className="flex-1 px-2 py-1 text-sm font-medium bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
              />
              <button
                onClick={() => deleteBreakpoint(bp.id)}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Min Width (px)
                </label>
                <input
                  type="number"
                  value={bp.minWidth}
                  onChange={(e) => updateBreakpoint(bp.id, 'minWidth', Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Max Width (px)
                </label>
                <input
                  type="number"
                  value={bp.maxWidth || ''}
                  onChange={(e) => updateBreakpoint(bp.id, 'maxWidth', e.target.value ? Number(e.target.value) : null)}
                  placeholder="None"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          💡 Tip: Breakpoints allow you to create responsive designs. Set different styles for each breakpoint.
        </p>
      </div>
    </div>
  );
};

export default BreakpointManager;
