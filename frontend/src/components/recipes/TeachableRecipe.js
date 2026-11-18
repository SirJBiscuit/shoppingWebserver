import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, ArrowLeft, Check, Plus, Trash2, GraduationCap,
  ChefHat, ShoppingBasket, ListOrdered, ClipboardCheck, Thermometer,
} from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';
import { getAutocompleteSuggestions } from '../../utils/autocomplete';

/**
 * TeachableRecipe — step-by-step "teach me your recipe" wizard.
 * Rapid entry: each stage is a single input; Enter adds a line and keeps
 * focus so a recipe can be dictated quickly. Final step reviews and saves.
 * Emits the same payload shape as RecipeModal's onSave.
 */

const STEPS = [
  { id: 'name', title: 'What is it?', icon: ChefHat },
  { id: 'ingredients', title: 'What goes in?', icon: ShoppingBasket },
  { id: 'steps', title: 'How do you make it?', icon: ListOrdered },
  { id: 'meta', title: 'Final details', icon: ClipboardCheck },
];

// Unicode fraction chars users may type or tap via the quick chips.
const UNICODE_FRACTIONS = {
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

// Convert a raw quantity string into { value, display }.
// display is the user's text verbatim — "1/2", "1 1/2", "0.5", "2-3", "½".
const parseQuantityText = (raw) => {
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
  `^(\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*-\\s*\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+|\\d+\\s*${UNI_CHARS.length ? `[${UNI_CHARS}]` : ''}|\\d*\\.?\\d+[${UNI_CHARS}]?|[${UNI_CHARS}]|\\d+\\s*-\\s*\\d+)(\\s+)(.*)$`,
  'u'
);

// "1/2 tsp salt" -> { item_name: 'salt', quantity: 0.5, quantity_display: '1/2', unit: 'tsp' }
// "0.5 cup flour" -> quantity stays decimal, display keeps "0.5".
// "salt to taste" -> quantity null, whole line is the name.
const parseIngredientLine = (line) => {
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
        return { item_name: unitM[2].trim(), quantity: qty.value, quantity_display: qty.display, unit: unitM[1] };
      }
      return { item_name: rest, quantity: qty.value, quantity_display: qty.display, unit: '' };
    }
  }
  return { item_name: t, quantity: null, quantity_display: null, unit: '' };
};

// Split a partially-typed line into { prefix, namePart } for autocomplete —
// prefix keeps "2 cups " intact, namePart is what the user is still typing.
const splitForSuggestion = (line) => {
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
const parseMinutesText = (text) => {
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
const parseServingsText = (text) => {
  const s = (text || '').trim();
  if (!s) return null;
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Math.round((parseInt(range[1], 10) + parseInt(range[2], 10)) / 2);
  const n = s.match(/\d+/);
  return n ? parseInt(n[0], 10) : null;
};

const FRACTION_CHIPS = ['¼', '½', '¾', '⅓', '⅔'];
const UNIT_CHIPS = ['tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'ml', 'pinch', 'clove', 'can'];

const TeachableRecipe = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [ingredientLine, setIngredientLine] = useState('');
  const [steps, setSteps] = useState([]);
  const [stepLine, setStepLine] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [temperature, setTemperature] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0); setName(''); setDescription('');
      setIngredients([]); setIngredientLine('');
      setSteps([]); setStepLine('');
      setServings(''); setPrepTime(''); setCookTime('');
      setTemperature(''); setSuggestions([]);
    }
  }, [isOpen]);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  if (!isOpen) return null;

  const addIngredient = () => {
    const parsed = parseIngredientLine(ingredientLine);
    if (!parsed) return;
    setIngredients((prev) => [...prev, { ...parsed, is_optional: false, is_pantry_staple: false, notes: '' }]);
    setIngredientLine('');
    setSuggestions([]);
  };

  const addStepLine = () => {
    const t = stepLine.trim();
    if (!t) return;
    setSteps((prev) => [...prev, t]);
    setStepLine('');
  };

  const canNext = step === 0 ? name.trim().length > 0 : true;

  const save = () => {
    onSave({
      name: name.trim(),
      description: description.trim() || '',
      servings: parseServingsText(servings),
      prep_time: parseMinutesText(prepTime),
      cook_time: parseMinutesText(cookTime),
      temperature: temperature.trim() || null,
      instructions: steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      image_url: '',
      ingredients,
    });
    onClose();
  };

  // Insert a quick chip (unit or unicode fraction) at the end of the line.
  const insertChip = (chip) => {
    setIngredientLine((prev) => {
      const base = prev.replace(/\s+$/, '');
      return base ? `${base} ${chip} ` : `${chip} `;
    });
    inputRef.current?.focus();
  };

  // Autocomplete: suggest on the trailing ingredient-name portion only.
  const updateIngredientLine = (value) => {
    setIngredientLine(value);
    const { namePart } = splitForSuggestion(value);
    setSuggestions(namePart.length >= 2 ? getAutocompleteSuggestions(namePart) : []);
  };

  const pickSuggestion = (s) => {
    const { prefix } = splitForSuggestion(ingredientLine);
    setIngredientLine(`${prefix}${s}`);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const CurrentIcon = STEPS[step].icon;

  return (
    <Portal><div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header w/ progress */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              <h2 className="text-lg font-bold">Teach a Recipe</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < step ? 'bg-white/90 text-indigo-700' : i === step ? 'bg-white text-indigo-700 ring-2 ring-white/60' : 'bg-white/25 text-white/70'
                  }`}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </button>
                {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 rounded ${i < step ? 'bg-white/80' : 'bg-white/25'}`} />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-2 text-sm text-indigo-100 flex items-center gap-1.5">
            <CurrentIcon className="w-4 h-4" /> {STEPS[step].title}
          </p>
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.18 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipe name *</label>
                    <input
                      ref={inputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canNext && setStep(1)}
                      placeholder="Grandma's Pancakes"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">One-line description (optional)</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canNext && setStep(1)}
                      placeholder="Fluffy weekend pancakes with crispy edges"
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        value={ingredientLine}
                        onChange={(e) => updateIngredientLine(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (suggestions.length > 0) {
                              pickSuggestion(suggestions[0]);
                            } else {
                              addIngredient();
                            }
                          }
                          if (e.key === 'Escape') setSuggestions([]);
                        }}
                        placeholder='e.g. "1/2 tsp salt" or "0.5 cup flour" — Enter to add'
                        className="input-field flex-1"
                      />
                      <button onClick={addIngredient} className="btn-primary px-3" title="Add ingredient">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Autocomplete dropdown — completes the ingredient name only */}
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => pickSuggestion(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Free-form amounts: <span className="font-mono">1/2</span>, <span className="font-mono">1 1/2</span>, <span className="font-mono">0.5</span>, or <span className="font-mono">2-3</span> — shown back exactly as typed.
                  </p>
                  {/* Quick-format chips — tap to append a fraction or unit */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {FRACTION_CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => insertChip(c)}
                        className="px-2 py-1 text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                      >
                        {c}
                      </button>
                    ))}
                    <span className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
                    {UNIT_CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => insertChip(c)}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  {ingredients.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/60 rounded-lg text-sm">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{ing.quantity_display ?? ing.quantity ?? ''} {ing.unit}</span>
                          <span className="flex-1 text-gray-800 dark:text-gray-200">{ing.item_name}</span>
                          <button onClick={() => setIngredients((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={stepLine}
                      onChange={(e) => setStepLine(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStepLine(); } }}
                      placeholder='e.g. "Whisk flour and eggs until smooth" — Enter to add'
                      className="input-field flex-1"
                    />
                    <button onClick={addStepLine} className="btn-primary px-3" title="Add step">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">One step per line — they auto-number.</p>
                  {steps.length > 0 && (
                    <ol className="mt-3 space-y-1.5">
                      {steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-700/60 rounded-lg text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="flex-1 text-gray-800 dark:text-gray-200">{s}</span>
                          <button onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Servings</label>
                      <input type="text" placeholder="4" value={servings} onChange={(e) => setServings(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prep time</label>
                      <input type="text" placeholder="15 min" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cook time</label>
                      <input type="text" placeholder="1 hour" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5" /> Temperature (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 350°F, 180°C, Gas mark 4"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Type naturally — "1 hour", "1h 30m", "45 min", "half hour" all convert to minutes.
                    </p>
                  </div>

                  {/* Review card */}
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                    <p className="font-bold text-gray-900 dark:text-white">{name}</p>
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-2">
                      {ingredients.length} ingredient{ingredients.length === 1 ? '' : 's'} · {steps.length} step{steps.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 && ingredients.length === 0 && (
            <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600">skip</button>
          )}
          {step === 2 && steps.length === 0 && (
            <button onClick={() => setStep(3)} className="text-xs text-gray-400 hover:text-gray-600">skip</button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={save}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Save Recipe
            </button>
          )}
        </div>
      </motion.div>
    </div></Portal>
    );
};

export default TeachableRecipe;
