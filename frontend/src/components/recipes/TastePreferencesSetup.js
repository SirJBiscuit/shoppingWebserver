import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, Settings, Sparkles, X } from 'lucide-react';

/**
 * TastePreferencesSetup - Initial setup wizard for taste learning
 * Features:
 * - Favorite meals input
 * - Cuisine preferences
 * - Dietary restrictions
 * - Learning settings control
 * - Enable/disable recommendations
 */

const CUISINES = [
  { name: 'Italian', emoji: '🇮🇹' },
  { name: 'Mexican', emoji: '🇲🇽' },
  { name: 'Chinese', emoji: '🇨🇳' },
  { name: 'Japanese', emoji: '🇯🇵' },
  { name: 'Indian', emoji: '🇮🇳' },
  { name: 'Thai', emoji: '🇹🇭' },
  { name: 'American', emoji: '🇺🇸' },
  { name: 'French', emoji: '🇫🇷' },
  { name: 'Greek', emoji: '🇬🇷' },
  { name: 'Korean', emoji: '🇰🇷' },
  { name: 'Vietnamese', emoji: '🇻🇳' },
  { name: 'Mediterranean', emoji: '🌊' }
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Halal',
  'Kosher'
];

const TastePreferencesSetup = ({ onSave, onSkip, existingPreferences = null }) => {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    favoriteMeals: existingPreferences?.favoriteMeals || [],
    favoriteCuisines: existingPreferences?.favoriteCuisines || [],
    dislikedCuisines: existingPreferences?.dislikedCuisines || [],
    dietaryRestrictions: existingPreferences?.dietaryRestrictions || [],
    learningEnabled: existingPreferences?.learningEnabled ?? true,
    showRecommendations: existingPreferences?.showRecommendations ?? true,
    autoImportEnabled: existingPreferences?.autoImportEnabled ?? false,
    preferredDifficulty: existingPreferences?.preferredDifficulty || 'any',
    maxCookTime: existingPreferences?.maxCookTime || 60
  });

  const [currentMeal, setCurrentMeal] = useState('');

  const handleAddMeal = () => {
    if (currentMeal.trim() && !preferences.favoriteMeals.includes(currentMeal.trim())) {
      setPreferences({
        ...preferences,
        favoriteMeals: [...preferences.favoriteMeals, currentMeal.trim()]
      });
      setCurrentMeal('');
    }
  };

  const handleRemoveMeal = (meal) => {
    setPreferences({
      ...preferences,
      favoriteMeals: preferences.favoriteMeals.filter(m => m !== meal)
    });
  };

  const toggleCuisine = (cuisine, type = 'favorite') => {
    const key = type === 'favorite' ? 'favoriteCuisines' : 'dislikedCuisines';
    const otherKey = type === 'favorite' ? 'dislikedCuisines' : 'favoriteCuisines';
    
    if (preferences[key].includes(cuisine)) {
      setPreferences({
        ...preferences,
        [key]: preferences[key].filter(c => c !== cuisine)
      });
    } else {
      setPreferences({
        ...preferences,
        [key]: [...preferences[key], cuisine],
        [otherKey]: preferences[otherKey].filter(c => c !== cuisine)
      });
    }
  };

  const toggleRestriction = (restriction) => {
    if (preferences.dietaryRestrictions.includes(restriction)) {
      setPreferences({
        ...preferences,
        dietaryRestrictions: preferences.dietaryRestrictions.filter(r => r !== restriction)
      });
    } else {
      setPreferences({
        ...preferences,
        dietaryRestrictions: [...preferences.dietaryRestrictions, restriction]
      });
    }
  };

  const handleSave = () => {
    onSave(preferences);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {step === 1 && 'Your Favorite Meals'}
                {step === 2 && 'Cuisine Preferences'}
                {step === 3 && 'Dietary Preferences'}
                {step === 4 && 'Learning Settings'}
              </h2>
            </div>
            <button onClick={onSkip} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Favorite Meals */}
          {step === 1 && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tell us about your favorite meals! This helps us recommend recipes you'll love.
              </p>
              
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentMeal}
                    onChange={(e) => setCurrentMeal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddMeal()}
                    placeholder="e.g., Spaghetti Carbonara, Chicken Tacos..."
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddMeal}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {preferences.favoriteMeals.map((meal, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    <span>{meal}</span>
                    <button
                      onClick={() => handleRemoveMeal(meal)}
                      className="hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </div>

              {preferences.favoriteMeals.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Add your favorite meals to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Cuisine Preferences */}
          {step === 2 && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Which cuisines do you love? Which ones aren't your favorite?
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CUISINES.map((cuisine) => {
                  const isFavorite = preferences.favoriteCuisines.includes(cuisine.name);
                  const isDisliked = preferences.dislikedCuisines.includes(cuisine.name);
                  
                  return (
                    <div key={cuisine.name} className="relative">
                      <button
                        onClick={() => toggleCuisine(cuisine.name, 'favorite')}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                          isFavorite
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : isDisliked
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 opacity-50'
                            : 'border-gray-200 dark:border-gray-600 hover:border-primary-500'
                        }`}
                      >
                        <div className="text-3xl mb-2">{cuisine.emoji}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{cuisine.name}</div>
                      </button>
                      <button
                        onClick={() => toggleCuisine(cuisine.name, 'dislike')}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Dislike"
                      >
                        <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Dietary Restrictions */}
          {step === 3 && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Do you have any dietary restrictions or preferences?
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DIETARY_RESTRICTIONS.map((restriction) => {
                  const isSelected = preferences.dietaryRestrictions.includes(restriction);
                  
                  return (
                    <button
                      key={restriction}
                      onClick={() => toggleRestriction(restriction)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-primary-500'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">{restriction}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cooking Preferences</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Difficulty
                    </label>
                    <select
                      value={preferences.preferredDifficulty}
                      onChange={(e) => setPreferences({ ...preferences, preferredDifficulty: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="any">Any Difficulty</option>
                      <option value="easy">Easy Only</option>
                      <option value="medium">Easy & Medium</option>
                      <option value="hard">All Levels</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Cook Time: {preferences.maxCookTime} minutes
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="180"
                      step="15"
                      value={preferences.maxCookTime}
                      onChange={(e) => setPreferences({ ...preferences, maxCookTime: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Learning Settings */}
          {step === 4 && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Control how the system learns your preferences and shows recommendations.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        Smart Learning
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Learn from your cooking habits and ratings to improve recommendations
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.learningEnabled}
                        onChange={(e) => setPreferences({ ...preferences, learningEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Show Recommendations</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Display personalized recipe suggestions based on your tastes
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.showRecommendations}
                        onChange={(e) => setPreferences({ ...preferences, showRecommendations: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Auto-Import Recipes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Automatically import and format recipes from popular cooking websites
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.autoImportEnabled}
                        onChange={(e) => setPreferences({ ...preferences, autoImportEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 You can change these settings anytime in your profile preferences.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors"
          >
            Skip for now
          </button>
          
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Heart className="w-5 h-5" />
                Save Preferences
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TastePreferencesSetup;
