import React from 'react';
import { Wheat } from 'lucide-react';
import CategoryRecipeLab from '../components/lab/CategoryRecipeLab';

const DOUGH_ICONS = {
  'Classic Pizza Dough': '🍕',
  'Soft Sandwich Bread': '🍞',
  'Flaky Pie Crust': '🥧',
  'Buttermilk Biscuits': '🥐',
  'Soft Pretzel Dough': '🥨',
  'Cinnamon Roll Dough': '🌀',
};

/**
 * DoughLab — preset dough recipes cross-referenced with home inventory.
 * Recipe data seeds from migration 068; all logic lives in CategoryRecipeLab.
 */
const DoughLab = () => (
  <CategoryRecipeLab
    category="dough"
    icon={Wheat}
    gradient="from-amber-500 to-yellow-600"
    accent="orange"
    title="Dough Lab"
    iconMap={DOUGH_ICONS}
    defaultEmoji="🥖"
    mixingText="Kneading it out…"
    allLabel="Doughs"
    emptyHint="Preset doughs arrive with migration 068 — or tag a recipe 'dough'."
  />
);

export default DoughLab;
