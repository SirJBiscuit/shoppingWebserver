import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Store, Tag, Sparkles } from 'lucide-react';
import MenuPanel from './MenuPanel';
import { getAvailableStores } from '../data/storeLayouts';
import { shoppingAPI } from '../services/api';

const NewListModal = ({ isOpen, onClose, onCreateList, existingLists = [] }) => {
  const [listName, setListName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [listType, setListType] = useState('general'); // general, weekly, store-specific
  const [notes, setNotes] = useState('');
  const [serverNames, setServerNames] = useState([]); // [{name, uses}]
  const nameTouched = useRef(false);

  const availableStores = getAvailableStores();

  // Server-ranked suggestions: the names this user uses most at the
  // selected store, by frequency. Re-fetches when the store changes.
  useEffect(() => {
    const store = storeName && storeName !== 'custom' ? storeName : '';
    let cancelled = false;
    shoppingAPI.getNameSuggestions(store)
      .then((r) => { if (!cancelled) setServerNames(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setServerNames([]); });
    return () => { cancelled = true; };
  }, [storeName]);

  // Autofill: once a store is picked and the user hasn't typed, drop the
  // top predicted name in — they can still overwrite or pick a chip.
  useEffect(() => {
    if (!nameTouched.current && serverNames.length && storeName && storeName !== 'custom') {
      setListName(serverNames[0].name);
    }
  }, [serverNames, storeName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      return;
    }

    onCreateList({
      name: listName.trim(),
      store_name: storeName.trim() || null,
      list_type: listType,
      notes: notes.trim() || null
    });

    // Reset form
    setListName('');
    setStoreName('');
    setListType('general');
    setNotes('');
    onClose();
  };

  const suggestedNames = [
    ...serverNames.map((s) => s.name),
    `Shopping List ${existingLists.length + 1}`,
    'Weekly Groceries',
    'Quick Trip',
    'Meal Prep',
    'Party Shopping'
  ].filter((n, i, a) => a.indexOf(n) === i).slice(0, 5);

  return (
    <MenuPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Create New List"
      subtitle="Organize items your way"
      icon={ShoppingCart}
      maxWidth="max-w-md"
    >
      {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* List Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => { nameTouched.current = true; setListName(e.target.value); }}
              className="input-field"
              placeholder="e.g., Weekly Groceries"
              autoFocus
              required
            />

            {/* Predicted names — learned from your past lists at this store */}
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestedNames.map((name) => {
                const learned = serverNames.find((s) => s.name === name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { nameTouched.current = true; setListName(name); }}
                    title={learned ? `Used ${learned.uses}× at ${storeName}` : 'Suggested name'}
                    className={`text-xs px-2 py-1 rounded transition-colors inline-flex items-center gap-1 ${
                      learned
                        ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/60'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {learned && <Sparkles className="w-3 h-3" />}
                    {name}
                    {learned && learned.uses > 1 && (
                      <span className="text-[10px] opacity-70">×{learned.uses}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setListType('general')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'general'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">General</span>
              </button>
              
              <button
                type="button"
                onClick={() => setListType('weekly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'weekly'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Tag className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Weekly</span>
              </button>
              
              <button
                type="button"
                onClick={() => setListType('store')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'store'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Store className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Store</span>
              </button>
            </div>
          </div>

          {/* Store Name (only for store-specific lists) */}
          {listType === 'store' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Store
              </label>
              <select
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input-field"
              >
                <option value="">Choose a store...</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.name}>
                    {store.name} {store.priceMultiplier !== 1.0 && `(${store.priceMultiplier < 1 ? 'Lower' : 'Higher'} prices)`}
                  </option>
                ))}
                <option value="custom">Custom Store</option>
              </select>
              
              {storeName === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom store name"
                  className="input-field mt-2"
                  onChange={(e) => setStoreName(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows="2"
              placeholder="Add any notes about this list..."
            />
          </div>

          {/* Actions */}
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
              disabled={!listName.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create List
            </button>
          </div>
        </form>
    </MenuPanel>
  );
};

export default NewListModal;
