import React from 'react';
import { Plus, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { EditableContainer } from './editor/EditorOverlay';

const SmartSuggestions = ({ suggestions, onAddSuggestion }) => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const aveProps = widgetProperties['smart-suggestions'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="Smart Suggestions"
      onSelect={() => selectWidget('smart-suggestions', 'dashboard')}
      isSelected={selectedWidget?.id === 'smart-suggestions'}
    >
      <SmartSuggestionsContent 
        suggestions={suggestions}
        onAddSuggestion={onAddSuggestion}
        {...aveProps}
      />
    </EditableContainer>
  );
};

const SmartSuggestionsContent = ({ 
  suggestions, 
  onAddSuggestion,
  maxSuggestions = 5,
  showIcons = true,
  showQuantity = true,
  showReason = true,
  showConfidence = false,
  compactMode = false,
  maxHeight = 384,
  groupByPriority = false
}) => {
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

  // Limit suggestions based on maxSuggestions property
  const limitedSuggestions = suggestions.slice(0, maxSuggestions);
  
  // Group by priority if enabled
  const displaySuggestions = groupByPriority
    ? [...limitedSuggestions].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
      })
    : limitedSuggestions;

  if (suggestions.length === 0) {
    return (
      <div className={`text-center ${compactMode ? 'py-4' : 'py-6'} text-gray-500`}>
        <p className="text-sm">No suggestions at the moment</p>
        <p className="text-xs mt-1">Keep shopping to get personalized suggestions!</p>
      </div>
    );
  }

  return (
    <div 
      className={`${compactMode ? 'space-y-2' : 'space-y-3'} overflow-y-auto`}
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {displaySuggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`${compactMode ? 'p-2' : 'p-3'} rounded-lg border-2 ${getPriorityColor(suggestion.priority)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className={`flex items-center ${compactMode ? 'mb-0.5' : 'mb-1'}`}>
                {showIcons && getPriorityIcon(suggestion.type)}
                <span className={`${showIcons ? 'ml-2' : ''} font-medium text-gray-900 ${compactMode ? 'text-sm' : ''}` }>
                  {suggestion.item}
                </span>
              </div>
              {showReason && (
                <p className={`text-xs text-gray-600 ${compactMode ? 'mb-1' : 'mb-2'}`}>{suggestion.reason}</p>
              )}
              {showQuantity && suggestion.quantity && (
                <p className="text-xs text-gray-500">
                  Suggested: {suggestion.quantity} {suggestion.unit}
                </p>
              )}
              {showConfidence && suggestion.confidence && (
                <p className="text-xs text-gray-400 mt-1">
                  Confidence: {Math.round(suggestion.confidence * 100)}%
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
