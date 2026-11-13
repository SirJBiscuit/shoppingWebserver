import React from 'react';
import { Salad } from 'lucide-react';
import CategoryRecipeLab from '../components/lab/CategoryRecipeLab';

/**
 * MealLab — every recipe you know, cross-referenced against what's actually
 * in your home inventory right now. No category filter = your whole recipe
 * book, sorted by what you can make without shopping.
 */
const MealLab = () => (
  <CategoryRecipeLab
    icon={Salad}
    gradient="from-green-500 to-emerald-600"
    accent="green"
    title="Meal Lab"
    defaultEmoji="🍽️"
    mixingText="Cooking it up…"
    allLabel="All Recipes"
    emptyHint="No recipes yet — create or import one on the Recipes page first."
  />
);

export default MealLab;
