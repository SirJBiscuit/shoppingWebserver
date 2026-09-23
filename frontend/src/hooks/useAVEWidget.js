import { useEditor } from '../contexts/EditorContext';
import { getWidget } from '../utils/widgetRegistry';

/**
 * useAVEWidget - Simplified hook for AVE-enabled widgets
 * 
 * Automatically handles:
 * - Widget ID registration
 * - Editor state
 * - Selection handling
 * - Property retrieval
 * 
 * Usage:
 * const { wrapWithAVE, props } = useAVEWidget('budget-tracker', 'dashboard');
 * 
 * return wrapWithAVE(
 *   <BudgetTrackerContent {...props} />
 * );
 */
export const useAVEWidget = (widgetId, section = 'dashboard', componentName = null) => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  
  // Get widget metadata from registry
  const widgetMeta = getWidget(widgetId);
  
  // Get custom properties for this widget
  const props = widgetProperties[widgetId] || {};
  
  // Determine component name (from registry or parameter)
  const displayName = componentName || widgetMeta?.name || widgetId;
  
  // Check if this widget is selected
  const isSelected = selectedWidget?.id === widgetId;
  
  // Handler to select this widget
  const handleSelect = () => {
    if (isEditorActive) {
      selectWidget(widgetId, section);
    }
  };
  
  // Wrapper function to wrap component with EditableContainer
  const wrapWithAVE = (children) => {
    // Import EditableContainer dynamically to avoid circular deps
    const { EditableContainer } = require('../components/editor/EditorOverlay');
    
    return (
      <EditableContainer
        isEditorActive={isEditorActive}
        componentName={displayName}
        onSelect={handleSelect}
        isSelected={isSelected}
      >
        {children}
      </EditableContainer>
    );
  };
  
  return {
    // Wrapper function
    wrapWithAVE,
    
    // Properties
    props,
    widgetMeta,
    
    // State
    isEditorActive,
    isSelected,
    
    // Actions
    select: handleSelect
  };
};

export default useAVEWidget;
