import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, Eye, Upload, Download, RotateCcw, 
  Palette, Image as ImageIcon, Type, Layout 
} from 'lucide-react';

/**
 * LoginScreenEditor - Visual editor for customizing login screen
 * 
 * Features:
 * - Live preview
 * - Logo customization
 * - Background options (gradient/image/color)
 * - Text customization
 * - Color picker
 * - Social login toggle
 * - Save/load configurations
 */

const DEFAULT_CONFIG = {
  logo_url: '/logo.png',
  background_type: 'gradient',
  background_value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  welcome_title: 'Welcome Back',
  welcome_subtitle: 'Sign in to continue to your account',
  primary_color: '#667eea',
  secondary_color: '#764ba2',
  show_social_login: true,
  footer_text: '© 2024 Your Company. All rights reserved.'
};

const GRADIENT_PRESETS = [
  { name: 'Purple Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean Blue', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { name: 'Night Sky', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
  { name: 'Fire', value: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' }
];

const LoginScreenEditor = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeConfig, setActiveConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('appearance');
  
  useEffect(() => {
    loadActiveConfig();
  }, []);
  
  const loadActiveConfig = async () => {
    try {
      const response = await fetch('/api/login-config/active');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setActiveConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };
  
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const saveConfig = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      let response;
      if (activeConfig?.id) {
        // Update existing
        response = await fetch(`/api/login-config/${activeConfig.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        });
      } else {
        // Create new
        response = await fetch('/api/login-config', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...config,
            config_name: 'Custom Login',
            is_active: true
          })
        });
      }
      
      if (!response.ok) throw new Error('Failed to save');
      
      const data = await response.json();
      setActiveConfig(data);
      setMessage({ type: 'success', text: 'Login screen saved successfully!' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };
  
  const resetToDefault = () => {
    if (confirm('Reset to default configuration?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };
  
  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'login-config.json';
    link.click();
  };
  
  const importConfig = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setConfig({ ...DEFAULT_CONFIG, ...imported });
        setMessage({ type: 'success', text: 'Configuration imported!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Invalid configuration file' });
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
      {/* Editor Panel */}
      <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Login Screen Editor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customize your login page appearance
            </p>
          </div>
          
          {/* Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}
            >
              {message.text}
            </motion.div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              onClick={resetToDefault}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            
            <button
              onClick={exportConfig}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'appearance', label: 'Appearance', icon: Palette },
              { id: 'content', label: 'Content', icon: Type },
              { id: 'layout', label: 'Layout', icon: Layout }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={config.logo_url || ''}
                  onChange={(e) => updateConfig('logo_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="/logo.png"
                />
              </div>
              
              {/* Background Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Background Type
                </label>
                <select
                  value={config.background_type}
                  onChange={(e) => updateConfig('background_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="gradient">Gradient</option>
                  <option value="image">Image</option>
                  <option value="color">Solid Color</option>
                </select>
              </div>
              
              {/* Background Value */}
              {config.background_type === 'gradient' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gradient Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {GRADIENT_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => updateConfig('background_value', preset.value)}
                        className="h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                        style={{ background: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Gradient CSS
                  </label>
                  <textarea
                    value={config.background_value}
                    onChange={(e) => updateConfig('background_value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                    rows="3"
                  />
                </div>
              )}
              
              {config.background_type === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background Image URL
                  </label>
                  <input
                    type="text"
                    value={config.background_value}
                    onChange={(e) => updateConfig('background_value', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
              
              {config.background_type === 'color' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={config.background_value}
                    onChange={(e) => updateConfig('background_value', e.target.value)}
                    className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}
              
              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => updateConfig('primary_color', e.target.value)}
                    className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={config.secondary_color}
                    onChange={(e) => updateConfig('secondary_color', e.target.value)}
                    className="w-full h-12 rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Welcome Title
                </label>
                <input
                  type="text"
                  value={config.welcome_title}
                  onChange={(e) => updateConfig('welcome_title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Welcome Subtitle
                </label>
                <input
                  type="text"
                  value={config.welcome_subtitle}
                  onChange={(e) => updateConfig('welcome_subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={config.footer_text}
                  onChange={(e) => updateConfig('footer_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
          
          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.show_social_login}
                    onChange={(e) => updateConfig('show_social_login', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Social Login Buttons
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  Display Google and GitHub login options
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Preview Panel */}
      <div
        className="flex items-center justify-center p-6"
        style={{
          background: config.background_type === 'image'
            ? `url(${config.background_value}) center/cover`
            : config.background_value
        }}
      >
        <motion.div
          key={JSON.stringify(config)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
        >
          {/* Logo */}
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt="Logo"
              className="h-12 mx-auto mb-6"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          
          {/* Title */}
          <h1
            className="text-3xl font-bold text-center mb-2"
            style={{ color: config.primary_color }}
          >
            {config.welcome_title}
          </h1>
          
          {/* Subtitle */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            {config.welcome_subtitle}
          </p>
          
          {/* Form */}
          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled
            />
            <button
              type="button"
              className="w-full py-3 text-white rounded-lg font-medium transition-colors"
              style={{ background: config.primary_color }}
              disabled
            >
              Sign In
            </button>
          </form>
          
          {/* Social Login */}
          {config.show_social_login && (
            <div className="mt-6 space-y-2">
              <button
                type="button"
                className="w-full py-3 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled
              >
                <span className="text-gray-700 dark:text-gray-300">Continue with Google</span>
              </button>
              <button
                type="button"
                className="w-full py-3 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled
              >
                <span className="text-gray-700 dark:text-gray-300">Continue with GitHub</span>
              </button>
            </div>
          )}
          
          {/* Footer */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
            {config.footer_text}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreenEditor;
