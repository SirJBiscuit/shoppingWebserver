import React, { useState } from 'react';
import { X, BookOpen, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectIcon, detectCategory, CATEGORIES } from '../utils/categoryDetector';

const ItemTrainingModal = ({ isOpen, onClose, itemName, frequency, isAdmin, onSubmit }) => {
  const [formData, setFormData] = useState({
    item_name: itemName,
    category: detectCategory(itemName) || '',
    item_icon: detectIcon(itemName) || '📦',
    preferred_unit: '',
    average_price: '',
    notes: ''
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const commonIcons = [
    '🥛', '🍞', '🥚', '🧀', '🥓', '🍗', '🥩', '🐟', '🍕', '🍔',
    '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🥘', '🍛',
    '🍱', '🍣', '🍤', '🥟', '🍚', '🍙', '🥠', '🍢', '🍡', '🍧',
    '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
    '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '☕', '🍵', '🧃',
    '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉',
    '🍾', '🧊', '🥄', '🍴', '🥢', '🔪', '🏺', '🌍', '🥫', '🍯',
    '🧂', '🧈', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗',
    '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙',
    '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        frequency,
        trained_by: isAdmin ? 'admin' : 'user'
      });
      onClose();
    } catch (error) {
      console.error('Error submitting item training:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Train Item Database</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {isAdmin ? '🔑 Admin Training' : '👤 User Training'} • Used {frequency} times
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className={`p-4 ${isAdmin ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <div className="flex items-start gap-3">
              {isAdmin ? (
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className={`font-semibold ${isAdmin ? 'text-blue-900 dark:text-blue-100' : 'text-amber-900 dark:text-amber-100'}`}>
                  {isAdmin 
                    ? 'Admin Training - Immediate Effect' 
                    : 'User Training - Requires Verification'}
                </p>
                <p className={`mt-1 ${isAdmin ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {isAdmin
                    ? 'Your training will be added immediately and used for all users.'
                    : 'Your suggestion will be reviewed and may be added to the database after verification.'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Item Name
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                required
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Item Icon
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="text-6xl hover:scale-110 transition-transform cursor-pointer"
                >
                  {formData.item_icon}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to change icon
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Auto-detected: {detectIcon(itemName)}
                  </p>
                </div>
              </div>
              
              {showIconPicker && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-10 gap-2">
                    {commonIcons.map((icon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, item_icon: icon });
                          setShowIconPicker(false);
                        }}
                        className="text-3xl hover:scale-125 transition-transform p-2 hover:bg-white dark:hover:bg-gray-600 rounded"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Unit */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Preferred Unit (Optional)
              </label>
              <input
                type="text"
                value={formData.preferred_unit}
                onChange={(e) => setFormData({ ...formData, preferred_unit: e.target.value })}
                placeholder="e.g., lbs, oz, count, gallon"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Average Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Average Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.average_price}
                  onChange={(e) => setFormData({ ...formData, average_price: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information about this item..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5" />
                    {isAdmin ? 'Add to Database' : 'Submit for Review'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ItemTrainingModal;
