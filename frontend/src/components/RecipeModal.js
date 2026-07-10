import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Image as ImageIcon, Sparkles, Link as LinkIcon } from 'lucide-react';
import { imagesAPI, recipesAPI } from '../services/api';

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
    amount: '',
    is_optional: false,
    notes: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [importingFromUrl, setImportingFromUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('image', file);
      formDataToUpload.append('category', 'recipes');

      const response = await imagesAPI.upload(formDataToUpload);
      setFormData({ ...formData, image_url: response.data.url });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) return;

    setImportingFromUrl(true);
    try {
      const response = await recipesAPI.importRecipe(importUrl);
      const importedRecipe = response.data;

      // Auto-fill all fields
      setFormData({
        name: importedRecipe.name || formData.name,
        description: importedRecipe.description || formData.description,
        servings: importedRecipe.servings || formData.servings,
        prep_time: importedRecipe.prep_time || formData.prep_time,
        cook_time: importedRecipe.cook_time || formData.cook_time,
        instructions: importedRecipe.instructions || formData.instructions,
        image_url: importedRecipe.image_url || formData.image_url,
        source_url: importUrl
      });

      // Auto-fill ingredients
      if (importedRecipe.ingredients && importedRecipe.ingredients.length > 0) {
        const formattedIngredients = importedRecipe.ingredients.map(ing => ({
          item_name: ing.item_name || ing.name,
          amount: ing.amount || `${ing.quantity || ''} ${ing.unit || ''}`.trim(),
          is_optional: ing.is_optional || false,
          notes: ing.notes || ''
        }));
        setIngredients(formattedIngredients);
      }

      setImportUrl('');
      alert('Recipe imported successfully! Review and edit as needed.');
    } catch (error) {
      console.error('Error importing recipe:', error);
      alert('Failed to import recipe. Make sure the URL is from a supported site (Food Network, AllRecipes, etc.)');
    } finally {
      setImportingFromUrl(false);
    }
  };

  const handleAutoDetectImage = async () => {
    if (!formData.name) {
      alert('Please enter a recipe name first');
      return;
    }

    setAutoDetecting(true);
    try {
      // Use Unsplash API for food images
      const query = encodeURIComponent(formData.name + ' food');
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1&client_id=your_unsplash_access_key`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setFormData({ ...formData, image_url: data.results[0].urls.regular });
        } else {
          // Fallback: generate a food emoji based on recipe name
          const foodEmojis = {
            'chicken': '🍗', 'beef': '🥩', 'fish': '🐟', 'pasta': '🍝',
            'pizza': '🍕', 'burger': '🍔', 'salad': '🥗', 'soup': '🍲',
            'cake': '🎂', 'cookie': '🍪', 'bread': '🍞', 'rice': '🍚',
            'taco': '🌮', 'sushi': '🍣', 'curry': '🍛', 'sandwich': '🥪'
          };
          
          const recipeLower = formData.name.toLowerCase();
          const emoji = Object.entries(foodEmojis).find(([key]) => 
            recipeLower.includes(key)
          )?.[1] || '🍽️';
          
          // Store emoji as a data URL for display
          setFormData({ ...formData, image_url: `emoji:${emoji}` });
        }
      }
    } catch (error) {
      console.error('Error auto-detecting image:', error);
      // Fallback to emoji
      setFormData({ ...formData, image_url: 'emoji:🍽️' });
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.item_name && newIngredient.amount) {
      setIngredients([...ingredients, { ...newIngredient }]);
      setNewIngredient({
        item_name: '',
        amount: '',
        is_optional: false,
        notes: ''
      });
      
      // Auto-detect image if not set and this is the first ingredient
      if (!formData.image_url && formData.name && ingredients.length === 0) {
        handleAutoDetectImage();
      }
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
                Recipe Image (optional)
              </label>
              
              {/* Image Preview */}
              {formData.image_url && (
                <div className="mb-3 relative">
                  {formData.image_url.startsWith('emoji:') ? (
                    <div className="w-full h-48 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center border-2 border-primary-200 dark:border-primary-700">
                      <span className="text-8xl">{formData.image_url.replace('emoji:', '')}</span>
                    </div>
                  ) : (
                    <img
                      src={formData.image_url}
                      alt="Recipe preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload/Auto-detect Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <label className="btn-secondary cursor-pointer flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </label>

                <button
                  type="button"
                  onClick={handleAutoDetectImage}
                  disabled={autoDetecting || !formData.name}
                  className="btn-secondary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!formData.name ? 'Enter recipe name first' : 'Auto-detect image'}
                >
                  {autoDetecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Auto-Detect
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Upload your own image or let us find one based on the recipe name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Import from Recipe URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="input-field flex-1"
                  placeholder="https://www.foodnetwork.com/recipes/..."
                />
                <button
                  type="button"
                  onClick={handleImportFromUrl}
                  disabled={importingFromUrl || !importUrl}
                  className="btn-primary flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Import recipe from URL"
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste a recipe URL from Food Network, AllRecipes, or other supported sites to auto-fill
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
                        {ing.amount} {ing.item_name}
                      </span>
                      {ing.is_optional && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(optional)</span>
                      )}
                      {ing.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">Note: {ing.notes}</p>
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
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <input
                  type="text"
                  placeholder="Amount (e.g., 2 cups, 1 tbsp, 3 large)"
                  value={newIngredient.amount}
                  onChange={(e) => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                  className="input-field col-span-5"
                />
                <input
                  type="text"
                  placeholder="Ingredient name"
                  value={newIngredient.item_name}
                  onChange={(e) => setNewIngredient({ ...newIngredient, item_name: e.target.value })}
                  className="input-field col-span-5"
                />
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="btn-primary col-span-2 flex items-center justify-center"
                  title="Add ingredient"
                >
                  <Plus className="w-5 h-5 mr-1" />
                  Add
                </button>
              </div>
              
              <div className="grid grid-cols-12 gap-3">
                <input
                  type="text"
                  placeholder="Notes (e.g., 'chopped', 'room temperature')"
                  value={newIngredient.notes}
                  onChange={(e) => setNewIngredient({ ...newIngredient, notes: e.target.value })}
                  className="input-field col-span-10"
                />
                <label className="col-span-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={newIngredient.is_optional}
                    onChange={(e) => setNewIngredient({ ...newIngredient, is_optional: e.target.checked })}
                    className="mr-2"
                  />
                  Optional
                </label>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 <strong>Examples:</strong> "2 cups" flour, "1 tbsp" olive oil, "3 large" eggs, "1 pinch" salt
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
      </div>
    </div>
  );
};

export default RecipeModal;
