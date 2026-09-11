import React, { useState } from 'react';
import { Check, X, Edit2, User, Store, Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';

const PriceReviewCard = ({ price, onApprove, onReject, onEdit, showActions = true }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrice, setEditedPrice] = useState(price.price);
  const [editedQuantity, setEditedQuantity] = useState(price.quantity);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleSaveEdit = () => {
    onEdit(price.id, {
      price: parseFloat(editedPrice),
      quantity: parseFloat(editedQuantity)
    });
    setIsEditing(false);
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(price.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 transition-all ${
        price.is_outlier 
          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' 
          : price.status === 'pending'
          ? 'border-orange-300 dark:border-orange-700'
          : 'border-gray-200 dark:border-gray-700'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{price.item_icon || '📦'}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {price.item_name}
              </h3>
              {price.category && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {price.category}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {price.is_outlier && (
              <span className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Outlier {price.outlier_score && `(${parseFloat(price.outlier_score).toFixed(1)}%)`}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              price.status === 'approved' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : price.status === 'rejected'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            }`}>
              {price.status.charAt(0).toUpperCase() + price.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Price</p>
            {isEditing ? (
              <input
                type="number"
                step="0.01"
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                className="w-full px-2 py-1 border rounded text-lg font-bold"
              />
            ) : (
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${parseFloat(price.price).toFixed(2)}
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quantity</p>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={editedQuantity}
                onChange={(e) => setEditedQuantity(e.target.value)}
                className="w-full px-2 py-1 border rounded text-lg font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {parseFloat(price.quantity)} {price.unit || ''}
              </p>
            )}
          </div>

          {price.avg_price && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average Price</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                ${parseFloat(price.avg_price).toFixed(2)}
              </p>
            </div>
          )}

          {price.avg_price && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Difference</p>
              <p className={`text-lg font-bold ${
                parseFloat(price.price) > parseFloat(price.avg_price)
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {parseFloat(price.price) > parseFloat(price.avg_price) ? '+' : ''}
                ${(parseFloat(price.price) - parseFloat(price.avg_price)).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {price.username && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{price.username}</span>
            </div>
          )}
          {price.store_name && (
            <div className="flex items-center gap-1">
              <Store className="w-4 h-4" />
              <span>{price.store_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(price.created_at)}</span>
          </div>
        </div>

        {/* Notes/Rejection Reason */}
        {price.notes && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> {price.notes}
            </p>
          </div>
        )}

        {price.rejection_reason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
            <p className="text-sm text-red-900 dark:text-red-100">
              <strong>Rejected:</strong> {price.rejection_reason}
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Check className="w-4 h-4 inline mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedPrice(price.price);
                    setEditedQuantity(price.quantity);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {price.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApprove(price.id)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Check className="w-4 h-4 inline mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <X className="w-4 h-4 inline mr-2" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4 inline mr-2" />
                  Edit
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        onConfirm={handleReject}
        title="Reject Price Submission"
        confirmText="Reject"
        confirmStyle="danger"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Please provide a reason for rejecting this price submission:
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Price seems incorrect for this quantity, Duplicate entry, etc."
            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
            rows="4"
          />
        </div>
      </ConfirmModal>
    </>
  );
};

export default PriceReviewCard;
