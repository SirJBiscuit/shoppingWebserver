import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, Layout, Sliders, Eye, Code } from 'lucide-react';

const MobileLayoutCustomizer = () => {
  const [deviceType, setDeviceType] = useState('mobile');
  const [mobileConfig, setMobileConfig] = useState({
    bottomNav: true,
    compactMode: true,
    fontSize: 'medium',
    spacing: 'normal',
    cardStyle: 'rounded',
    showAnimations: true,
    touchTargetSize: 'large',
    hideOnScroll: false,
  });

  const [customCSS, setCustomCSS] = useState('');

  const updateConfig = (key, value) => {
    setMobileConfig(prev => ({ ...prev, [key]: value }));
  };

  const generateCSS = () => {
    let css = `/* Mobile Custom Styles */\n@media (max-width: 768px) {\n`;
    
    if (mobileConfig.compactMode) {
      css += `  .card { padding: 0.75rem !important; }\n`;
    }
    
    if (mobileConfig.fontSize === 'small') {
      css += `  body { font-size: 14px !important; }\n`;
    } else if (mobileConfig.fontSize === 'large') {
      css += `  body { font-size: 18px !important; }\n`;
    }
    
    if (mobileConfig.touchTargetSize === 'large') {
      css += `  button, a { min-height: 48px !important; min-width: 48px !important; }\n`;
    }
    
    css += `}\n`;
    return css;
  };

  const saveConfiguration = () => {
    const config = {
      mobile: mobileConfig,
      customCSS: customCSS || generateCSS(),
    };
    localStorage.setItem('mobile_layout_config', JSON.stringify(config));
    alert('Mobile configuration saved!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Smartphone className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile Layout Customizer</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customize how the app looks and works on mobile devices
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          {/* Device Preview Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Preview Device</h3>
            <div className="flex space-x-2">
              {[
                { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                { id: 'tablet', icon: Tablet, label: 'Tablet' },
                { id: 'desktop', icon: Monitor, label: 'Desktop' }
              ].map((device) => {
                const Icon = device.icon;
                return (
                  <button
                    key={device.id}
                    onClick={() => setDeviceType(device.id)}
                    className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition ${
                      deviceType === device.id
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-1" />
                    <span className="text-sm">{device.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <h3 className="font-bold">Layout Options</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bottom Navigation</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileConfig.bottomNav}
                  onChange={(e) => updateConfig('bottomNav', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compact Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileConfig.compactMode}
                  onChange={(e) => updateConfig('compactMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Show Animations</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mobileConfig.showAnimations}
                  onChange={(e) => updateConfig('showAnimations', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <select
                value={mobileConfig.fontSize}
                onChange={(e) => updateConfig('fontSize', e.target.value)}
                className="input-field"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Touch Target Size</label>
              <select
                value={mobileConfig.touchTargetSize}
                onChange={(e) => updateConfig('touchTargetSize', e.target.value)}
                className="input-field"
              >
                <option value="normal">Normal (44px)</option>
                <option value="large">Large (48px)</option>
                <option value="xlarge">Extra Large (56px)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Card Style</label>
              <select
                value={mobileConfig.cardStyle}
                onChange={(e) => updateConfig('cardStyle', e.target.value)}
                className="input-field"
              >
                <option value="rounded">Rounded</option>
                <option value="sharp">Sharp</option>
                <option value="pill">Pill</option>
              </select>
            </div>
          </div>

          {/* Custom CSS */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-bold mb-4 flex items-center space-x-2">
              <Code className="w-5 h-5" />
              <span>Custom CSS</span>
            </h3>
            <textarea
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder={generateCSS()}
              className="input-field font-mono text-sm h-48"
            />
          </div>

          <button onClick={saveConfiguration} className="btn-primary w-full">
            Save Mobile Configuration
          </button>
        </div>

        {/* Preview */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Live Preview</h3>
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className={`mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden ${
            deviceType === 'mobile' ? 'max-w-sm' :
            deviceType === 'tablet' ? 'max-w-2xl' :
            'max-w-full'
          }`}>
            {/* Mock Mobile UI */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
              <h4 className={`font-bold ${mobileConfig.fontSize === 'large' ? 'text-xl' : 'text-lg'}`}>
                Listzy App
              </h4>
            </div>
            
            <div className={`p-${mobileConfig.compactMode ? '3' : '6'} space-y-${mobileConfig.compactMode ? '2' : '4'}`}>
              <div className={`bg-gray-100 dark:bg-gray-700 p-${mobileConfig.compactMode ? '3' : '4'} ${
                mobileConfig.cardStyle === 'rounded' ? 'rounded-lg' :
                mobileConfig.cardStyle === 'pill' ? 'rounded-full' : ''
              }`}>
                <p className={`${mobileConfig.fontSize === 'small' ? 'text-sm' : mobileConfig.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
                  Shopping List Item
                </p>
              </div>
              
              <div className={`bg-gray-100 dark:bg-gray-700 p-${mobileConfig.compactMode ? '3' : '4'} ${
                mobileConfig.cardStyle === 'rounded' ? 'rounded-lg' :
                mobileConfig.cardStyle === 'pill' ? 'rounded-full' : ''
              }`}>
                <p className={`${mobileConfig.fontSize === 'small' ? 'text-sm' : mobileConfig.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
                  Another Item
                </p>
              </div>
            </div>

            {mobileConfig.bottomNav && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-around">
                {['🏠', '🛒', '📦', '⚙️'].map((icon, i) => (
                  <button
                    key={i}
                    className={`p-${mobileConfig.touchTargetSize === 'large' ? '3' : '2'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700`}
                  >
                    <span className="text-2xl">{icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLayoutCustomizer;
