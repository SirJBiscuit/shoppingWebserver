import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Star, MapPin, Calendar, Activity, MessageSquare, Award,
  Send, UserCheck, UserX, Trash2, Clock, Package, TrendingUp,
  Filter, Search, ChevronDown, Eye, Gift, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import CustomNotification from '../CustomNotification';

const BetaTesterManagementCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const { notification, hideNotification, confirm, confirmDelete } = useNotification();
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTester, setSelectedTester] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [sortBy, setSortBy] = useState('quality'); // quality, activity, feedback, items

  // Default configuration
  const defaultConfig = {
    showInactive: true,
    defaultSort: 'quality',
    ...config
  };

  useEffect(() => {
    if (!isEditing) {
      fetchTesters();
    }
  }, [isEditing]);

  const fetchTesters = async () => {
    setLoading(true);
    try {
      const response = await api.get('/beta/admin/testers');
      setTesters(response.data);
    } catch (error) {
      console.error('Error fetching beta testers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDataQuality = (tester) => {
    const itemScore = Math.min((tester.items_added || 0) * 2, 100);
    const aisleScore = Math.min((tester.aisles_reported || 0) * 3, 100);
    const feedbackScore = Math.min((tester.feedback_count || 0) * 5, 100);
    const activityScore = tester.last_active ? 100 : 50;
    
    return Math.round((itemScore + aisleScore + feedbackScore + activityScore) / 4);
  };

  const getActivityLevel = (tester) => {
    if (!tester.last_active) return 'inactive';
    const daysSinceActive = Math.floor((Date.now() - new Date(tester.last_active)) / (1000 * 60 * 60 * 24));
    if (daysSinceActive <= 1) return 'very-high';
    if (daysSinceActive <= 7) return 'high';
    if (daysSinceActive <= 30) return 'medium';
    return 'low';
  };

  const handleSendThankYou = async () => {
    if (!thankYouMessage.trim() || !selectedTester) return;

    setSendingMessage(true);
    try {
      await api.post(`/beta/admin/testers/${selectedTester.id}/thank-you`, {
        message: thankYouMessage.trim()
      });
      
      setShowThankYouModal(false);
      setThankYouMessage('');
      alert('Thank you message sent successfully!');
    } catch (error) {
      console.error('Error sending thank you:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleConvertToUser = (testerId) => {
    confirm(
      'Convert this beta tester to a full user? They will lose beta tester status.',
      async () => {
        try {
          await api.post(`/beta/admin/testers/${testerId}/convert`);
          setTesters(testers.filter(t => t.id !== testerId));
          alert('Beta tester converted to full user successfully!');
        } catch (error) {
          console.error('Error converting tester:', error);
          alert('Failed to convert tester');
        }
      },
      null,
      'Convert to Full User'
    );
  };

  const handleRemoveTester = (testerId) => {
    confirmDelete(
      'this beta tester',
      async () => {
        try {
          await api.delete(`/beta/admin/testers/${testerId}`);
          setTesters(testers.filter(t => t.id !== testerId));
          alert('Beta tester removed successfully!');
        } catch (error) {
          console.error('Error removing tester:', error);
          alert('Failed to remove tester');
        }
      }
    );
  };

  // Filter and sort testers
  const filteredTesters = testers
    .filter(t => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          t.display_name?.toLowerCase().includes(search) ||
          t.beta_username?.toLowerCase().includes(search) ||
          t.state?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .filter(t => {
      // Status filter
      if (filterStatus === 'active') return getActivityLevel(t) !== 'inactive';
      if (filterStatus === 'inactive') return getActivityLevel(t) === 'inactive';
      return true;
    })
    .sort((a, b) => {
      // Sort
      switch (sortBy) {
        case 'quality':
          return calculateDataQuality(b) - calculateDataQuality(a);
        case 'activity':
          return new Date(b.last_active || 0) - new Date(a.last_active || 0);
        case 'feedback':
          return (b.feedback_count || 0) - (a.feedback_count || 0);
        case 'items':
          return (b.items_added || 0) - (a.items_added || 0);
        default:
          return 0;
      }
    });

  if (isEditing) {
    return (
      <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700">
        <div className="text-center">
          <Users className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Beta Tester Management
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View, manage, and appreciate your beta testers
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              View Details
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              Send Thanks
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              Convert to User
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading beta testers...</p>
        </div>
      </div>
    );
  }

  const activeTesters = testers.filter(t => getActivityLevel(t) !== 'inactive').length;
  const totalFeedback = testers.reduce((sum, t) => sum + (t.feedback_count || 0), 0);
  const totalItems = testers.reduce((sum, t) => sum + (t.items_added || 0), 0);
  const avgQuality = Math.round(testers.reduce((sum, t) => sum + calculateDataQuality(t), 0) / testers.length);

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            Beta Tester Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and appreciate your beta testing community
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Testers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{testers.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeTesters}</p>
            </div>
            <Activity className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Feedback</p>
              <p className="text-2xl font-bold text-blue-600">{totalFeedback}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</p>
              <p className="text-2xl font-bold text-orange-600">{avgQuality}%</p>
            </div>
            <Award className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, username, or location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="quality">Sort by Quality</option>
            <option value="activity">Sort by Activity</option>
            <option value="feedback">Sort by Feedback</option>
            <option value="items">Sort by Items</option>
          </select>
        </div>
      </div>

      {/* Testers List */}
      <div className="space-y-3">
        {filteredTesters.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No beta testers found</p>
          </div>
        ) : (
          filteredTesters.map((tester) => (
            <TesterCard
              key={tester.id}
              tester={tester}
              qualityScore={calculateDataQuality(tester)}
              activityLevel={getActivityLevel(tester)}
              onViewDetails={() => {
                setSelectedTester(tester);
                setShowDetailsModal(true);
              }}
              onSendThankYou={() => {
                setSelectedTester(tester);
                setShowThankYouModal(true);
              }}
              onConvert={() => handleConvertToUser(tester.id)}
              onRemove={() => handleRemoveTester(tester.id)}
            />
          ))
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedTester && (
          <TesterDetailsModal
            tester={selectedTester}
            qualityScore={calculateDataQuality(selectedTester)}
            activityLevel={getActivityLevel(selectedTester)}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTester(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Thank You Modal */}
      <AnimatePresence>
        {showThankYouModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-6 h-6 text-purple-600" />
                  Send Thank You
                </h3>
                <button
                  onClick={() => {
                    setShowThankYouModal(false);
                    setSelectedTester(null);
                    setThankYouMessage('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Sending to: <strong>{selectedTester.display_name}</strong>
                </p>
                <textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Thank you for your valuable feedback and contributions..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowThankYouModal(false);
                    setSelectedTester(null);
                    setThankYouMessage('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={sendingMessage}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendThankYou}
                  disabled={sendingMessage || !thankYouMessage.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sendingMessage ? (
                    <>
                      <Send className="w-5 h-5 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <CustomNotification {...notification} onClose={hideNotification} />
    </div>
  );
};

const TesterCard = ({ tester, qualityScore, activityLevel, onViewDetails, onSendThankYou, onConvert, onRemove }) => {
  const stars = Math.round(qualityScore / 20);
  
  const activityColors = {
    'very-high': 'green',
    'high': 'blue',
    'medium': 'yellow',
    'low': 'orange',
    'inactive': 'gray'
  };
  
  const activityLabels = {
    'very-high': 'Very Active',
    'high': 'Active',
    'medium': 'Moderate',
    'low': 'Low Activity',
    'inactive': 'Inactive'
  };

  const color = activityColors[activityLevel];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-l-4 border-purple-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {tester.display_name || tester.beta_username}
            </h4>
            <span className={`px-2 py-1 bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 text-xs font-medium rounded-full`}>
              {activityLabels[activityLevel]}
            </span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < stars
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              {qualityScore}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{tester.state}, {tester.country}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>{tester.items_added || 0} items</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>{tester.feedback_count || 0} feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(tester.registered_at).toLocaleDateString()}</span>
            </div>
          </div>

          {tester.last_active && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last active: {new Date(tester.last_active).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={onViewDetails}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={onSendThankYou}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            title="Send Thank You"
          >
            <Gift className="w-5 h-5" />
          </button>
          <button
            onClick={onConvert}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Convert to User"
          >
            <UserCheck className="w-5 h-5" />
          </button>
          <button
            onClick={onRemove}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const TesterDetailsModal = ({ tester, qualityScore, activityLevel, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Beta Tester Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <AlertCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Display Name:</span>
                <p className="font-medium text-gray-900 dark:text-white">{tester.display_name}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Username:</span>
                <p className="font-medium text-gray-900 dark:text-white">{tester.beta_username}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Location:</span>
                <p className="font-medium text-gray-900 dark:text-white">{tester.state}, {tester.country}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Registered:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(tester.registered_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Quality Score</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-purple-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${qualityScore}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-600">{qualityScore}%</span>
            </div>
          </div>

          {/* Contributions */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contributions</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tester.items_added || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Items Added</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tester.aisles_reported || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aisles Reported</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <MessageSquare className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tester.feedback_count || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Feedback</p>
              </div>
            </div>
          </div>

          {/* Activity */}
          {tester.last_active && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Activity</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last active: {new Date(tester.last_active).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
};

export default BetaTesterManagementCFS;
