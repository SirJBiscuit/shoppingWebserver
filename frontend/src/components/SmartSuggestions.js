import React from 'react';
import { Plus, AlertCircle, TrendingUp, Clock } from 'lucide-react';

const SmartSuggestions = ({ suggestions, onAddSuggestion }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-blue-300 bg-blue-50';
    }
  };

  const getPriorityIcon = (type) => {
    switch (type) {
      case 'low_inventory':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'recurring':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'frequent':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-sm">No suggestions at the moment</p>
        <p className="text-xs mt-1">Keep shopping to get personalized suggestions!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border-2 ${getPriorityColor(suggestion.priority)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                {getPriorityIcon(suggestion.type)}
                <span className="ml-2 font-medium text-gray-900">
                  {suggestion.item}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{suggestion.reason}</p>
              {suggestion.quantity && (
                <p className="text-xs text-gray-500">
                  Suggested: {suggestion.quantity} {suggestion.unit}
                </p>
              )}
            </div>
            <button
              onClick={() => onAddSuggestion(suggestion)}
              className="ml-2 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              title="Add to list"
            >
              <Plus className="w-4 h-4 text-primary-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmartSuggestions;
