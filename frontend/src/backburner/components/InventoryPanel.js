import React, { useState } from 'react';
import { inventoryAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const InventoryPanel = ({ inventory, onUpdate }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [percentage, setPercentage] = useState('');

  const handleUpdatePercentage = async (itemId) => {
    try {
      await inventoryAPI.updateInventory(itemId, {
        percentageLeft: parseInt(percentage),
      });
      setEditingItem(null);
      setPercentage('');
      onUpdate();
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const getPercentageColor = (percent) => {
    if (percent <= 10) return 'bg-red-500';
    if (percent <= 25) return 'bg-yellow-500';
    if (percent <= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (inventory.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-sm">No inventory tracked yet</p>
        <p className="text-xs mt-1">Complete a shopping trip to start tracking</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {inventory.map((item) => (
        <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">{item.item_name}</span>
            <span className="text-xs text-gray-500">
              {item.current_quantity} {item.unit}
            </span>
          </div>
          
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Stock Level</span>
              <span>{item.percentage_left}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getPercentageColor(
                  item.percentage_left
                )}`}
                style={{ width: `${item.percentage_left}%` }}
              />
            </div>
          </div>

          {item.last_purchased && (
            <p className="text-xs text-gray-500 mb-2">
              Last purchased {formatDistanceToNow(new Date(item.last_purchased), { addSuffix: true })}
            </p>
          )}

          {editingItem === item.id ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="0-100%"
                className="input-field text-sm py-1"
                autoFocus
              />
              <button
                onClick={() => handleUpdatePercentage(item.item_id)}
                className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setPercentage('');
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingItem(item.id);
                setPercentage(item.percentage_left.toString());
              }}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Update stock level
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default InventoryPanel;
