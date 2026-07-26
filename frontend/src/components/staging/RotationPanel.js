import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Trash2, RotateCcw, Clock, X } from 'lucide-react';

/**
 * RotationPanel - Shows rotation suggestions for selected staging item
 */
const RotationPanel = ({ item, suggestions, onPutAway, onResolveSuggestion, onClose }) => {
  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'use_first':
        return <Clock className="text-orange-600" size={20} />;
      case 'discard':
        return <Trash2 className="text-red-600" size={20} />;
      case 'rotate':
        return <RotateCcw className="text-blue-600" size={20} />;
      case 'expires_soon':
        return <AlertTriangle className="text-yellow-600" size={20} />;
      default:
        return <AlertTriangle className="text-gray-600" size={20} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 2:
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      case 3:
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1:
        return 'URGENT';
      case 2:
        return 'IMPORTANT';
      case 3:
        return 'SUGGESTED';
      default:
        return 'INFO';
    }
  };

  const urgentSuggestions = suggestions.filter(s => s.priority === 1);
  const importantSuggestions = suggestions.filter(s => s.priority === 2);
  const otherSuggestions = suggestions.filter(s => s.priority === 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-3xl">{item.icon || '📦'}</div>
            <div>
              <h3 className="font-bold text-lg">{item.item_name}</h3>
              <p className="text-sm opacity-90">
                {item.quantity} {item.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              All Clear!
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No rotation suggestions for this item. Safe to put away!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Urgent Suggestions */}
            {urgentSuggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  URGENT
                </h4>
                <div className="space-y-2">
                  {urgentSuggestions.map(suggestion => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onResolve={onResolveSuggestion}
                      getSuggestionIcon={getSuggestionIcon}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Important Suggestions */}
            {importantSuggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2">
                  IMPORTANT
                </h4>
                <div className="space-y-2">
                  {importantSuggestions.map(suggestion => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onResolve={onResolveSuggestion}
                      getSuggestionIcon={getSuggestionIcon}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Suggestions */}
            {otherSuggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                  SUGGESTED
                </h4>
                <div className="space-y-2">
                  {otherSuggestions.map(suggestion => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onResolve={onResolveSuggestion}
                      getSuggestionIcon={getSuggestionIcon}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Put Away Button */}
        <button
          onClick={onPutAway}
          className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle size={20} />
          Put Away to Inventory
        </button>
      </div>
    </div>
  );
};

const SuggestionCard = ({ suggestion, onResolve, getSuggestionIcon, getPriorityColor }) => {
  return (
    <div className={`border-2 rounded-lg p-3 ${getPriorityColor(suggestion.priority)}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {getSuggestionIcon(suggestion.suggestion_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {suggestion.reason}
          </p>
          {suggestion.item_name && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Item: {suggestion.item_name}
              {suggestion.current_quantity && ` (${suggestion.current_quantity} ${suggestion.unit})`}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {suggestion.suggestion_type === 'discard' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onResolve(suggestion.id, 'discarded')}
            className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={() => onResolve(suggestion.id, 'kept')}
            className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            Keep
          </button>
        </div>
      )}

      {suggestion.suggestion_type === 'use_first' && (
        <div className="mt-3">
          <button
            onClick={() => onResolve(suggestion.id, 'used')}
            className="w-full px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
          >
            Mark as Used
          </button>
        </div>
      )}

      {(suggestion.suggestion_type === 'rotate' || suggestion.suggestion_type === 'expires_soon') && (
        <div className="mt-3">
          <button
            onClick={() => onResolve(suggestion.id, 'ignored')}
            className="w-full px-3 py-1.5 bg-gray-600 text-white rounded text-xs font-semibold hover:bg-gray-700 transition-colors"
          >
            Got It
          </button>
        </div>
      )}
    </div>
  );
};

export default RotationPanel;
