import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Star, MapPin, Activity, MessageSquare, Award,
  Send, UserCheck, Trash2, Clock, Package, Ban, TimerReset,
  Search, Gift, AlertCircle, Edit, StickyNote, KeyRound, Copy, Pin,
  ChevronRight, X
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import CustomNotification from '../CustomNotification';
import CustomDatePicker from '../CustomDatePicker';
import { Portal } from '../../utils/autoPlacement';
import BetaChat from '../beta/BetaChat';
import BtcsModal from './BtcsModal';

const BetaTesterManagementCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const { notification, hideNotification, confirm, confirmDelete } = useNotification();
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTester, setSelectedTester] = useState(null);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatTester, setChatTester] = useState(null); // tester the instant-chat thread is open with

  // Extend-access + edit modals
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState('30');
  const [extending, setExtending] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Password reset modal — set a custom password or generate a temp one.
  // pwResult only ever holds the NEW generated password (never the old one).
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwResult, setPwResult] = useState('');

  // Activity feed modal — opened by clicking the items/feedback stats
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [sortBy, setSortBy] = useState('quality'); // quality, activity, feedback, items, score
  const [btcsTester, setBtcsTester] = useState(null); // tester whose BTCS modal is open

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
          setSelectedTester(t => (t && t.id === testerId ? null : t));
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
      'Remove Beta Tester?',
      'This will permanently remove this tester and their beta access.',
      async () => {
        try {
          await api.delete(`/beta/admin/testers/${testerId}`);
          setTesters(testers.filter(t => t.id !== testerId));
          setSelectedTester(t => (t && t.id === testerId ? null : t));
        } catch (error) {
          console.error('Error removing tester:', error);
          alert('Failed to remove tester');
        }
      }
    );
  };

  const handleExtendAccess = async () => {
    const days = parseInt(extendDays, 10);
    if (!selectedTester || !Number.isFinite(days) || days < 1 || days > 3650) {
      alert('Enter a valid number of days (1–3650)');
      return;
    }
    setExtending(true);
    try {
      const res = await api.post(`/beta/admin/testers/${selectedTester.id}/extend`, { days });
      setTesters(testers.map(t =>
        t.id === selectedTester.id ? { ...t, beta_expires_at: res.data.beta_expires_at } : t
      ));
      setShowExtendModal(false);
      setSelectedTester(t => ({ ...t, beta_expires_at: res.data.beta_expires_at }));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to extend access');
    } finally {
      setExtending(false);
    }
  };

  const handleToggleSuspend = async (tester) => {
    const next = !tester.suspended;
    try {
      await api.patch(`/beta/admin/testers/${tester.id}`, { suspended: next });
      setTesters(testers.map(t => t.id === tester.id ? { ...t, suspended: next } : t));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update tester');
    }
  };

  const openEditTester = (tester) => {
    setSelectedTester(tester);
    setEditForm({
      displayName: tester.display_name || '',
      adminNotes: tester.admin_notes || '',
      betaExpiresAt: tester.beta_expires_at ? tester.beta_expires_at.slice(0, 10) : ''
    });
    setShowEditModal(true);
  };

  const handleSaveTesterEdit = async () => {
    if (!selectedTester) return;
    setSavingEdit(true);
    try {
      await api.patch(`/beta/admin/testers/${selectedTester.id}`, {
        displayName: editForm.displayName,
        adminNotes: editForm.adminNotes,
        betaExpiresAt: editForm.betaExpiresAt || null
      });
      setTesters(testers.map(t =>
        t.id === selectedTester.id
          ? { ...t, display_name: editForm.displayName, admin_notes: editForm.adminNotes, beta_expires_at: editForm.betaExpiresAt || null }
          : t
      ));
      setShowEditModal(false);
      setSelectedTester(t => ({
        ...t,
        display_name: editForm.displayName,
        admin_notes: editForm.adminNotes,
        beta_expires_at: editForm.betaExpiresAt || null
      }));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update tester');
    } finally {
      setSavingEdit(false);
    }
  };

  const openResetPassword = (tester) => {
    setSelectedTester(tester);
    setPwValue(''); setPwResult('');
    setShowPwModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedTester) return;
    if (pwValue && pwValue.trim().length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setPwBusy(true);
    try {
      const res = await api.post(`/beta/admin/testers/${selectedTester.id}/reset-password`, {
        password: pwValue.trim() || undefined
      });
      setPwResult(res.data.tempPassword || '');
      if (!res.data.tempPassword) {
        setShowPwModal(false);
        alert('Password updated.');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setPwBusy(false);
    }
  };

  const openActivity = async (tester, kind = 'all') => {
    setSelectedTester(tester);
    setActivityFilter(kind);
    setShowActivityModal(true);
    setActivityLoading(true);
    setActivityItems([]);
    try {
      const res = await api.get(`/beta/admin/testers/${tester.id}/activity`);
      setActivityItems(res.data || []);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to load activity');
    } finally {
      setActivityLoading(false);
    }
  };

  const handleClearTesterExpiry = async () => {
    if (!selectedTester) return;
    try {
      await api.patch(`/beta/admin/testers/${selectedTester.id}`, { betaExpiresAt: null });
      setTesters(testers.map(t =>
        t.id === selectedTester.id ? { ...t, beta_expires_at: null } : t
      ));
      setSelectedTester({ ...selectedTester, beta_expires_at: null });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to clear expiry');
    }
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
        case 'score':
          return (b.btcs_score || 0) - (a.btcs_score || 0);
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
            <option value="score">Sort by BTCS</option>
          </select>
        </div>
      </div>

      {/* Testers — master list + detail sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Compact control list — click a row to manage that tester */}
        <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 space-y-1.5 lg:max-h-[70vh] overflow-y-auto scrollbar-3d">
          {filteredTesters.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No beta testers found</p>
            </div>
          ) : (
            filteredTesters.map((tester) => (
              <TesterRow
                key={tester.id}
                tester={tester}
                qualityScore={calculateDataQuality(tester)}
                activityLevel={getActivityLevel(tester)}
                selected={selectedTester?.id === tester.id}
                onSelect={() => setSelectedTester(tester)}
              />
            ))
          )}
        </div>

        {/* Detail sidebar — info + full control list for the selected tester */}
        <div className="flex-1 w-full min-w-0">
          {selectedTester ? (
            <TesterSidebar
              tester={testers.find(t => t.id === selectedTester.id) || selectedTester}
              qualityScore={calculateDataQuality(selectedTester)}
              activityLevel={getActivityLevel(selectedTester)}
              onClose={() => setSelectedTester(null)}
              onSendThankYou={() => setShowThankYouModal(true)}
              onConvert={() => handleConvertToUser(selectedTester.id)}
              onRemove={() => handleRemoveTester(selectedTester.id)}
              onExtend={() => { setExtendDays('30'); setShowExtendModal(true); }}
              onSuspend={() => handleToggleSuspend(testers.find(t => t.id === selectedTester.id) || selectedTester)}
              onEdit={() => openEditTester(testers.find(t => t.id === selectedTester.id) || selectedTester)}
              onResetPassword={() => openResetPassword(testers.find(t => t.id === selectedTester.id) || selectedTester)}
              onActivity={(kind) => openActivity(testers.find(t => t.id === selectedTester.id) || selectedTester, kind)}
              onChat={() => setChatTester(testers.find(t => t.id === selectedTester.id) || selectedTester)}
              onBtcs={() => setBtcsTester(testers.find(t => t.id === selectedTester.id) || selectedTester)}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Select a tester to manage</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Their details and every control appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* BTCS score breakdown + per-tester settings */}
      <AnimatePresence>
        {btcsTester && (
          <BtcsModal tester={btcsTester} onClose={() => setBtcsTester(null)} />
        )}
      </AnimatePresence>

      {/* Extend Access Modal */}
      <Portal><AnimatePresence>
        {showExtendModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TimerReset className="w-6 h-6 text-purple-600" />
                  Extend Beta Access
                </h3>
                <button
                  onClick={() => { setShowExtendModal(false); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Extending access for <strong>{selectedTester.display_name || selectedTester.beta_username}</strong>
                {selectedTester.beta_expires_at
                  ? ` — currently expires ${new Date(selectedTester.beta_expires_at).toLocaleDateString()}`
                  : selectedTester.expires_at
                    ? ` — via code, ends ${new Date(selectedTester.expires_at).toLocaleDateString()}`
                    : ' — no expiry set'}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Extend by (days)
                </label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  min="1"
                  max="3650"
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {[7, 14, 30, 60, 90, 180, 365].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(String(d))}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        extendDays === String(d)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                {selectedTester.beta_expires_at && (
                  <button
                    type="button"
                    onClick={handleClearTesterExpiry}
                    className="mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 underline"
                  >
                    Clear per-tester expiry (inherit code expiry)
                  </button>
                )}
              </div>

              {(() => {
                const d = parseInt(extendDays, 10);
                if (Number.isFinite(d) && d > 0) {
                  const base = selectedTester.beta_expires_at && new Date(selectedTester.beta_expires_at) > new Date()
                    ? new Date(selectedTester.beta_expires_at)
                    : new Date();
                  const newExpiry = new Date(base.getTime() + d * 86400000);
                  return (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-4">
                      New expiry: {newExpiry.toLocaleDateString()}
                    </p>
                  );
                }
                return null;
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowExtendModal(false); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={extending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendAccess}
                  disabled={extending || !extendDays || parseInt(extendDays, 10) < 1}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {extending ? <Send className="w-5 h-5 animate-pulse" /> : <TimerReset className="w-5 h-5" />}
                  Extend
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></Portal>

      {/* Edit Tester Modal */}
      <Portal><AnimatePresence>
        {showEditModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-6 h-6 text-purple-600" />
                  Edit Tester
                </h3>
                <button
                  onClick={() => { setShowEditModal(false); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editForm.displayName || ''}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Expires On <span className="text-xs text-gray-500">(empty = inherit code expiry)</span>
                  </label>
                  <CustomDatePicker
                    value={editForm.betaExpiresAt || ''}
                    onChange={(v) => setEditForm({ ...editForm, betaExpiresAt: v })}
                    placeholder="Inherit code expiry"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Admin Notes (private)
                  </label>
                  <textarea
                    value={editForm.adminNotes || ''}
                    onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                    rows="4"
                    placeholder="Notes only visible to admins…"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowEditModal(false); }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTesterEdit}
                    disabled={savingEdit}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    {savingEdit ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></Portal>

      {/* Instant chat modal — direct thread with this tester */}
      <Portal><AnimatePresence>
        {chatTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" onClick={() => setChatTester(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <BetaChat
                peerId={chatTester.id}
                peerName={chatTester.display_name || chatTester.beta_username || chatTester.username}
              />
              <button
                onClick={() => setChatTester(null)}
                className="mt-2 w-full py-1.5 text-xs text-gray-400 hover:text-gray-200"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence></Portal>

      {/* Thank You Modal */}
      <Portal><AnimatePresence>
        {showThankYouModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
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
      </AnimatePresence></Portal>
      
      {/* Reset / Set Password Modal */}
      <Portal><AnimatePresence>
        {showPwModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-6 h-6 text-indigo-600" />
                  Reset Password
                </h3>
                <button
                  onClick={() => { setShowPwModal(false); setPwValue(''); setPwResult(''); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Set a new password for <strong>{selectedTester.display_name || selectedTester.beta_username}</strong>.
                The current password is never shown or recoverable — this replaces it.
              </p>

              {pwResult ? (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Temporary password — copy it now, it won't be shown again:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white select-all">
                      {pwResult}
                    </code>
                    <button
                      onClick={() => { try { navigator.clipboard.writeText(pwResult); } catch { /* clipboard unavailable */ } }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                      title="Copy password"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowPwModal(false); setPwResult(''); }}
                    className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New password <span className="text-xs text-gray-500">(empty = generate a temp one)</span>
                    </label>
                    <input
                      type="text"
                      value={pwValue}
                      onChange={(e) => setPwValue(e.target.value)}
                      placeholder="Leave empty to generate…"
                      autoComplete="off"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowPwModal(false); setPwValue(''); }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      disabled={pwBusy}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={pwBusy || (pwValue.trim().length > 0 && pwValue.trim().length < 6)}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {pwBusy ? 'Working…' : pwValue.trim() ? 'Set Password' : 'Generate Temp'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence></Portal>

      {/* Activity Feed Modal — opened by clicking items/feedback stats */}
      <Portal><AnimatePresence>
        {showActivityModal && selectedTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-green-600" />
                  {selectedTester.display_name || selectedTester.beta_username} — Activity
                </h3>
                <button
                  onClick={() => { setShowActivityModal(false); setActivityItems([]); }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <AlertCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Kind filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'feedback', label: 'Feedback', Icon: MessageSquare },
                  { key: 'pin', label: 'Pins', Icon: Pin },
                  { key: 'item', label: 'Items', Icon: Package },
                  { key: 'aisle', label: 'Aisles', Icon: MapPin },
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActivityFilter(key)}
                    className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 transition-colors ${
                      activityFilter === key
                        ? 'bg-green-600 text-white border-green-600'
                        : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {activityLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading activity…</p>
                )}
                {!activityLoading && activityItems.filter((e) => activityFilter === 'all' || e.kind === activityFilter).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No activity yet</p>
                )}
                {!activityLoading && activityItems
                  .filter((e) => activityFilter === 'all' || e.kind === activityFilter)
                  .map((e, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                      <span className="mt-0.5 shrink-0">
                        {e.kind === 'feedback' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                        {e.kind === 'pin' && <Pin className="w-4 h-4 text-red-500" />}
                        {e.kind === 'item' && <Package className="w-4 h-4 text-emerald-500" />}
                        {e.kind === 'aisle' && <MapPin className="w-4 h-4 text-amber-500" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-gray-900 dark:text-white truncate">{e.label}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {new Date(e.at).toLocaleString()}{e.status ? ` · ${e.status}` : ''}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></Portal>

      <CustomNotification {...notification} onClose={hideNotification} />
    </div>
  );
};

const ACTIVITY_DOTS = {
  'very-high': 'bg-emerald-500',
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-orange-400',
  inactive: 'bg-gray-400'
};

const ACTIVITY_LABELS = {
  'very-high': 'Very Active',
  high: 'Active',
  medium: 'Moderate',
  low: 'Low Activity',
  inactive: 'Inactive'
};

const TesterRow = ({ tester, qualityScore, activityLevel, selected, onSelect }) => {
  const expired = tester.days_left != null && tester.days_left <= 0;
  const expiring = tester.days_left != null && tester.days_left > 0 && tester.days_left <= 7;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
        selected
          ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500/60'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/60'
      }`}
    >
      <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {(tester.display_name || tester.beta_username || '?')[0].toUpperCase()}
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${ACTIVITY_DOTS[activityLevel]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {tester.display_name || tester.beta_username}
          </p>
          {tester.suspended && <Ban className="w-3 h-3 text-red-500 shrink-0" />}
          {(expired || expiring) && (
            <Clock className={`w-3 h-3 shrink-0 ${expired ? 'text-red-500' : 'text-amber-500'}`} />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${qualityScore}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
            {tester.btcs_score || 0}pt
          </span>
        </div>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 transition ${selected ? 'text-purple-500' : 'text-gray-300 dark:text-gray-600'}`} />
    </button>
  );
};

const ControlItem = ({ icon: Icon, label, desc, onClick, tint, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/60 text-left transition group"
  >
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tint} flex items-center justify-center shrink-0 shadow-sm`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{label}</p>
      {desc && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{desc}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
  </button>
);

const TesterSidebar = ({ tester, qualityScore, activityLevel, onClose, onSendThankYou, onConvert, onRemove, onExtend, onSuspend, onEdit, onResetPassword, onActivity, onChat, onBtcs }) => {
  const stars = Math.round(qualityScore / 20);
  const expired = tester.days_left != null && tester.days_left <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {(tester.display_name || tester.beta_username || '?')[0].toUpperCase()}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-600 ${ACTIVITY_DOTS[activityLevel]}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{tester.display_name || tester.beta_username}</h3>
              <p className="text-xs text-white/70 truncate">
                @{tester.beta_username} · {tester.state}, {tester.country}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white shrink-0 lg:hidden" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
            {ACTIVITY_LABELS[activityLevel]}
          </span>
          {tester.suspended && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/80 text-white">Suspended</span>
          )}
          {tester.days_left != null && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${expired ? 'bg-red-500/80' : tester.days_left <= 7 ? 'bg-amber-500/80' : 'bg-white/15'} text-white`}>
              {expired ? 'Expired' : tester.days_left === 1 ? '1 day left' : `${tester.days_left} days left`}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white">
            Joined {new Date(tester.registered_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5 max-h-[62vh] overflow-y-auto scrollbar-3d">
        {/* Quality + BTCS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Data Quality</span>
            <span className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} />
              ))}
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400 ml-1">{qualityScore}%</span>
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${qualityScore}%` }} />
          </div>
          <button
            type="button"
            onClick={onBtcs}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            title="Beta Tester Contribution score — view breakdown"
          >
            <Award className="w-3.5 h-3.5" />
            {tester.btcs_score || 0} pts · {tester.btcs_tier_label || 'Rookie'}
          </button>
        </div>

        {/* Contributions — click a stat to open the activity feed */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Package, label: 'Items', value: tester.items_added || 0, kind: 'item', tint: 'from-blue-500 to-blue-600' },
            { Icon: MapPin, label: 'Aisles', value: tester.aisles_reported || 0, kind: 'aisle', tint: 'from-green-500 to-emerald-600' },
            { Icon: MessageSquare, label: 'Feedback', value: tester.feedback_count || 0, kind: 'feedback', tint: 'from-violet-500 to-purple-600' },
          ].map(({ Icon, label, value, kind, tint }) => (
            <button
              key={kind}
              type="button"
              onClick={() => onActivity(kind)}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all"
              title={`View ${label.toLowerCase()} activity`}
            >
              <div className={`w-7 h-7 mx-auto rounded-lg bg-gradient-to-br ${tint} flex items-center justify-center mb-1.5`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {tester.last_active && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Last active: {new Date(tester.last_active).toLocaleString()}
          </p>
        )}
        {tester.admin_notes && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
            <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {tester.admin_notes}
          </p>
        )}

        {/* Control list — every tester action, grouped */}
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Communicate</p>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60">
              <ControlItem icon={MessageSquare} label="Chat" desc="Open the instant message thread" onClick={onChat} tint="from-violet-500 to-violet-600" />
              <ControlItem icon={Gift} label="Send thank-you" desc="Personal appreciation message" onClick={onSendThankYou} tint="from-pink-500 to-pink-600" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Account</p>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/60">
              <ControlItem icon={Edit} label="Edit tester" desc="Name, expiry, admin notes" onClick={onEdit} tint="from-slate-500 to-slate-600" />
              <ControlItem icon={KeyRound} label="Reset password" desc="Set or generate a new password" onClick={onResetPassword} tint="from-indigo-500 to-indigo-600" />
              <ControlItem icon={TimerReset} label="Extend access" desc="Add days to beta access" onClick={onExtend} tint="from-teal-500 to-teal-600" />
              <ControlItem
                icon={Ban}
                label={tester.suspended ? 'Unsuspend' : 'Suspend'}
                desc={tester.suspended ? 'Restore beta access' : 'Pause beta access'}
                onClick={onSuspend}
                tint={tester.suspended ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600'}
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Danger zone</p>
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 divide-y divide-red-100 dark:divide-red-900/40">
              <ControlItem icon={UserCheck} label="Convert to full user" desc="Loses beta tester status" onClick={onConvert} tint="from-emerald-500 to-emerald-600" danger />
              <ControlItem icon={Trash2} label="Remove tester" desc="Permanently remove beta access" onClick={onRemove} tint="from-red-500 to-red-600" danger />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


export default BetaTesterManagementCFS;
