# Limbo - Deprecated Components

**⚠️ WARNING: These components are deprecated and should NOT be used in new code.**

This folder contains old components that have been replaced by modern CFS/AVE/MDL/ASI systems.

---

## Purpose

- **Reference Only** - Keep old code for reference during migration
- **No Imports** - Do not import these components in active code
- **Will Be Deleted** - Once modernization is complete, this folder will be removed

---

## Replacement Guide

### Old Component → New Component

**Modals & Confirmations:**
- `ConfirmModal.js` → `CustomNotification` + `useNotification` hook
- `ConfirmDialog.js` → `CustomNotification` + `useNotification` hook
- Old modal components → `CustomPanel`

**Dropdowns:**
- Old `<select>` elements → `CustomDropdownList`
- Custom dropdown components → `CustomDropdownList`

**Panels:**
- Old panel components → `CustomPanel`

**Pantry/Inventory:**
- `PantryEnhanced.js` → `PantryNewV2.js`
- Old pantry components → New inventory components in `/components/inventory/`

**Input Components:**
- Old number inputs → `CustomNumberPad`
- Old search inputs → `CustomSearchBar`

---

## How to Use Modern Components

### CustomNotification (Confirmations)

```javascript
import { useNotification } from '../hooks/useNotification';
import CustomNotification from '../components/CustomNotification';

const MyComponent = () => {
  const { notification, hideNotification, confirmDelete } = useNotification();
  
  const handleDelete = () => {
    confirmDelete(
      'Delete this item?',
      'This action cannot be undone.',
      async () => {
        // Delete logic here
      }
    );
  };
  
  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      <CustomNotification {...notification} onClose={hideNotification} />
    </>
  );
};
```

### CustomPanel (Modals)

```javascript
import CustomPanel from '../components/CustomPanel';

const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <CustomPanel
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="My Panel"
      size="medium"
    >
      <p>Panel content here</p>
    </CustomPanel>
  );
};
```

### CustomDropdownList (Dropdowns)

```javascript
import CustomDropdownList from '../components/CustomDropdownList';

const MyComponent = () => {
  const [value, setValue] = useState('');
  
  return (
    <CustomDropdownList
      value={value}
      onChange={setValue}
      options={[
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' }
      ]}
      placeholder="Select an option"
      searchable
    />
  );
};
```

---

## Migration Checklist

When moving a component to limbo:

1. ✅ Ensure no active code imports it
2. ✅ Replace all usages with modern components
3. ✅ Test the new implementation
4. ✅ Move to appropriate limbo subfolder
5. ✅ Update this README with the mapping

---

## Folder Structure

```
limbo/
├── README.md (this file)
├── components/     # Deprecated UI components
├── pages/          # Deprecated page components
└── modals/         # Deprecated modal components
```

---

## Timeline

- **Phase 1** - Move deprecated components here (Current)
- **Phase 2** - Complete modernization of all active code
- **Phase 3** - Delete limbo folder entirely

---

**Last Updated:** September 25, 2026  
**Status:** Active Migration
