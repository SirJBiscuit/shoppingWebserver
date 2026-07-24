import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import fingerprintsAPI from '../services/fingerprintsAPI';

/**
 * AdminItemReview - Review and approve/reject flagged items
 * Prevents bad data from polluting the learning system
 */
const AdminItemReview = () => {
  const { toast, success, showError } = useToast();
  const [pendingItems, setPendingItems] = useState([]);
  const [reviewedItems, setReviewedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // pending or reviewed
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadItems();
    loadStats();
  }, [activeTab]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await fingerprintsAPI.getReviewQueue(activeTab);
      
      if (activeTab === 'pending') {
        setPendingItems(response.items || []);
      } else {
        setReviewedItems(response.items || []);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
      showError('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fingerprintsAPI.getReviewQueueStats();
      setStats({
        pending: parseInt(response.pending) || 0,
        approved: parseInt(response.approved) || 0,
        rejected: parseInt(response.rejected) || 0,
        avgConfidence: parseFloat(response.avg_confidence) || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleApprove = async (itemId) => {
    try {
      await fingerprintsAPI.approveItem(itemId);
      success('Item approved and added to learning system');
      loadItems();
      loadStats();
    } catch (error) {
      console.error('Failed to approve item:', error);
      showError('Failed to approve item');
    }
  };

  const handleReject = async (itemId) => {
    try {
      await fingerprintsAPI.rejectItem(itemId);
      success('Item rejected and excluded from learning');
      loadItems();
      loadStats();
    } catch (error) {
      console.error('Failed to reject item:', error);
      showError('Failed to reject item');
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return 'text-green-600 dark:text-green-400';
    if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceBg = (score) => {
    if (score >= 0.7) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 0.5) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const filteredItems = (activeTab === 'pending' ? pendingItems : reviewedItems).filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterReason === 'all' || item.reason.includes(filterReason);
    return matchesSearch && matchesFilter;
  });

  return (
    <PageTransition>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="max-w-[1800px] mx-auto p-3 sm:p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={32} className="text-orange-600 dark:text-orange-400" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Item Review Queue
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Review and approve items before they contribute to the learning system
              </p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-4 border-2 border-orange-300 dark:border-orange-700">
                  <div className="text-sm text-orange-800 dark:text-orange-300 font-semibold">Pending Review</div>
                  <div className="text-3xl font-bold text-orange-900 dark:text-orange-200">{stats.pending}</div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4 border-2 border-green-300 dark:border-green-700">
                  <div className="text-sm text-green-800 dark:text-green-300 font-semibold">Approved</div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-200">{stats.approved}</div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4 border-2 border-red-300 dark:border-red-700">
                  <div className="text-sm text-red-800 dark:text-red-300 font-semibold">Rejected</div>
                  <div className="text-3xl font-bold text-red-900 dark:text-red-200">{stats.rejected}</div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-4 border-2 border-blue-300 dark:border-blue-700">
                  <div className="text-sm text-blue-800 dark:text-blue-300 font-semibold">Avg Confidence</div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-200">
                    {(stats.avgConfidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Pending ({stats?.pending || 0})
              </button>
              <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  activeTab === 'reviewed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Reviewed
              </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-gray-400" />
                  <select
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Reasons</option>
                    <option value="suspicious">Suspicious Pattern</option>
                    <option value="confidence">Low Confidence</option>
                    <option value="length">Invalid Length</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'pending' ? 'No items pending review' : 'No reviewed items'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="text-4xl">
                            {item.barcode ? '📦' : '❓'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                              {item.item_name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {item.category && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium">
                                  {item.category}
                                </span>
                              )}
                              {item.brand && (
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium">
                                  {item.brand}
                                </span>
                              )}
                              {item.barcode && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-xs font-mono">
                                  {item.barcode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <AlertTriangle size={14} />
                              <span>{item.reason}</span>
                            </div>
                          </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Confidence:
                          </span>
                          <div className={`px-3 py-1 rounded-lg ${getConfidenceBg(item.confidence_score)}`}>
                            <span className={`text-sm font-bold ${getConfidenceColor(item.confidence_score)}`}>
                              {(item.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                item.confidence_score >= 0.7 ? 'bg-green-500' :
                                item.confidence_score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${item.confidence_score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {activeTab === 'pending' && (
                        <div className="flex gap-3 w-full md:w-auto">
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={20} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="flex-1 md:flex-none px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle size={20} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Toast {...toast} />
      </div>
    </PageTransition>
  );
};

export default AdminItemReview;
