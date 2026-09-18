# Dashboard Layout Editor System

## Overview
A visual drag-and-drop layout editor that lets admins customize the Dashboard UI without touching code. Prevents layout issues and gives full control over spacing, positioning, and component visibility.

## Core Features

### 1. Layout Configuration Storage
```javascript
// Stored in database per user/admin
{
  "dashboard_layout": {
    "looking_for_next": {
      "enabled": true,
      "sections": [
        { "id": "header", "order": 1, "spacing": "4", "visible": true },
        { "id": "store_name", "order": 2, "spacing": "4", "visible": true },
        { "id": "item_info", "order": 3, "spacing": "4", "visible": true },
        { "id": "badges", "order": 4, "spacing": "3", "visible": true },
        { "id": "up_next", "order": 5, "spacing": "4", "visible": true },
        { "id": "quick_price", "order": 6, "spacing": "4", "visible": true },
        { "id": "action_buttons", "order": 7, "spacing": "3", "visible": true },
        { "id": "same_aisle", "order": 8, "spacing": "4", "visible": true }
      ],
      "container_padding": "4",
      "max_width": "md"
    },
    "shopping_list": {
      "columns": "grid-cols-1",
      "item_spacing": "2",
      "show_categories": true,
      "compact_mode": false
    }
  }
}
```

### 2. Admin Layout Editor UI

**Access:** Dashboard → Admin Button → "Layout Editor"

**Features:**
- Live preview of changes
- Drag sections to reorder
- Adjust spacing with slider (0-8)
- Toggle section visibility
- Reset to defaults
- Save as template
- Export/import layouts

**UI Components:**
```jsx
<LayoutEditor>
  <PreviewPane>
    {/* Live preview of Dashboard with current settings */}
  </PreviewPane>
  
  <ControlPanel>
    <SectionList>
      {sections.map(section => (
        <SectionControl
          draggable
          section={section}
          onReorder={handleReorder}
          onToggle={handleToggle}
          onSpacingChange={handleSpacing}
        />
      ))}
    </SectionList>
    
    <GlobalSettings>
      <SpacingSlider label="Container Padding" />
      <MaxWidthSelect options={['sm', 'md', 'lg', 'xl']} />
      <CompactModeToggle />
    </GlobalSettings>
    
    <Actions>
      <SaveButton />
      <ResetButton />
      <ExportButton />
      <ImportButton />
    </Actions>
  </ControlPanel>
</LayoutEditor>
```

### 3. Dynamic Component Renderer

Replace hardcoded layouts with config-driven rendering:

```jsx
// NextItemSuggestion.js becomes:
const NextItemSuggestion = ({ layoutConfig, ...props }) => {
  const sections = layoutConfig?.looking_for_next?.sections || DEFAULT_SECTIONS;
  
  // Sort by order
  const orderedSections = sections
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);
  
  return (
    <motion.div className={`p-${layoutConfig.container_padding}`}>
      {orderedSections.map(section => (
        <div 
          key={section.id} 
          className={`mt-${section.spacing}`}
        >
          {renderSection(section.id, props)}
        </div>
      ))}
    </motion.div>
  );
};

const renderSection = (sectionId, props) => {
  switch(sectionId) {
    case 'header': return <HeaderSection {...props} />;
    case 'store_name': return <StoreNameSection {...props} />;
    case 'item_info': return <ItemInfoSection {...props} />;
    case 'badges': return <BadgesSection {...props} />;
    case 'up_next': return <UpNextSection {...props} />;
    case 'quick_price': return <QuickPriceSection {...props} />;
    case 'action_buttons': return <ActionButtonsSection {...props} />;
    case 'same_aisle': return <SameAisleSection {...props} />;
    default: return null;
  }
};
```

### 4. Database Schema

```sql
-- Migration: 041_layout_configs.sql
CREATE TABLE layout_configs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  config_name VARCHAR(100),
  layout_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Global default layout (admin sets this)
INSERT INTO layout_configs (is_global, config_name, layout_data) VALUES
(true, 'default', '{
  "dashboard_layout": {
    "looking_for_next": {
      "enabled": true,
      "sections": [...]
    }
  }
}');
```

### 5. API Endpoints

```javascript
// backend/routes/layout.js

// Get user's layout (or global default)
GET /api/layout/dashboard
Response: { layout_data: {...} }

// Save user's custom layout
POST /api/layout/dashboard
Body: { layout_data: {...} }

// Admin: Save global default
POST /api/layout/global
Body: { layout_data: {...} }

// Reset to default
DELETE /api/layout/dashboard

// Export layout
GET /api/layout/export
Response: JSON file download

// Import layout
POST /api/layout/import
Body: FormData with JSON file
```

### 6. Component Breakdown

Break NextItemSuggestion into smaller, reusable sections:

```
frontend/src/components/LookingForNext/
├── index.js (main container)
├── sections/
│   ├── HeaderSection.js
│   ├── StoreNameSection.js
│   ├── ItemInfoSection.js
│   ├── BadgesSection.js
│   ├── UpNextSection.js
│   ├── QuickPriceSection.js
│   ├── ActionButtonsSection.js
│   └── SameAisleSection.js
├── LayoutRenderer.js (config-driven renderer)
└── useLayoutConfig.js (hook to fetch config)
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Create database schema
- ✅ Build API endpoints
- ✅ Create layout config context
- ✅ Break NextItemSuggestion into sections

### Phase 2: Editor UI (Week 2)
- ✅ Build Layout Editor page
- ✅ Drag-and-drop reordering
- ✅ Spacing controls
- ✅ Visibility toggles
- ✅ Live preview

### Phase 3: Dynamic Rendering (Week 3)
- ✅ Implement config-driven renderer
- ✅ Load user/global configs
- ✅ Apply spacing dynamically
- ✅ Handle section visibility

### Phase 4: Advanced Features (Week 4)
- ✅ Export/import layouts
- ✅ Layout templates
- ✅ Mobile vs Desktop configs
- ✅ Per-list custom layouts

## Benefits

1. **No More Layout Bugs** - Spacing controlled by config, not code
2. **User Customization** - Each user can customize their view
3. **A/B Testing** - Test different layouts easily
4. **Mobile Optimization** - Different configs for mobile/desktop
5. **Quick Fixes** - Change spacing without code deploy
6. **Accessibility** - Users can adjust for their needs

## Example Use Cases

**Compact Mode:**
```json
{
  "sections": [
    { "id": "item_info", "spacing": "2" },
    { "id": "quick_price", "spacing": "2" },
    { "id": "action_buttons", "spacing": "2" }
  ],
  "container_padding": "2"
}
```

**Power User Mode:**
```json
{
  "sections": [
    { "id": "item_info", "spacing": "1" },
    { "id": "badges", "visible": false },
    { "id": "up_next", "visible": false },
    { "id": "action_buttons", "spacing": "1" }
  ]
}
```

**Beginner Mode:**
```json
{
  "sections": [
    { "id": "help_guide", "visible": true, "spacing": "4" },
    { "id": "item_info", "spacing": "6" },
    { "id": "action_buttons", "spacing": "6" }
  ]
}
```

## Migration Strategy

1. Keep current NextItemSuggestion.js working
2. Build new section components alongside
3. Create LayoutRenderer with feature flag
4. Test with admin users
5. Gradually migrate users to new system
6. Remove old code once stable

## Future Enhancements

- Visual theme editor (colors, fonts)
- Component size controls
- Custom CSS injection
- Layout marketplace (share layouts)
- AI-suggested layouts based on usage
- Responsive breakpoint controls
