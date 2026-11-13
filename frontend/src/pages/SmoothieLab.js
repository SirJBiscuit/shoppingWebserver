import React from 'react';
import { CupSoda } from 'lucide-react';
import CategoryRecipeLab from '../components/lab/CategoryRecipeLab';

const SMOOTHIE_ICONS = {
  'Berry Blast': '🫐',
  'Tropical Sunrise': '🍍',
  'Green Machine': '🥬',
  'Peanut Butter Banana': '🥜',
  'Strawberry Oatmeal': '🍓',
  'Mango Lassi': '🥭',
  'Chocolate Protein Shake': '🍫',
};

/**
 * SmoothieLab — preset smoothie recipes cross-referenced with home inventory.
 * Recipe data seeds from migration 063; all logic lives in CategoryRecipeLab.
 */
const SmoothieLab = () => (
  <CategoryRecipeLab
    category="smoothie"
    icon={CupSoda}
    gradient="from-pink-500 to-rose-600"
    accent="pink"
    title="Smoothie Lab"
    iconMap={SMOOTHIE_ICONS}
    defaultEmoji="🥤"
    mixingText="Blending it up…"
    allLabel="Smoothies"
    emptyHint="Preset smoothies arrive with migration 063 — or tag a recipe 'smoothie'."
  />
);

export default SmoothieLab;
