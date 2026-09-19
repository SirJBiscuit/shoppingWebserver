import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Lightbulb, Zap, MessageCircle, Send, Star, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

/**
 * Beta Feedback Form
 * Allows beta testers to submit feedback
 */
const BetaFeedbackForm = ({ onSuccess, compact = false }) => {
  const [type, setType] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [experienceRating, setExperienceRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const feedbackTypes = [
    { id: 'bug', name: 'Bug Report', icon: Bug, color: 'red', description: 'Something isn\'t working' },
    { id: 'feature', name: 'Feature Request', icon: Zap, color: 'blue', description: 'Suggest a new feature' },
    { id: 'idea', name: 'Idea', icon: Lightbulb, color: 'purple', description: 'Share your ideas' },
    { id: 'general', name: 'General', icon: MessageCircle, color: 'green', description: 'General feedback' }
  ];

  const severityLevels = [
    { id: 'low', name: 'Low', color: 'green' },
    { id: 'medium', name: 'Medium', color: 'yellow' },
    { id: 'high', name: 'High', color: 'orange' },
    { id: 'critical', name: 'Critical', color: 'red' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/beta/feedback', {
        type,
        title: title.trim(),
        description: description.trim(),
        severity: type === 'bug' ? severity : null,
        experienceRating: type === 'general' ? experienceRating : null
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setExperienceRating(0);
      
      if (onSuccess) {
        onSuccess();
      } else {
        alert('✅ Feedback submitted successfully! Thank you!');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Quick Feedback
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quick feedback title..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your feedback..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
            required
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Submit Feedback
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Feedback Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {feedbackTypes.map((feedbackType) => {
              const Icon = feedbackType.icon;
              return (
                <button
                  key={feedbackType.id}
                  type="button"
                  onClick={() => setType(feedbackType.id)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${type === feedbackType.id
                      ? `border-${feedbackType.color}-500 bg-${feedbackType.color}-50 dark:bg-${feedbackType.color}-900/20`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${type === feedbackType.id ? `text-${feedbackType.color}-600` : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${type === feedbackType.id ? `text-${feedbackType.color}-900 dark:text-${feedbackType.color}-100` : 'text-gray-600 dark:text-gray-400'}`}>
                    {feedbackType.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide detailed information..."
            rows="6"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* Severity (for bugs only) */}
        {type === 'bug' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Severity
            </label>
            <div className="grid grid-cols-4 gap-2">
              {severityLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setSeverity(level.id)}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium
                    ${severity === level.id
                      ? `border-${level.color}-500 bg-${level.color}-50 dark:bg-${level.color}-900/20 text-${level.color}-700 dark:text-${level.color}-300`
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }
                  `}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Experience Rating (for general feedback) */}
        {type === 'general' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How would you rate your experience?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setExperienceRating(rating)}
                  className="p-2 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      rating <= experienceRating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setTitle('');
              setDescription('');
              setSeverity('medium');
              setExperienceRating(0);
              setError('');
            }}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={submitting}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BetaFeedbackForm;
