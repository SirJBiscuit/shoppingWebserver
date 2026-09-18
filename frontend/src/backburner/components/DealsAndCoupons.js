import React, { useState, useEffect } from 'react';
import { Tag, TrendingDown, Percent, DollarSign, Clock, Star, Copy, Check, ExternalLink } from 'lucide-react';

const DealsAndCoupons = ({ items = [] }) => {
  const [deals, setDeals] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'deals', 'coupons'

  useEffect(() => {
    // Mock deals data - in production, this would fetch from an API
    const mockDeals = [
      {
        id: 1,
        item_name: 'Milk',
        store: 'Walmart',
        original_price: 4.99,
        sale_price: 3.49,
        discount_percent: 30,
        expires: '2026-07-15',
        type: 'deal'
      },
      {
        id: 2,
        item_name: 'Bread',
        store: 'Target',
        original_price: 3.99,
        sale_price: 2.99,
        discount_percent: 25,
        expires: '2026-07-12',
        type: 'deal'
      },
      {
        id: 3,
        code: 'SAVE20',
        description: '$20 off $100+ grocery order',
        store: 'Amazon Fresh',
        discount_amount: 20,
        min_purchase: 100,
        expires: '2026-07-20',
        type: 'coupon'
      },
      {
        id: 4,
        code: 'FRESH15',
        description: '15% off produce',
        store: 'Whole Foods',
        discount_percent: 15,
        category: 'Produce',
        expires: '2026-07-18',
        type: 'coupon'
      }
    ];

    setDeals(mockDeals.filter(d => d.type === 'deal'));
    setCoupons(mockDeals.filter(d => d.type === 'coupon'));
  }, [items]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredDeals = filter === 'all' || filter === 'deals' ? deals : [];
  const filteredCoupons = filter === 'all' || filter === 'coupons' ? coupons : [];
  const totalSavings = deals.reduce((sum, deal) => sum + (deal.original_price - deal.sale_price), 0);

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Tag className="w-6 h-6 mr-2 text-green-600" />
            Deals & Coupons
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Save ${totalSavings.toFixed(2)} with current deals
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('deals')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filter === 'deals'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Deals
          </button>
          <button
            onClick={() => setFilter('coupons')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              filter === 'coupons'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Coupons
          </button>
        </div>
      </div>

      {/* Deals */}
      {filteredDeals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <TrendingDown className="w-5 h-5 mr-2 text-green-600" />
            Price Drops ({filteredDeals.length})
          </h3>
          <div className="space-y-3">
            {filteredDeals.map((deal) => {
              const daysLeft = getDaysUntilExpiry(deal.expires);
              return (
                <div
                  key={deal.id}
                  className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                          {deal.discount_percent}% OFF
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          at {deal.store}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        {deal.item_name}
                      </h4>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${deal.sale_price.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          ${deal.original_price.toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          Save ${(deal.original_price - deal.sale_price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm flex items-center">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coupons */}
      {filteredCoupons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Percent className="w-5 h-5 mr-2 text-blue-600" />
            Digital Coupons ({filteredCoupons.length})
          </h3>
          <div className="space-y-3">
            {filteredCoupons.map((coupon) => {
              const daysLeft = getDaysUntilExpiry(coupon.expires);
              const isCopied = copiedCode === coupon.code;
              return (
                <div
                  key={coupon.id}
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {coupon.store}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {coupon.description}
                      </h4>
                      {coupon.min_purchase && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Min purchase: ${coupon.min_purchase}
                        </p>
                      )}
                      {coupon.category && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Category: {coupon.category}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-3 bg-white dark:bg-gray-800 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded font-mono text-lg font-bold text-center text-blue-600 dark:text-blue-400">
                      {coupon.code}
                    </div>
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="btn-primary flex items-center"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredDeals.length === 0 && filteredCoupons.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No deals available</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Check back later for new savings opportunities
          </p>
        </div>
      )}

      {/* Savings Summary */}
      {(filteredDeals.length > 0 || filteredCoupons.length > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Potential Savings</p>
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                ${totalSavings.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Offers</p>
              <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                {filteredDeals.length + filteredCoupons.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealsAndCoupons;
