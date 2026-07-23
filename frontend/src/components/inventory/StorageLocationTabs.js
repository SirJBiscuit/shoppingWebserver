import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

/**
 * StorageLocationTabs - Tabs for switching between storage locations
 * Supports default locations (Pantry, Fridge, Freezer) and custom locations
 */
const StorageLocationTabs = ({ 
  locations, 
  activeLocation, 
  onLocationChange,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  itemCounts = {}
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  // Default locations
  const defaultLocations = locations?.default || [
    { id: 'pantry', name: 'Pantry', icon: '🥫', color: '#8B4513', isDefault: true },
    { id: 'fridge', name: 'Fridge', icon: '🧊', color: '#60A5FA', isDefault: true },
    { id: 'freezer', name: 'Freezer', icon: '❄️', color: '#3B82F6', isDefault: true }
  ];

  // Custom locations
  const customLocations = locations?.custom || [];

  // All locations combined
  const allLocations = [...defaultLocations, ...customLocations];

  return (
    <div className="mb-6">
      {/* Tabs Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {/* All Items Tab */}
        <button
          onClick={() => onLocationChange(null)}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap
            ${!activeLocation 
              ? 'bg-blue-600 text-white shadow-lg scale-105' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <span className="text-xl">📦</span>
          <span>All Items</span>
          {itemCounts.total > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-sm">
              {itemCounts.total}
            </span>
          )}
        </button>

        {/* Default Location Tabs */}
        {defaultLocations.map((location) => (
          <button
            key={location.id}
            onClick={() => onLocationChange(location.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap
              ${activeLocation === location.id
                ? 'text-white shadow-lg scale-105' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            style={activeLocation === location.id ? { backgroundColor: location.color } : {}}
          >
            <span className="text-xl">{location.icon}</span>
            <span>{location.name}</span>
            {itemCounts[location.id] > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-sm">
                {itemCounts[location.id]}
              </span>
            )}
          </button>
        ))}

        {/* Custom Location Tabs */}
        {customLocations.map((location) => (
          <div key={location.id} className="relative group">
            <button
              onClick={() => onLocationChange(`custom_${location.id}`)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap
                ${activeLocation === `custom_${location.id}`
                  ? 'text-white shadow-lg scale-105' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
              style={activeLocation === `custom_${location.id}` ? { backgroundColor: location.color } : {}}
            >
              <span className="text-xl">{location.icon}</span>
              <span>{location.name}</span>
              {itemCounts[`custom_${location.id}`] > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white bg-opacity-30 rounded-full text-sm">
                  {itemCounts[`custom_${location.id}`]}
                </span>
              )}
            </button>

            {/* Edit/Delete buttons (show on hover) */}
            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLocation(location);
                }}
                className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${location.name}"?`)) {
                    onDeleteLocation(location.id);
                  }
                }}
                className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Custom Location Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all whitespace-nowrap shadow-lg"
        >
          <Plus size={20} />
          <span>Add Location</span>
        </button>
      </div>

      {/* Add/Edit Location Modal */}
      {(showAddModal || editingLocation) && (
        <LocationModal
          location={editingLocation}
          onSave={(locationData) => {
            if (editingLocation) {
              onEditLocation(editingLocation.id, locationData);
              setEditingLocation(null);
            } else {
              onAddLocation(locationData);
              setShowAddModal(false);
            }
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditingLocation(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * LocationModal - Modal for adding/editing custom storage locations
 */
const LocationModal = ({ location, onSave, onClose }) => {
  const [name, setName] = useState(location?.name || '');
  const [icon, setIcon] = useState(location?.icon || '📦');
  const [color, setColor] = useState(location?.color || '#6B7280');

  const commonIcons = ['📦', '🏺', '🍷', '🧴', '🥫', '🗄️', '🧊', '❄️', '🌡️', '🔥'];
  const commonColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#6B7280', '#8B4513', '#000000'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, icon, color });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {location ? 'Edit Location' : 'Add Custom Location'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Location Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wine Rack, Shelf 1, Garage Freezer"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Icon Picker */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {commonIcons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`
                    text-3xl p-3 rounded-lg transition-all
                    ${icon === emoji 
                      ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 scale-110' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="grid grid-cols-10 gap-2">
              {commonColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`
                    w-8 h-8 rounded-full transition-all
                    ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}
                  `}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              <span className="text-xl">{icon}</span>
              <span>{name || 'Location Name'}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {location ? 'Save Changes' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StorageLocationTabs;
