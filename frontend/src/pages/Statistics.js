import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, DollarSign, ShoppingCart, 
  Package, Calendar, Award, Target, Clock, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { itemsAPI, shoppingAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';

const Statistics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // Load item preferences for stats
      const itemsResponse = await itemsAPI.getPreferences();
      const items = itemsResponse.data || [];

      // Calculate statistics
      const totalItems = items.length;
      const totalPurchases = items.reduce((sum, item) => sum + (item.purchase_count || 0), 0);
      const avgPrice = items.reduce((sum, item) => sum + parseFloat(item.average_price || 0), 0) / totalItems || 0;
      const totalSpent = items.reduce((sum, item) => 
        sum + (parseFloat(item.average_price || 0) * (item.purchase_count || 0)), 0
      );

      // Top items by purchase count
      const topItems = [...items]
        .sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0))
        .slice(0, 10);

      // Most expensive items
      const expensiveItems = [...items]
        .sort((a, b) => parseFloat(b.average_price || 0) - parseFloat(a.average_price || 0))
        .slice(0, 5);

      // Category breakdown
      const categoryStats = items.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) {
          acc[cat] = { count: 0, total: 0 };
        }
        acc[cat].count += item.purchase_count || 0;
        acc[cat].total += parseFloat(item.average_price || 0) * (item.purchase_count || 0);
        return acc;
      }, {});

      setStats({
        totalItems,
        totalPurchases,
        avgPrice,
        totalSpent,
        topItems,
        expensiveItems,
        categoryStats
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading statistics...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-primary-600" />
              Shopping Statistics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Insights into your shopping habits and spending
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Package}
              label="Total Items"
              value={stats.totalItems}
              color="bg-blue-500"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={ShoppingCart}
              label="Total Purchases"
              value={stats.totalPurchases}
              color="bg-green-500"
              iconColor="text-green-600"
            />
            <StatCard
              icon={DollarSign}
              label="Avg Item Price"
              value={`$${stats.avgPrice.toFixed(2)}`}
              color="bg-purple-500"
              iconColor="text-purple-600"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Spent"
              value={`$${stats.totalSpent.toFixed(2)}`}
              color="bg-pink-500"
              iconColor="text-pink-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Items */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-6 h-6 mr-2 text-yellow-500" />
                Most Purchased Items
              </h2>
              <div className="space-y-3">
                {stats.topItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.preferred_icon} {item.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${parseFloat(item.average_price || 0).toFixed(2)} avg
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600 dark:text-primary-400">
                        {item.purchase_count}×
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">purchases</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Expensive */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-green-500" />
                Most Expensive Items
              </h2>
              <div className="space-y-3">
                {stats.expensiveItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.preferred_icon}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.purchase_count}× purchased
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                        ${parseFloat(item.average_price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card lg:col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2 text-blue-500" />
                Spending by Category
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.categoryStats)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 9)
                  .map(([category, data]) => (
                    <div key={category} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">{category}</p>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        ${data.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {data.count} purchases
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Shopping Insights */}
          <div className="card mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-yellow-500" />
              Shopping Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Average per Trip</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${(stats.totalSpent / Math.max(stats.totalPurchases / 10, 1)).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Most Bought Category</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {Object.entries(stats.categoryStats).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Unique Items</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const StatCard = ({ icon: Icon, label, value, color, iconColor }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className={`p-3 ${color} bg-opacity-10 rounded-lg`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
    </div>
  </div>
);

export default Statistics;
