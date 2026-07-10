import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import IconPicker from './IconPicker';
import ItemHistoryWidget from './ItemHistoryWidget';

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
        category: item.category_name || item.category || '',
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
            {/* Item History Widget */}
            {formData.item_name && (
              <ItemHistoryWidget itemName={formData.item_name} />
            )}

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

            {/* Price with Auto-Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, price: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !value.includes('.')) {
                        const formatted = (parseFloat(value) / 100).toFixed(2);
                        setFormData({ ...formData, price: formatted });
                      }
                    }}
                    className="input-field pl-8"
                    placeholder="5.99 or 599"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const value = formData.price;
                    if (value && !value.includes('.')) {
                      const formatted = (parseFloat(value) / 100).toFixed(2);
                      setFormData({ ...formData, price: formatted });
                    }
                  }}
                  className="px-3 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors text-sm font-medium"
                  title="Format as $X.XX"
                >
                  💲
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type 599 → auto-formats to $5.99 on blur, or click 💲
              </p>
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
                <optgroup label="🍽️ Meal Categories">
                  <option value="Breakfast">🍳 Breakfast</option>
                  <option value="Lunch">🥪 Lunch / Work</option>
                  <option value="Dinner">🍽️ Dinner</option>
                  <option value="Snacks">🍿 Snacks & Treats</option>
                </optgroup>
                <optgroup label="🛒 Food Categories">
                  <option value="Produce">🥬 Produce & Vegetables</option>
                  <option value="Fruits">🍎 Fruits</option>
                  <option value="Dairy">🥛 Dairy & Eggs</option>
                  <option value="Meat">🥩 Meat & Seafood</option>
                  <option value="Bakery">🍞 Bakery & Bread</option>
                  <option value="Deli">🥪 Deli & Prepared</option>
                  <option value="Pantry">🥫 Pantry Staples</option>
                  <option value="Canned">🥫 Canned Goods</option>
                  <option value="Frozen">❄️ Frozen Foods</option>
                  <option value="Beverages">🥤 Beverages & Drinks</option>
                  <option value="Condiments">🧂 Condiments & Sauces</option>
                  <option value="Spices">�️ Spices & Seasonings</option>
                </optgroup>
                <optgroup label="🏠 Household">
                  <option value="Cleaning">🧹 Cleaning Supplies</option>
                  <option value="Paper">🧻 Paper Products</option>
                  <option value="Kitchen">🍴 Kitchen Supplies</option>
                  <option value="Laundry">� Laundry</option>
                  <option value="Storage">📦 Storage & Organization</option>
                </optgroup>
                <optgroup label="🧴 Personal Care">
                  <option value="Bathroom">🚿 Bathroom Supplies</option>
                  <option value="Personal Care">🧴 Personal Care</option>
                  <option value="Health">💊 Health & Medicine</option>
                  <option value="Beauty">💄 Beauty & Cosmetics</option>
                </optgroup>
                <optgroup label="🐾 Other">
                  <option value="Pet">🐾 Pet Supplies</option>
                  <option value="Baby">👶 Baby & Kids</option>
                  <option value="Automotive">🚗 Automotive</option>
                  <option value="Garden">🌱 Garden & Outdoor</option>
                  <option value="Other">📦 Other</option>
                </optgroup>
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
