import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, MapPin, Package, Image as ImageIcon, Camera } from 'lucide-react';

/**
 * AddItemModal - Modal for adding/editing inventory items
 * Includes all new fields: bought date, price, store, expiration, etc.
 */
const AddItemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  item = null,
  locations = {},
  categories = []
}) => {
  const [formData, setFormData] = useState({
    item_name: '',
    storage_location: 'pantry',
    custom_location_id: null,
    category: '',
    quantity: 1,
    unit: '',
    bought_date: new Date().toISOString().split('T')[0],
    opened_date: null,
    is_opened: false,
    manual_expiry_date: null,
    barcode: '',
    image_url: '',
    price: '',
    store: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        storage_location: item.storage_location || 'pantry',
        custom_location_id: item.custom_location_id || null,
        category: item.category || '',
        quantity: item.current_quantity || 1,
        unit: item.unit || '',
        bought_date: item.bought_date || new Date().toISOString().split('T')[0],
        opened_date: item.opened_date || null,
        is_opened: item.is_opened || false,
        manual_expiry_date: item.manual_expiry_date || null,
        barcode: item.barcode || '',
        image_url: item.image_url || '',
        price: item.price || '',
        store: item.store || '',
        notes: item.notes || ''
      });
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  if (!isOpen) return null;

  const defaultCategories = [
    'Dairy & Eggs',
    'Meat & Seafood',
    'Produce',
    'Bakery & Bread',
    'Canned & Jarred',
    'Grains & Pasta',
    'Spices & Seasonings',
    'Snacks & Sweets',
    'Beverages',
    'Condiments & Sauces',
    'Frozen Foods',
    'Leftovers',
    'Other'
  ];

  const units = ['', 'lbs', 'oz', 'kg', 'g', 'cups', 'tbsp', 'tsp', 'ml', 'L', 'count', 'pieces'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {item ? 'Edit Item' : 'Add Item to Inventory'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              placeholder="e.g., Milk, Eggs, Bread"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.item_name && (
              <p className="mt-1 text-sm text-red-600">{errors.item_name}</p>
            )}
          </div>

          {/* Storage Location & Category Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Storage Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Storage Location
              </label>
              <select
                name="storage_location"
                value={formData.storage_location}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="pantry">🥫 Pantry</option>
                <option value="fridge">🧊 Fridge</option>
                <option value="freezer">❄️ Freezer</option>
                {locations.custom?.map(loc => (
                  <option key={loc.id} value={`custom_${loc.id}`}>
                    {loc.icon} {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select category...</option>
                {defaultCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Unit Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="0.1"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit || 'Select unit...'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bought Date & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Bought Date
              </label>
              <input
                type="date"
                name="bought_date"
                value={formData.bought_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <DollarSign size={16} />
                Price
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Store */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <MapPin size={16} />
              Store
            </label>
            <input
              type="text"
              name="store"
              value={formData.store}
              onChange={handleChange}
              placeholder="e.g., Walmart, Target, Kroger"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Expiration Date (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              name="manual_expiry_date"
              value={formData.manual_expiry_date || ''}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave blank to auto-calculate based on item type and storage location
            </p>
          </div>

          {/* Is Opened Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_opened"
              checked={formData.is_opened}
              onChange={handleChange}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Package size={16} />
              Item is already opened
            </label>
          </div>

          {/* Opened Date (if opened) */}
          {formData.is_opened && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Opened Date
              </label>
              <input
                type="date"
                name="opened_date"
                value={formData.opened_date || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Any additional notes..."
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {item ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
