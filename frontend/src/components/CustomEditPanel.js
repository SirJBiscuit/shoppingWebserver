import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, DollarSign, Package, Tag, FileText, Sparkles, TrendingUp, Clock } from 'lucide-react';
import CustomNumberPad from './CustomNumberPad';
import CustomDropdownList from './CustomDropdownList';
import IconPicker from './IconPicker';
import ItemIcon from './ItemIcon';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import { canonicalizeCategory } from '../utils/categoryDetector';
import { Portal } from '../utils/autoPlacement';

/**
 * CustomEditPanel - Modern, animated item editing panel
 * 
 * Features:
 * - Smooth framer-motion animations
 * - Inline stepper for quantity
 * - CustomNumberPad overlay for price
 * - CustomDropdownList for unit & category
 * - Icon picker integration
 * - Real-time validation
 * - Beautiful gradient backgrounds
 * - Responsive design
 * - Dark mode support
 */
const CustomEditPanel = ({ item, isOpen, onClose, onSave, anchor }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 1,
    unit: '',
    price: '',
    category: '',
    item_icon: '',
    notes: ''
  });

  const [showPriceKeypad, setShowPriceKeypad] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        price: item.price || '',
        category: canonicalizeCategory(item.category_name || item.category || ''),
        item_icon: item.item_icon || '',
        notes: item.notes || ''
      });
    }
    // Always reset sub-menus so a reopen never shows a stale keypad/picker
    setShowPriceKeypad(false);
    setPriceInput('');
    setShowIconPicker(false);
    setErrors({});
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

  // Canonical categories — values match the categories table so items
  // join correctly for icons + shopping order
  const categoryOptions = [
    { value: '', label: 'Select Category', disabled: true },
    { value: 'header2', label: '🛒 Food', isHeader: true },
    { value: 'Produce', label: '🥬 Produce' },
    { value: 'Meat & Seafood', label: '🥩 Meat & Seafood' },
    { value: 'Dairy & Eggs', label: '🥛 Dairy & Eggs' },
    { value: 'Bakery', label: '🍞 Bakery & Bread' },
    { value: 'Frozen', label: '❄️ Frozen Foods' },
    { value: 'Breakfast', label: '🍳 Breakfast' },
    { value: 'Pantry Staples', label: '🥫 Pantry Staples' },
    { value: 'Snacks', label: '🍿 Snacks & Treats' },
    { value: 'Beverages', label: '🥤 Beverages & Drinks' },
    { value: 'Condiments & Sauces', label: '🧂 Condiments & Sauces' },
    { value: 'header3', label: '🏠 Non-Food', isHeader: true },
    { value: 'Household', label: '� Household' },
    { value: 'Personal Care', label: '🧴 Personal Care' },
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

  // Anchor-aware placement: appear next to the clicked edit button when
  // coordinates arrive; centered otherwise. Desktop only — the panel is
  // nearly full-width on mobile so anchoring buys nothing there.
  const anchorPos = (() => {
    if (!anchor || window.innerWidth < 768) return null;
    const M = 8;
    const W = Math.min(672, window.innerWidth - M * 2);
    const H = Math.min(window.innerHeight * 0.9, 720);
    const left = Math.min(Math.max(anchor.cx - W / 2, M), window.innerWidth - W - M);
    if (anchor.bottom + 8 + H <= window.innerHeight - M) {
      return { left, top: anchor.bottom + 8, width: W };
    }
    if (anchor.top - 8 - H >= M) {
      // Pin the bottom edge so the panel hugs the button at any height
      return { left, bottom: window.innerHeight - anchor.top + 8, width: W };
    }
    return { left, top: M, width: W };
  })();

  if (!isOpen) return null;

  return (
    <Portal>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          style={anchorPos ? { position: 'fixed', left: anchorPos.left, top: anchorPos.top, bottom: anchorPos.bottom, width: anchorPos.width } : undefined}
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
            autoHide={false}
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
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 dark:hover:border-primary-400 transition-all bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.span
                      key={formData.item_icon || 'none'}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="text-3xl flex-shrink-0"
                    >
                      <ItemIcon icon={formData.item_icon} emojiClass="text-3xl" imgClass="w-10 h-10 rounded-lg object-cover" />
                    </motion.span>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formData.item_icon ? 'Icon selected' : 'Choose an icon'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        Tap to browse the icon library
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors flex-shrink-0">
                    {formData.item_icon ? 'Change' : 'Browse'}
                  </span>
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
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFormData({ ...formData, quantity: Math.max(1, (parseInt(formData.quantity) || 1) - 1) })}
                      className="w-11 h-11 flex-shrink-0 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xl font-bold hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
                      aria-label="Decrease quantity"
                    >
                      −
                    </motion.button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800 text-gray-900 dark:text-white font-semibold text-lg text-center outline-none focus:border-primary-500 dark:focus:border-primary-400"
                    />
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFormData({ ...formData, quantity: (parseInt(formData.quantity) || 0) + 1 })}
                      className="w-11 h-11 flex-shrink-0 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xl font-bold hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
                      aria-label="Increase quantity"
                    >
                      +
                    </motion.button>
                  </div>
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
                    setPriceInput(String(formData.price ?? ''));
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

        {/* Number Pad for Price — rendered in its own fixed overlay so it
            never shifts the modal panel behind the sidebar */}
        {showPriceKeypad && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowPriceKeypad(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <CustomNumberPad
                value={priceInput}
                onChange={setPriceInput}
                onSave={() => {
                  setFormData({ ...formData, price: priceInput });
                  setShowPriceKeypad(false);
                }}
                onCancel={() => setShowPriceKeypad(false)}
              />
            </div>
          </div>
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
    </Portal>
  );
};

export default CustomEditPanel;
