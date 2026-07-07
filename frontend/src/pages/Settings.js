import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ArrowLeft, Settings as SettingsIcon, User, Bell, 
  Palette, Database, Download, Upload, Trash2, Save
} from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [settings, setSettings] = useState({
    notifications: true,
    autoSort: false,
    defaultView: 'grid',
    showPrices: true,
    showImages: true,
    compactMode: false,
    autoSuggest: true,
    soundEffects: false,
  });

  const [customUnits, setCustomUnits] = useState([]);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    loadSettings();
    loadCustomUnits();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const loadCustomUnits = () => {
    const saved = localStorage.getItem('customUnits');
    if (saved) {
      setCustomUnits(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const addCustomUnit = () => {
    if (!newUnit.trim()) return;
    
    const updated = [...customUnits, newUnit.trim()];
    setCustomUnits(updated);
    localStorage.setItem('customUnits', JSON.stringify(updated));
    setNewUnit('');
  };

  const removeCustomUnit = (unit) => {
    const updated = customUnits.filter(u => u !== unit);
    setCustomUnits(updated);
    localStorage.setItem('customUnits', JSON.stringify(updated));
  };

  const exportData = () => {
    const data = {
      settings,
      customUnits,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-app-settings-${Date.now()}.json`;
    a.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) {
          setSettings(data.settings);
          localStorage.setItem('appSettings', JSON.stringify(data.settings));
        }
        if (data.customUnits) {
          setCustomUnits(data.customUnits);
          localStorage.setItem('customUnits', JSON.stringify(data.customUnits));
        }
        alert('Settings imported successfully!');
      } catch (error) {
        alert('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure? This will clear all your settings and custom units.')) {
      localStorage.removeItem('appSettings');
      localStorage.removeItem('customUnits');
      setSettings({
        notifications: true,
        autoSort: false,
        defaultView: 'grid',
        showPrices: true,
        showImages: true,
        compactMode: false,
        autoSuggest: true,
        soundEffects: false,
      });
      setCustomUnits([]);
      alert('All settings cleared!');
    }
  };

  const SettingToggle = ({ label, description, value, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center space-x-3">
                  <SettingsIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Settings
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Customize your experience
                    </p>
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Profile Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Profile
                </h2>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {user?.username}
                </p>
              </div>
            </motion.div>

            {/* App Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    App Preferences
                  </h2>
                </div>
                <button onClick={saveSettings} className="btn-primary text-sm flex items-center">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </button>
              </div>
              
              <div className="space-y-3">
                <SettingToggle
                  label="Notifications"
                  description="Receive notifications for expiring items"
                  value={settings.notifications}
                  onChange={(val) => setSettings({ ...settings, notifications: val })}
                />
                <SettingToggle
                  label="Auto Sort"
                  description="Automatically sort items by store layout"
                  value={settings.autoSort}
                  onChange={(val) => setSettings({ ...settings, autoSort: val })}
                />
                <SettingToggle
                  label="Show Prices"
                  description="Display item prices in lists"
                  value={settings.showPrices}
                  onChange={(val) => setSettings({ ...settings, showPrices: val })}
                />
                <SettingToggle
                  label="Show Images"
                  description="Display item images when available"
                  value={settings.showImages}
                  onChange={(val) => setSettings({ ...settings, showImages: val })}
                />
                <SettingToggle
                  label="Compact Mode"
                  description="Use smaller cards and spacing"
                  value={settings.compactMode}
                  onChange={(val) => setSettings({ ...settings, compactMode: val })}
                />
                <SettingToggle
                  label="Auto Suggestions"
                  description="Show smart suggestions automatically"
                  value={settings.autoSuggest}
                  onChange={(val) => setSettings({ ...settings, autoSuggest: val })}
                />
                <SettingToggle
                  label="Sound Effects"
                  description="Play sounds for actions"
                  value={settings.soundEffects}
                  onChange={(val) => setSettings({ ...settings, soundEffects: val })}
                />
              </div>
            </motion.div>

            {/* Custom Units */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Custom Units
                </h2>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomUnit()}
                  placeholder="Add custom unit (e.g., 'dozen', 'bunch')"
                  className="input-field flex-1"
                />
                <button onClick={addCustomUnit} className="btn-primary">
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {customUnits.map((unit, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-gray-900 dark:text-white">{unit}</span>
                    <button
                      onClick={() => removeCustomUnit(unit)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {customUnits.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No custom units added yet
                  </p>
                )}
              </div>
            </motion.div>

            {/* Data Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Database className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Data Management
                </h2>
              </div>

              <div className="space-y-3">
                <button
                  onClick={exportData}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Settings
                </button>

                <label className="w-full btn-secondary flex items-center justify-center cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Settings
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={clearAllData}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Settings
                </button>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Settings;
