import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, DollarSign, Package, Tag, FileText, Sparkles, TrendingUp, Clock } from 'lucide-react';
import CustomNumberPad from './CustomNumberPad';
import CustomKeypad from './CustomKeypad';
import CustomDropdownList from './CustomDropdownList';
import IconPicker from './IconPicker';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';

/**
 * CustomEditPanel - Modern, animated item editing panel
 * 
 * Features:
 * - Smooth framer-motion animations
 * - CustomNumberPad for quantity
 * - CustomKeypad for price
 * - CustomDropdownList for unit & category
 * - Icon picker integration
 * - Real-time validation
 * - Beautiful gradient backgrounds
 * - Responsive design
 * - Dark mode support
 */
const CustomEditPanel = ({ item, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 1,
    unit: '',
    price: '',
    category: '',
    item_icon: '',
    notes: ''
  });

  const [showNumberPad, setShowNumberPad] = useState(false);
  const [showPriceKeypad, setShowPriceKeypad] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        price: item.price || '',
        category: item.category_name || item.category || '',
        item_icon: item.item_icon || '',
        notes: item.notes || ''
      });
    }
  }, [item]);

  const unitOptions = [
    { value: '', label: 'None' },
    { value: 'oz', label: 'oz (ounces)' },
    { value: 'lb', label: 'lb (pounds)' },
    { value: 'g', label: 'g (grams)' },
    { value: 'kg', label: 'kg (kilograms)' },
    { value: 'ml', label: 'ml (milliliters)' },
    { value: 'L', label: 'L (liters)' },
    { value: 'pt', label: 'pt (pints)' },
    { value: 'qt', label: 'qt (quarts)' },
    { value: 'gal', label: 'gal (gallons)' },
    { value: 'ct', label: 'ct (count)' },
    { value: 'pkg', label: 'pkg (package)' },
    { value: 'box', label: 'box' },
    { value: 'can', label: 'can' },
    { value: 'bag', label: 'bag' },
  ];

  const categoryOptions = [
    { value: '', label: 'Select Category', disabled: true },
    { value: 'header1', label: '🍽️ Meal Categories', isHeader: true },
    { value: 'Breakfast', label: '🍳 Breakfast' },
    { value: 'Lunch', label: '🥪 Lunch / Work' },
    { value: 'Dinner', label: '🍽️ Dinner' },
    { value: 'Snacks', label: '🍿 Snacks & Treats' },
    { value: 'header2', label: '🛒 Food Categories', isHeader: true },
    { value: 'Produce', label: '🥬 Produce & Vegetables' },
    { value: 'Fruits', label: '🍎 Fruits' },
    { value: 'Dairy', label: '🥛 Dairy & Eggs' },
    { value: 'Meat', label: '🥩 Meat & Seafood' },
    { value: 'Bakery', label: '🍞 Bakery & Bread' },
    { value: 'Deli', label: '🥪 Deli & Prepared' },
    { value: 'Pantry', label: '🥫 Pantry Staples' },
    { value: 'Canned', label: '🥫 Canned Goods' },
    { value: 'Frozen', label: '❄️ Frozen Foods' },
    { value: 'Beverages', label: '🥤 Beverages & Drinks' },
    { value: 'Condiments', label: '🧂 Condiments & Sauces' },
    { value: 'Spices', label: '🌶️ Spices & Seasonings' },
    { value: 'header3', label: '🏠 Household', isHeader: true },
    { value: 'Cleaning', label: '🧹 Cleaning Supplies' },
    { value: 'Paper', label: '🧻 Paper Products' },
    { value: 'Kitchen', label: '🍴 Kitchen Supplies' },
    { value: 'Laundry', label: '🧺 Laundry' },
    { value: 'Storage', label: '📦 Storage & Organization' },
    { value: 'header4', label: '🧴 Personal Care', isHeader: true },
    { value: 'Bathroom', label: '🚿 Bathroom Supplies' },
    { value: 'Personal Care', label: '🧴 Personal Care' },
    { value: 'Health', label: '💊 Health & Medicine' },
    { value: 'Beauty', label: '💄 Beauty & Cosmetics' },
    { value: 'header5', label: '🐾 Other', isHeader: true },
    { value: 'Pet', label: '🐾 Pet Supplies' },
    { value: 'Baby', label: '👶 Baby & Kids' },
    { value: 'Automotive', label: '🚗 Automotive' },
    { value: 'Garden', label: '🌱 Garden & Outdoor' },
    { value: 'Other', label: '📦 Other' },
  ];

  const validate = () => {
    const newErrors = {};
    
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
    }
    
    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    onSave({ ...item, ...formData });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-r from-primary-500 to-purple-600 p-6 text-white">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold">Edit Item</h2>
                  <p className="text-sm text-white/80">Update item details</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Content with 3D Scrollbar */}
          <AnimatedScrollbar3D
            maxHeight="calc(90vh - 180px)"
            thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
            glowColor="primary"
            autoHide={true}
          >
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Icon Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  Item Icon
                </label>
                <motion.button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 dark:hover:border-primary-400 transition-all bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 flex items-center justify-center group"
                >
                  {formData.item_icon ? (
                    <span className="text-6xl group-hover:scale-110 transition-transform">{formData.item_icon}</span>
                  ) : (
                    <span className="text-gray-400 group-hover:text-primary-500 transition-colors">Click to choose icon</span>
                  )}
                </motion.button>
              </motion.div>

              {/* Item Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-500" />
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.item_name 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all`}
                  placeholder="Enter item name"
                  required
                />
                {errors.item_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.item_name}</p>
                )}
              </motion.div>

              {/* Quantity and Unit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary-500" />
                    Quantity *
                  </label>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setActiveField('quantity');
                      setShowNumberPad(true);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800 text-gray-900 dark:text-white font-semibold text-lg hover:border-primary-500 transition-all"
                  >
                    {formData.quantity}
                  </motion.button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Unit
                  </label>
                  <CustomDropdownList
                    value={formData.unit}
                    onChange={(value) => setFormData({ ...formData, unit: value })}
                    options={unitOptions}
                    placeholder="Select unit"
                    searchable={true}
                  />
                </div>
              </motion.div>

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary-500" />
                  Price
                </label>
                <motion.button
                  type="button"
                  onClick={() => {
                    setActiveField('price');
                    setShowPriceKeypad(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 text-gray-900 dark:text-white font-semibold text-lg hover:border-green-500 transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  {formData.price || '0.00'}
                </motion.button>
              </motion.div>

              {/* Category */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-500" />
                  Category
                </label>
                <CustomDropdownList
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={categoryOptions}
                  placeholder="Select category"
                  searchable={true}
                />
              </motion.div>

              {/* Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                  rows="3"
                  placeholder="Add any special notes or preferences..."
                />
              </motion.div>
            </form>
            </div>
          </AnimatedScrollbar3D>

          {/* Footer Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                onClick={handleSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold hover:from-primary-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Custom Number Pad for Quantity */}
        {showNumberPad && activeField === 'quantity' && (
          <CustomNumberPad
            initialValue={formData.quantity}
            onConfirm={(value) => {
              setFormData({ ...formData, quantity: parseInt(value) || 1 });
              setShowNumberPad(false);
            }}
            onClose={() => setShowNumberPad(false)}
            title="Enter Quantity"
            allowDecimal={false}
            min={1}
          />
        )}

        {/* Custom Keypad for Price */}
        {showPriceKeypad && activeField === 'price' && (
          <CustomKeypad
            initialValue={formData.price}
            onConfirm={(value) => {
              setFormData({ ...formData, price: value });
              setShowPriceKeypad(false);
            }}
            onClose={() => setShowPriceKeypad(false)}
            title="Enter Price"
            mode="price"
          />
        )}

        {/* Icon Picker */}
        {showIconPicker && (
          <IconPicker
            currentIcon={formData.item_icon}
            itemName={formData.item_name}
            onSelect={(icon) => {
              setFormData({ ...formData, item_icon: icon });
              setShowIconPicker(false);
            }}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomEditPanel;
