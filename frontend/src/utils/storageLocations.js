/**
 * Shared default storage locations for Home Inventory.
 * Mirrors the `default` array returned by GET /inventory/locations
 * (backend/src/routes/inventory_enhanced.js) — keep the two in sync.
 *
 * UI fallbacks (tabs, maps, add-item picker) use this when the API
 * hasn't loaded yet or when rendering a static option list.
 */
export const DEFAULT_STORAGE_LOCATIONS = [
  { id: 'pantry',            name: 'Pantry',            icon: '🥫', color: '#8B4513' },
  { id: 'fridge',            name: 'Fridge',            icon: '🧊', color: '#60A5FA' },
  { id: 'freezer',           name: 'Freezer',           icon: '❄️', color: '#3B82F6' },
  { id: 'counter',           name: 'Counter',           icon: '🍞', color: '#D97706' },
  { id: 'spice_rack',        name: 'Spice Rack',        icon: '🌶️', color: '#DC2626' },
  { id: 'cabinet',           name: 'Cabinet',           icon: '🗄️', color: '#78716C' },
  { id: 'medicine_cabinet',  name: 'Medicine Cabinet',  icon: '💊', color: '#EF4444' },
  { id: 'bathroom',          name: 'Bathroom',          icon: '🛁', color: '#0EA5E9' },
  { id: 'laundry_room',      name: 'Laundry Room',      icon: '🧺', color: '#8B5CF6' },
  { id: 'closet',            name: 'Closet',            icon: '🚪', color: '#A16207' },
  { id: 'garage',            name: 'Garage',            icon: '🔧', color: '#6B7280' },
  { id: 'basement',          name: 'Basement',          icon: '📦', color: '#57534E' },
  { id: 'attic',             name: 'Attic',             icon: '🏠', color: '#B45309' },
  { id: 'shed',              name: 'Shed',              icon: '🌱', color: '#16A34A' },
  { id: 'office',            name: 'Office',            icon: '📎', color: '#4F46E5' },
  { id: 'car',               name: 'Car',               icon: '🚗', color: '#0891B2' },
];

// Legacy alias kept for callers that grouped on the old three-location set.
export const LEGACY_LOCATION_IDS = ['pantry', 'fridge', 'freezer'];

export const getLocationMeta = (id) =>
  DEFAULT_STORAGE_LOCATIONS.find((l) => l.id === id) || null;
