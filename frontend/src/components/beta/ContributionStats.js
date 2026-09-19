import React, { useState, useEffect } from 'react';
import { Package, MapPin, MessageSquare, Star, Award, TrendingUp, Calendar } from 'lucide-react';
import api from '../../services/api';

/**
 * Contribution Stats
 * Shows beta tester's contributions and quality score
 */
const ContributionStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get user's feedback count
      const feedbackResponse = await api.get('/beta/feedback/my');
      const feedbackCount = feedbackResponse.data.length;

      // Mock data for now - would come from MDL tracking
      const mockStats = {
        items_added: 0, // From MDL tracking
        aisles_reported: 0, // From MDL aisle reports
        feedback_count: feedbackCount,
        registered_at: new Date().toISOString(), // Would come from beta_testers table
        quality_score: calculateQualityScore(0, 0, feedbackCount)
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateQualityScore = (items, aisles, feedback) => {
    const itemScore = Math.min(items * 2, 100);
    const aisleScore = Math.min(aisles * 3, 100);
    const feedbackScore = Math.min(feedback * 5, 100);
    return Math.round((itemScore + aisleScore + feedbackScore) / 3);
  };

  const getStarRating = (score) => {
    if (score >= 90) return 5;
    if (score >= 70) return 4;
    if (score >= 50) return 3;
    if (score >= 30) return 2;
    return 1;
  };

  const getDaysSinceJoined = () => {
    if (!stats?.registered_at) return 0;
    const days = Math.floor((Date.now() - new Date(stats.registered_at)) / (1000 * 60 * 60 * 24));
    return days;
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

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <p className="text-gray-600 dark:text-gray-400">Unable to load stats</p>
      </div>
    );
  }

  const stars = getStarRating(stats.quality_score);
  const daysSinceJoined = getDaysSinceJoined();

  return (
    <div className="space-y-4">
      {/* Quality Score Card */}
      <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-purple-100 text-sm mb-1">Your Quality Score</p>
            <p className="text-4xl font-bold">{stats.quality_score}%</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl">
            <Award className="w-8 h-8" />
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < stars
                  ? 'text-yellow-300 fill-yellow-300'
                  : 'text-white/30'
              }`}
            />
          ))}
        </div>

        <p className="text-purple-100 text-sm">
          {stars === 5 && '🌟 Outstanding contributor!'}
          {stars === 4 && '⭐ Great work!'}
          {stars === 3 && '👍 Keep it up!'}
          {stars === 2 && '📈 Getting started!'}
          {stars === 1 && '🚀 Welcome aboard!'}
        </p>
      </div>

      {/* Contribution Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Your Contributions
        </h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Items Added */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.items_added}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Items Added</p>
          </div>

          {/* Aisles Reported */}
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <MapPin className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.aisles_reported}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Aisles Reported</p>
          </div>

          {/* Feedback Submitted */}
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <MessageSquare className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.feedback_count}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Feedback</p>
          </div>
        </div>

        {/* Days Active */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Beta Tester Since
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {daysSinceJoined} {daysSinceJoined === 1 ? 'day' : 'days'} ago
            </span>
          </div>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
          💡 Improve Your Score
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          {stats.items_added === 0 && <li>• Add items to your shopping lists</li>}
          {stats.aisles_reported === 0 && <li>• Report aisle locations when shopping</li>}
          {stats.feedback_count === 0 && <li>• Submit feedback about your experience</li>}
          {stats.quality_score >= 80 && <li>• You're doing great! Keep up the excellent work! 🎉</li>}
        </ul>
      </div>
    </div>
  );
};

export default ContributionStats;
