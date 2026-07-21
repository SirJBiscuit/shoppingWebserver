# Admin Feature Manager Enhancements

## Completed ✅
- [x] Animated toggle switches instead of lock icons
- [x] "Enabled/Disabled" labels above toggles
- [x] Min Tier dropdown for each feature

## To Implement 🚧

### 1. Tier Limits Tab
- [ ] Add "Save Changes" button (only appears when changes are made)
- [ ] Track pending changes before saving
- [ ] Batch update all limits at once
- [ ] Show unsaved changes indicator

### 2. Dashboard Widgets Tab
- [ ] Per-tier widget management (Guest/Free/Premium tabs)
- [ ] Drag-and-drop widget reordering
- [ ] Live dashboard preview
- [ ] Enable/disable widgets per tier
- [ ] Save Changes button per tier
- [ ] Visual widget cards with icons

### 3. Global Settings Tab
- [ ] Default theme selector with preview
- [ ] Animation toggle with live preview
- [ ] Guest cleanup scheduler
- [ ] Bulk actions for features

## Implementation Plan

### Phase 1: Tier Limits with Save Button
```javascript
const [pendingLimitChanges, setPendingLimitChanges] = useState({});
const [hasUnsavedLimits, setHasUnsavedLimits] = useState(false);

const handleLimitChange = (limitId, newValue) => {
  setPendingLimitChanges(prev => ({
    ...prev,
    [limitId]: newValue
  }));
  setHasUnsavedLimits(true);
};

const saveLimitChanges = async () => {
  // Batch update all changed limits
  for (const [limitId, value] of Object.entries(pendingLimitChanges)) {
    await updateLimit(limitId, { limit_value: value });
  }
  setPendingLimitChanges({});
  setHasUnsavedLimits(false);
};
```

### Phase 2: Widget Management with Drag-Drop
```javascript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const [widgetsByTier, setWidgetsByTier] = useState({
  guest: [],
  free: [],
  premium: []
});

const onDragEnd = (result, tier) => {
  // Reorder widgets
  const items = Array.from(widgetsByTier[tier]);
  const [reorderedItem] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, reorderedItem);
  
  setWidgetsByTier(prev => ({
    ...prev,
    [tier]: items
  }));
};
```

### Phase 3: Dashboard Preview
```javascript
const DashboardPreview = ({ widgets, tier }) => {
  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-4">Preview ({tier})</h4>
      <div className="grid grid-cols-2 gap-4">
        {widgets.filter(w => w.enabled).map(widget => (
          <div key={widget.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
            <p className="text-xs font-medium">{widget.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Dependencies Needed
```bash
npm install react-beautiful-dnd
```

## Next Steps
1. Add pending changes tracking to Tier Limits
2. Install react-beautiful-dnd for drag-drop
3. Create widget management UI with per-tier controls
4. Add dashboard preview component
5. Implement save buttons with confirmation
