import React, { useState, useEffect } from 'react';
import { Gift, Calendar, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Thank You Messages
 * Displays messages from admins to beta testers
 */
const ThankYouMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      // Get beta tester ID first (would need endpoint or user object to have this)
      // For now, we'll use a placeholder
      const response = await api.get(`/beta/admin/testers/${user.id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // If endpoint doesn't exist yet, show placeholder
      setMessages([]);
    } finally {
      setLoading(false);
    }
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

  if (messages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
        <div className="text-center">
          <div className="inline-flex p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
            <Gift className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Messages Yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keep contributing and you might receive a thank you message from the admin team!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Messages from the Team
        </h3>
        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Admin Team
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(message.sent_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {message.message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                Thank you for being an awesome beta tester! 💜
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Placeholder Message (if no real messages) */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Beta Testing! 🎉
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Thank you for joining our beta testing program! Your feedback and contributions
                help us build a better product. We appreciate your time and effort in testing
                new features and reporting issues.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
                Keep up the great work, and you'll receive personalized thank you messages
                from our team! 💜
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ThankYouMessages;
