import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, MapPin, Package, Zap, X } from 'lucide-react';

/**
 * QuickAddItem - Super fast inventory item entry
 * Features:
 * - Minimal fields (item name, location, expiry)
 * - Smart expiry date suggestions
 * - Common items quick select
 * - One-click add
 */

const COMMON_ITEMS = [
  { name: 'Milk', days: 7, location: 'Fridge' },
  { name: 'Bread', days: 5, location: 'Pantry' },
  { name: 'Eggs', days: 21, location: 'Fridge' },
  { name: 'Cheese', days: 14, location: 'Fridge' },
  { name: 'Butter', days: 30, location: 'Fridge' },
  { name: 'Chicken Breast', days: 2, location: 'Fridge' },
  { name: 'Ground Beef', days: 2, location: 'Fridge' },
  { name: 'Lettuce', days: 5, location: 'Fridge' },
  { name: 'Tomatoes', days: 7, location: 'Fridge' },
  { name: 'Onions', days: 14, location: 'Pantry' },
  { name: 'Potatoes', days: 30, location: 'Pantry' },
  { name: 'Rice', days: 365, location: 'Pantry' },
  { name: 'Pasta', days: 365, location: 'Pantry' },
  { name: 'Canned Beans', days: 730, location: 'Pantry' },
  { name: 'Yogurt', days: 14, location: 'Fridge' },
  { name: 'Apples', days: 14, location: 'Fridge' },
  { name: 'Bananas', days: 5, location: 'Counter' },
  { name: 'Carrots', days: 21, location: 'Fridge' },
  { name: 'Bacon', days: 7, location: 'Fridge' },
  { name: 'Sour Cream', days: 14, location: 'Fridge' }
];

const QuickAddItem = ({ onAdd, onClose, locations = [] }) => {
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [showCommonItems, setShowCommonItems] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const calculateExpiryDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleQuickAdd = (item) => {
    const itemData = {
      item_name: item.name,
      location: item.location,
      estimated_expiry_date: calculateExpiryDate(item.days),
      quantity: 1
    };
    onAdd(itemData);
  };

  const handleCustomAdd = () => {
    if (!itemName.trim()) return;
    
    const itemData = {
      item_name: itemName,
      location: location || 'Pantry',
      estimated_expiry_date: calculateExpiryDate(expiryDays),
      quantity: 1
    };
    onAdd(itemData);
    
    // Reset form
    setItemName('');
    setLocation('');
    setExpiryDays(7);
  };

  const filteredCommonItems = COMMON_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expiryPresets = [
    { label: '2 days', days: 2 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
    { label: '3 months', days: 90 },
    { label: '1 year', days: 365 }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Add Items</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Custom Add Form */}
          <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Custom Item
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Item Name
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Milk"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomAdd()}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select location...</option>
                  <option value="Fridge">Fridge</option>
                  <option value="Freezer">Freezer</option>
                  <option value="Pantry">Pantry</option>
                  <option value="Counter">Counter</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expires In
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {expiryPresets.map(preset => (
                    <option key={preset.days} value={preset.days}>{preset.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCustomAdd}
              disabled={!itemName.trim()}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>

          {/* Common Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Common Items - One Click Add
              </h3>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-64"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredCommonItems.map((item, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleQuickAdd(item)}
                  className="p-4 bg-white dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {item.name}
                    </span>
                    <Plus className="w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.days < 30 ? `${item.days} days` : item.days < 365 ? `${Math.floor(item.days / 30)} months` : `${Math.floor(item.days / 365)} year`}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {filteredCommonItems.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No items found</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default QuickAddItem;
