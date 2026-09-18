import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Pause, RotateCw } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * AnimationPresets - Pre-built animation presets
 * 
 * Features:
 * - Entrance animations
 * - Exit animations
 * - Hover effects
 * - Click effects
 * - Custom timing
 */

const ANIMATION_PRESETS = {
  entrance: [
    { name: 'Fade In', value: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } } },
    { name: 'Slide Up', value: { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.4 } } },
    { name: 'Slide Down', value: { initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.4 } } },
    { name: 'Slide Left', value: { initial: { x: 20, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.4 } } },
    { name: 'Slide Right', value: { initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 }, transition: { duration: 0.4 } } },
    { name: 'Scale Up', value: { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.3 } } },
    { name: 'Bounce In', value: { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: 'spring', bounce: 0.5 } } }
  ],
  hover: [
    { name: 'Lift', value: { scale: 1.05, y: -5, transition: { duration: 0.2 } } },
    { name: 'Grow', value: { scale: 1.1, transition: { duration: 0.2 } } },
    { name: 'Glow', value: { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)', transition: { duration: 0.2 } } },
    { name: 'Tilt', value: { rotate: 5, transition: { duration: 0.2 } } },
    { name: 'Pulse', value: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1 } } }
  ],
  click: [
    { name: 'Shrink', value: { scale: 0.95, transition: { duration: 0.1 } } },
    { name: 'Bounce', value: { scale: [1, 0.9, 1.1, 1], transition: { duration: 0.3 } } },
    { name: 'Shake', value: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.3 } } },
    { name: 'Spin', value: { rotate: 360, transition: { duration: 0.5 } } }
  ]
};

const AnimationPresets = ({ widget }) => {
  const { updateWidgetProperty } = useEditor();
  
  const [selectedType, setSelectedType] = useState('entrance');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0.3);
  const [delay, setDelay] = useState(0);
  
  const applyAnimation = (preset) => {
    setSelectedPreset(preset);
    updateWidgetProperty('animation', {
      type: selectedType,
      preset: preset.name,
      config: preset.value,
      duration,
      delay
    });
  };
  
  const playPreview = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), (duration + delay) * 1000 + 500);
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Animation Presets</h3>
      </div>
      
      {/* Animation Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Animation Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['entrance', 'hover', 'click'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                selectedType === type
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      {/* Preview */}
      <div className="mb-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center min-h-[150px]">
        <AnimatePresence mode="wait">
          {isPlaying && selectedPreset ? (
            <motion.div
              key="preview"
              {...selectedPreset.value}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium shadow-lg"
            >
              Preview
            </motion.div>
          ) : (
            <motion.div
              key="static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium"
            >
              {selectedPreset ? selectedPreset.name : 'Select a preset'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Play Button */}
      {selectedPreset && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={playPreview}
            disabled={isPlaying}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Playing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Preview
              </>
            )}
          </button>
          <button
            onClick={() => setSelectedPreset(null)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Presets Grid */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Presets
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {ANIMATION_PRESETS[selectedType].map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyAnimation(preset)}
              className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                selectedPreset?.name === preset.name
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-2 border-transparent'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Timing Controls */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration: {duration}s
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Delay: {delay}s
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default AnimationPresets;
