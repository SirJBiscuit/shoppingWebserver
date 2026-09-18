import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, ShoppingCart, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MealPlanner = ({ recipes, onGenerateList }) => {
  const [weekPlan, setWeekPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: 'Monday', emoji: '🌙' },
    { key: 'tuesday', label: 'Tuesday', emoji: '🔥' },
    { key: 'wednesday', label: 'Wednesday', emoji: '🌊' },
    { key: 'thursday', label: 'Thursday', emoji: '⚡' },
    { key: 'friday', label: 'Friday', emoji: '🎉' },
    { key: 'saturday', label: 'Saturday', emoji: '🌟' },
    { key: 'sunday', label: 'Sunday', emoji: '☀️' },
  ];

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Initialize empty week plan
  useEffect(() => {
    const initialPlan = {};
    daysOfWeek.forEach(day => {
      initialPlan[day.key] = {
        breakfast: null,
        lunch: null,
        dinner: null,
        snack: null,
      };
    });
    setWeekPlan(initialPlan);
  }, []);

  const addRecipeToDay = (day, mealType, recipe) => {
    setWeekPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe,
      },
    }));
    setShowRecipeSelector(false);
    setSelectedDay(null);
  };

  const removeRecipeFromDay = (day, mealType) => {
    setWeekPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: null,
      },
    }));
  };

  const generateShoppingList = () => {
    const allIngredients = [];
    
    Object.values(weekPlan).forEach(dayMeals => {
      Object.values(dayMeals).forEach(recipe => {
        if (recipe && recipe.ingredients) {
          allIngredients.push(...recipe.ingredients);
        }
      });
    });

    // Consolidate duplicate ingredients
    const consolidated = allIngredients.reduce((acc, ingredient) => {
      const existing = acc.find(i => 
        i.name.toLowerCase() === ingredient.name.toLowerCase()
      );
      
      if (existing) {
        existing.quantity += ingredient.quantity;
      } else {
        acc.push({ ...ingredient });
      }
      
      return acc;
    }, []);

    onGenerateList(consolidated);
  };

  const getTotalRecipes = () => {
    return Object.values(weekPlan).reduce((total, dayMeals) => {
      return total + Object.values(dayMeals).filter(recipe => recipe !== null).length;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Weekly Meal Plan
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getTotalRecipes()} meals planned this week
            </p>
          </div>
        </div>
        
        {getTotalRecipes() > 0 && (
          <button
            onClick={generateShoppingList}
            className="btn-primary flex items-center"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Generate List
          </button>
        )}
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {daysOfWeek.map(day => (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{day.emoji}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {day.label}
                </h3>
              </div>
            </div>

            {/* Meals */}
            <div className="space-y-2">
              {mealTypes.map(mealType => (
                <div key={mealType} className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {mealType}
                  </div>
                  
                  {weekPlan[day.key]?.[mealType] ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-between p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <ChefHat className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {weekPlan[day.key][mealType].name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeRecipeFromDay(day.key, mealType)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDay({ day: day.key, mealType });
                        setShowRecipeSelector(true);
                      }}
                      className="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recipe Selector Modal */}
      <AnimatePresence>
        {showRecipeSelector && selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRecipeSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Select Recipe for {daysOfWeek.find(d => d.key === selectedDay.day)?.label} - {selectedDay.mealType}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recipes.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => addRecipeToDay(selectedDay.day, selectedDay.mealType, recipe)}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors text-left"
                  >
                    {recipe.image_url && (
                      <img
                        src={recipe.image_url}
                        alt={recipe.name}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {recipe.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {recipe.ingredients?.length || 0} ingredients
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MealPlanner;
