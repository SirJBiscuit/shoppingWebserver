import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit2, Trash2, Copy, Move, Star, Heart, Share2, Download,
  Settings, RefreshCw, Save, Upload, Eye, EyeOff
} from 'lucide-react';
import CustomRadialMenu from '../CustomRadialMenu';
import { customTheme } from '../../utils/customTheme';

/**
 * RadialMenuTester - Admin panel to test CustomRadialMenu configurations
 * 
 * Features:
 * - Test all shapes: circle, square, rectangle, grid, list, arc
 * - Test all layouts: radial, arc, grid, vertical, horizontal, list
 * - Test all sizes: sm, md, lg
 * - Test animations and spacing
 * - Live preview
 * - Export configuration
 * - Save presets
 */
const RadialMenuTester = () => {
  // Configuration state
  const [config, setConfig] = useState({
    shape: 'circle',
    layout: 'auto',
    size: 'md',
    showLabels: true,
    showBackdrop: false,
    compact: false,
    spacing: 'md',
    radius: 100,
    columns: 3,
    arcAngle: 180,
    arcStart: -90,
    actionCount: 6
  });

  // Sample actions
  const getSampleActions = (count) => {
    const allActions = [
      { icon: Edit2, label: 'Edit', color: 'bg-gradient-to-br from-blue-500 to-blue-600' },
      { icon: Trash2, label: 'Delete', color: 'bg-gradient-to-br from-red-500 to-red-600' },
      { icon: Copy, label: 'Copy', color: 'bg-gradient-to-br from-green-500 to-green-600' },
      { icon: Move, label: 'Move', color: 'bg-gradient-to-br from-purple-500 to-purple-600' },
      { icon: Star, label: 'Favorite', color: 'bg-gradient-to-br from-yellow-500 to-yellow-600', badge: '5' },
      { icon: Heart, label: 'Like', color: 'bg-gradient-to-br from-pink-500 to-pink-600' },
      { icon: Share2, label: 'Share', color: 'bg-gradient-to-br from-indigo-500 to-indigo-600' },
      { icon: Download, label: 'Download', color: 'bg-gradient-to-br from-teal-500 to-teal-600' },
      { icon: Settings, label: 'Settings', color: 'bg-gradient-to-br from-gray-500 to-gray-600' },
      { icon: RefreshCw, label: 'Refresh', color: 'bg-gradient-to-br from-cyan-500 to-cyan-600' }
    ];
    return allActions.slice(0, count).map(action => ({
      ...action,
      onClick: () => console.log(`${action.label} clicked`)
    }));
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const exportConfig = () => {
    const code = `<CustomRadialMenu
  shape="${config.shape}"
  layout="${config.layout}"
  size="${config.size}"
  showLabels={${config.showLabels}}
  showBackdrop={${config.showBackdrop}}
  compact={${config.compact}}
  spacing="${config.spacing}"
  radius={${config.radius}}
  ${config.shape === 'grid' ? `columns={${config.columns}}` : ''}
  ${config.shape === 'arc' ? `arcAngle={${config.arcAngle}} arcStart={${config.arcStart}}` : ''}
  actions={[
    { icon: Edit2, label: 'Edit', onClick: () => {} },
    { icon: Trash2, label: 'Delete', onClick: () => {} },
    // ... more actions
  ]}
/>`;
    
    navigator.clipboard.writeText(code);
    alert('Configuration copied to clipboard!');
  };

  const presets = [
    { name: 'Classic Radial', config: { shape: 'circle', layout: 'radial', size: 'md', actionCount: 6 } },
    { name: 'Compact List', config: { shape: 'list', layout: 'list', size: 'sm', compact: true, actionCount: 5 } },
    { name: 'Grid Menu', config: { shape: 'grid', layout: 'grid', size: 'md', columns: 3, actionCount: 6 } },
    { name: 'Arc Menu', config: { shape: 'arc', layout: 'arc', arcAngle: 180, arcStart: -90, actionCount: 5 } },
    { name: 'Vertical Bar', config: { shape: 'rectangle', layout: 'vertical', size: 'md', actionCount: 4 } },
    { name: 'Horizontal Bar', config: { shape: 'rectangle', layout: 'horizontal', size: 'lg', actionCount: 4 } }
  ];

  const loadPreset = (preset) => {
    setConfig(prev => ({ ...prev, ...preset.config }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Radial Menu Tester
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test different configurations and find the perfect menu style
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Presets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Presets
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => loadPreset(preset)}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Shape
              </h2>
              <div className="space-y-2">
                {['circle', 'square', 'rectangle', 'grid', 'list', 'arc'].map(shape => (
                  <label key={shape} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="shape"
                      value={shape}
                      checked={config.shape === shape}
                      onChange={(e) => updateConfig('shape', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{shape}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Layout */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Layout
              </h2>
              <div className="space-y-2">
                {['auto', 'radial', 'arc', 'grid', 'vertical', 'horizontal', 'list'].map(layout => (
                  <label key={layout} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="layout"
                      value={layout}
                      checked={config.layout === layout}
                      onChange={(e) => updateConfig('layout', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{layout}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Size
              </h2>
              <div className="space-y-2">
                {['sm', 'md', 'lg'].map(size => (
                  <label key={size} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="size"
                      value={size}
                      checked={config.size === size}
                      onChange={(e) => updateConfig('size', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 uppercase">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Options
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showLabels}
                    onChange={(e) => updateConfig('showLabels', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Show Labels</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showBackdrop}
                    onChange={(e) => updateConfig('showBackdrop', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Show Backdrop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.compact}
                    onChange={(e) => updateConfig('compact', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Compact Mode</span>
                </label>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Advanced
              </h2>
              <div className="space-y-4">
                {/* Action Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action Count: {config.actionCount}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={config.actionCount}
                    onChange={(e) => updateConfig('actionCount', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Spacing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Spacing
                  </label>
                  <select
                    value={config.spacing}
                    onChange={(e) => updateConfig('spacing', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>

                {/* Radius (for radial layouts) */}
                {(config.layout === 'radial' || config.layout === 'arc') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Radius: {config.radius}px
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={config.radius}
                      onChange={(e) => updateConfig('radius', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Grid Columns */}
                {config.shape === 'grid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Columns: {config.columns}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="5"
                      value={config.columns}
                      onChange={(e) => updateConfig('columns', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Arc Settings */}
                {config.shape === 'arc' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Arc Angle: {config.arcAngle}°
                      </label>
                      <input
                        type="range"
                        min="90"
                        max="360"
                        step="30"
                        value={config.arcAngle}
                        onChange={(e) => updateConfig('arcAngle', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Arc Start: {config.arcStart}°
                      </label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="30"
                        value={config.arcStart}
                        onChange={(e) => updateConfig('arcStart', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Export */}
            <button
              onClick={exportConfig}
              className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copy Configuration
            </button>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 min-h-[600px] flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Live Preview
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Click the button below to test the menu
                </p>
                
                {/* Live Preview */}
                <div className="flex items-center justify-center">
                  <CustomRadialMenu
                    primaryAction={{
                      icon: Settings,
                      label: 'Menu',
                      onClick: () => console.log('Primary clicked')
                    }}
                    actions={getSampleActions(config.actionCount)}
                    shape={config.shape}
                    layout={config.layout}
                    size={config.size}
                    showLabels={config.showLabels}
                    showBackdrop={config.showBackdrop}
                    compact={config.compact}
                    spacing={config.spacing}
                    radius={config.radius}
                    columns={config.columns}
                    arcAngle={config.arcAngle}
                    arcStart={config.arcStart}
                  />
                </div>

                {/* Current Config Display */}
                <div className="mt-12 text-left bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Current Configuration:
                  </h3>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadialMenuTester;
