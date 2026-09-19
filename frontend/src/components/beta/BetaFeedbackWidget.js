import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Clock, CheckCircle } from 'lucide-react';
import BetaFeedbackForm from './BetaFeedbackForm';
import api from '../../services/api';

/**
 * Beta Feedback Widget
 * Shows quick feedback form and recent feedback
 */
const BetaFeedbackWidget = () => {
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      const response = await api.get('/beta/feedback/my');
      setMyFeedback(response.data.slice(0, 5)); // Show last 5
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSuccess = () => {
    setShowForm(false);
    fetchMyFeedback();
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'blue',
      in_progress: 'yellow',
      planned: 'purple',
      fixed: 'green',
      wont_fix: 'gray',
      duplicate: 'gray'
    };
    return colors[status] || 'gray';
  };

  const getTypeIcon = (type) => {
    const icons = {
      bug: '🐛',
      feature: '✨',
      idea: '💡',
      general: '📝'
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Feedback Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg transition-colors flex items-center justify-center gap-3 font-medium text-lg"
        >
          <MessageSquare className="w-6 h-6" />
          Submit Feedback
        </button>
      )}

      {/* Feedback Form */}
      {showForm && (
        <div>
          <BetaFeedbackForm onSuccess={handleFeedbackSuccess} compact />
          <button
            onClick={() => setShowForm(false)}
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Recent Feedback */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Your Recent Feedback
        </h3>

        {myFeedback.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
            No feedback submitted yet. Click above to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {myFeedback.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(item.type)}</span>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {item.title}
                    </h4>
                  </div>
                  <span className={`px-2 py-1 bg-${getStatusColor(item.status)}-100 dark:bg-${getStatusColor(item.status)}-900/30 text-${getStatusColor(item.status)}-700 dark:text-${getStatusColor(item.status)}-300 text-xs font-medium rounded-full`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {item.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.vote_count > 0 && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {item.vote_count}
                    </span>
                  )}
                  {item.admin_response && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      Responded
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BetaFeedbackWidget;
