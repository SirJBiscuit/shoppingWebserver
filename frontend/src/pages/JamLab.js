import React from 'react';
import { Citrus } from 'lucide-react';
import CategoryRecipeLab from '../components/lab/CategoryRecipeLab';

const JAM_ICONS = {
  'Classic Strawberry Jam': '🍓',
  'Blueberry Lemon Jam': '🫐',
  'Peach Vanilla Jam': '🍑',
  'Raspberry Jam': '🍇',
  'Apple Butter': '🍎',
  'Quick Freezer Berry Jam': '🧊',
};

/**
 * JamLab — preset jam recipes cross-referenced with home inventory.
 * Recipe data seeds from migration 068; all logic lives in CategoryRecipeLab.
 */
const JamLab = () => (
  <CategoryRecipeLab
    category="jam"
    icon={Citrus}
    gradient="from-rose-500 to-pink-600"
    accent="pink"
    title="Jam Lab"
    iconMap={JAM_ICONS}
    defaultEmoji="🍯"
    mixingText="Simmering it down…"
    allLabel="Jams"
    emptyHint="Preset jams arrive with migration 068 — or tag a recipe 'jam'."
  />
);

export default JamLab;
