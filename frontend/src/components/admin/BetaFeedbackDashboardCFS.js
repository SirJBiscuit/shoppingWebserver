import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Bug, Lightbulb, Star, MessageCircle, Filter, Search,
  AlertTriangle, CheckCircle, Clock, XCircle, Send, Eye, Trash2,
  ThumbsUp, TrendingUp, AlertCircle, Zap, Package, Smile
} from 'lucide-react';
import api from '../../services/api';

const BetaFeedbackDashboardCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, bug, feature, idea, general
  const [filterStatus, setFilterStatus] = useState('all'); // all, new, in_progress, planned, fixed, etc.
  const [filterSeverity, setFilterSeverity] = useState('all'); // all, critical, high, medium, low
  const [sortBy, setSortBy] = useState('created_at'); // created_at, votes, severity

  // Default configuration
  const defaultConfig = {
    showResolved: true,
    defaultSort: 'created_at',
    ...config
  };

  useEffect(() => {
    if (!isEditing) {
      fetchFeedback();
    }
  }, [isEditing]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await api.get('/beta/feedback/admin/all');
      setFeedback(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (feedbackId, newStatus) => {
    try {
      await api.patch(`/beta/feedback/admin/${feedbackId}/status`, { status: newStatus });
      setFeedback(feedback.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleUpdateSeverity = async (feedbackId, newSeverity) => {
    try {
      await api.patch(`/beta/feedback/admin/${feedbackId}/severity`, { severity: newSeverity });
      setFeedback(feedback.map(f => f.id === feedbackId ? { ...f, severity: newSeverity } : f));
    } catch (error) {
      console.error('Error updating severity:', error);
      alert('Failed to update severity');
    }
  };

  const handleSendResponse = async () => {
    if (!adminResponse.trim() || !selectedFeedback) return;

    setSendingResponse(true);
    try {
      await api.post(`/beta/feedback/admin/${selectedFeedback.id}/respond`, {
        response: adminResponse.trim()
      });
      
      setShowResponseModal(false);
      setAdminResponse('');
      fetchFeedback(); // Refresh to get updated data
      alert('Response sent successfully!');
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback? This cannot be undone.')) return;

    try {
      await api.delete(`/beta/feedback/admin/${feedbackId}`);
      setFeedback(feedback.filter(f => f.id !== feedbackId));
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  // Filter and sort feedback
  const filteredFeedback = feedback
    .filter(f => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          f.title?.toLowerCase().includes(search) ||
          f.description?.toLowerCase().includes(search) ||
          f.beta_tester_display_name?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .filter(f => filterType === 'all' || f.type === filterType)
    .filter(f => filterStatus === 'all' || f.status === filterStatus)
    .filter(f => filterSeverity === 'all' || f.severity === filterSeverity)
    .sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return (b.vote_count || 0) - (a.vote_count || 0);
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  if (isEditing) {
    return (
      <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Beta Feedback Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View, manage, and respond to beta tester feedback
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
              Bugs
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              Features
            </span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              Ideas
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              General
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
          <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
        </div>
      </div>
    );
  }

  const bugCount = feedback.filter(f => f.type === 'bug').length;
  const featureCount = feedback.filter(f => f.type === 'feature').length;
  const criticalBugs = feedback.filter(f => f.type === 'bug' && f.severity === 'critical').length;
  const topVoted = feedback.filter(f => f.type === 'feature').sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))[0];

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-purple-600" />
            Beta Feedback Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and respond to beta tester feedback
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Feedback</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feedback.length}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bugs Reported</p>
              <p className="text-2xl font-bold text-red-600">{bugCount}</p>
              {criticalBugs > 0 && (
                <p className="text-xs text-red-500">{criticalBugs} critical</p>
              )}
            </div>
            <Bug className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Feature Requests</p>
              <p className="text-2xl font-bold text-blue-600">{featureCount}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Top Voted</p>
              <p className="text-2xl font-bold text-orange-600">{topVoted?.vote_count || 0}</p>
              {topVoted && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{topVoted.title}</p>
              )}
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
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
                placeholder="Search feedback..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="bug">🐛 Bugs</option>
            <option value="feature">✨ Features</option>
            <option value="idea">💡 Ideas</option>
            <option value="general">📝 General</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="planned">Planned</option>
            <option value="fixed">Fixed</option>
            <option value="wont_fix">Won't Fix</option>
            <option value="duplicate">Duplicate</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Severity</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="created_at">Sort by Date</option>
            <option value="votes">Sort by Votes</option>
            <option value="severity">Sort by Severity</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filteredFeedback.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No feedback found</p>
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <FeedbackCard
              key={item.id}
              feedback={item}
              onViewDetails={() => {
                setSelectedFeedback(item);
                setShowDetailsModal(true);
              }}
              onRespond={() => {
                setSelectedFeedback(item);
                setShowResponseModal(true);
              }}
              onUpdateStatus={handleUpdateStatus}
              onUpdateSeverity={handleUpdateSeverity}
              onDelete={() => handleDeleteFeedback(item.id)}
            />
          ))
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedFeedback && (
          <FeedbackDetailsModal
            feedback={selectedFeedback}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedFeedback(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Response Modal */}
      <AnimatePresence>
        {showResponseModal && selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Send className="w-6 h-6 text-purple-600" />
                  Send Response
                </h3>
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedFeedback(null);
                    setAdminResponse('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Responding to: <strong>{selectedFeedback.title}</strong>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  From: {selectedFeedback.beta_tester_display_name}
                </p>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Thank you for your feedback. We're working on this..."
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setSelectedFeedback(null);
                    setAdminResponse('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={sendingResponse}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendResponse}
                  disabled={sendingResponse || !adminResponse.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {sendingResponse ? (
                    <>
                      <Send className="w-5 h-5 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Response
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeedbackCard = ({ feedback, onViewDetails, onRespond, onUpdateStatus, onUpdateSeverity, onDelete }) => {
  const typeIcons = {
    bug: Bug,
    feature: Zap,
    idea: Lightbulb,
    general: MessageCircle
  };

  const typeColors = {
    bug: 'red',
    feature: 'blue',
    idea: 'purple',
    general: 'green'
  };

  const severityColors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'green'
  };

  const statusColors = {
    new: 'blue',
    in_progress: 'yellow',
    planned: 'purple',
    fixed: 'green',
    wont_fix: 'gray',
    duplicate: 'gray'
  };

  const Icon = typeIcons[feedback.type] || MessageSquare;
  const typeColor = typeColors[feedback.type] || 'gray';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-l-4 border-${typeColor}-500`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-5 h-5 text-${typeColor}-600`} />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {feedback.title}
            </h4>
            <span className={`px-2 py-1 bg-${statusColors[feedback.status]}-100 dark:bg-${statusColors[feedback.status]}-900/30 text-${statusColors[feedback.status]}-700 dark:text-${statusColors[feedback.status]}-300 text-xs font-medium rounded-full`}>
              {feedback.status.replace('_', ' ')}
            </span>
            {feedback.severity && (
              <span className={`px-2 py-1 bg-${severityColors[feedback.severity]}-100 dark:bg-${severityColors[feedback.severity]}-900/30 text-${severityColors[feedback.severity]}-700 dark:text-${severityColors[feedback.severity]}-300 text-xs font-medium rounded-full`}>
                {feedback.severity}
              </span>
            )}
            {feedback.vote_count > 0 && (
              <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <ThumbsUp className="w-4 h-4" />
                {feedback.vote_count}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {feedback.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>From: {feedback.beta_tester_display_name}</span>
            <span>•</span>
            <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
            {feedback.admin_response && (
              <>
                <span>•</span>
                <span className="text-green-600 dark:text-green-400">✓ Responded</span>
              </>
            )}
          </div>
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
            onClick={onRespond}
            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            title="Respond"
          >
            <Send className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const FeedbackDetailsModal = ({ feedback, onClose }) => {
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
            Feedback Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Title & Type */}
          <div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {feedback.title}
            </h4>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full">
                {feedback.type}
              </span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                {feedback.status}
              </span>
              {feedback.severity && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-full">
                  {feedback.severity}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h5>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {feedback.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Submitted by:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {feedback.beta_tester_display_name}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(feedback.created_at).toLocaleString()}
              </p>
            </div>
            {feedback.vote_count > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Votes:</span>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {feedback.vote_count}
                </p>
              </div>
            )}
            {feedback.experience_rating && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Experience Rating:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {feedback.experience_rating}/5 ⭐
                </p>
              </div>
            )}
          </div>

          {/* Admin Response */}
          {feedback.admin_response && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                Admin Response
              </h5>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {feedback.admin_response}
              </p>
              {feedback.responded_at && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(feedback.responded_at).toLocaleString()}
                </p>
              )}
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

export default BetaFeedbackDashboardCFS;
