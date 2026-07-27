import React from 'react';
import { Check } from 'lucide-react';

/**
 * CustomCheckbox - Beautiful custom checkbox component
 * Replaces basic HTML checkboxes with styled version
 */
const CustomCheckbox = ({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  className = '' 
}) => {
  return (
    <label className={`flex items-center cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-primary-500 border-primary-500 dark:bg-primary-600 dark:border-primary-600'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 group-hover:border-primary-400 dark:group-hover:border-primary-500'
        }`}>
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </div>
      {label && (
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 select-none">
          {label}
        </span>
      )}
    </label>
  );
};

export default CustomCheckbox;
