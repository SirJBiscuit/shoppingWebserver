/**
 * Format quantity for display
 * Converts 1.00 -> x1, 2.50 -> x2½, 0.25 -> x¼, etc.
 */

// Common kitchen fractions → unicode glyphs (1/8 resolution is enough
// for food quantities; anything else falls back to 2-decimal display)
const FRACTIONS = [
  [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
  [0.5, '½'],   [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
  [0.2, '⅕'],  [0.4, '⅖'],  [0.6, '⅗'],  [0.8, '⅘'],
  [0.167, '⅙'], [0.833, '⅚']
];

const toFraction = (num) => {
  const whole = Math.floor(num);
  const frac = num - whole;
  if (frac < 0.001) return whole.toString();
  const match = FRACTIONS.find(([v]) => Math.abs(frac - v) < 0.02);
  if (match) return `${whole > 0 ? whole : ''}${match[1]}`;
  return num.toFixed(2).replace(/\.?0+$/, '');
};

export const formatQuantity = (qty) => {
  if (qty === null || qty === undefined || qty === '') return '';

  const num = parseFloat(qty);

  if (isNaN(num)) return qty;

  return `x${toFraction(num)}`;
};

/**
 * Format quantity without the 'x' prefix
 */
export const formatQuantityPlain = (qty) => {
  if (qty === null || qty === undefined || qty === '') return '';

  const num = parseFloat(qty);

  if (isNaN(num)) return qty;

  return toFraction(num);
};
