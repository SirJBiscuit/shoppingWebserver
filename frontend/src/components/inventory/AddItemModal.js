import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, MapPin, Package, Image as ImageIcon, Trash2, Lightbulb, Smile } from 'lucide-react';
import { detectLocation, getCategorySuggestions } from '../../utils/smartLocationDetector';
import IconPicker from './IconPicker';
import DateInput from '../DateInput';
import { useDeviceType, getTouchSizes } from '../../hooks/useDeviceType';

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
    quantity: '1',
    unit: '',
    bought_date: new Date().toISOString().split('T')[0],
    opened_date: null,
    is_opened: false,
    sell_by_date: '',
    manual_expiry_date: '',
    calculated_expiry: null,
    auto_expiry: true,
    barcode: '',
    image_url: '',
    icon: '📦',
    price: '',
    store: '',
    notes: '',
    user_shelf_life_estimate: null
  });

  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [locationSuggestion, setLocationSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  
  // Device detection for touch-optimized UI
  const deviceInfo = useDeviceType();
  const touchSizes = getTouchSizes(deviceInfo);

  // Common food icons
  const foodIcons = [
    '🥛', '🧀', '🥚', '🍞', '🥖', '🥐', '🥯', '🥞', '🧇',
    '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🌮',
    '🌯', '🥙', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱',
    '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢',
    '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮',
    '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯',
    '🥛', '☕', '🍵', '🧃', '🧉', '🥤', '🍶', '🍺', '🍻',
    '🍷', '🥂', '🍸', '🍹', '🧊', '🥄', '🍴', '🥢', '🥡',
    '🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
    '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆',
    '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒',
    '🧄', '🧅', '🥔', '🍠', '🥐', '🥨', '🥖', '🍞', '🥯',
    '🥫', '🧂', '🧈', '🥛', '🍯', '🧃', '🧊', '📦', '🎁'
  ];

  // Common units
  const commonUnits = [
    'piece', 'pieces', 'lb', 'lbs', 'oz', 'kg', 'g',
    'gallon', 'quart', 'pint', 'cup', 'tbsp', 'tsp',
    'can', 'jar', 'box', 'bag', 'bottle', 'carton', 'pack'
  ];

  // Auto-detect item information from name
  const detectItemInfo = (itemName) => {
    const name = itemName.toLowerCase();
    let category = '';
    let unit = '';
    let icon = '📦';

    // Category detection
    if (name.match(/milk|cheese|yogurt|butter|cream/)) {
      category = 'Dairy & Eggs';
      icon = '🥛';
      unit = 'gallon';
    } else if (name.match(/bread|bagel|muffin|roll|bun/)) {
      category = 'Bakery & Bread';
      icon = '🍞';
      unit = 'loaf';
    } else if (name.match(/chicken|beef|pork|fish|meat|steak/)) {
      category = 'Meat & Seafood';
      icon = '🍗';
      unit = 'lb';
    } else if (name.match(/apple|banana|orange|grape|berry|fruit/)) {
      category = 'Produce';
      icon = '🍎';
      unit = 'lb';
    } else if (name.match(/lettuce|carrot|broccoli|tomato|vegetable|potato/)) {
      category = 'Produce';
      icon = '🥕';
      unit = 'lb';
    } else if (name.match(/pasta|rice|cereal|oat|grain/)) {
      category = 'Grains & Pasta';
      icon = '🍝';
      unit = 'box';
    } else if (name.match(/soda|juice|water|drink|beverage/)) {
      category = 'Beverages';
      icon = '🥤';
      unit = 'bottle';
    } else if (name.match(/chip|cookie|candy|snack/)) {
      category = 'Snacks & Sweets';
      icon = '🍪';
      unit = 'bag';
    } else if (name.match(/sauce|ketchup|mustard|mayo|dressing/)) {
      category = 'Condiments & Sauces';
      icon = '🧂';
      unit = 'bottle';
    }

    return { category, unit, icon };
  };

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

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // Auto-detect category, unit, and store when item name changes
    if (name === 'item_name' && value) {
      const detected = detectItemInfo(value);
      setFormData(prev => ({
        ...prev,
        item_name: value,
        category: detected.category || prev.category,
        unit: detected.unit || prev.unit,
        icon: detected.icon || prev.icon
      }));
      return;
    }
    
    // Calculate expiry from sell-by date
    if (name === 'sell_by_date' && value) {
      try {
        const response = await fetch('/api/inventory/calculate-expiry-from-sellby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sellByDate: value,
            category: formData.category,
            storageLocation: formData.storage_location
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            sell_by_date: value,
            calculated_expiry: data.estimatedExpiryDate,
            manual_expiry_date: data.estimatedExpiryDate
          }));
          return;
        }
      } catch (error) {
        console.error('Error calculating expiry:', error);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Auto-detect location when item name or category changes
    if (name === 'item_name' || name === 'category') {
      const itemName = name === 'item_name' ? newValue : formData.item_name;
      const category = name === 'category' ? newValue : formData.category;
      
      if (itemName && itemName.length > 2) {
        const suggestion = detectLocation(itemName, category);
        setLocationSuggestion(suggestion);
      }
    }
  };

  // Apply suggested location
  const applySuggestion = () => {
    if (locationSuggestion) {
      setFormData(prev => ({
        ...prev,
        storage_location: locationSuggestion.location
      }));
      setLocationSuggestion(null);
    }
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

  // Format quantity for display (integer if whole number)
  const formatQuantity = (qty) => {
    const num = parseFloat(qty);
    return num % 1 === 0 ? Math.floor(num).toString() : qty;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Item Name with Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Item Name *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="flex-shrink-0 w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center dark:bg-gray-700 text-2xl"
              >
                {formData.icon}
              </button>
              <input
                type="text"
                name="item_name"
                value={formData.item_name}
                onChange={handleChange}
                placeholder="e.g., Milk, Eggs, Bread"
                className={`flex-1 px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            {errors.item_name && (
              <p className="mt-1 text-xs text-red-600">{errors.item_name}</p>
            )}
            {formData.category && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Auto-detected: {formData.category} {formData.unit && `• ${formData.unit}`}
              </p>
            )}
          </div>

          {/* Storage Location & Quantity Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Storage Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Location
              </label>
              <select
                name="storage_location"
                value={formData.storage_location}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
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

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Quantity *
              </label>
              <input
                type="text"
                name="quantity"
                value={formatQuantity(formData.quantity)}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow integers and decimals
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setFormData(prev => ({ ...prev, quantity: value }));
                  }
                }}
                placeholder="1"
                className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
          </div>

          {/* Sell-By Date (Smart Calculation) */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-purple-600 dark:text-purple-400" />
              Sell-By Date (Smart Calculation)
            </label>
            <DateInput
              name="sell_by_date"
              value={formData.sell_by_date || ''}
              onChange={handleChange}
              placeholder="MM/DD/YYYY"
              className="w-full px-4 py-3 border-2 border-purple-300 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            {formData.calculated_expiry && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-sm">
                <span className="text-green-800 dark:text-green-200 font-semibold">
                  ✓ Calculated Expiration: {new Date(formData.calculated_expiry).toLocaleDateString()}
                </span>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Based on {formData.category} in {formData.storage_location}
                </p>
                {(() => {
                  const sellByDate = new Date(formData.sell_by_date);
                  const expiryDate = new Date(formData.calculated_expiry);
                  const daysToExpiry = Math.ceil((expiryDate - sellByDate) / (1000 * 60 * 60 * 24));
                  return (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-semibold">
                      📅 Estimated shelf life: ~{daysToExpiry} days after sell-by date
                    </p>
                  );
                })()}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              💡 Enter the sell-by date from the package, and we'll calculate the actual expiration!
            </p>
          </div>

          {/* Expiration Date (Optional Override) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Expiration Date (Manual Override)
            </label>
            <DateInput
              name="manual_expiry_date"
              value={formData.manual_expiry_date || ''}
              onChange={handleChange}
              placeholder="MM/DD/YYYY"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={formData.calculated_expiry && !formData.manual_expiry_date}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.calculated_expiry 
                ? 'Using calculated expiration. Clear to enter manually.' 
                : 'Leave blank to auto-calculate based on item type and storage location'}
            </p>
          </div>

          {/* User Shelf Life Estimate */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Lightbulb size={16} className="text-blue-600 dark:text-blue-400" />
              How long do you think this will last? (Help us learn!)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                name="user_shelf_life_estimate"
                value={formData.user_shelf_life_estimate || ''}
                onChange={handleChange}
                min="1"
                placeholder="7"
                className="w-24 px-4 py-2 border-2 border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              💡 Your estimate helps our system learn and improve predictions for everyone!
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

      {/* Icon Picker Modal */}
      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(emoji) => setFormData(prev => ({ ...prev, icon: emoji }))}
        currentIcon={formData.icon}
      />
    </div>
  );
};

export default AddItemModal;
