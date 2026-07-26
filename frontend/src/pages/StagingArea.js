import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, AlertTriangle, ArrowRight, Trash2, Info } from 'lucide-react';
import stagingAPI from '../services/stagingAPI';
import inventoryAPI from '../services/inventoryAPI';
import StagingItemCard from '../components/staging/StagingItemCard';
import RotationPanel from '../components/staging/RotationPanel';
import Sidebar from '../components/Sidebar';

/**
 * StagingArea - After Shop
 * Shows items waiting to be put away with smart rotation suggestions
 */
const StagingArea = () => {
  const [stagingItems, setStagingItems] = useState({ items: [], grouped: {}, total: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'comparison'
  const [pantryItems, setPantryItems] = useState([]);

  useEffect(() => {
    loadStagingItems();
    loadPantryPreview();
  }, []);

  const loadStagingItems = async () => {
    try {
      setLoading(true);
      const response = await stagingAPI.getStagingItems();
      setStagingItems(response.data);
    } catch (error) {
      console.error('Error loading staging items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPantryPreview = async () => {
    try {
      const response = await inventoryAPI.getItems();
      // Get recent items, limit to 20
      const recentItems = response.data.items?.slice(0, 20) || [];
      setPantryItems(recentItems);
    } catch (error) {
      console.error('Error loading pantry preview:', error);
    }
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    
    // Load suggestions for this item
    try {
      const response = await stagingAPI.getSuggestions(item.id);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    }
  };

  const handlePutAway = async (itemId) => {
    try {
      await stagingAPI.putAwayItem(itemId);
      await loadStagingItems();
      setSelectedItem(null);
      setSuggestions([]);
    } catch (error) {
      console.error('Error putting away item:', error);
      alert('Failed to put away item');
    }
  };

  const handlePutAwayAll = async () => {
    if (!window.confirm('Put away all items to inventory?')) return;
    
    try {
      await stagingAPI.putAwayAll();
      await loadStagingItems();
      setSelectedItem(null);
      setSuggestions([]);
    } catch (error) {
      console.error('Error putting away all items:', error);
      alert('Failed to put away items');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Remove this item from staging?')) return;
    
    try {
      await stagingAPI.removeItem(itemId);
      await loadStagingItems();
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    }
  };

  const handleResolveSuggestion = async (suggestionId, actionType) => {
    try {
      await stagingAPI.resolveSuggestion(suggestionId, actionType);
      // Reload suggestions
      if (selectedItem) {
        const response = await stagingAPI.getSuggestions(selectedItem.id);
        setSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Error resolving suggestion:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const { grouped, total } = stagingItems;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 p-4 ml-64">
        {/* Instructions Banner */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <Info size={32} className="flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-3">How to Use After Shop</h2>
                <ol className="space-y-2 text-sm opacity-90">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Complete a shopping trip - items automatically appear here</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Click on an item to see smart suggestions (use old items first, discard expired)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Review rotation recommendations to prevent food waste</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Put away items to Kitchen Inventory when ready</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              🛒 After Shop
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {total} item{total !== 1 ? 's' : ''} waiting to be put away
            </p>
          </div>
          
          {total > 0 && (
            <button
              onClick={handlePutAwayAll}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle size={20} />
              Put Away All
            </button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Nothing Here Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Complete a shopping trip to move items here for organized put-away
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Staging Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fridge Items */}
            {grouped.fridge && grouped.fridge.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🧊 Fridge Items ({grouped.fridge.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped.fridge.map(item => (
                    <StagingItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={() => handleSelectItem(item)}
                      onPutAway={() => handlePutAway(item.id)}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Freezer Items */}
            {grouped.freezer && grouped.freezer.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  ❄️ Freezer Items ({grouped.freezer.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped.freezer.map(item => (
                    <StagingItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={() => handleSelectItem(item)}
                      onPutAway={() => handlePutAway(item.id)}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pantry Items */}
            {grouped.pantry && grouped.pantry.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  🥫 Pantry Items ({grouped.pantry.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped.pantry.map(item => (
                    <StagingItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={() => handleSelectItem(item)}
                      onPutAway={() => handlePutAway(item.id)}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Rotation Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {selectedItem ? (
                <RotationPanel
                  item={selectedItem}
                  suggestions={suggestions}
                  onPutAway={() => handlePutAway(selectedItem.id)}
                  onResolveSuggestion={handleResolveSuggestion}
                  onClose={() => {
                    setSelectedItem(null);
                    setSuggestions([]);
                  }}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
                  <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Item
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Click on an item to see rotation suggestions and put it away
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Far Right: Pantry Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    🏠 Current Pantry
                  </h3>
                  <p className="text-xs opacity-90 mt-1">What you already have</p>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {pantryItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No items in pantry yet</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {pantryItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="text-2xl">{item.image_url || item.item_icon || '📦'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {item.item_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.current_quantity} {item.unit}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {item.storage_location === 'fridge' && '🧊'}
                            {item.storage_location === 'freezer' && '❄️'}
                            {item.storage_location === 'pantry' && '🥫'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default StagingArea;
