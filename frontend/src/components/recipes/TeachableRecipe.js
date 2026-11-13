import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, ArrowLeft, Check, Plus, Trash2, GraduationCap,
  ChefHat, ShoppingBasket, ListOrdered, ClipboardCheck,
} from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';

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

// "2 cups flour" -> { item_name: 'flour', quantity: 2, unit: 'cups' }
const parseIngredientLine = (line) => {
  const t = line.trim();
  if (!t) return null;
  const m = t.match(/^([\d./]+)\s+(\S+)\s+(.*)$/);
  if (m) {
    let q = m[1];
    if (q.includes('/')) {
      const [n, d] = q.split('/');
      q = parseFloat(n) / parseFloat(d);
    } else {
      q = parseFloat(q);
    }
    if (!isNaN(q)) return { item_name: m[3].trim(), quantity: q, unit: m[2] };
  }
  const m2 = t.match(/^([\d./]+)\s+(.*)$/);
  if (m2) {
    let q = m2[1];
    if (q.includes('/')) {
      const [n, d] = q.split('/');
      q = parseFloat(n) / parseFloat(d);
    } else {
      q = parseFloat(q);
    }
    if (!isNaN(q)) return { item_name: m2[2].trim(), quantity: q, unit: '' };
  }
  return { item_name: t, quantity: null, unit: '' };
};

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
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0); setName(''); setDescription('');
      setIngredients([]); setIngredientLine('');
      setSteps([]); setStepLine('');
      setServings(''); setPrepTime(''); setCookTime('');
    }
  }, [isOpen]);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  if (!isOpen) return null;

  const addIngredient = () => {
    const parsed = parseIngredientLine(ingredientLine);
    if (!parsed) return;
    setIngredients((prev) => [...prev, { ...parsed, is_optional: false, is_pantry_staple: false, notes: '' }]);
    setIngredientLine('');
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
      servings: parseInt(servings, 10) || null,
      prep_time: parseInt(prepTime, 10) || null,
      cook_time: parseInt(cookTime, 10) || null,
      instructions: steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      image_url: '',
      ingredients,
    });
    onClose();
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
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={ingredientLine}
                      onChange={(e) => setIngredientLine(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
                      placeholder='e.g. "2 cups flour" — press Enter to add'
                      className="input-field flex-1"
                    />
                    <button onClick={addIngredient} className="btn-primary px-3" title="Add ingredient">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Type each ingredient as one line: amount, unit, name. Enter = next.</p>
                  {ingredients.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/60 rounded-lg text-sm">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{ing.quantity ?? ''} {ing.unit}</span>
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
                      <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prep min</label>
                      <input type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cook min</label>
                      <input type="number" min="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="input-field" />
                    </div>
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
