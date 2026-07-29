import React from 'react';
import { Trash2, Star, Edit2, Package, X, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BulkActionBar - Floating action bar for bulk operations
 * Features:
 * - Shows when items are selected
 * - Bulk delete
 * - Bulk favorite/unfavorite
 * - Bulk category change
 * - Clear selection
 */
const BulkActionBar = ({ 
  selectedCount = 0,
  onBulkDelete,
  onBulkFavorite,
  onBulkUnfavorite,
  onBulkCategoryChange,
  onClearSelection,
  onSelectAll
}) => {
  
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
            {/* Selection Count */}
            <div className="flex items-center gap-2 pr-4 border-r border-white/30">
              <CheckSquare className="w-5 h-5" />
              <span className="font-bold text-lg">{selectedCount}</span>
              <span className="text-sm opacity-90">selected</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Select All */}
              <button
                onClick={onSelectAll}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 font-medium"
                title="Select All"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Select All</span>
              </button>

              {/* Add to Favorites */}
              <button
                onClick={onBulkFavorite}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors flex items-center gap-2 font-medium"
                title="Add to Favorites"
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Favorite</span>
              </button>

              {/* Remove from Favorites */}
              <button
                onClick={onBulkUnfavorite}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 font-medium"
                title="Remove from Favorites"
              >
                <Star className="w-4 h-4 fill-current" />
                <span className="hidden sm:inline">Unfavorite</span>
              </button>

              {/* Change Category */}
              <button
                onClick={onBulkCategoryChange}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2 font-medium"
                title="Change Category"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Category</span>
              </button>

              {/* Delete */}
              <button
                onClick={onBulkDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 font-medium"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 font-medium ml-2 border-l border-white/30 pl-4"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionBar;
