import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, PieChart, BarChart3, Target, Award } from 'lucide-react';

const AdvancedAnalytics = ({ userId }) => {
  const [timeRange, setTimeRange] = useState('month'); // week, month, year
  const [analytics, setAnalytics] = useState({
    totalSpent: 0,
    totalTrips: 0,
    avgTripCost: 0,
    totalSaved: 0,
    budgetAdherence: 0,
    topCategories: [],
    spendingTrend: [],
    monthlyComparison: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, userId]);

  const loadAnalytics = () => {
    // Mock data - replace with API call
    const mockData = {
      totalSpent: 1247.89,
      totalTrips: 12,
      avgTripCost: 103.99,
      totalSaved: 234.50,
      budgetAdherence: 87,
      topCategories: [
        { name: 'Produce', amount: 345.67, percentage: 28, color: '#10B981' },
        { name: 'Meat & Seafood', amount: 289.34, percentage: 23, color: '#EF4444' },
        { name: 'Dairy', amount: 198.45, percentage: 16, color: '#3B82F6' },
        { name: 'Bakery', amount: 156.78, percentage: 13, color: '#F59E0B' },
        { name: 'Pantry', amount: 257.65, percentage: 20, color: '#8B5CF6' }
      ],
      spendingTrend: [
        { week: 'Week 1', spent: 98.45, budget: 120 },
        { week: 'Week 2', spent: 112.34, budget: 120 },
        { week: 'Week 3', spent: 87.90, budget: 120 },
        { week: 'Week 4', spent: 105.67, budget: 120 }
      ],
      monthlyComparison: [
        { month: 'Jan', spent: 1150, saved: 180 },
        { month: 'Feb', spent: 1089, saved: 210 },
        { month: 'Mar', spent: 1247, saved: 234 }
      ]
    };
    setAnalytics(mockData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-primary-600" />
            Advanced Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your spending and savings
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex space-x-2">
          {['week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-900/40 px-2 py-1 rounded">
              This {timeRange}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(analytics.totalSpent)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            ↓ 8% vs last {timeRange}
          </p>
        </div>

        {/* Shopping Trips */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-900/40 px-2 py-1 rounded">
              Trips
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shopping Trips</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.totalTrips}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Avg: {formatCurrency(analytics.avgTripCost)}
          </p>
        </div>

        {/* Total Saved */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-900/40 px-2 py-1 rounded">
              Savings
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Saved</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(analytics.totalSaved)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            ↑ 15% vs last {timeRange}
          </p>
        </div>

        {/* Budget Adherence */}
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-200 dark:bg-orange-900/40 px-2 py-1 rounded">
              Budget
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget Adherence</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.budgetAdherence}%
          </p>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
              style={{ width: `${analytics.budgetAdherence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category (Pie Chart) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-primary-600" />
              Spending by Category
            </h3>
          </div>
          
          <div className="space-y-3">
            {analytics.topCategories.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {category.name}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                    {category.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>Tip:</strong> You spend the most on produce. Consider buying in-season items to save more!
            </p>
          </div>
        </div>

        {/* Weekly Spending Trend (Bar Chart) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
              Weekly Spending Trend
            </h3>
          </div>

          <div className="space-y-4">
            {analytics.spendingTrend.map((week, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {week.week}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(week.spent)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                      / {formatCurrency(week.budget)}
                    </span>
                  </div>
                </div>
                <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {/* Budget line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: '100%' }}
                  />
                  {/* Spent bar */}
                  <div
                    className={`h-full transition-all duration-500 ${
                      week.spent > week.budget
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${(week.spent / week.budget) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {week.spent > week.budget ? 'Over budget' : 'Under budget'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm text-green-900 dark:text-green-100">
              🎉 <strong>Great job!</strong> You stayed under budget 3 out of 4 weeks!
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary-600" />
            Monthly Comparison
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {analytics.monthlyComparison.map((month, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {month.month}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Spent</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(month.spent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Saved</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(month.saved)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="card bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700">
        <div className="flex items-center mb-4">
          <Award className="w-6 h-6 mr-2 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
              🎯 Budget Performance
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You're doing great! You've stayed under budget 87% of the time this month.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💰 Savings Opportunity
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Switch to store brands for pantry items and save an estimated $45/month.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
              📊 Spending Pattern
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              You spend 15% less when shopping with a list. Keep it up!
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
              🛒 Shopping Frequency
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Shopping once per week saves you $30/month vs multiple trips.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
