import React from 'react';
import { Check, Trash2, X, Copy } from 'lucide-react';

const BulkActions = ({ selectedCount, onCheckAll, onDeleteAll, onClear, onDuplicate }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-full shadow-2xl px-6 py-4 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
            {selectedCount}
          </div>
          <span className="font-medium">selected</span>
        </div>

        <div className="h-6 w-px bg-white/30"></div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onCheckAll}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Check all selected"
          >
            <Check className="w-5 h-5" />
          </button>

          <button
            onClick={onDuplicate}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Duplicate selected"
          >
            <Copy className="w-5 h-5" />
          </button>

          <button
            onClick={onDeleteAll}
            className="p-2 hover:bg-red-500 rounded-lg transition-colors"
            title="Delete selected"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={onClear}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Clear selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;
