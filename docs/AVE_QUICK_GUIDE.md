# AVE Quick Implementation Guide

**Quick reference for making components editable and upgrading dropdowns**

---

## 🎯 Making a Component Editable

### Step 1: Import Required Dependencies

```javascript
import { EditableContainer } from '../components/editor/EditorOverlay';
import { useEditor } from '../contexts/EditorContext';
```

### Step 2: Get Editor Context in Component

```javascript
const YourComponent = () => {
  // Get editor context
  const { 
    isEditorActive, 
    selectWidget, 
    selectedWidget, 
    widgetProperties 
  } = useEditor();
  
  // Get this widget's properties (use the widget ID from widgetSchemas.js)
  const props = widgetProperties['your-widget-id'] || {};
  
  // ... rest of component
};
```

### Step 3: Wrap Component with EditableContainer

```javascript
return (
  <EditableContainer
    isEditorActive={isEditorActive}
    componentName="Your Widget Name"
    onSelect={() => selectWidget('your-widget-id')}
    isSelected={selectedWidget === 'your-widget-id'}
  >
    <YourActualComponent {...props} />
  </EditableContainer>
);
```

### Step 4: Update Component to Accept Properties

```javascript
const YourActualComponent = ({ 
  // Regular props
  items,
  data,
  // AVE Properties (with defaults from schema)
  showChart = true,
  chartColor = '#6366f1',
  maxItems = 10,
  ...otherProps 
}) => {
  // Use the AVE properties in your component
  return (
    <div>
      {showChart && <Chart color={chartColor} />}
      {items.slice(0, maxItems).map(item => (
        <Item key={item.id} {...item} />
      ))}
    </div>
  );
};
```

---

## 📝 Complete Example: BudgetTracker

### Before (Not Editable)

```javascript
// BudgetTracker.js
const BudgetTracker = ({ items, totalCost, listId }) => {
  return (
    <div className="card">
      <h3>Budget Tracker</h3>
      <Chart data={items} />
      <Total amount={totalCost} />
    </div>
  );
};
```

### After (Editable via AVE)

```javascript
// BudgetTracker.js
import { EditableContainer } from '../components/editor/EditorOverlay';
import { useEditor } from '../contexts/EditorContext';

const BudgetTracker = ({ items, totalCost, listId }) => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const props = widgetProperties['budget-tracker'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="Budget Tracker"
      onSelect={() => selectWidget('budget-tracker')}
      isSelected={selectedWidget === 'budget-tracker'}
    >
      <BudgetTrackerContent 
        items={items}
        totalCost={totalCost}
        listId={listId}
        {...props}
      />
    </EditableContainer>
  );
};

// Separate content component that uses AVE properties
const BudgetTrackerContent = ({ 
  items, 
  totalCost, 
  listId,
  // AVE Properties
  showChart = true,
  chartColor = '#6366f1',
  maxBudget = 500,
  showPercentage = true,
  warningThreshold = 80
}) => {
  const percentage = (totalCost / maxBudget) * 100;
  const isWarning = percentage >= warningThreshold;
  
  return (
    <div className="card">
      <h3>Budget Tracker</h3>
      
      {showChart && (
        <Chart 
          data={items} 
          color={chartColor}
          max={maxBudget}
        />
      )}
      
      <Total amount={totalCost} max={maxBudget} />
      
      {showPercentage && (
        <div className={isWarning ? 'text-red-500' : 'text-green-500'}>
          {percentage.toFixed(1)}% of budget
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;
```

---

## 🎨 Upgrading Dropdowns to CustomDropdownList

### Step 1: Import CustomDropdownList

```javascript
import CustomDropdownList from '../components/CustomDropdownList';
```

### Step 2: Replace `<select>` with CustomDropdownList

#### Before (Native Select)

```javascript
<select 
  value={selectedList} 
  onChange={(e) => setSelectedList(e.target.value)}
  className="px-3 py-2 border rounded"
>
  <option value="">Select a list...</option>
  {lists.map(list => (
    <option key={list.id} value={list.id}>
      {list.name}
    </option>
  ))}
</select>
```

#### After (CustomDropdownList)

```javascript
<CustomDropdownList
  value={selectedList}
  onChange={setSelectedList}
  options={lists.map(list => ({
    value: list.id,
    label: list.name,
    icon: list.icon // optional
  }))}
  placeholder="Select a list..."
  searchable={true}
/>
```

### Step 3: Advanced Options

```javascript
<CustomDropdownList
  value={selectedItem}
  onChange={setSelectedItem}
  options={items.map(item => ({
    value: item.id,
    label: item.name,
    icon: item.icon,           // Optional: Lucide icon component
    description: item.desc,     // Optional: Secondary text
    color: item.color          // Optional: Custom color
  }))}
  placeholder="Search items..."
  searchable={true}             // Enable search/filter
  disabled={isLoading}          // Disable when loading
  maxHeight={300}               // Max dropdown height
  renderItem={(option) => (     // Custom item renderer
    <div className="flex items-center gap-2">
      {option.icon && <option.icon className="w-4 h-4" />}
      <span>{option.label}</span>
    </div>
  )}
/>
```

---

## 📋 Checklist for Making Components Editable

### 1. Create Widget Schema (if not exists)

**File:** `frontend/src/config/widgetSchemas.js`

```javascript
'your-widget-id': {
  name: 'Your Widget Name',
  category: 'Category',
  properties: {
    propertyName: {
      type: 'boolean' | 'color' | 'number' | 'select' | 'text' | 'range',
      label: 'Property Label',
      default: defaultValue,
      category: 'appearance' | 'layout' | 'behavior',
      // Type-specific options
      min: 0,           // for number/range
      max: 100,         // for number/range
      step: 1,          // for number/range
      options: [],      // for select
      placeholder: '',  // for text
    },
  },
},
```

### 2. Update Component File

- [ ] Import `EditableContainer` and `useEditor`
- [ ] Get editor context with `useEditor()`
- [ ] Get widget properties with `widgetProperties['widget-id']`
- [ ] Wrap component with `EditableContainer`
- [ ] Pass properties to actual component
- [ ] Update component to accept and use AVE properties

### 3. Test the Flow

- [ ] Enable AVE mode (toggle editor in toolbar)
- [ ] Click on the component (should show selection overlay)
- [ ] Properties panel should appear on right
- [ ] Change a property value
- [ ] Click "Save Changes"
- [ ] Reload page
- [ ] Verify property persisted

---

## 🔍 Common Widget IDs

Use these IDs when wrapping components:

| Component | Widget ID | Schema File Location |
|-----------|-----------|---------------------|
| Dashboard Main | `dashboard` | `widgetSchemas.js:18` |
| Sidebar | `sidebar` | `widgetSchemas.js:48` |
| Budget Tracker | `budget-tracker` | `widgetSchemas.js:77` |
| Animated Cart | `animated-cart` | `widgetSchemas.js:112` |
| Leveling System | `leveling-system` | `widgetSchemas.js:138` |
| Smart Suggestions | `smart-suggestions` | `widgetSchemas.js:169` |
| Pantry Quick View | `pantry-quick-view` | `widgetSchemas.js:193` |
| Next Item Suggestion | `next-item-suggestion` | `widgetSchemas.js:217` |
| Item List | `item-list` | `widgetSchemas.js:242` |
| Shopping List Recipes | `shopping-list-recipes` | `widgetSchemas.js:282` |

---

## 🎯 Quick Dropdown Upgrade Checklist

- [ ] Import `CustomDropdownList`
- [ ] Find all `<select>` elements
- [ ] Convert options array to `{ value, label }` format
- [ ] Replace `<select>` with `<CustomDropdownList>`
- [ ] Update `onChange` handler (no need for `e.target.value`)
- [ ] Add `searchable={true}` for better UX
- [ ] Test keyboard navigation (arrows, enter, escape)
- [ ] Test search functionality
- [ ] Verify dark mode appearance

---

## 💡 Pro Tips

### For Components

1. **Always provide defaults** for AVE properties in component signature
2. **Use destructuring** to separate AVE props from regular props
3. **Keep EditableContainer wrapper** at the top level of your component
4. **Don't nest EditableContainers** - one per component
5. **Use the same widget ID** in schema, EditableContainer, and selectWidget

### For Dropdowns

1. **Enable search** for lists with 5+ items
2. **Add icons** for better visual hierarchy
3. **Use descriptions** for complex options
4. **Keep placeholder text** clear and concise
5. **Test mobile** - CustomDropdownList is touch-friendly

### For Testing

1. **Test in AVE mode** - Enable editor and click component
2. **Test property changes** - Change values and save
3. **Test persistence** - Reload page and verify
4. **Test defaults** - Reset to default and verify
5. **Test dark mode** - Toggle theme and verify appearance

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong

```javascript
// Using wrong widget ID
<EditableContainer
  componentName="Budget"
  onSelect={() => selectWidget('budget')} // ❌ Wrong ID
  isSelected={selectedWidget === 'budget'}
>
```

```javascript
// Not passing properties to component
<EditableContainer {...}>
  <BudgetTracker items={items} /> {/* ❌ Missing {...props} */}
</EditableContainer>
```

```javascript
// Using old select syntax
<select onChange={(e) => setValue(e.target.value)}> {/* ❌ Old way */}
```

### ✅ Correct

```javascript
// Using correct widget ID from schema
<EditableContainer
  componentName="Budget Tracker"
  onSelect={() => selectWidget('budget-tracker')} // ✅ Matches schema
  isSelected={selectedWidget === 'budget-tracker'}
>
```

```javascript
// Passing properties to component
const props = widgetProperties['budget-tracker'] || {};
<EditableContainer {...}>
  <BudgetTracker items={items} {...props} /> {/* ✅ Props passed */}
</EditableContainer>
```

```javascript
// Using CustomDropdownList
<CustomDropdownList onChange={setValue} {...} /> {/* ✅ New way */}
```

---

## 📚 Related Documentation

- **Widget Schemas:** `frontend/src/config/widgetSchemas.js`
- **EditorContext:** `frontend/src/contexts/EditorContext.js`
- **EditableContainer:** `frontend/src/components/editor/EditorOverlay.js`
- **CustomDropdownList:** `frontend/src/components/CustomDropdownList.js`
- **PropertiesPanel:** `frontend/src/components/editor/PropertiesPanel.js`

---

## 🎓 Learning Path

1. **Start simple** - Make one component editable (BudgetTracker)
2. **Test thoroughly** - Verify the full edit → save → reload flow
3. **Add more** - Make 2-3 more components editable
4. **Upgrade dropdowns** - Replace all `<select>` elements
5. **Advanced features** - Add custom property types, drag & drop

---

**Last Updated:** September 22, 2026  
**Quick Reference Version:** 1.0  
**For:** AVE System Implementation
