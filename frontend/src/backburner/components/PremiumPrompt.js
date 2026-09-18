import React from 'react';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PremiumPrompt = ({ 
  featureName, 
  description, 
  icon,
  inline = false,
  className = '' 
}) => {
  const navigate = useNavigate();

  if (inline) {
    // Inline version for small spaces
    return (
      <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg ${className}`}>
        <div className="flex items-center">
          <Lock className="w-4 h-4 text-yellow-600 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Premium Feature
          </span>
        </div>
        <button
          onClick={() => navigate('/premium')}
          className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center"
        >
          Upgrade
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    );
  }

  // Full version for modal/page overlays
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-2xl p-8 text-center ${className}`}
    >
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Crown className="w-16 h-16 text-yellow-500" />
          <Lock className="w-6 h-6 text-yellow-600 absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1" />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Premium Feature
      </h3>

      {featureName && (
        <div className="flex items-center justify-center mb-3">
          {icon && <span className="text-3xl mr-2">{icon}</span>}
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {featureName}
          </p>
        </div>
      )}

      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}

      <div className="space-y-3">
        <button
          onClick={() => navigate('/premium')}
          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
        >
          <Crown className="w-5 h-5 mr-2" />
          Upgrade to Premium
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Starting at <span className="font-bold text-gray-900 dark:text-white">$5/week</span> or{' '}
          <span className="font-bold text-gray-900 dark:text-white">$15/month</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PremiumPrompt;
