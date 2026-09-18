import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ShoppingCart, Trash2 } from 'lucide-react';

const MealCalendar = ({ meals = [], onAddMeal, onRemoveMeal, onGenerateShoppingList }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

  const getDaysInWeek = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start on Sunday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMealsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return meals.filter(meal => meal.date === dateStr);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDays = getDaysInWeek(currentDate);
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2 text-primary-600" />
            Meal Calendar
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Month
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onGenerateShoppingList}
            className="btn-primary flex items-center ml-4"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Generate List
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`text-center p-3 rounded-lg ${
                  isToday(day)
                    ? 'bg-primary-100 dark:bg-primary-900'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className={`text-xs font-medium ${
                  isToday(day)
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${
                  isToday(day)
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Meal Rows */}
          {mealTypes.map((mealType) => (
            <div key={mealType} className="mb-4">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2">
                {mealType}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, dayIndex) => {
                  const dayMeals = getMealsForDate(day).filter(m => m.type === mealType);
                  return (
                    <div
                      key={dayIndex}
                      className="min-h-[100px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 transition-colors"
                    >
                      {dayMeals.length > 0 ? (
                        <div className="space-y-2">
                          {dayMeals.map((meal) => (
                            <div
                              key={meal.id}
                              className="group relative p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {meal.recipe_name}
                                  </p>
                                  {meal.servings && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {meal.servings} servings
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => onRemoveMeal(meal.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddMeal(day, mealType)}
                          className="w-full h-full flex items-center justify-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">This Week's Meals</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {meals.length} planned
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Unique Recipes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(meals.map(m => m.recipe_name)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealCalendar;
