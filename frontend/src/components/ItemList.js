import React from 'react';
import { Check, Trash2 } from 'lucide-react';

const ItemList = ({ items, onToggleCheck, onDelete }) => {
  const groupedItems = items.reduce((acc, item) => {
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
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Your shopping list is empty</p>
        <p className="text-sm mt-2">Add items above or use smart suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
            <span className="text-2xl mr-2">{groupedItems[category].icon}</span>
            {category}
            <span className="ml-2 text-xs text-gray-500 normal-case">
              ({groupedItems[category].items.length} items)
            </span>
          </h4>
          <div className="space-y-2">
            {groupedItems[category].items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  item.is_checked
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-300 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center flex-1">
                  <button
                    onClick={() => onToggleCheck(item)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                      item.is_checked
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {item.is_checked && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`font-medium flex items-center ${
                        item.is_checked ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {item.item_icon && <span className="text-xl mr-2">{item.item_icon}</span>}
                      {item.item_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} {item.unit}
                      {item.price > 0 && ` • $${(item.price * item.quantity).toFixed(2)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemList;
