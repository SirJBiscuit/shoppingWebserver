import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Copy, Edit2, MapPin } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { storeLayouts } from '../data/storeLayouts';
import ConfirmDialog from './ConfirmDialog';

const StoreManager = ({ isOpen, onClose, onStoreCreated }) => {
  const { success, error } = useToast();
  const [userStores, setUserStores] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [editingStore, setEditingStore] = useState(null);
  const [aisles, setAisles] = useState([]);
  const [storeToDelete, setStoreToDelete] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUserStores();
    }
  }, [isOpen]);

  const loadUserStores = async () => {
    try {
      const response = await fetch('/api/stores/user', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserStores(data);
      }
    } catch (err) {
      console.error('Error loading stores:', err);
    }
  };

  const createStore = async (e) => {
    if (e) e.preventDefault();
    
    if (!newStoreName.trim()) {
      error('Please enter a store name');
      return;
    }

    console.log('Creating store:', newStoreName, 'with template:', selectedTemplate);

    try {
      // Create the store
      const storeResponse = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newStoreName,
          chain: selectedTemplate || null,
        }),
      });

      if (!storeResponse.ok) {
        const errorData = await storeResponse.json();
        throw new Error(errorData.error || 'Failed to create store');
      }
      const newStore = await storeResponse.json();

      // If template selected, copy aisles from template
      if (selectedTemplate) {
        const templateKey = selectedTemplate.toLowerCase().replace(/\s+/g, '-');
        const template = storeLayouts[templateKey];
        
        if (template && template.aisles) {
          for (const aisle of template.aisles) {
            await fetch(`/api/stores/${newStore.id}/aisles`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                aisle_number: aisle.number,
                aisle_name: aisle.name,
                categories: aisle.categories,
                display_order: template.aisles.indexOf(aisle),
              }),
            });
          }
        }
      }

      success(`Store "${newStoreName}" created!`);
      setNewStoreName('');
      setSelectedTemplate('');
      setShowCreateForm(false);
      loadUserStores();
      if (onStoreCreated) onStoreCreated(newStore);
    } catch (err) {
      console.error('Error creating store:', err);
      error(err.message || 'Failed to create store');
    }
  };

  const confirmDeleteStore = async () => {
    if (!storeToDelete) return;

    try {
      const response = await fetch(`/api/stores/${storeToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        success('Store deleted');
        loadUserStores();
      }
    } catch (err) {
      console.error('Error deleting store:', err);
      error('Failed to delete store');
    } finally {
      setStoreToDelete(null);
    }
  };

  const loadStoreAisles = async (storeId) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/aisles`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAisles(data);
      }
    } catch (err) {
      console.error('Error loading aisles:', err);
    }
  };

  const editStore = (store) => {
    setEditingStore(store);
    loadStoreAisles(store.id);
  };

  const addAisle = () => {
    setAisles([...aisles, {
      aisle_number: '',
      aisle_name: '',
      categories: [],
      display_order: aisles.length,
      isNew: true,
    }]);
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
    if (!editingStore) return;

    try {
      for (const aisle of aisles) {
        await fetch(`/api/stores/${editingStore.id}/aisles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            aisle_number: aisle.aisle_number,
            aisle_name: aisle.aisle_name,
            categories: aisle.categories || [],
            display_order: aisle.display_order,
          }),
        });
      }
      success('Aisles saved!');
      setEditingStore(null);
      setAisles([]);
    } catch (err) {
      console.error('Error saving aisles:', err);
      error('Failed to save aisles');
    }
  };

  if (!isOpen) return null;

  const availableTemplates = ['Walmart', 'Target', 'Kroger', 'Aldi', 'Costco'];
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🏪 My Stores
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create and manage your custom store configurations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {editingStore ? (
            // Aisle Editor
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Configure Aisles: {editingStore.name}
                </h3>
                <button
                  onClick={() => {
                    setEditingStore(null);
                    setAisles([]);
                  }}
                  className="btn-secondary text-sm"
                >
                  ← Back to Stores
                </button>
              </div>

              <div className="space-y-4 mb-6">
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
                            placeholder="e.g., 1, A1"
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
                        Categories
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
              </div>

              <button
                onClick={addAisle}
                className="w-full btn-secondary flex items-center justify-center mb-4"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Aisle
              </button>

              <div className="flex gap-3">
                <button
                  onClick={saveAisles}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Aisles
                </button>
              </div>
            </div>
          ) : (
            // Store List
            <div>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary w-full mb-6 flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Store
                </button>
              )}

              {showCreateForm && (
                <div className="border border-primary-300 dark:border-primary-700 rounded-lg p-4 mb-6 bg-primary-50 dark:bg-primary-900/20">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Create New Store
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        className="input-field"
                        placeholder="e.g., Kroger - Main Street"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Copy Aisles From Template (Optional)
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Start from scratch</option>
                        {availableTemplates.map((template) => (
                          <option key={template} value={template}>
                            {template} (auto-populate aisles)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createStore}
                        className="btn-primary flex-1"
                      >
                        Create Store
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewStoreName('');
                          setSelectedTemplate('');
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userStores.map((store) => (
                  <div
                    key={store.id}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {store.name}
                        </h4>
                        {store.chain && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Based on: {store.chain}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setStoreToDelete(store)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => editStore(store)}
                      className="btn-secondary w-full text-sm flex items-center justify-center"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Configure Aisles
                    </button>
                  </div>
                ))}
              </div>

              {userStores.length === 0 && !showCreateForm && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg mb-2">No stores yet</p>
                  <p className="text-sm">Create your first store to get started!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={storeToDelete !== null}
        title="Delete Store"
        message={`Are you sure you want to delete "${storeToDelete?.name}"? This will remove all aisle configurations.`}
        onConfirm={confirmDeleteStore}
        onCancel={() => setStoreToDelete(null)}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default StoreManager;
