import React, { useState } from 'react';
import { Check, Trash2, Edit2, Smile, Sparkles } from 'lucide-react';
import EditItemModal from './EditItemModal';
import { detectIcon, detectCategory } from '../utils/categoryDetector';

const ItemList = ({ items, onToggleCheck, onDelete, onEdit }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  // Group items by name to combine duplicates
  const combinedItems = items.reduce((acc, item) => {
    const key = item.item_name.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        ...item,
        count: 1,
        totalQuantity: item.quantity,
        totalPrice: (item.price || 0) * item.quantity,
        ids: [item.id]
      };
    } else {
      acc[key].count += 1;
      acc[key].totalQuantity += item.quantity;
      acc[key].totalPrice += (item.price || 0) * item.quantity;
      acc[key].ids.push(item.id);
    }
    return acc;
  }, {});

  // Group by category
  const groupedItems = Object.values(combinedItems).reduce((acc, item) => {
    const category = item.category_name || item.category || 'Other';
    if (!acc[category]) {
      acc[category] = {
        items: [],
        icon: item.category_icon || '📦',
        order: item.category_order || 999
      };
    }
    acc[category].items.push(item);
    return acc;
  }, {});

  // Sort categories by shopping order (pantry first, frozen last)
  const categories = Object.keys(groupedItems).sort((a, b) => {
    return groupedItems[a].order - groupedItems[b].order;
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">Your shopping list is empty</p>
        <p className="text-sm mt-2">Add items above or use smart suggestions</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 shopping-list-scroll custom-scrollbar max-h-[calc(100vh-400px)] pr-2">
      {categories.map((category) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center">
            <span className="text-2xl mr-2">{groupedItems[category].icon}</span>
            {category}
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 normal-case">
              ({groupedItems[category].items.length} items)
            </span>
          </h4>
          <div className="space-y-2">
            {groupedItems[category].items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  item.is_checked
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500'
                }`}
              >
                <div className="flex items-center flex-1">
                  <button
                    onClick={() => onToggleCheck(item)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                      item.is_checked
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300 dark:border-gray-500 hover:border-primary-500 dark:hover:border-primary-400'
                    }`}
                  >
                    {item.is_checked && <Check className="w-4 h-4 text-white" />}
                  </button>
                  
                  {/* Icon */}
                  <div className="text-2xl mr-2 relative">
                    {item.item_icon || detectIcon(item.item_name)}
                    {!item.item_icon && (
                      <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`font-medium flex items-center ${
                        item.is_checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {item.item_name}
                      {item.count > 1 && (
                        <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full">
                          x{item.count}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.floor(item.totalQuantity)} {item.unit}
                      {item.totalPrice > 0 && (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {' '}• ${item.totalPrice.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowEditModal(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                    title="Edit item"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      // Delete all instances of this item
                      item.ids.forEach(id => onDelete(id));
                    }}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Edit Item Modal */}
    <EditItemModal
      item={editingItem}
      isOpen={showEditModal}
      onClose={() => {
        setShowEditModal(false);
        setEditingItem(null);
      }}
      onSave={(updatedItem) => {
        if (onEdit) {
          // Update all instances of this item
          updatedItem.ids.forEach(id => {
            onEdit({ ...updatedItem, id });
          });
        }
        setShowEditModal(false);
        setEditingItem(null);
      }}
    />
    </>
  );
};

export default ItemList;
