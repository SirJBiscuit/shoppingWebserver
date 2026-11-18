import React, { useState, useEffect } from 'react';
import { Gift, Calendar, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BetaChat from './BetaChat';

const PIN_WIN_RE = /^(🎉 PIN COMPLETE|✨ PIN RESOLVED)/;

const CONFETTI = ['🎉', '✨', '🚀', '💜', '⭐', '🎊', '🔥', '💎', '🏆', '👏'];

/**
 * PinWinCard — celebratory card shown when the admin team completes or
 * resolves a tester's pin. Floating confetti + gradient frame so the win
 * feels like an event, encouraging more pins.
 */
const PinWinCard = ({ message, index }) => {
  const isComplete = message.message.startsWith('🎉 PIN COMPLETE');
  // Strip the marker header line; the rest is the body copy.
  const body = message.message.split('\n\n').slice(1).join('\n\n');
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, rotateX: -15 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 18, stiffness: 200 }}
      className="relative overflow-hidden rounded-xl p-[2px] bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 shadow-lg"
    >
      {/* One-time gentle confetti burst — plays on open, then settles.
          Nothing loops or moves after that so it never fights attention. */}
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="absolute text-sm pointer-events-none select-none"
          style={{ left: `${8 + i * 9}%`, top: '10%' }}
          initial={{ y: 0, opacity: 0, rotate: 0 }}
          animate={{ y: [0, -18, 28], opacity: [0, 0.9, 0], rotate: [0, 180] }}
          transition={{ duration: 2.4 + (i % 3) * 0.4, delay: 0.3 + i * 0.28, repeat: 0 }}
        >
          {c}
        </motion.span>
      ))}
      <div className="relative rounded-[10px] bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-extrabold tracking-wide uppercase shadow ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-slate-500 to-slate-600'
          }`}>
            <Sparkles className="w-4 h-4" />
            {isComplete ? 'Pin Completed!' : 'Pin Resolved'}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(message.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-[15px]">
          {body}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs font-semibold bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">
            — The Admin Team
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Keep those pins coming! 📌</span>
        </div>
      </div>
    </motion.div>
  );
};

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
      <div className="space-y-4">
        {/* Instant two-way chat with the admin team — always available */}
        <BetaChat />
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
          <div className="text-center">
            <div className="inline-flex p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
              <Gift className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Messages Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thank you for contributing!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instant two-way chat with the admin team */}
      <BetaChat />
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
          typeof message.message === 'string' && PIN_WIN_RE.test(message.message) ? (
            <PinWinCard key={message.id} message={message} index={index} />
          ) : (
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
          )
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
                Thank you for joining my beta testing program! Your feedback and contributions
                help me build a better product. I appreciate your time and effort in testing
                new features and reporting issues.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
                Keep up the great work, and you'll receive personalized thank you messages
                from me! 💜
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ThankYouMessages;
