/**
 * Shared recipe-entry parsers — extracted from TeachableRecipe so the
 * edit/create modal gets the same free-form input features:
 * - "1/2 tsp salt" one-line ingredients (unicode fractions + unit normalize)
 * - "1h 30m" / "half hour" prep & cook times -> minutes
 * - "4", "serves 6", "2-3" -> servings count
 * - "350F" -> "350°F" temperature auto-format
 */

// Unicode fraction chars users may type or tap via the quick chips.
export const UNICODE_FRACTIONS = {
  '¼': '1/4', '½': '1/2', '¾': '3/4',
  '⅐': '1/7', '⅑': '1/9', '⅒': '1/10',
  '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};
const UNI_CHARS = '¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞';
const UNI_RE = new RegExp(`[${UNI_CHARS}]`, 'g');

const fracToDecimal = (n, d) => {
  const den = parseFloat(d);
  return den ? parseFloat(n) / den : null;
};

// Reverse lookup for live auto-format: "1/2" -> "½" as the user types.
// Only common readable glyphs — anything else stays as typed ("1/5" etc.)
// so the amount is never shown in a glyph too small to read.
const DECIMAL_TO_UNI = Object.fromEntries(
  Object.entries(UNICODE_FRACTIONS).map(([u, d]) => [d, u])
);
const FRAC_LIVE_RE = /(\d+)\s*\/\s*(\d+)(?=\s|$)/g;
export const autoFormatFractions = (text) =>
  text.replace(FRAC_LIVE_RE, (m, n, d) => DECIMAL_TO_UNI[`${n}/${d}`] || m);

// Canonical short forms — "tablespoons" -> "tbsp" so saved ingredients
// stay tidy and consistent with the quick chips.
const UNIT_NORMALIZE = {
  teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp',
  cups: 'cup', ounce: 'oz', ounces: 'oz', floz: 'fl oz', 'fl oz': 'fl oz',
  pound: 'lb', pounds: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg',
  milligram: 'mg', milligrams: 'mg', mgs: 'mg',
  milliliter: 'ml', milliliters: 'ml', mls: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l', ls: 'l',
  quart: 'qt', quarts: 'qt', qts: 'qt',
  pint: 'pt', pints: 'pt', pts: 'pt',
  gallon: 'gal', gallons: 'gal',
  package: 'pkg', packages: 'pkg', pack: 'pkg', packs: 'pkg',
  packet: 'pkt', packets: 'pkt',
  cans: 'can', jars: 'jar', bottles: 'bottle',
  cloves: 'clove', pinches: 'pinch', dashes: 'dash',
  slices: 'slice', sticks: 'stick', bunches: 'bunch',
  sprigs: 'sprig', pieces: 'piece', scoops: 'scoop',
  sheets: 'sheet', cubes: 'cube', heads: 'head',
  stalks: 'stalk', ears: 'ear', fillets: 'fillet',
  containers: 'container', servings: 'serving',
  handfuls: 'handful', dozen: 'doz', dozens: 'doz',
};
const normalizeUnit = (u) =>
  UNIT_NORMALIZE[(u || '').toLowerCase().replace(/\./g, '').trim()] || u;

// Temperatures — "350F" / "180c" / "350 deg f" -> "350°F" / "180°C".
// Bare letters only, so words like "for" never match.
export const autoFormatTemperature = (v) =>
  v.replace(/(\d+)\s*(?:°\s*|deg(?:rees?)?\s*)?([fc])\b/gi,
    (m, n, s) => `${n}°${s.toUpperCase()}`);

// Convert a raw quantity string into { value, display }.
// display is the user's text verbatim — "1/2", "1 1/2", "0.5", "2-3", "½".
export const parseQuantityText = (raw) => {
  const display = raw.trim();
  // Normalise unicode fractions to "a/b" so the math works.
  const norm = display.replace(UNI_RE, (c) => ` ${UNICODE_FRACTIONS[c]}`);

  // Mixed number, space- or dash-separated: "1 1/2", "1-1/2"
  const mixed = norm.match(/^(\d+)[\s-]+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const frac = fracToDecimal(mixed[2], mixed[3]);
    return frac === null ? null : { value: parseFloat(mixed[1]) + frac, display };
  }
  // Simple fraction: "1/2"
  const frac = norm.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (frac) {
    const v = fracToDecimal(frac[1], frac[2]);
    return v === null ? null : { value: v, display };
  }
  // Range: "2-3" → store midpoint, keep "2-3" for display
  const range = display.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    return { value: (parseFloat(range[1]) + parseFloat(range[2])) / 2, display };
  }
  // Plain number / decimal
  const v = parseFloat(norm);
  return Number.isFinite(v) ? { value: v, display } : null;
};

// Words that can act as a unit token after a quantity.
const KNOWN_UNIT_RE = /^(tsp|tsps|teaspoons?|tbsp|tbsps|tablespoons?|cups?|oz|ounces?|fl\.?\s?oz|lbs?|pounds?|grams?|g|kg|kilo(?:gram)?s?|mgs?|mls?|ls?|lit(?:er|re)s?|quarts?|qts?|pints?|pts?|gallons?|gal|cloves?|cans?|pkg|packages?|packs?|packets?|pinch(?:es)?|dash(?:es)?|slices?|sticks?|bunch(?:es)?|sprigs?|pieces?|scoops?|sheets?|cubes?|whole|large|medium|small|dozen|doz|heads?|stalks?|ears?|fillets?|jars?|bottles?|containers?|servings?|handfuls?)$/i;

// Regex for a leading quantity token (checked in order, longest first).
const QTY_TOKEN_RE = new RegExp(
  `^(\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*-\\s*\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+\\s*[${UNI_CHARS}]|\\d*\\.?\\d+[${UNI_CHARS}]?|[${UNI_CHARS}]|\\d+\\s*-\\s*\\d+)(\\s+)(.*)$`,
  'u'
);

// "1/2 tsp salt" -> { item_name: 'salt', quantity: 0.5, quantity_display: '1/2', unit: 'tsp' }
// "0.5 cup flour" -> quantity stays decimal, display keeps "0.5".
// "salt to taste" -> quantity null, whole line is the name.
export const parseIngredientLine = (line) => {
  const t = line.trim();
  if (!t) return null;

  const m = t.match(QTY_TOKEN_RE);
  if (m) {
    const qty = parseQuantityText(m[1]);
    if (qty) {
      const rest = m[3].trim();
      if (!rest) {
        return { item_name: t, quantity: qty.value, quantity_display: qty.display, unit: '' };
      }
      const unitM = rest.match(/^(\S+)\s+(.*)$/);
      if (unitM && KNOWN_UNIT_RE.test(unitM[1])) {
        return { item_name: unitM[2].trim(), quantity: qty.value, quantity_display: qty.display, unit: normalizeUnit(unitM[1]) };
      }
      return { item_name: rest, quantity: qty.value, quantity_display: qty.display, unit: '' };
    }
  }
  return { item_name: t, quantity: null, quantity_display: null, unit: '' };
};

// Split a partially-typed line into { prefix, namePart } for autocomplete —
// prefix keeps "2 cups " intact, namePart is what the user is still typing.
export const splitForSuggestion = (line) => {
  const m = line.match(QTY_TOKEN_RE);
  if (!m || parseQuantityText(m[1]) === null) {
    return { prefix: '', namePart: line.trimStart() };
  }
  const after = m[3] || '';
  const unitM = after.match(/^(\S+)(\s+)(.*)$/);
  if (unitM && KNOWN_UNIT_RE.test(unitM[1])) {
    return { prefix: `${m[1]} ${unitM[1]} `, namePart: unitM[3] };
  }
  return { prefix: `${m[1]} `, namePart: after };
};

// "30", "30 min", "1h 30m", "1 hour 20 minutes", "half hour" -> minutes
export const parseMinutesText = (text) => {
  const s = (text || '').trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let matched = false;
  const h = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (h) { total += parseFloat(h[1]) * 60; matched = true; }
  const mn = s.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/);
  if (mn) { total += parseFloat(mn[1]); matched = true; }
  if (!matched && s.includes('half')) { total += 30; matched = true; }
  if (matched) return Math.round(total);
  const bare = s.match(/\d+(?:\.\d+)?/);
  return bare ? Math.round(parseFloat(bare[0])) : null;
};

// "4", "4 people", "serves 6", "2-3" -> servings count
export const parseServingsText = (text) => {
  const s = (text || '').trim();
  if (!s) return null;
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Math.round((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2);
  const n = s.match(/\d+/);
  return n ? parseInt(n[0], 10) : null;
};

// Format a parsed ingredient for display, e.g. "1½ cups flour".
export const formatIngredient = (ing) =>
  `${ing.quantity_display ?? ing.quantity ?? ''} ${ing.unit || ''} ${ing.item_name}`.replace(/\s+/g, ' ').trim();

export const FRACTION_CHIPS = ['¼', '½', '¾', '⅓', '⅔'];
export const UNIT_CHIPS = ['tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'ml', 'pinch', 'clove', 'can'];
