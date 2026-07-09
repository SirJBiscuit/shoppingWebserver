import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import IconPicker from './IconPicker';

const EditItemModal = ({ item, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 1,
    unit: '',
    price: '',
    category: '',
    item_icon: '',
    notes: ''
  });
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        price: item.price || '',
        category: item.category || '',
        item_icon: item.item_icon || '',
        notes: item.notes || ''
      });
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...item, ...formData });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Item</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icon
              </label>
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
              >
                {formData.item_icon ? (
                  <span className="text-4xl">{formData.item_icon}</span>
                ) : (
                  <span className="text-gray-400">Click to choose icon</span>
                )}
              </button>
            </div>

            {/* Item Name */}
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
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="input-field"
                >
                  <option value="">None</option>
                  <option value="oz">oz (ounces)</option>
                  <option value="lb">lb (pounds)</option>
                  <option value="g">g (grams)</option>
                  <option value="kg">kg (kilograms)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="L">L (liters)</option>
                  <option value="pt">pt (pints)</option>
                  <option value="qt">qt (quarts)</option>
                  <option value="gal">gal (gallons)</option>
                  <option value="ct">ct (count)</option>
                  <option value="pkg">pkg (package)</option>
                  <option value="box">box</option>
                  <option value="can">can</option>
                  <option value="bag">bag</option>
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                <option value="">Select Category</option>
                <option value="Produce">🥬 Produce</option>
                <option value="Dairy">🥛 Dairy & Eggs</option>
                <option value="Meat">🥩 Meat & Seafood</option>
                <option value="Bakery">🍞 Bakery</option>
                <option value="Pantry">🥫 Pantry Staples</option>
                <option value="Frozen">❄️ Frozen</option>
                <option value="Beverages">🥤 Beverages</option>
                <option value="Snacks">🍿 Snacks</option>
                <option value="Household">🧹 Household</option>
                <option value="Personal Care">🧴 Personal Care</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field"
                rows="3"
                placeholder="Add any special notes or preferences..."
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary flex items-center justify-center"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Icon Picker Modal */}
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
    </div>
  );
};

export default EditItemModal;
