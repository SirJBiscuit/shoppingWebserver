import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, UtensilsCrossed, Package, BarChart3, Settings } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: ShoppingCart, label: 'Lists' },
    { path: '/recipes', icon: UtensilsCrossed, label: 'Recipes' },
    { path: '/pantry', icon: Package, label: 'Pantry' },
    { path: '/statistics', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = (path) => {
    playSound('button');
    navigate(path);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-primary-600 dark:bg-primary-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
