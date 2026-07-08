import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const RecipeModal = ({ isOpen, onClose, onSave, recipe = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    servings: '',
    prep_time: '',
    cook_time: '',
    instructions: '',
    image_url: ''
  });
  
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    item_name: '',
    quantity: '',
    unit: '',
    is_optional: false,
    notes: ''
  });

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        servings: recipe.servings || '',
        prep_time: recipe.prep_time || '',
        cook_time: recipe.cook_time || '',
        instructions: recipe.instructions || '',
        image_url: recipe.image_url || ''
      });
      setIngredients(recipe.ingredients || []);
    } else {
      // Reset form
      setFormData({
        name: '',
        description: '',
        servings: '',
        prep_time: '',
        cook_time: '',
        instructions: '',
        image_url: ''
      });
      setIngredients([]);
    }
  }, [recipe, isOpen]);

  const handleAddIngredient = () => {
    if (newIngredient.item_name && newIngredient.quantity) {
      setIngredients([...ingredients, { ...newIngredient }]);
      setNewIngredient({
        item_name: '',
        quantity: '',
        unit: '',
        is_optional: false,
        notes: ''
      });
    }
  };

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      servings: parseInt(formData.servings) || null,
      prep_time: parseInt(formData.prep_time) || null,
      cook_time: parseInt(formData.cook_time) || null,
      ingredients
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {recipe ? 'Edit Recipe' : 'Create New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipe Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Servings
                </label>
                <input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className="input-field"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prep Time (min)
                </label>
                <input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cook Time (min)
                </label>
                <input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className="input-field"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="input-field"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source URL (e.g., Food Network, AllRecipes)
              </label>
              <input
                type="url"
                value={formData.source_url || ''}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                className="input-field"
                placeholder="https://www.foodnetwork.com/..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Link to the original recipe source
              </p>
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
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ing.quantity} {ing.unit} {ing.item_name}
                      </span>
                      {ing.is_optional && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(optional)</span>
                      )}
                      {ing.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ing.notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient Form */}
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={newIngredient.item_name}
                onChange={(e) => setNewIngredient({ ...newIngredient, item_name: e.target.value })}
                className="input-field col-span-4"
              />
              <input
                type="number"
                placeholder="Qty"
                value={newIngredient.quantity}
                onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                className="input-field col-span-2"
                step="0.1"
              />
              <input
                type="text"
                placeholder="Unit"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="input-field col-span-2"
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newIngredient.notes}
                onChange={(e) => setNewIngredient({ ...newIngredient, notes: e.target.value })}
                className="input-field col-span-3"
              />
              <button
                type="button"
                onClick={handleAddIngredient}
                className="btn-primary col-span-1 flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <label className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={newIngredient.is_optional}
                onChange={(e) => setNewIngredient({ ...newIngredient, is_optional: e.target.checked })}
                className="mr-2"
              />
              Mark as optional
            </label>
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
      </div>
    </div>
  );
};

export default RecipeModal;
