import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlaskConical, Flame, UtensilsCrossed, Salad, CupSoda, Pizza, ArrowRight,
  Citrus, Wheat,
} from 'lucide-react';
import LabShell from '../components/lab/LabShell';
import CustomContextMenu from '../components/CustomContextMenu';
import { useFeatureFlags } from '../context/FeatureFlagContext';

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
    path: '/lab/meal',
    ready: true,
  },
  {
    id: 'smoothie',
    name: 'Smoothie Lab',
    icon: CupSoda,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Smoothie recipes generated from your available fruit and extras.',
    path: '/lab/smoothie',
    ready: true,
  },
  {
    id: 'jam',
    name: 'Jam Lab',
    icon: Citrus,
    gradient: 'from-rose-500 to-pink-600',
    description: 'Jams, butters, and freezer preserves from the fruit you have on hand.',
    path: '/lab/jam',
    ready: true,
  },
  {
    id: 'dough',
    name: 'Dough Lab',
    icon: Wheat,
    gradient: 'from-amber-500 to-yellow-600',
    description: 'Pizza, bread, biscuits, pretzels — doughs from pantry staples.',
    path: '/lab/dough',
    ready: true,
  },
  {
    id: 'plate',
    name: 'Plate',
    icon: Pizza,
    gradient: 'from-violet-500 to-purple-600',
    description: 'Balance your plate — food groups, macros, and household tracking.',
    path: '/lab/plate',
    ready: true,
  },
];

const HomemadeLab = () => {
  const navigate = useNavigate();
  const { hasFeature } = useFeatureFlags();

  return (
    <LabShell
      icon={FlaskConical}
      gradient="from-violet-500 to-fuchsia-600"
      title="Homemade Lab"
      subtitle="Make it at home — blends, meals, smoothies, and balanced plates"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LABS.filter((lab) => hasFeature(`lab_${lab.id}`)).map((lab, i) => {
          const Icon = lab.icon;
          const menuItems = [
            { label: `Open ${lab.name}`, icon: lab.icon, onClick: () => navigate(lab.path) },
            { separator: true },
            {
              label: 'Jump to lab',
              icon: FlaskConical,
              submenu: LABS.filter((l) => l.id !== lab.id && l.ready).map((l) => ({
                label: l.name,
                icon: l.icon,
                onClick: () => navigate(l.path),
              })),
            },
          ];
          return (
            <CustomContextMenu
              key={lab.id}
              trigger="both"
              disabled={!lab.ready}
              items={menuItems}
            >
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.16, ease: 'easeOut' }}
              whileHover={lab.ready ? { y: -4, transition: { duration: 0.12 } } : undefined}
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
            </CustomContextMenu>
          );
        })}
      </div>
    </LabShell>
  );
};

export default HomemadeLab;
