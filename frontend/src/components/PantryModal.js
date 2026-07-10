import React, { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { expirationAPI } from '../services/api';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {item ? 'Edit Pantry Item' : 'Add to Pantry'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

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

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {item ? 'Update Item' : 'Add to Pantry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PantryModal;
