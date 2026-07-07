import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shoppingAPI } from '../services/api';
import { 
  ArrowLeft, TrendingUp, DollarSign, ShoppingCart, 
  Calendar, Package, Award, BarChart3 
} from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const Stats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSpent: 0,
    monthlySpent: 0,
    totalItems: 0,
    totalTrips: 0,
    averagePerTrip: 0,
    topCategories: [],
    recentPurchases: [],
    monthlyTrend: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // This would call a backend stats API endpoint
      // For now, we'll calculate from shopping lists
      const listsResponse = await shoppingAPI.getLists();
      const completedLists = listsResponse.data.filter(l => l.status === 'completed');
      
      let totalSpent = 0;
      let totalItems = 0;
      let monthlySpent = 0;
      const categorySpending = {};
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (const list of completedLists) {
        const itemsResponse = await shoppingAPI.getListItems(list.id);
        const items = itemsResponse.data;
        
        items.forEach(item => {
          const itemCost = (item.price || 0) * (item.quantity || 1);
          totalSpent += itemCost;
          totalItems++;
          
          // Check if this month
          const listDate = new Date(list.completed_at || list.created_at);
          if (listDate.getMonth() === currentMonth && listDate.getFullYear() === currentYear) {
            monthlySpent += itemCost;
          }
          
          // Category breakdown
          const category = item.category_name || item.category || 'Other';
          categorySpending[category] = (categorySpending[category] || 0) + itemCost;
        });
      }

      const topCategories = Object.entries(categorySpending)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      setStats({
        totalSpent,
        monthlySpent,
        totalItems,
        totalTrips: completedLists.length,
        averagePerTrip: completedLists.length > 0 ? totalSpent / completedLists.length : 0,
        topCategories,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading stats...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Shopping Stats
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your shopping insights
                    </p>
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={DollarSign}
              label="Total Spent"
              value={`$${stats.totalSpent.toFixed(2)}`}
              color="text-green-600 dark:text-green-400"
              subtitle="All time"
            />
            <StatCard
              icon={Calendar}
              label="This Month"
              value={`$${stats.monthlySpent.toFixed(2)}`}
              color="text-blue-600 dark:text-blue-400"
              subtitle={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            />
            <StatCard
              icon={ShoppingCart}
              label="Shopping Trips"
              value={stats.totalTrips}
              color="text-purple-600 dark:text-purple-400"
              subtitle={`$${stats.averagePerTrip.toFixed(2)} avg per trip`}
            />
            <StatCard
              icon={Package}
              label="Items Purchased"
              value={stats.totalItems}
              color="text-orange-600 dark:text-orange-400"
              subtitle="Total items"
            />
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />
                Top Categories
              </h2>
              <div className="space-y-4">
                {stats.topCategories.map((category, index) => {
                  const percentage = (category.amount / stats.totalSpent) * 100;
                  return (
                    <div key={category.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {category.name}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ${category.amount.toFixed(2)} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="bg-primary-600 dark:bg-primary-400 h-2 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                Achievements
              </h2>
              <div className="space-y-3">
                {stats.totalTrips >= 10 && (
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Shopping Pro</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Completed {stats.totalTrips} shopping trips
                      </p>
                    </div>
                  </div>
                )}
                {stats.totalSpent >= 500 && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-3xl">💰</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Big Spender</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Spent over $500 total
                      </p>
                    </div>
                  </div>
                )}
                {stats.totalItems >= 100 && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-3xl">📦</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Item Collector</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Purchased {stats.totalItems} items
                      </p>
                    </div>
                  </div>
                )}
                {stats.totalTrips < 10 && stats.totalSpent < 500 && stats.totalItems < 100 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">Keep shopping to unlock achievements!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Stats;
