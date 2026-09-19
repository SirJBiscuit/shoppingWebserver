import React from 'react';
import { Package } from 'lucide-react';

/**
 * Placeholder Section Component
 * Used for sections that haven't been implemented yet
 */
const PlaceholderSection = ({ title, description, icon: Icon = Package }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center">
        <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title || 'Coming Soon'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {description || 'This section is under development'}
        </p>
      </div>
    </div>
  );
};

export default PlaceholderSection;
