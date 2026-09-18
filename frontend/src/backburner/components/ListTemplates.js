import React, { useState } from 'react';
import { ShoppingCart, Cake, Utensils, Coffee, Heart, Star, Plus, X } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'weekly',
    name: 'Weekly Groceries',
    icon: ShoppingCart,
    color: 'bg-blue-500',
    items: [
      { name: 'Milk', icon: '🥛', category: 'Dairy', quantity: 1, unit: 'gal' },
      { name: 'Bread', icon: '🍞', category: 'Bakery', quantity: 2, unit: 'loaf' },
      { name: 'Eggs', icon: '🥚', category: 'Dairy', quantity: 1, unit: 'dozen' },
      { name: 'Chicken Breast', icon: '🍗', category: 'Meat', quantity: 2, unit: 'lb' },
      { name: 'Bananas', icon: '🍌', category: 'Produce', quantity: 1, unit: 'bunch' },
      { name: 'Apples', icon: '🍎', category: 'Produce', quantity: 6, unit: 'ct' },
      { name: 'Rice', icon: '🍚', category: 'Pantry', quantity: 1, unit: 'bag' },
      { name: 'Pasta', icon: '🍝', category: 'Pantry', quantity: 2, unit: 'box' },
    ]
  },
  {
    id: 'party',
    name: 'Party Supplies',
    icon: Cake,
    color: 'bg-pink-500',
    items: [
      { name: 'Chips', icon: '🥔', category: 'Snacks', quantity: 3, unit: 'bag' },
      { name: 'Soda', icon: '🥤', category: 'Beverages', quantity: 2, unit: 'case' },
      { name: 'Paper Plates', icon: '🍽️', category: 'Paper', quantity: 1, unit: 'pkg' },
      { name: 'Napkins', icon: '🧻', category: 'Paper', quantity: 1, unit: 'pkg' },
      { name: 'Ice Cream', icon: '🍦', category: 'Frozen', quantity: 2, unit: 'tub' },
      { name: 'Cake', icon: '🎂', category: 'Bakery', quantity: 1, unit: 'ct' },
    ]
  },
  {
    id: 'breakfast',
    name: 'Breakfast Essentials',
    icon: Coffee,
    color: 'bg-amber-500',
    items: [
      { name: 'Coffee', icon: '☕', category: 'Beverages', quantity: 1, unit: 'bag' },
      { name: 'Cereal', icon: '🥣', category: 'Breakfast', quantity: 2, unit: 'box' },
      { name: 'Oatmeal', icon: '🥣', category: 'Breakfast', quantity: 1, unit: 'box' },
      { name: 'Bagels', icon: '🥯', category: 'Bakery', quantity: 1, unit: 'bag' },
      { name: 'Orange Juice', icon: '🧃', category: 'Beverages', quantity: 1, unit: 'jug' },
      { name: 'Yogurt', icon: '🥛', category: 'Dairy', quantity: 6, unit: 'ct' },
    ]
  },
  {
    id: 'dinner',
    name: 'Dinner Tonight',
    icon: Utensils,
    color: 'bg-green-500',
    items: [
      { name: 'Ground Beef', icon: '🥩', category: 'Meat', quantity: 1, unit: 'lb' },
      { name: 'Pasta Sauce', icon: '🥫', category: 'Canned', quantity: 1, unit: 'jar' },
      { name: 'Spaghetti', icon: '🍝', category: 'Pantry', quantity: 1, unit: 'box' },
      { name: 'Garlic', icon: '🧄', category: 'Produce', quantity: 1, unit: 'bulb' },
      { name: 'Parmesan Cheese', icon: '🧀', category: 'Dairy', quantity: 1, unit: 'ct' },
      { name: 'Salad Mix', icon: '🥗', category: 'Produce', quantity: 1, unit: 'bag' },
    ]
  },
  {
    id: 'healthy',
    name: 'Healthy Living',
    icon: Heart,
    color: 'bg-red-500',
    items: [
      { name: 'Spinach', icon: '🥬', category: 'Produce', quantity: 1, unit: 'bag' },
      { name: 'Quinoa', icon: '🍚', category: 'Pantry', quantity: 1, unit: 'bag' },
      { name: 'Salmon', icon: '🐟', category: 'Seafood', quantity: 2, unit: 'fillet' },
      { name: 'Avocados', icon: '🥑', category: 'Produce', quantity: 4, unit: 'ct' },
      { name: 'Greek Yogurt', icon: '🥛', category: 'Dairy', quantity: 4, unit: 'ct' },
      { name: 'Almonds', icon: '🥜', category: 'Snacks', quantity: 1, unit: 'bag' },
    ]
  }
];

const ListTemplates = ({ onSelectTemplate, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.items);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">List Templates</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Choose a template to quickly add common items to your list
          </p>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate?.id === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`${template.color} p-3 rounded-lg text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{template.items.length} items</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {template.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <span className="mr-2">{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        +{template.items.length - 3} more...
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedTemplate ? `${selectedTemplate.items.length} items will be added` : 'Select a template'}
            </p>
            <div className="flex space-x-3">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListTemplates;
