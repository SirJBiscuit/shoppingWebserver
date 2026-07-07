import React, { useState, useEffect } from 'react';
import { X, Camera, DollarSign, Calendar, Package, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ItemDetailsModal = ({ item, isOpen, onClose, onSave }) => {
  const [editedItem, setEditedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (item) {
      setEditedItem({
        ...item,
        image_url: item.image_url || '',
        expiry_date: item.expiry_date || '',
        next_purchase_date: item.next_purchase_date || '',
        custom_price: item.custom_price || item.price || '',
        notes: item.notes || '',
      });
    }
  }, [item]);

  if (!isOpen || !editedItem) return null;

  const handleSave = () => {
    onSave(editedItem);
    setIsEditing(false);
    onClose();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedItem({ ...editedItem, image_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const daysUntilExpiry = editedItem.expiry_date 
    ? Math.ceil((new Date(editedItem.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">{editedItem.item_icon || '📦'}</span>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem.item_name}
                    onChange={(e) => setEditedItem({ ...editedItem, item_name: e.target.value })}
                    className="input-field text-xl font-bold"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editedItem.item_name}
                  </h2>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {editedItem.category_name || editedItem.category || 'Uncategorized'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Image
            </label>
            {editedItem.image_url ? (
              <div className="relative">
                <img
                  src={editedItem.image_url}
                  alt={editedItem.item_name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {isEditing && (
                  <button
                    onClick={() => setEditedItem({ ...editedItem, image_url: '' })}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                {isEditing ? (
                  <label className="cursor-pointer">
                    <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload image
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <>
                    <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No image available
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Quantity & Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity & Size
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={editedItem.quantity || 1}
                  onChange={(e) => setEditedItem({ ...editedItem, quantity: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="input-field flex-1"
                />
                <input
                  type="text"
                  value={editedItem.unit || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, unit: e.target.value })}
                  disabled={!isEditing}
                  placeholder="oz, lb, etc."
                  className="input-field w-24"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Custom Price (overrides auto-price)
              </label>
              <input
                type="number"
                step="0.01"
                value={editedItem.custom_price || ''}
                onChange={(e) => setEditedItem({ ...editedItem, custom_price: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter price"
                className="input-field"
              />
              {editedItem.price && !editedItem.custom_price && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-price: ${editedItem.price}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Expiry Date
              </label>
              <input
                type="date"
                value={editedItem.expiry_date || ''}
                onChange={(e) => setEditedItem({ ...editedItem, expiry_date: e.target.value })}
                disabled={!isEditing}
                className="input-field"
              />
              {daysUntilExpiry !== null && (
                <p className={`text-xs mt-1 ${
                  isExpired ? 'text-red-600 dark:text-red-400' :
                  isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {isExpired ? `Expired ${Math.abs(daysUntilExpiry)} days ago` :
                   isExpiringSoon ? `Expires in ${daysUntilExpiry} days` :
                   `${daysUntilExpiry} days until expiry`}
                </p>
              )}
            </div>

            {/* Next Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Package className="w-4 h-4 mr-1" />
                Next Purchase Date
              </label>
              <input
                type="date"
                value={editedItem.next_purchase_date || ''}
                onChange={(e) => setEditedItem({ ...editedItem, next_purchase_date: e.target.value })}
                disabled={!isEditing}
                className="input-field"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={editedItem.notes || ''}
              onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
              disabled={!isEditing}
              rows={3}
              placeholder="Add notes about this item..."
              className="input-field resize-none"
            />
          </div>

          {/* Purchase History */}
          {editedItem.total_purchases > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Purchase History
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Purchases:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {editedItem.total_purchases}
                  </span>
                </div>
                {editedItem.last_purchase_date && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Last Purchased:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {new Date(editedItem.last_purchase_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex space-x-3">
              <button onClick={handleSave} className="btn-primary flex-1">
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedItem({ ...item });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemDetailsModal;
