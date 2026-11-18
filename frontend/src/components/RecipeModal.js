import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Sparkles, Link as LinkIcon, Edit2, Smile, ChevronDown, Thermometer } from 'lucide-react';
import recipesAPI from '../services/recipesAPI';
import CustomCheckbox from './ui/CustomCheckbox';
import RecipeIconPicker from './recipes/RecipeIconPicker';
import ModalShell from './ui/ModalShell';
import { detectIcon } from '../utils/categoryDetector';
import { getAutocompleteSuggestions } from '../utils/autocomplete';
import {
  autoFormatFractions, autoFormatTemperature, parseIngredientLine,
  parseMinutesText, parseServingsText, splitForSuggestion,
  FRACTION_CHIPS, UNIT_CHIPS,
} from '../utils/recipeParsers';

// Normalize an ingredient from any stored shape into the editor's shape.
const toEditorIngredient = (ing) => ({
  item_name: ing.item_name || ing.name || '',
  quantity: ing.quantity ?? null,
  quantity_display: ing.quantity_display || (ing.quantity != null ? String(ing.quantity) : null),
  unit: ing.unit || '',
  is_optional: ing.is_optional || false,
  is_pantry_staple: ing.is_pantry_staple || false,
  notes: ing.notes || '',
});

const RecipeModal = ({ isOpen, onClose, onSave, recipe = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    servings: '',
    prep_time: '',
    cook_time: '',
    temperature: '',
    instructions: '',
    image_url: ''
  });

  const [ingredients, setIngredients] = useState([]);
  const [ingredientLine, setIngredientLine] = useState('');
  const [ingredientExtras, setIngredientExtras] = useState({
    is_optional: false,
    is_pantry_staple: false,
    notes: ''
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [importingFromUrl, setImportingFromUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const ingredientRef = useRef(null);

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        servings: recipe.servings != null ? String(recipe.servings) : '',
        prep_time: recipe.prep_time != null ? `${recipe.prep_time} min` : '',
        cook_time: recipe.cook_time != null ? `${recipe.cook_time} min` : '',
        temperature: recipe.temperature || '',
        instructions: recipe.instructions || '',
        image_url: recipe.image_url || ''
      });
      setIngredients((recipe.ingredients || []).map(toEditorIngredient));
    } else {
      // Reset form
      setFormData({
        name: '',
        description: '',
        servings: '',
        prep_time: '',
        cook_time: '',
        temperature: '',
        instructions: '',
        image_url: ''
      });
      setIngredients([]);
    }
    setIngredientLine('');
    setIngredientExtras({ is_optional: false, is_pantry_staple: false, notes: '' });
    setSuggestions([]);
    setEditingIndex(null);
    setImportUrl('');
    setImportError('');
    setShowImport(false);
  }, [recipe, isOpen]);

  // RecipeIconPicker emits 'emoji:X' or an image URL/data URL.
  const handlePickIcon = (value) => {
    setFormData((prev) => ({ ...prev, image_url: value }));
  };

  // Auto icon: guess an emoji from the recipe name using the app's detector.
  const handleAutoIcon = () => {
    if (!formData.name.trim()) return;
    const icon = detectIcon(formData.name) || '🍽️';
    setFormData((prev) => ({ ...prev, image_url: `emoji:${icon}` }));
  };

  const handleImportFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setImportError('Enter a full URL starting with http:// or https://');
      return;
    }

    setImportingFromUrl(true);
    setImportError('');
    try {
      const importedRecipe = await recipesAPI.importFromUrl(url);

      setFormData({
        name: importedRecipe.name || formData.name,
        description: importedRecipe.description || formData.description,
        servings: importedRecipe.servings != null ? String(importedRecipe.servings) : formData.servings,
        prep_time: importedRecipe.prep_time != null ? `${importedRecipe.prep_time} min` : formData.prep_time,
        cook_time: importedRecipe.cook_time != null ? `${importedRecipe.cook_time} min` : formData.cook_time,
        temperature: importedRecipe.temperature || formData.temperature,
        instructions: importedRecipe.instructions || formData.instructions,
        image_url: importedRecipe.image_url || formData.image_url,
        source_url: url
      });

      if (importedRecipe.ingredients && importedRecipe.ingredients.length > 0) {
        setIngredients(importedRecipe.ingredients.map(toEditorIngredient));
      }

      setImportUrl('');
      setShowImport(false);
    } catch (error) {
      console.error('Error importing recipe:', error);
      setImportError('Could not import from that URL. Try Food Network, AllRecipes, or another supported site.');
    } finally {
      setImportingFromUrl(false);
    }
  };

  // Teachable-style one-line ingredient entry: "1/2 tsp salt".
  const handleAddIngredient = () => {
    const parsed = parseIngredientLine(ingredientLine);
    if (!parsed) return;

    const item = { ...parsed, ...ingredientExtras };
    if (editingIndex !== null) {
      const updated = [...ingredients];
      updated[editingIndex] = item;
      setIngredients(updated);
      setEditingIndex(null);
    } else {
      setIngredients([...ingredients, item]);
      // Auto icon on first ingredient if nothing set yet
      if (!formData.image_url && formData.name && ingredients.length === 0) {
        handleAutoIcon();
      }
    }

    setIngredientLine('');
    setIngredientExtras({ is_optional: false, is_pantry_staple: false, notes: '' });
    setSuggestions([]);
  };

  // Rebuild an editable line from a stored ingredient, e.g. "1½ cups flour".
  const handleEditIngredient = (index) => {
    const ing = ingredients[index];
    const qtyUnit = [ing.quantity_display ?? ing.quantity, ing.unit].filter(Boolean).join(' ');
    setIngredientLine([qtyUnit, ing.item_name].filter(Boolean).join(' '));
    setIngredientExtras({
      is_optional: ing.is_optional || false,
      is_pantry_staple: ing.is_pantry_staple || false,
      notes: ing.notes || ''
    });
    setEditingIndex(index);
    ingredientRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setIngredientLine('');
    setIngredientExtras({ is_optional: false, is_pantry_staple: false, notes: '' });
    setEditingIndex(null);
    setSuggestions([]);
  };

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
    if (editingIndex === index) handleCancelEdit();
  };

  // Insert a quick chip (unit or unicode fraction) at the end of the line.
  const insertChip = (chip) => {
    setIngredientLine((prev) => {
      const base = prev.replace(/\s+$/, '');
      return base ? `${base} ${chip} ` : `${chip} `;
    });
    ingredientRef.current?.focus();
  };

  const updateIngredientLine = (value) => {
    const formatted = autoFormatFractions(value);
    setIngredientLine(formatted);
    const { namePart } = splitForSuggestion(formatted);
    setSuggestions(namePart.length >= 2 ? getAutocompleteSuggestions(namePart) : []);
  };

  const pickSuggestion = (s) => {
    const { prefix } = splitForSuggestion(ingredientLine);
    setIngredientLine(`${prefix}${s}`);
    setSuggestions([]);
    ingredientRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const parsedIngredients = ingredients.map((ing) => ({
      item_name: ing.item_name,
      quantity: ing.quantity ?? null,
      unit: ing.unit || '',
      quantity_display: ing.quantity_display || null,
      is_optional: ing.is_optional || false,
      is_pantry_staple: ing.is_pantry_staple || false,
      notes: ing.notes || ''
    }));

    onSave({
      ...formData,
      servings: parseServingsText(formData.servings),
      prep_time: parseMinutesText(formData.prep_time),
      cook_time: parseMinutesText(formData.cook_time),
      temperature: formData.temperature.trim() || null,
      ingredients: parsedIngredients
    });
    onClose();
  };

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={recipe ? 'Edit Recipe' : 'Create New Recipe'}
      maxWidth="max-w-4xl"
      bodyClass="p-0"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            {/* Name + icon preview */}
            <div className="flex gap-4 items-start">
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                title="Choose recipe icon"
                className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-dashed border-primary-300 dark:border-primary-700 flex items-center justify-center overflow-hidden hover:border-primary-500 transition-colors group"
              >
                {formData.image_url ? (
                  formData.image_url.startsWith('emoji:') ? (
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {formData.image_url.replace('emoji:', '')}
                    </span>
                  ) : (
                    <img src={formData.image_url} alt="Recipe" className="w-full h-full object-cover" />
                  )
                ) : (
                  <Smile className="w-7 h-7 text-primary-400" />
                )}
              </button>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Recipe Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Grandma's Pancakes"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="btn-secondary text-sm flex items-center"
                  >
                    <Smile className="w-4 h-4 mr-1.5" />
                    {formData.image_url ? 'Change icon / photo' : 'Pick icon or photo'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoIcon}
                    disabled={!formData.name.trim()}
                    className="btn-secondary text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!formData.name.trim() ? 'Enter a recipe name first' : 'Guess an icon from the name'}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Auto icon
                  </button>
                  {formData.image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-sm text-red-500 hover:text-red-600 px-2"
                      title="Remove icon/photo"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="2"
                placeholder="A short description..."
              />
            </div>

            {/* Teachable-style free-text timing fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Servings</label>
                <input
                  type="text"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className="input-field"
                  placeholder="4"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prep time</label>
                <input
                  type="text"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="input-field"
                  placeholder="15 min"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cook time</label>
                <input
                  type="text"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className="input-field"
                  placeholder="1 hour"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" /> Temp
                </label>
                <input
                  type="text"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: autoFormatTemperature(e.target.value) })}
                  className="input-field"
                  placeholder="350°F"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              Times accept free text — "1h 30m", "half hour", "serves 6". Temp auto-adds the ° symbol.
            </p>

            {/* Import from URL — tucked behind a toggle */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowImport((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Import from a recipe URL
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showImport ? 'rotate-180' : ''}`} />
              </button>
              {showImport && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => { setImportUrl(e.target.value); setImportError(''); }}
                      className="input-field flex-1"
                      placeholder="https://www.foodnetwork.com/recipes/..."
                    />
                    <button
                      type="button"
                      onClick={handleImportFromUrl}
                      disabled={importingFromUrl || !importUrl.trim()}
                      className="btn-primary flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importingFromUrl ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importing...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </button>
                  </div>
                  {importError && (
                    <p className="text-xs text-red-500 mt-2">{importError}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Auto-fills everything — review and adjust after importing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ingredients</h3>
            
            {/* Ingredient List */}
            {ingredients.length > 0 && (
              <div className="space-y-2 mb-4">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      editingIndex === index
                        ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-400'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex-1 flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                        {[ing.quantity_display ?? ing.quantity, ing.unit].filter(Boolean).join(' ') || '—'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {ing.item_name}
                      </span>
                      {ing.is_pantry_staple && (
                        <span className="flex-shrink-0 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">🏠 Staple</span>
                      )}
                      {ing.is_optional && (
                        <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">(optional)</span>
                      )}
                      {ing.notes && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{ing.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleEditIngredient(index)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit ingredient"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient — teachable-style one-liner */}
            <div className="bg-gray-50 dark:bg-gray-700/60 p-4 rounded-xl space-y-3">
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={ingredientRef}
                    type="text"
                    placeholder={editingIndex !== null ? 'Edit ingredient...' : 'e.g. "1/2 tsp salt" or "0.5 cup flour" — Enter to add'}
                    value={ingredientLine}
                    onChange={(e) => updateIngredientLine(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (suggestions.length > 0) {
                          pickSuggestion(suggestions[0]);
                        } else {
                          handleAddIngredient();
                        }
                      }
                      if (e.key === 'Escape') {
                        if (suggestions.length > 0) setSuggestions([]);
                        else if (editingIndex !== null) handleCancelEdit();
                      }
                    }}
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    disabled={!ingredientLine.trim()}
                    className="btn-primary px-4 flex items-center justify-center disabled:opacity-50"
                    title={editingIndex !== null ? 'Update ingredient' : 'Add ingredient'}
                  >
                    {editingIndex !== null ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                {/* Autocomplete — completes the ingredient name only */}
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick-format chips */}
              <div className="flex flex-wrap gap-1">
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

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Note (chopped, room temp…)"
                  value={ingredientExtras.notes}
                  onChange={(e) => setIngredientExtras({ ...ingredientExtras, notes: e.target.value })}
                  className="input-field flex-1 min-w-[10rem]"
                />
                <CustomCheckbox
                  checked={ingredientExtras.is_optional}
                  onChange={(e) => setIngredientExtras({ ...ingredientExtras, is_optional: e.target.checked })}
                  label="Optional"
                />
                <div title="Common pantry items you always have (flour, salt, oil, etc.)">
                  <CustomCheckbox
                    checked={ingredientExtras.is_pantry_staple}
                    onChange={(e) => setIngredientExtras({ ...ingredientExtras, is_pantry_staple: e.target.checked })}
                    label="🏠 Staple"
                  />
                </div>
                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Free-form amounts: <span className="font-mono">1/2</span>, <span className="font-mono">1 1/2</span>, <span className="font-mono">0.5</span>, <span className="font-mono">2-3</span> — shown back exactly as typed.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="input-field"
              rows="6"
              placeholder="Step-by-step instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {recipe ? 'Update Recipe' : 'Create Recipe'}
            </button>
          </div>
      </form>
    </ModalShell>

    {/* Recipe icon/photo picker — emoji presets, URL, or upload */}
    <RecipeIconPicker
      isOpen={showIconPicker}
      onClose={() => setShowIconPicker(false)}
      onPick={handlePickIcon}
      current={formData.image_url}
    />
    </>
  );
};

export default RecipeModal;
