import React, { useState } from 'react';
import { ArrowLeft, Search, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PriceChart from '../components/PriceChart';
import BestDayBadge from '../components/BestDayBadge';
import ShoppingRecommendations from '../components/ShoppingRecommendations';
import TrendingItems from '../components/TrendingItems';

const PriceTrends = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  const handleItemClick = (itemName) => {
    setSelectedItem(itemName);
    setSearchQuery(itemName);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedItem(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                Price Trends & Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Track price changes and find the best days to shop
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an item to see its price history..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart and Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedItem ? (
              <>
                <PriceChart 
                  itemName={selectedItem} 
                  storeName={selectedStore}
                  showControls={true}
                />
                
                <BestDayBadge 
                  itemName={selectedItem}
                  storeName={selectedStore}
                  compact={false}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  Search for an Item
                </h3>
                <p className="text-gray-500">
                  Enter an item name above to view its price history and trends
                </p>
              </div>
            )}

            <TrendingItems 
              onItemClick={handleItemClick}
              maxItems={10}
            />
          </div>

          {/* Right Column - Recommendations */}
          <div className="space-y-6">
            <ShoppingRecommendations 
              onItemClick={handleItemClick}
            />

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <p>We track every price you enter when shopping</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <p>Our system analyzes prices by day, week, and store</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <p>We identify the best days to buy each item</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <p>You save money by shopping on optimal days!</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                💡 Pro Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Track prices consistently for better recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Shop on recommended days to maximize savings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Compare stores to find the best deals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>Check trending items for price drops</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceTrends;
