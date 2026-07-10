import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const types = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500',
      text: 'text-white'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500',
      text: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500',
      text: 'text-white'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500',
      text: 'text-white'
    }
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 ${config.bg} ${config.text} px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md animate-slide-in`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
