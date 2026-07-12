import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const NextItemSuggestion = ({ nextItem, sameAisleItems = [] }) => {
  if (!nextItem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-green-500 text-white rounded-full p-2">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
              Looking for Next
            </p>
            <div className="flex items-center mt-1">
              <span className="text-3xl mr-2">{nextItem.item_icon || '📦'}</span>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {nextItem.item_name}
                </p>
                {nextItem.aisle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    Aisle {nextItem.aisle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {nextItem.quantity && (
          <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            ×{nextItem.quantity}
          </div>
        )}
      </div>

      {/* Same Aisle Items */}
      {sameAisleItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-2">
            💡 Also in this aisle:
          </p>
          <div className="flex flex-wrap gap-2">
            {sameAisleItems.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg px-3 py-1 text-sm flex items-center space-x-2"
              >
                <span className="text-lg">{item.item_icon || '📦'}</span>
                <span className="text-gray-700 dark:text-gray-300">{item.item_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NextItemSuggestion;
