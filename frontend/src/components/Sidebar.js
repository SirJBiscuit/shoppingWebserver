import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, ChefHat, Package, Calendar, BarChart3, 
  Settings, Shield, History, Search, Mic, Scan, Share2,
  Menu, X, Bell, Moon, Sun, Crown, Store, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import ClearCacheButton from './ClearCacheButton';

const Sidebar = ({ onAction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { hasFeature } = useFeatureFlags();
  const [isOpen, setIsOpen] = useState(false);
  const [expiringCount, setExpiringCount] = useState(0);

  // Fetch expiring items count
  useEffect(() => {
    const fetchExpiringCount = async () => {
      try {
        const response = await fetch('/api/inventory/expiring-suggestions?days=3', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setExpiringCount(data.length);
        }
      } catch (error) {
        console.error('Error fetching expiring count:', error);
      }
    };

    if (user) {
      fetchExpiringCount();
      // Refresh every 5 minutes
      const interval = setInterval(fetchExpiringCount, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const mainNavItems = [
    { path: '/', icon: ShoppingCart, label: 'Dashboard', color: 'text-blue-600', feature: 'shopping_lists' },
    { path: '/staging', icon: Package, label: 'After Shop', color: 'text-yellow-600', feature: 'pantry', badge: '🛒' },
    { path: '/pantry-new', icon: Package, label: 'Kitchen Inventory', color: 'text-green-600', feature: 'pantry' },
    { path: '/recipes', icon: ChefHat, label: 'Recipe Book', color: 'text-orange-600', feature: 'recipes' },
    { path: '/meal-plan', icon: Calendar, label: 'Meal Planner', color: 'text-purple-600', feature: 'meal_planner' },
    { path: '/stats', icon: BarChart3, label: 'Statistics', color: 'text-pink-600', feature: 'statistics' },
    { path: '/discover', icon: Search, label: 'Recipe Discovery', color: 'text-teal-600', feature: 'recipe_discovery' },
    { path: '/history', icon: History, label: 'Activity History', color: 'text-indigo-600', feature: 'activity_history' },
  ];

  const toolItems = [
    { action: 'voice', icon: Mic, label: 'Voice Input', color: 'text-red-600', feature: 'voice_input' },
    { action: 'scan', icon: Scan, label: 'Barcode Scanner', color: 'text-yellow-600', feature: 'barcode_scanner' },
    { action: 'share', icon: Share2, label: 'Share List', color: 'text-cyan-600', feature: 'sharing' },
  ];

  const settingsItems = [
    { action: 'stores', icon: Store, label: 'Manage Stores', color: 'text-blue-600', feature: 'store_management' },
    { path: '/admin/customize', icon: Sparkles, label: 'ACH Customization', color: 'text-purple-600', special: true, feature: 'ach_customization' },
    { path: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-600' },
    ...(user?.is_admin ? [{ path: '/admin', icon: Shield, label: 'Admin', color: 'text-red-600' }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleToolClick = (action) => {
    // Emit custom event for tools
    window.dispatchEvent(new CustomEvent('sidebar-tool-click', { detail: { action } }));
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-all hover:scale-105"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen || window.innerWidth >= 1024 ? 0 : -280 }}
        className="fixed left-0 top-0 h-screen w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col custom-scrollbar overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Listzy</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Smart Shopping Lists</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Welcome back!</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <div className="mb-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Main Menu
            </h3>
            {mainNavItems
              .filter(item => !item.feature || hasFeature(item.feature))
              .map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${
                  isActive(item.path)
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive(item.path) ? item.color : ''}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {/* Expiring Soon Badge for Kitchen Inventory */}
                {item.path === '/pantry-new' && expiringCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {expiringCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Tools */}
          <div className="mb-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Quick Tools
            </h3>
            {toolItems
              .filter(item => !item.feature || hasFeature(item.feature))
              .map((item) => (
              <button
                key={item.action}
                onClick={() => handleToolClick(item.action)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Settings */}
          <div>
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              System
            </h3>
            {settingsItems
              .filter(item => !item.feature || hasFeature(item.feature))
              .map((item) => (
              <button
                key={item.path || item.action}
                onClick={() => item.action ? onAction?.(item.action) : handleNavClick(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  item.special
                    ? isActive(item.path)
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md'
                    : isActive(item.path)
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className={`w-5 h-5 ${item.special ? 'text-white' : isActive(item.path) ? item.color : ''}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {item.special && (
                  <span className="ml-auto bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Premium Button */}
          <button
            onClick={() => handleNavClick('/premium')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Crown className="w-5 h-5" />
            <span className="font-medium text-sm">Upgrade to Premium</span>
          </button>
          <ClearCacheButton />
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            <span className="font-medium text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content spacer */}
      <div className="hidden lg:block w-72" />
    </>
  );
};

export default Sidebar;
