import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Package } from 'lucide-react';
import { expirationAPI } from '../services/api';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';

const PantryModal = ({ isOpen, onClose, onSave, item = null, categories = [] }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    unit: '',
    category_id: '',
    storage_location: 'pantry',
    expiry_date: '',
    barcode: '',
    image_url: ''
  });
  const [estimatedExpiry, setEstimatedExpiry] = useState(null);
  const [freshnessCheck, setFreshnessCheck] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        quantity: item.quantity || '',
        unit: item.unit || '',
        category_id: item.category_id || '',
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
        barcode: item.barcode || '',
        image_url: item.image_url || ''
      });
    } else {
      setFormData({
        item_name: '',
        quantity: '',
        unit: '',
        category_id: '',
        storage_location: 'pantry',
        expiry_date: '',
        barcode: '',
        image_url: ''
      });
      setEstimatedExpiry(null);
      setFreshnessCheck('');
    }
  }, [item, isOpen]);

  // Auto-estimate expiration when item name changes
  useEffect(() => {
    const estimateExpiration = async () => {
      if (formData.item_name && formData.item_name.length > 2 && !item) {
        try {
          const response = await expirationAPI.getEstimate({
            itemName: formData.item_name,
            storageLocation: formData.storage_location
          });
          setEstimatedExpiry(response.data.estimated_expiry);
          setFreshnessCheck(response.data.freshness_check || '');
          // Auto-fill if no expiry date set
          if (!formData.expiry_date) {
            setFormData(prev => ({ ...prev, expiry_date: response.data.estimated_expiry }));
          }
        } catch (error) {
          console.error('Failed to estimate expiration:', error);
        }
      }
    };

    const debounce = setTimeout(estimateExpiration, 500);
    return () => clearTimeout(debounce);
  }, [formData.item_name, formData.storage_location, item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      quantity: parseFloat(formData.quantity) || 1,
      category_id: formData.category_id || null,
      expiry_date: formData.expiry_date || null
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
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
        >
          {/* Header with Gradient - shared pattern with CustomEditPanel */}
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
                  <Package className="w-6 h-6" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {item ? 'Edit Pantry Item' : 'Add to Pantry'}
                  </h2>
                  <p className="text-sm text-white/80">
                    {item ? 'Update item details' : 'Add a new item to your pantry'}
                  </p>
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

          <AnimatedScrollbar3D
            maxHeight="calc(90vh - 180px)"
            thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
            glowColor="primary"
            autoHide={true}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              className="input-field"
              required
              disabled={!!item}
              placeholder="e.g., Chicken Breast, Milk, Bread"
            />
            {estimatedExpiry && !item && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                <Lightbulb className="w-3 h-3 mr-1" />
                Auto-estimated expiration: {new Date(estimatedExpiry).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input-field"
                step="0.1"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-field"
                placeholder="e.g., lbs, oz, count"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage Location
              </label>
              <select
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                className="input-field"
              >
                <option value="pantry">🏺 Pantry</option>
                <option value="fridge">🧊 Fridge</option>
                <option value="freezer">❄️ Freezer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry Date (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input-field flex-1"
              />
              {formData.expiry_date && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expiry_date: '' })}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty if item doesn't expire
            </p>
            {freshnessCheck && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">💡 Freshness Tip:</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">{freshnessCheck}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Barcode (optional)
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="input-field"
              placeholder="Scan or enter barcode"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="input-field"
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold hover:from-primary-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
            >
              {item ? 'Update Item' : 'Add to Pantry'}
            </motion.button>
          </div>
            </form>
          </AnimatedScrollbar3D>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PantryModal;
