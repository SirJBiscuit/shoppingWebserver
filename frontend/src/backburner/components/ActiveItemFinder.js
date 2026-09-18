import React, { useState } from 'react';
import { MapPin, DollarSign, Eye, ArrowRight, Clock, SkipForward, X } from 'lucide-react';

const ActiveItemFinder = ({ item, onNext, onSkip, onClose }) => {
  if (!item) return null;

  const handleSkipToLater = () => {
    onSkip(item.id, 'later');
  };

  const handleSkipToOtherStore = () => {
    onSkip(item.id, 'other_store');
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-4xl">{item.item_icon || '📦'}</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Currently Looking For:
            </h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {item.item_name}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Item Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Location */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2 mb-1">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Location</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {item.aisle || 'Aisle 5'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {item.section || 'Dairy Section'}
          </p>
        </div>

        {/* Expected Price */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Expected Price</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            ${parseFloat(item.price || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {item.unit || 'per item'}
          </p>
        </div>

        {/* What it looks like */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2 mb-1">
            <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Look For</span>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {item.brand || 'Any Brand'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {item.package_type || 'Standard package'}
          </p>
        </div>

        {/* Quantity Needed */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Quantity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {item.quantity || 1}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {item.unit || 'items'}
          </p>
        </div>
      </div>

      {/* What's Next */}
      {item.next_item && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Next: {item.next_item.item_icon} {item.next_item.item_name}
              </span>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.next_item.aisle || 'Nearby'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onNext}
          className="flex-1 btn-primary flex items-center justify-center"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Found It - Next Item
        </button>
        <button
          onClick={handleSkipToOtherStore}
          className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center"
        >
          <SkipForward className="w-4 h-4 mr-1" />
          Other Store
        </button>
        <button
          onClick={handleSkipToLater}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center"
        >
          <Clock className="w-4 h-4 mr-1" />
          Next Trip
        </button>
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Notes:</p>
          <p className="text-sm text-gray-900 dark:text-white">{item.notes}</p>
        </div>
      )}
    </div>
  );
};

export default ActiveItemFinder;
