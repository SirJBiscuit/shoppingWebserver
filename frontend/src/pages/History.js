import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shoppingAPI } from '../services/api';
import { 
  ArrowLeft, History as HistoryIcon, Calendar, ShoppingCart, 
  DollarSign, Package, TrendingUp, Filter, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    // Load from localStorage
    const saved = localStorage.getItem(`userHistory_${user?.id || user?.username}`);
    if (saved) {
      setActivities(JSON.parse(saved));
    }
    setLoading(false);
  };

  const addActivity = (type, description, metadata = {}) => {
    const activity = {
      id: Date.now(),
      type,
      description,
      metadata,
      timestamp: new Date().toISOString(),
    };

    const updated = [activity, ...activities].slice(0, 100); // Keep last 100
    setActivities(updated);
    localStorage.setItem(`userHistory_${user?.id || user?.username}`, JSON.stringify(updated));
  };

  // Expose globally for other components
  useEffect(() => {
    window.addActivity = addActivity;
    return () => {
      delete window.addActivity;
    };
  }, [activities]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'item_added': return <Package className="w-5 h-5 text-blue-600" />;
      case 'item_completed': return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case 'list_created': return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'list_completed': return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case 'recipe_added': return <Package className="w-5 h-5 text-orange-600" />;
      case 'budget_set': return <DollarSign className="w-5 h-5 text-yellow-600" />;
      case 'level_up': return <TrendingUp className="w-5 h-5 text-primary-600" />;
      default: return <HistoryIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'item_added': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'item_completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'list_created': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'list_completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'recipe_added': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'budget_set': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'level_up': return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter !== 'all' && activity.type !== filter) return false;
    if (searchQuery && !activity.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const groupByDate = (activities) => {
    const groups = {};
    activities.forEach(activity => {
      const date = new Date(activity.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    });
    return groups;
  };

  const groupedActivities = groupByDate(filteredActivities);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading history...</div>
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
                  <HistoryIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Activity History
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activities.length} activities tracked
                    </p>
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities..."
                  className="input-field pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Activities</option>
                  <option value="item_added">Items Added</option>
                  <option value="item_completed">Items Completed</option>
                  <option value="list_created">Lists Created</option>
                  <option value="list_completed">Lists Completed</option>
                  <option value="recipe_added">Recipes Added</option>
                  <option value="level_up">Level Ups</option>
                </select>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          {Object.keys(groupedActivities).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                  <div className="flex items-center mb-4">
                    <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {date}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-4"></div>
                  </div>

                  <div className="space-y-3">
                    {dateActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 border rounded-lg ${getActivityColor(activity.type)}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.description}
                            </p>
                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {Object.entries(activity.metadata).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded"
                                  >
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(activity.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <HistoryIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Activities Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your activity history will appear here as you use the app
              </p>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default History;
