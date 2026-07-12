import React from 'react';
import { playSound } from '../utils/soundEffects';

/**
 * Button wrapper that plays a sound on click
 * Use this for important action buttons
 */
const SoundButton = ({ 
  children, 
  onClick, 
  sound = 'button',
  className = '',
  disabled = false,
  type = 'button',
  ...props 
}) => {
  const handleClick = (e) => {
    if (!disabled) {
      playSound(sound);
      if (onClick) {
        onClick(e);
      }
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default SoundButton;
