import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Star, MapPin, Calendar, Activity, MessageSquare, Award,
  Send, UserCheck, UserX, Trash2, Clock, Package, Ban, TimerReset,
  Search, Eye, Gift, AlertCircle, Edit, StickyNote, KeyRound, Copy, Pin
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import CustomNotification from '../CustomNotification';
import CustomDatePicker from '../CustomDatePicker';
import RadialActionMenu from '../RadialActionMenu';
import { Portal } from '../../utils/autoPlacement';
import BetaChat from '../beta/BetaChat';
import BtcsModal from './BtcsModal';

const BetaTesterManagementCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const { notification, hideNotification, confirm, confirmDelete } = useNotification();
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTester, setSelectedTester] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
      setSelectedTester(null);
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
      setSelectedTester(null);
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
        setSelectedTester(null);
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
              onExtend={() => {
                setSelectedTester(tester);
                setExtendDays('30');
                setShowExtendModal(true);
              }}
              onSuspend={() => handleToggleSuspend(tester)}
              onEdit={() => openEditTester(tester)}
              onResetPassword={() => openResetPassword(tester)}
              onActivity={(kind) => openActivity(tester, kind)}
              onChat={() => setChatTester(tester)}
              onBtcs={() => setBtcsTester(tester)}
            />
          ))
        )}
      </div>

      {/* BTCS score breakdown + per-tester settings */}
      <AnimatePresence>
        {btcsTester && (
          <BtcsModal tester={btcsTester} onClose={() => setBtcsTester(null)} />
        )}
      </AnimatePresence>

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
                  onClick={() => { setShowExtendModal(false); setSelectedTester(null); }}
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
                  onClick={() => { setShowExtendModal(false); setSelectedTester(null); }}
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
                  onClick={() => { setShowEditModal(false); setSelectedTester(null); }}
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
                    onClick={() => { setShowEditModal(false); setSelectedTester(null); }}
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
                  onClick={() => { setShowPwModal(false); setSelectedTester(null); setPwValue(''); setPwResult(''); }}
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
                    onClick={() => { setShowPwModal(false); setSelectedTester(null); setPwResult(''); }}
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
                      onClick={() => { setShowPwModal(false); setSelectedTester(null); setPwValue(''); }}
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
                  onClick={() => { setShowActivityModal(false); setSelectedTester(null); setActivityItems([]); }}
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

const TesterCard = ({ tester, qualityScore, activityLevel, onViewDetails, onSendThankYou, onConvert, onRemove, onExtend, onSuspend, onEdit, onResetPassword, onActivity, onChat, onBtcs }) => {
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
            {tester.suspended && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                Suspended
              </span>
            )}
            {tester.days_left != null && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${
                tester.days_left <= 0
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : tester.days_left <= 7
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
                title={tester.expires_at ? `Ends ${new Date(tester.expires_at).toLocaleDateString()}` : ''}
              >
                <Clock className="w-3 h-3" />
                {tester.days_left <= 0
                  ? 'Expired'
                  : tester.days_left === 1
                    ? '1 day left'
                    : `${tester.days_left} days left`}
              </span>
            )}
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
            <button
              onClick={() => onActivity('item')}
              className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="View items this tester added"
            >
              <Package className="w-4 h-4" />
              <span>{tester.items_added || 0} items</span>
            </button>
            <button
              onClick={() => onActivity('feedback')}
              className="flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              title="View this tester's feedback"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{tester.feedback_count || 0} feedback</span>
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Joined {new Date(tester.registered_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* BTCS score chip — opens the contribution breakdown + settings */}
          <button
            type="button"
            onClick={onBtcs}
            className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            title="Beta Tester Contribution score — view breakdown"
          >
            <Award className="w-3.5 h-3.5" />
            {tester.btcs_score || 0} pts · {tester.btcs_tier_label || 'Rookie'}
          </button>

          {tester.last_active && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last active: {new Date(tester.last_active).toLocaleDateString()}
            </p>
          )}
          {tester.admin_notes && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> {tester.admin_notes}
            </p>
          )}
        </div>

        <div className="ml-4 shrink-0">
          <RadialActionMenu
            size="sm"
            primaryAction={{ label: 'Tester actions', className: 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' }}
            actions={[
              { icon: Award, label: 'BTCS score', onClick: onBtcs, color: 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' },
              { icon: Eye, label: 'View details', onClick: onViewDetails, color: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' },
              { icon: MessageSquare, label: 'Chat', onClick: onChat, color: 'bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700' },
              { icon: Edit, label: 'Edit', onClick: onEdit, color: 'bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700' },
              { icon: KeyRound, label: 'Password', onClick: onResetPassword, color: 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700' },
              { icon: TimerReset, label: 'Extend', onClick: onExtend, color: 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' },
              { icon: Ban, label: tester.suspended ? 'Unsuspend' : 'Suspend', onClick: onSuspend, color: tester.suspended ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' },
              { icon: Gift, label: 'Thank you', onClick: onSendThankYou, color: 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700' },
              { icon: UserCheck, label: 'To full user', onClick: onConvert, color: 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' },
              { icon: Trash2, label: 'Remove', onClick: onRemove, color: 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' },
            ]}
          />
        </div>
      </div>
    </motion.div>
  );
};

const TesterDetailsModal = ({ tester, qualityScore, activityLevel, onClose }) => {
  return (
    <Portal><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm">
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
    </div></Portal>
  );
};


export default BetaTesterManagementCFS;
