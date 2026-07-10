import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const AisleConfigModal = ({ isOpen, onClose, storeName, storeId }) => {
  const { success, error } = useToast();
  const [aisles, setAisles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && storeId) {
      loadAisles();
    }
  }, [isOpen, storeId]);

  const loadAisles = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/aisles`);
      if (response.ok) {
        const data = await response.json();
        setAisles(data);
      } else {
        // No aisles configured yet
        setAisles([]);
      }
    } catch (err) {
      console.error('Error loading aisles:', err);
      setAisles([]);
    }
  };

  const addAisle = () => {
    setAisles([
      ...aisles,
      {
        aisle_number: '',
        aisle_name: '',
        categories: [],
        display_order: aisles.length,
        isNew: true,
      },
    ]);
  };

  const updateAisle = (index, field, value) => {
    const updated = [...aisles];
    updated[index][field] = value;
    setAisles(updated);
  };

  const removeAisle = (index) => {
    setAisles(aisles.filter((_, i) => i !== index));
  };

  const addCategory = (aisleIndex, category) => {
    if (!category.trim()) return;
    const updated = [...aisles];
    if (!updated[aisleIndex].categories) {
      updated[aisleIndex].categories = [];
    }
    if (!updated[aisleIndex].categories.includes(category.trim())) {
      updated[aisleIndex].categories.push(category.trim());
      setAisles(updated);
    }
  };

  const removeCategory = (aisleIndex, categoryIndex) => {
    const updated = [...aisles];
    updated[aisleIndex].categories.splice(categoryIndex, 1);
    setAisles(updated);
  };

  const saveAisles = async () => {
    setLoading(true);
    try {
      // Save each aisle
      for (const aisle of aisles) {
        await fetch(`/api/stores/${storeId}/aisles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aisle_number: aisle.aisle_number,
            aisle_name: aisle.aisle_name,
            categories: aisle.categories || [],
            display_order: aisle.display_order,
          }),
        });
      }
      success('Aisle configuration saved!');
      onClose();
    } catch (err) {
      console.error('Error saving aisles:', err);
      error('Failed to save aisle configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const commonCategories = [
    'Produce', 'Bakery', 'Deli', 'Meat', 'Seafood', 'Dairy', 'Eggs',
    'Frozen', 'Breakfast', 'Cereal', 'Canned', 'Soup', 'Pantry',
    'Pasta', 'Rice', 'Baking', 'Spices', 'Condiments', 'Sauces',
    'Snacks', 'Chips', 'Candy', 'Beverages', 'Soda', 'Juice',
    'Coffee', 'Tea', 'Paper', 'Cleaning', 'Household', 'Kitchen',
    'Laundry', 'Personal Care', 'Health', 'Baby', 'Pet',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configure Aisles
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {storeName} - Set up your store's aisle layout
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {aisles.map((aisle, index) => (
            <div
              key={index}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3"
            >
              <div className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Aisle Number *
                    </label>
                    <input
                      type="text"
                      value={aisle.aisle_number}
                      onChange={(e) => updateAisle(index, 'aisle_number', e.target.value)}
                      className="input-field"
                      placeholder="e.g., 1, A1, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Aisle Name
                    </label>
                    <input
                      type="text"
                      value={aisle.aisle_name}
                      onChange={(e) => updateAisle(index, 'aisle_name', e.target.value)}
                      className="input-field"
                      placeholder="e.g., Fresh Produce"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeAisle(index)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-6"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categories in this aisle
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(aisle.categories || []).map((cat, catIndex) => (
                    <span
                      key={catIndex}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                      {cat}
                      <button
                        onClick={() => removeCategory(index, catIndex)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addCategory(index, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="input-field text-sm"
                >
                  <option value="">+ Add category...</option>
                  {commonCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addAisle}
            className="w-full btn-secondary flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Aisle
          </button>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={saveAisles}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AisleConfigModal;
