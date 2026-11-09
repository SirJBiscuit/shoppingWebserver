import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, AlertCircle, Info, TrendingUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const POLL_MS = 60000;

/**
 * NotificationCenter — toolbar bell
 * Server notifications (feature releases, admin broadcasts) live in
 * user_notifications via /api/notifications. Local alerts (expiring items,
 * window.addNotification from anywhere in the app) merge on top.
 */
const NotificationCenter = () => {
  const [remote, setRemote] = useState([]);   // from /api/notifications
  const [local, setLocal] = useState([]);     // localStorage alerts
  const [isOpen, setIsOpen] = useState(false);

  /* ---------- remote ---------- */
  const fetchRemote = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 25 } });
      setRemote(data || []);
    } catch { /* backend unreachable — local alerts still work */ }
  }, []);

  useEffect(() => {
    fetchRemote();
    const t = setInterval(fetchRemote, POLL_MS);
    return () => clearInterval(t);
  }, [fetchRemote]);

  /* ---------- local alerts ---------- */
  const addLocal = useCallback((type, title, message) => {
    setLocal((prev) => {
      if (prev.some((n) => n.title === title && n.message === message)) return prev;
      const n = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, title, message, read: false, timestamp: new Date().toISOString() };
      const updated = [n, ...prev].slice(0, 30);
      try { localStorage.setItem('notifications', JSON.stringify(updated)); } catch { /* full */ }
      return updated;
    });
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('notifications') || '[]');
      if (saved.length) setLocal(saved);
    } catch { /* corrupt */ }

    // Seed expiring-item alerts once per mount
    try {
      const pantry = JSON.parse(localStorage.getItem('pantryItems') || '[]');
      const now = Date.now();
      pantry.forEach((item) => {
        if (!item.expiry_date) return;
        const days = Math.ceil((new Date(item.expiry_date) - now) / 86400000);
        if (days <= 3 && days >= 0) {
          addLocal('warning', 'Item Expiring Soon', `${item.item_name} expires in ${days} day${days !== 1 ? 's' : ''}`);
        }
      });
    } catch { /* no pantry data */ }
  }, [addLocal]);

  // Keep the global hook so existing code calling window.addNotification lands here
  useEffect(() => {
    window.addNotification = (type, title, message) => addLocal(type, title, message);
    return () => { delete window.addNotification; };
  }, [addLocal]);

  /* ---------- actions ---------- */
  const markRemoteRead = async (id) => {
    setRemote((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try { await api.post(`/notifications/${id}/read`); } catch { /* non-fatal */ }
  };

  const deleteLocal = (id) => {
    setLocal((prev) => {
      const u = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('notifications', JSON.stringify(u)); } catch { /* full */ }
      return u;
    });
  };

  const markAllRead = async () => {
    setRemote((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setLocal((prev) => {
      const u = prev.map((n) => ({ ...n, read: true }));
      try { localStorage.setItem('notifications', JSON.stringify(u)); } catch { /* full */ }
      return u;
    });
    try { await api.post('/notifications/read-all'); } catch { /* non-fatal */ }
  };

  /* ---------- merged view ---------- */
  const items = [
    ...remote.map((n) => ({ ...n, remote: true, read: n.is_read, timestamp: n.created_at })),
    ...local.map((n) => ({ ...n, remote: false })),
  ].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  const unreadCount = items.filter((n) => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'feature_release': return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'success': return <Check className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'achievement': return <TrendingUp className="w-5 h-5 text-primary-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'feature_release': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'achievement': return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)] custom-scrollbar">
                {items.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-l-4 ${getColor(n.type)} ${
                          !n.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">{getIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {n.title}
                                </p>
                                {n.message && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {n.message}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                  {new Date(n.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {!n.remote && (
                                <button
                                  onClick={() => deleteLocal(n.id)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => (n.remote ? markRemoteRead(n.id) : deleteLocal(n.id))}
                                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-2"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
