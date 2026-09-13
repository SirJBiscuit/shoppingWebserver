import React, { useState, useEffect } from 'react';
import { Smile, Search, Save, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const ItemIconTrainingTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('missing'); // 'missing', 'all', 'trained'
  const [saving, setSaving] = useState(null);
  const [stats, setStats] = useState({ total: 0, missing: 0, trained: 0 });

  const commonIcons = [
    '🥛', '🍞', '🥚', '🧀', '🥓', '🍗', '🥩', '🐟', '🍕', '🍔',
    '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🥘', '🍛',
    '🍱', '🍣', '🍤', '🥟', '🍚', '🍙', '🥠', '🍢', '🍡', '🍧',
    '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
    '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '☕', '🍵', '🧃', '🥤',
    '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾',
    '🧊', '🥄', '🍴', '🥢', '🔪', '🏺', '🌍', '🥫', '🧂', '🧈',
    '🥖', '🥨', '🥯', '🥞', '🧇', '🍖', '🍟', '🥙', '🧆', '🍳',
    '🥣', '🍌', '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🥝',
    '🥑', '🍅', '🥕', '🥔', '🌽', '🥦', '🥬', '🥒', '🌶️', '🫑'
  ];

  useEffect(() => {
    loadItems();
  }, [filter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/training/items/icons?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIcon = async (itemId, icon) => {
    setSaving(itemId);
    try {
      const response = await fetch(`/api/admin/training/items/${itemId}/icon`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ icon })
      });
      
      if (response.ok) {
        // Update local state
        setItems(items.map(item => 
          item.id === itemId ? { ...item, item_icon: icon, has_icon: true } : item
        ));
        setStats(prev => ({ ...prev, missing: prev.missing - 1, trained: prev.trained + 1 }));
      }
    } catch (error) {
      console.error('Error updating icon:', error);
    } finally {
      setSaving(null);
    }
  };

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Smile className="w-12 h-12 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Missing Icons</p>
              <p className="text-3xl font-bold text-orange-600">{stats.missing}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With Icons</p>
              <p className="text-3xl font-bold text-green-600">{stats.trained}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('missing')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'missing'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Missing Only
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All Items
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Train Item Icons
          </h3>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Smile className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No items found' : 'All items have icons!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredItems.map((item) => (
                <ItemIconCard
                  key={item.id}
                  item={item}
                  commonIcons={commonIcons}
                  onUpdate={updateIcon}
                  saving={saving === item.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ItemIconCard = ({ item, commonIcons, onUpdate, saving }) => {
  const [selectedIcon, setSelectedIcon] = useState(item.item_icon || '📦');
  const [showPicker, setShowPicker] = useState(false);

  const handleSave = () => {
    onUpdate(item.id, selectedIcon);
    setShowPicker(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-6xl hover:scale-110 transition-transform cursor-pointer"
          >
            {selectedIcon}
          </button>
          
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white">{item.item_name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Category: {item.category || 'Uncategorized'} • Used {item.usage_count || 0} times
            </p>
          </div>
        </div>
        
        {selectedIcon !== item.item_icon && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        )}
      </div>
      
      {showPicker && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Choose Icon:</p>
          <div className="grid grid-cols-10 gap-2">
            {commonIcons.map((icon, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIcon(icon)}
                className={`text-3xl hover:scale-125 transition-transform p-2 rounded ${
                  selectedIcon === icon ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-white dark:hover:bg-gray-600'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ItemIconTrainingTab;
