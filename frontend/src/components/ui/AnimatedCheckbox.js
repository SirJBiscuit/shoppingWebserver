import React from 'react';
import { Check } from 'lucide-react';

/**
 * AnimatedCheckbox - Beautiful 3D animated checkbox with smooth transitions
 */
const AnimatedCheckbox = ({ 
  checked, 
  onChange, 
  label, 
  color = 'blue',
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const iconSizes = {
    small: 12,
    medium: 16,
    large: 20
  };

  const colorClasses = {
    blue: {
      checked: 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600',
      unchecked: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
      shadow: 'shadow-blue-500/50'
    },
    green: {
      checked: 'bg-gradient-to-br from-green-500 to-green-600 border-green-600',
      unchecked: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
      shadow: 'shadow-green-500/50'
    },
    purple: {
      checked: 'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-600',
      unchecked: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
      shadow: 'shadow-purple-500/50'
    },
    orange: {
      checked: 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600',
      unchecked: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
      shadow: 'shadow-orange-500/50'
    }
  };

  const currentSize = sizeClasses[size];
  const currentIconSize = iconSizes[size];
  const currentColor = colorClasses[color];

  return (
    <label className="flex items-center gap-2 cursor-pointer group select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div
          className={`
            ${currentSize}
            border-2
            rounded-md
            transition-all
            duration-300
            ease-out
            flex
            items-center
            justify-center
            ${checked ? currentColor.checked : currentColor.unchecked}
            ${checked ? `${currentColor.shadow} shadow-lg scale-110` : 'shadow-sm'}
            group-hover:scale-110
            group-hover:shadow-md
            transform
            ${checked ? 'rotate-0' : 'rotate-0'}
            peer-focus:ring-2
            peer-focus:ring-offset-2
            peer-focus:ring-blue-500
          `}
          style={{
            transform: checked ? 'perspective(400px) rotateY(0deg)' : 'perspective(400px) rotateY(0deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Checkmark with animation */}
          <Check
            size={currentIconSize}
            className={`
              text-white
              transition-all
              duration-300
              ${checked ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}
            `}
            strokeWidth={3}
          />

          {/* 3D effect layers */}
          {checked && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-md pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-black/10 to-transparent rounded-md pointer-events-none"></div>
            </>
          )}
        </div>

        {/* Ripple effect on check */}
        {checked && (
          <div
            className={`
              absolute
              inset-0
              rounded-md
              ${currentColor.checked}
              animate-ping
              opacity-75
            `}
            style={{
              animation: 'ping 0.6s cubic-bezier(0, 0, 0.2, 1)'
            }}
          ></div>
        )}
      </div>

      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      )}
    </label>
  );
};

export default AnimatedCheckbox;
