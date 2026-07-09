import React, { useState } from 'react';
import { Users, Plus, Minus, Calculator, ArrowRight } from 'lucide-react';

const RecipeScaling = ({ recipe, onScale }) => {
  const [servings, setServings] = useState(recipe.servings || 4);
  const originalServings = recipe.servings || 4;

  const scaleIngredient = (ingredient) => {
    const ratio = servings / originalServings;
    const amount = parseFloat(ingredient.amount) * ratio;
    
    return {
      ...ingredient,
      amount: amount.toFixed(2),
      scaledAmount: amount
    };
  };

  const convertUnit = (amount, fromUnit, toUnit) => {
    // Common conversions
    const conversions = {
      'tsp_to_tbsp': 1/3,
      'tbsp_to_cup': 1/16,
      'cup_to_oz': 8,
      'oz_to_lb': 1/16,
      'ml_to_l': 1/1000,
      'g_to_kg': 1/1000
    };

    // Add conversion logic here
    return amount;
  };

  const handleServingsChange = (newServings) => {
    if (newServings > 0 && newServings <= 100) {
      setServings(newServings);
    }
  };

  const scaledIngredients = recipe.ingredients?.map(scaleIngredient) || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <Calculator className="w-6 h-6 mr-2 text-primary-600" />
          Recipe Scaling
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Original: {originalServings}</span>
        </div>
      </div>

      {/* Servings Adjuster */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-gray-900 dark:text-white">Servings</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleServingsChange(servings - 1)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={servings}
              onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
              className="w-20 text-center text-2xl font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
              min="1"
              max="100"
            />
            <button
              onClick={() => handleServingsChange(servings + 1)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Quick Buttons */}
        <div className="flex space-x-2">
          {[2, 4, 6, 8, 12].map((num) => (
            <button
              key={num}
              onClick={() => setServings(num)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                servings === num
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Scaling Info */}
      {servings !== originalServings && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Scaling by {(servings / originalServings).toFixed(2)}x
            </span>
            <button
              onClick={() => setServings(originalServings)}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
            >
              Reset to original
            </button>
          </div>
        </div>
      )}

      {/* Scaled Ingredients */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Ingredients for {servings} servings:
        </h4>
        <div className="space-y-2">
          {scaledIngredients.map((ingredient, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-3">
                {servings !== originalServings && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="line-through">{ingredient.amount / (servings / originalServings)}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                <span className="font-bold text-gray-900 dark:text-white">
                  {ingredient.amount}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {ingredient.unit}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {ingredient.name}
                </span>
              </div>
              {ingredient.notes && (
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {ingredient.notes}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Batch Cooking Mode */}
      <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
          Batch Cooking Mode
        </h4>
        <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
          Make multiple batches and freeze for later
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((batches) => (
            <button
              key={batches}
              onClick={() => setServings(originalServings * batches)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium"
            >
              {batches}x Batch
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={() => onScale && onScale(scaledIngredients, servings)}
          className="flex-1 btn-primary"
        >
          Add to Shopping List
        </button>
        <button className="btn-secondary">
          Save Scaled Recipe
        </button>
      </div>
    </div>
  );
};

export default RecipeScaling;
