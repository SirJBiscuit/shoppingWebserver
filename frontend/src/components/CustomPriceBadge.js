import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, DollarSign, AlertCircle } from 'lucide-react';
import { customTheme } from '../utils/customTheme';

/**
 * CustomPriceBadge - 3D animated price indicator with MDL integration
 * 
 * Features:
 * - Shows current price with trend indicator
 * - Compares to MDL average price
 * - Animated price changes
 * - 3D badge with depth and shadows
 * - Color-coded: green (lower), red (higher), gray (same)
 * - Compact and non-intrusive
 * - Hover to see details
 * - Smooth transitions
 * 
 * Props:
 * - currentPrice: Current item price
 * - previousPrice: Last recorded price (optional)
 * - mdlAveragePrice: MDL average price (optional)
 * - mdlConfidence: MDL confidence level 0-1 (optional)
 * - showDetails: Show detailed breakdown on hover
 * - compact: Ultra-compact mode
 * - animated: Enable animations
 */
const CustomPriceBadge = ({
  currentPrice = 0,
  previousPrice = null,
  mdlAveragePrice = null,
  mdlConfidence = 0,
  showDetails = true,
  compact = false,
  animated = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [priceChange, setPriceChange] = useState(null);
  const [trend, setTrend] = useState('neutral'); // 'up', 'down', 'neutral'

  // Calculate price change and trend
  useEffect(() => {
    const comparePrice = mdlAveragePrice || previousPrice;
    
    if (comparePrice && currentPrice > 0) {
      const change = currentPrice - comparePrice;
      const percentChange = (change / comparePrice) * 100;
      
      setPriceChange({
        amount: change,
        percent: percentChange,
        comparePrice: comparePrice
      });

      // Determine trend
      if (Math.abs(percentChange) < 2) {
        setTrend('neutral');
      } else if (change > 0) {
        setTrend('up');
      } else {
        setTrend('down');
      }
    } else {
      setPriceChange(null);
      setTrend('neutral');
    }
  }, [currentPrice, previousPrice, mdlAveragePrice]);

  // Get trend colors and icon
  const getTrendConfig = () => {
    switch (trend) {
      case 'up':
        return {
          gradient: 'from-red-500 to-red-600',
          glow: 'shadow-red-500/50',
          icon: TrendingUp,
          label: 'Higher',
          textColor: 'text-red-100',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50'
        };
      case 'down':
        return {
          gradient: 'from-green-500 to-green-600',
          glow: 'shadow-green-500/50',
          icon: TrendingDown,
          label: 'Lower',
          textColor: 'text-green-100',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/50'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          glow: 'shadow-gray-500/50',
          icon: Minus,
          label: 'Normal',
          textColor: 'text-gray-100',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/50'
        };
    }
  };

  const config = getTrendConfig();
  const TrendIcon = config.icon;

  // Format price
  const formatPrice = (price) => {
    return price ? `$${price.toFixed(2)}` : '$0.00';
  };

  // Format percent
  const formatPercent = (percent) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  if (currentPrice === 0) return null;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Main Badge */}
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={animated ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`
          relative
          ${compact ? 'px-2 py-1' : 'px-3 py-2'}
          rounded-xl
          bg-gradient-to-br ${config.gradient}
          shadow-lg ${config.glow}
          cursor-pointer
          transition-all duration-300
          ${isHovered ? 'scale-110 shadow-2xl' : ''}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isHovered ? 'translateZ(10px)' : 'translateZ(0px)'
        }}
      >
        {/* 3D Depth Layer */}
        <div 
          className="absolute inset-0 rounded-xl bg-black/20 -z-10"
          style={{
            transform: 'translateZ(-4px)',
            filter: 'blur(2px)'
          }}
        />

        {/* Content */}
        <div className="flex items-center gap-2">
          {/* Trend Icon */}
          <motion.div
            animate={animated ? {
              rotate: trend === 'up' ? [0, -10, 0] : trend === 'down' ? [0, 10, 0] : 0,
              scale: isHovered ? 1.2 : 1
            } : {}}
            transition={{ duration: 0.3 }}
          >
            <TrendIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
          </motion.div>

          {/* Price */}
          <div className="flex flex-col">
            <motion.span
              key={currentPrice}
              initial={animated ? { y: -10, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-white leading-none`}
            >
              {formatPrice(currentPrice)}
            </motion.span>
            
            {/* Change indicator (compact mode) */}
            {!compact && priceChange && (
              <motion.span
                initial={animated ? { y: 10, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                className="text-[10px] text-white/80 leading-none mt-0.5"
              >
                {formatPercent(priceChange.percent)}
              </motion.span>
            )}
          </div>
        </div>

        {/* Pulse animation for significant changes */}
        {animated && Math.abs(priceChange?.percent || 0) > 15 && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-white/20"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      {/* Hover Details Tooltip */}
      <AnimatePresence>
        {isHovered && showDetails && priceChange && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`
              absolute top-full left-1/2 -translate-x-1/2 mt-2
              bg-white dark:bg-gray-800
              border-2 ${config.borderColor}
              rounded-xl shadow-2xl
              p-3 min-w-[200px]
              z-50
            `}
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateZ(20px)'
            }}
          >
            {/* Arrow */}
            <div 
              className={`
                absolute -top-2 left-1/2 -translate-x-1/2
                w-4 h-4 rotate-45
                bg-white dark:bg-gray-800
                border-l-2 border-t-2 ${config.borderColor}
              `}
            />

            {/* Content */}
            <div className="relative space-y-2">
              {/* Current Price */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Current:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(currentPrice)}
                </span>
              </div>

              {/* Comparison Price */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {mdlAveragePrice ? 'Average:' : 'Previous:'}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {formatPrice(priceChange.comparePrice)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Change */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Change:</span>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-bold ${
                    trend === 'up' ? 'text-red-600 dark:text-red-400' :
                    trend === 'down' ? 'text-green-600 dark:text-green-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {priceChange.amount > 0 ? '+' : ''}{formatPrice(Math.abs(priceChange.amount))}
                  </span>
                  <span className={`text-xs ${
                    trend === 'up' ? 'text-red-500' :
                    trend === 'down' ? 'text-green-500' :
                    'text-gray-500'
                  }`}>
                    ({formatPercent(priceChange.percent)})
                  </span>
                </div>
              </div>

              {/* MDL Confidence */}
              {mdlAveragePrice && mdlConfidence > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Confidence:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${mdlConfidence * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {Math.round(mdlConfidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Trend Label */}
              <div className={`
                text-center text-xs font-medium py-1 px-2 rounded-lg
                ${config.bgColor} ${config.textColor}
              `}>
                {trend === 'up' ? '📈 Higher than usual' :
                 trend === 'down' ? '📉 Lower than usual' :
                 '➡️ Normal price'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomPriceBadge;
