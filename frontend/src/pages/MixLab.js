import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import CategoryRecipeLab from '../components/lab/CategoryRecipeLab';

const MIX_ICONS = {
  'Classic Basil Pesto': '',
  'Tzatziki': '',
  'Guacamole': '',
  'Hummus': '',
  'Ranch Dressing': '',
  'Chimichurri': '',
  'Pico de Gallo': '',
  'Honey Mustard': '',
};

/**
 * MixLab  preset mix/blend recipes cross-referenced with home inventory.
 * All logic lives in CategoryRecipeLab; data seeds from migration 061.
 */
const MixLab = () => (
  <CategoryRecipeLab
    category="mix"
    icon={UtensilsCrossed}
    gradient="from-amber-500 to-orange-600"
    accent="orange"
    title="Mix & Blend Lab"
    iconMap={MIX_ICONS}
    defaultEmoji=""
    mixingText="Mixing it up"
    allLabel="Mix Recipes"
    emptyHint="Preset mixes arrive with migration 061  or import a recipe tagged 'mix'."
  />
);

export default MixLab;
