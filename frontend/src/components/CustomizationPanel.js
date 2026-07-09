import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Image, Check, Crown } from 'lucide-react';

const CustomizationPanel = ({ isPremium }) => {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedIconPack, setSelectedIconPack] = useState('default');
  const [accentColor, setAccentColor] = useState('#3B82F6');

  const themes = [
    {
      id: 'default',
      name: 'Listly Blue',
      colors: { primary: '#3B82F6', secondary: '#8B5CF6' },
      preview: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      free: true
    },
    {
      id: 'forest',
      name: 'Forest Green',
      colors: { primary: '#10B981', secondary: '#059669' },
      preview: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      free: true
    },
    {
      id: 'sunset',
      name: 'Sunset Orange',
      colors: { primary: '#F59E0B', secondary: '#EF4444' },
      preview: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      free: false
    },
    {
      id: 'ocean',
      name: 'Ocean Blue',
      colors: { primary: '#06B6D4', secondary: '#3B82F6' },
      preview: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      free: false
    },
    {
      id: 'lavender',
      name: 'Lavender Dream',
      colors: { primary: '#A78BFA', secondary: '#EC4899' },
      preview: 'linear-gradient(135deg, #A78BFA 0%, #EC4899 100%)',
      free: false
    },
    {
      id: 'midnight',
      name: 'Midnight Purple',
      colors: { primary: '#6366F1', secondary: '#8B5CF6' },
      preview: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      free: false
    }
  ];

  const iconPacks = [
    {
      id: 'default',
      name: 'Classic Emoji',
      icons: ['🥬', '🥖', '🥩', '🥛', '🧊', '🥫'],
      free: true
    },
    {
      id: 'minimal',
      name: 'Minimal Icons',
      icons: ['○', '□', '△', '◇', '☆', '◐'],
      free: true
    },
    {
      id: 'colorful',
      name: 'Colorful',
      icons: ['🌈', '🎨', '🎭', '🎪', '🎡', '🎢'],
      free: false
    },
    {
      id: 'nature',
      name: 'Nature',
      icons: ['🌿', '🌸', '🌺', '🌻', '🌼', '🌷'],
      free: false
    },
    {
      id: 'food',
      name: 'Gourmet',
      icons: ['🍕', '🍔', '🍟', '🌮', '🍱', '🍜'],
      free: false
    }
  ];

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('selectedTheme');
    const savedIconPack = localStorage.getItem('selectedIconPack');
    const savedAccent = localStorage.getItem('accentColor');

    if (savedTheme) setSelectedTheme(savedTheme);
    if (savedIconPack) setSelectedIconPack(savedIconPack);
    if (savedAccent) setAccentColor(savedAccent);
  }, []);

  const applyTheme = (theme) => {
    if (!theme.free && !isPremium) {
      alert('This theme requires Listly Premium');
      return;
    }

    setSelectedTheme(theme.id);
    localStorage.setItem('selectedTheme', theme.id);

    // Apply theme colors to CSS variables
    document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.colors.secondary);
  };

  const applyIconPack = (pack) => {
    if (!pack.free && !isPremium) {
      alert('This icon pack requires Listly Premium');
      return;
    }

    setSelectedIconPack(pack.id);
    localStorage.setItem('selectedIconPack', pack.id);
  };

  const applyAccentColor = (color) => {
    setAccentColor(color);
    localStorage.setItem('accentColor', color);
    document.documentElement.style.setProperty('--color-accent', color);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Palette className="w-6 h-6 mr-2 text-primary-600" />
          Customization
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Personalize your Listly experience
        </p>
      </div>

      {/* Themes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary-600" />
            Color Themes
          </h3>
          {!isPremium && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Premium themes available
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => applyTheme(theme)}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTheme === theme.id
                  ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              } ${!theme.free && !isPremium ? 'opacity-60' : ''}`}
            >
              {/* Theme Preview */}
              <div
                className="w-full h-20 rounded-lg mb-3"
                style={{ background: theme.preview }}
              />

              {/* Theme Name */}
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {theme.name}
                </p>
                {selectedTheme === theme.id && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </div>

              {/* Premium Badge */}
              {!theme.free && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <Crown className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">
                      PRO
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Icon Packs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Image className="w-5 h-5 mr-2 text-primary-600" />
            Icon Packs
          </h3>
          {!isPremium && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Premium packs available
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {iconPacks.map((pack) => (
            <div
              key={pack.id}
              onClick={() => applyIconPack(pack)}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedIconPack === pack.id
                  ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              } ${!pack.free && !isPremium ? 'opacity-60' : ''}`}
            >
              {/* Icon Preview */}
              <div className="flex items-center justify-center space-x-2 mb-3 text-2xl">
                {pack.icons.map((icon, index) => (
                  <span key={index}>{icon}</span>
                ))}
              </div>

              {/* Pack Name */}
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white">
                  {pack.name}
                </p>
                {selectedIconPack === pack.id && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </div>

              {/* Premium Badge */}
              {!pack.free && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <Crown className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">
                      PRO
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Accent Color (Premium) */}
      {isPremium && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-primary-600" />
            Custom Accent Color
          </h3>

          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => applyAccentColor(e.target.value)}
              className="w-20 h-20 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Choose your accent color
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current: {accentColor}
              </p>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="mt-4 flex flex-wrap gap-2">
            {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'].map((color) => (
              <button
                key={color}
                onClick={() => applyAccentColor(color)}
                className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Prompt for Free Users */}
      {!isPremium && (
        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start space-x-3">
            <Crown className="w-8 h-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Unlock Premium Themes & Icons
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Get access to exclusive themes, icon packs, and custom accent colors with Listly Premium.
              </p>
              <button className="btn-primary text-sm">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Preview
        </h3>
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <button className="w-full btn-primary">
              Primary Button
            </button>
            <button className="w-full btn-secondary">
              Secondary Button
            </button>
            <div className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <span className="text-2xl">
                {iconPacks.find(p => p.id === selectedIconPack)?.icons[0]}
              </span>
              <span className="text-gray-900 dark:text-white">
                Sample Item with Icon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizationPanel;
