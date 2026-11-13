import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlaskConical, Flame, UtensilsCrossed, Salad, CupSoda, Pizza, ArrowRight,
} from 'lucide-react';
import LabShell from '../components/lab/LabShell';

/**
 * HomemadeLab - hub for the "make it at home" labs.
 * Each lab uses LabShell + MixingOverlay; new labs slot in as cards here.
 */
const LABS = [
  {
    id: 'spice',
    name: 'Spice Lab',
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    description: 'Track your spice rack, build blends, and get suggestions for any dish.',
    path: '/spices',
    ready: true,
  },
  {
    id: 'mix',
    name: 'Mix & Blend Lab',
    icon: UtensilsCrossed,
    gradient: 'from-amber-500 to-orange-600',
    description: 'Pesto, tzatziki, guac — mixes that cross-reference what you already have.',
    path: '/lab/mix',
    ready: true,
  },
  {
    id: 'meal',
    name: 'Meal Lab',
    icon: Salad,
    gradient: 'from-green-500 to-emerald-600',
    description: 'Build meals from what is in your home inventory right now.',
    path: null,
    ready: false,
  },
  {
    id: 'smoothie',
    name: 'Smoothie Lab',
    icon: CupSoda,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Smoothie recipes generated from your available fruit and extras.',
    path: null,
    ready: false,
  },
  {
    id: 'plate',
    name: 'Plate',
    icon: Pizza,
    gradient: 'from-violet-500 to-purple-600',
    description: 'Balance your plate — food groups, macros, and household tracking.',
    path: null,
    ready: false,
  },
];

const HomemadeLab = () => {
  const navigate = useNavigate();

  return (
    <LabShell
      icon={FlaskConical}
      gradient="from-violet-500 to-fuchsia-600"
      title="Homemade Lab"
      subtitle="Make it at home — blends, meals, smoothies, and balanced plates"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LABS.map((lab, i) => {
          const Icon = lab.icon;
          return (
            <motion.button
              key={lab.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={lab.ready ? { y: -4 } : undefined}
              onClick={() => lab.ready && lab.path && navigate(lab.path)}
              disabled={!lab.ready}
              className={`relative text-left p-5 rounded-2xl border transition-all ${
                lab.ready
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-violet-300 dark:hover:border-violet-600 cursor-pointer'
                  : 'bg-gray-50 dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 opacity-70 cursor-default'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${lab.gradient} flex items-center justify-center mb-3 shadow`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{lab.name}</h3>
                {!lab.ready && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {lab.description}
              </p>
              {lab.ready && (
                <span className="absolute top-4 right-4 text-gray-300 dark:text-gray-600">
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </LabShell>
  );
};

export default HomemadeLab;
