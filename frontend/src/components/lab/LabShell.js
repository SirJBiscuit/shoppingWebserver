import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../Sidebar';
import PageTransition from '../PageTransition';

/**
 * LabShell - shared page chrome for the Homemade Lab family
 * (Spice Lab, Blend/Mix Lab, Meal Lab, Smoothie Lab, Plate...).
 *
 * Gives every lab the same layout language:
 *   - Sidebar + PageTransition wrapper
 *   - Gradient icon header (title + subtitle)
 *   - Optional animated tab strip
 *   - Centered max-width content column
 *
 * Props:
 *   icon       - lucide icon component for the header tile
 *   gradient   - tailwind gradient stops, e.g. 'from-orange-500 to-red-600'
 *   title      - page title
 *   subtitle   - small line under the title
 *   tabs       - [{ id, label, icon, count? }] (omit to hide the strip)
 *   activeTab  - current tab id
 *   onTabChange- (id) => void
 *   accent     - tailwind color name for the active tab (default 'primary')
 *   maxWidth   - tailwind max-w-* class (default 'max-w-6xl')
 *   headerAction - optional node rendered at the right of the header
 */
const LabShell = ({
  icon: Icon,
  gradient = 'from-primary-500 to-purple-600',
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  accent = 'primary',
  maxWidth = 'max-w-6xl',
  headerAction,
  children,
}) => {
  const accentBg = {
    primary: 'bg-primary-600',
    orange: 'bg-orange-500',
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    pink: 'bg-pink-500',
    teal: 'bg-teal-500',
  }[accent] || 'bg-primary-600';

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="lg:ml-72">
          <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mr-4 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                  )}
                </div>
              </div>
              {headerAction}
            </div>

            {/* Tab strip */}
            {tabs?.length > 0 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTabChange?.(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                      activeTab === t.id
                        ? `${accentBg} text-white shadow-lg`
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {t.icon && <t.icon className="w-4 h-4" />}
                    {t.label}
                    {t.count != null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === t.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default LabShell;
