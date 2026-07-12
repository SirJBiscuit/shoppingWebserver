import React, { useState, useEffect } from 'react';
import { X, Copy, ArrowRight } from 'lucide-react';

const CopyItemModal = ({ isOpen, onClose, item, lists, onCopy, onMove }) => {
  const [selectedListId, setSelectedListId] = useState('');
  const [action, setAction] = useState('copy'); // 'copy' or 'move'

  useEffect(() => {
    if (isOpen && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [isOpen, lists]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedListId) return;

    if (action === 'copy') {
      onCopy(item, selectedListId);
    } else {
      onMove(item, selectedListId);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Copy className="w-5 h-5 mr-2" />
            {action === 'copy' ? 'Copy' : 'Move'} Item to Another List
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Item:</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {item?.item_icon} {item?.item_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item?.totalQuantity} {item?.unit}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction('copy')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  action === 'copy'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                }`}
              >
                <Copy className="w-4 h-4 inline mr-2" />
                Copy
              </button>
              <button
                type="button"
                onClick={() => setAction('move')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  action === 'move'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                }`}
              >
                <ArrowRight className="w-4 h-4 inline mr-2" />
                Move
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {action === 'copy' ? 'Keep item in current list and add to another' : 'Remove from current list and add to another'}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target List
            </label>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="input-field"
              required
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!selectedListId}
            >
              {action === 'copy' ? 'Copy' : 'Move'} Item
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CopyItemModal;
