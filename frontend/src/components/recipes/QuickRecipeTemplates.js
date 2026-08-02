import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChefHat, Clock, Users } from 'lucide-react';

/**
 * QuickRecipeTemplates - Pre-made common recipes for quick adding
 * Features:
 * - Popular recipe templates
 * - One-click add to collection
 * - Category filtering
 * - Visual recipe cards
 */

const RECIPE_TEMPLATES = [
  // Breakfast
  {
    name: 'Scrambled Eggs',
    category: 'breakfast',
    difficulty: 'easy',
    prep_time: 5,
    cook_time: 5,
    servings: 2,
    cuisine: 'American',
    description: 'Classic scrambled eggs',
    ingredients: ['eggs', 'butter', 'milk', 'salt', 'pepper']
  },
  {
    name: 'Pancakes',
    category: 'breakfast',
    difficulty: 'easy',
    prep_time: 10,
    cook_time: 15,
    servings: 4,
    cuisine: 'American',
    description: 'Fluffy homemade pancakes',
    ingredients: ['flour', 'eggs', 'milk', 'sugar', 'baking powder', 'butter']
  },
  
  // Lunch
  {
    name: 'Grilled Cheese',
    category: 'lunch',
    difficulty: 'easy',
    prep_time: 5,
    cook_time: 10,
    servings: 1,
    cuisine: 'American',
    description: 'Classic grilled cheese sandwich',
    ingredients: ['bread', 'cheese', 'butter']
  },
  {
    name: 'BLT Sandwich',
    category: 'lunch',
    difficulty: 'easy',
    prep_time: 10,
    cook_time: 10,
    servings: 1,
    cuisine: 'American',
    description: 'Bacon, lettuce, and tomato sandwich',
    ingredients: ['bread', 'bacon', 'lettuce', 'tomato', 'mayonnaise']
  },
  
  // Dinner
  {
    name: 'Mac and Cheese',
    category: 'dinner',
    difficulty: 'easy',
    prep_time: 10,
    cook_time: 20,
    servings: 4,
    cuisine: 'American',
    description: 'Creamy homemade mac and cheese',
    ingredients: ['macaroni', 'cheese', 'milk', 'butter', 'flour']
  },
  {
    name: 'Spaghetti',
    category: 'dinner',
    difficulty: 'easy',
    prep_time: 10,
    cook_time: 25,
    servings: 4,
    cuisine: 'Italian',
    description: 'Classic spaghetti with marinara',
    ingredients: ['spaghetti', 'tomato sauce', 'ground beef', 'onion', 'garlic', 'olive oil']
  },
  {
    name: 'Chili',
    category: 'dinner',
    difficulty: 'medium',
    prep_time: 15,
    cook_time: 45,
    servings: 6,
    cuisine: 'American',
    description: 'Hearty beef chili',
    ingredients: ['ground beef', 'kidney beans', 'tomatoes', 'onion', 'chili powder', 'cumin']
  },
  {
    name: 'Hamburger Helper',
    category: 'dinner',
    difficulty: 'easy',
    prep_time: 5,
    cook_time: 20,
    servings: 4,
    cuisine: 'American',
    description: 'Quick and easy hamburger helper',
    ingredients: ['ground beef', 'pasta', 'milk', 'cheese', 'seasoning mix']
  },
  {
    name: 'Tacos',
    category: 'dinner',
    difficulty: 'easy',
    prep_time: 15,
    cook_time: 15,
    servings: 4,
    cuisine: 'Mexican',
    description: 'Classic beef tacos',
    ingredients: ['ground beef', 'taco shells', 'lettuce', 'tomato', 'cheese', 'sour cream', 'taco seasoning']
  },
  {
    name: 'Chicken Stir Fry',
    category: 'dinner',
    difficulty: 'medium',
    prep_time: 15,
    cook_time: 15,
    servings: 4,
    cuisine: 'Asian',
    description: 'Quick chicken and vegetable stir fry',
    ingredients: ['chicken breast', 'mixed vegetables', 'soy sauce', 'garlic', 'ginger', 'rice']
  },
  {
    name: 'Quesadillas',
    category: 'dinner',
    difficulty: 'easy',
    prep_time: 10,
    cook_time: 10,
    servings: 2,
    cuisine: 'Mexican',
    description: 'Cheese quesadillas',
    ingredients: ['tortillas', 'cheese', 'butter']
  },
  
  // Desserts
  {
    name: 'Chocolate Chip Cookies',
    category: 'dessert',
    difficulty: 'easy',
    prep_time: 15,
    cook_time: 12,
    servings: 24,
    cuisine: 'American',
    description: 'Classic chocolate chip cookies',
    ingredients: ['flour', 'butter', 'sugar', 'brown sugar', 'eggs', 'vanilla', 'chocolate chips']
  },
  {
    name: 'Brownies',
    category: 'dessert',
    difficulty: 'easy',
    prep_time: 15,
    cook_time: 25,
    servings: 12,
    cuisine: 'American',
    description: 'Fudgy chocolate brownies',
    ingredients: ['flour', 'cocoa powder', 'butter', 'sugar', 'eggs', 'vanilla']
  }
];

const QuickRecipeTemplates = ({ onAddRecipe, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { value: 'all', label: 'All Recipes', emoji: '🍽️' },
    { value: 'breakfast', label: 'Breakfast', emoji: '🍳' },
    { value: 'lunch', label: 'Lunch', emoji: '🥗' },
    { value: 'dinner', label: 'Dinner', emoji: '🍝' },
    { value: 'dessert', label: 'Dessert', emoji: '🍰' }
  ];

  const filteredTemplates = RECIPE_TEMPLATES.filter(recipe => {
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAddTemplate = (template) => {
    const recipeData = {
      recipe_name: template.name,
      category: template.category,
      difficulty: template.difficulty,
      prep_time: template.prep_time,
      cook_time: template.cook_time,
      servings: template.servings,
      cuisine: template.cuisine,
      description: template.description,
      ingredients: template.ingredients.map(ing => ({
        ingredient_name: ing,
        quantity: null,
        unit: null
      })),
      instructions: []
    };
    onAddRecipe(recipeData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-8 h-8 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Add Recipes</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Recipe Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-500"
                onClick={() => handleAddTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{template.name}</h3>
                  <Plus className="w-5 h-5 text-primary-600" />
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.prep_time + template.cook_time} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {template.servings}
                  </div>
                  <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                    {template.difficulty}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.ingredients.slice(0, 4).map((ing, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded">
                      {ing}
                    </span>
                  ))}
                  {template.ingredients.length > 4 && (
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                      +{template.ingredients.length - 4} more
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No recipes found</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QuickRecipeTemplates;
