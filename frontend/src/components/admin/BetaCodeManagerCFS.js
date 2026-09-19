import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Key, Calendar, Users, CheckCircle, XCircle, RefreshCw, 
  Copy, Trash2, Edit, Eye, EyeOff, Clock, AlertCircle, Zap
} from 'lucide-react';
import api from '../../services/api';

const BetaCodeManagerCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Generate form state
  const [expiresIn, setExpiresIn] = useState('30');
  const [maxUses, setMaxUses] = useState('10');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Default configuration
  const defaultConfig = {
    showActiveOnly: false,
    sortBy: 'created_at',
    sortOrder: 'desc',
    ...config
  };

  useEffect(() => {
    if (!isEditing) {
      fetchCodes();
    }
  }, [isEditing]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/beta/codes');
      setCodes(response.data);
    } catch (error) {
      console.error('Error fetching beta codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

      const response = await api.post('/beta/codes/generate', {
        expiresAt: expiresAt.toISOString(),
        maxUses: parseInt(maxUses),
        notes: notes.trim() || null
      });

      setCodes([response.data, ...codes]);
      setShowGenerateModal(false);
      setExpiresIn('30');
      setMaxUses('10');
      setNotes('');
    } catch (error) {
      console.error('Error generating code:', error);
      alert('Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeactivateCode = async (codeId) => {
    if (!confirm('Are you sure you want to deactivate this code?')) return;

    try {
      await api.post(`/beta/codes/${codeId}/deactivate`);
      setCodes(codes.map(c => c.id === codeId ? { ...c, is_active: false } : c));
    } catch (error) {
      console.error('Error deactivating code:', error);
      alert('Failed to deactivate code');
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!confirm('Are you sure you want to delete this code? This cannot be undone.')) return;

    try {
      await api.delete(`/beta/codes/${codeId}`);
      setCodes(codes.filter(c => c.id !== codeId));
    } catch (error) {
      console.error('Error deleting code:', error);
      alert(error.response?.data?.error || 'Failed to delete code');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const isFullyUsed = (code) => {
    return code.current_uses >= code.max_uses;
  };

  const getStatusColor = (code) => {
    if (!code.is_active) return 'gray';
    if (isExpired(code.expires_at)) return 'red';
    if (isFullyUsed(code)) return 'orange';
    return 'green';
  };

  const getStatusText = (code) => {
    if (!code.is_active) return 'Inactive';
    if (isExpired(code.expires_at)) return 'Expired';
    if (isFullyUsed(code)) return 'Fully Used';
    return 'Active';
  };

  if (isEditing) {
    return (
      <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700">
        <div className="text-center">
          <Key className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Beta Code Manager
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate and manage beta testing access codes
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              Generate Codes
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              Track Usage
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              Manage Expiration
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
          <p className="text-gray-600 dark:text-gray-400">Loading codes...</p>
        </div>
      </div>
    );
  }

  const activeCodes = codes.filter(c => c.is_active && !isExpired(c.expires_at) && !isFullyUsed(c));
  const inactiveCodes = codes.filter(c => !c.is_active || isExpired(c.expires_at) || isFullyUsed(c));

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Key className="w-8 h-8 text-purple-600" />
            Beta Code Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate and manage beta testing access codes
          </p>
        </div>
        
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Generate New Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Codes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{codes.length}</p>
            </div>
            <Key className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeCodes.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Uses</p>
              <p className="text-2xl font-bold text-blue-600">
                {codes.reduce((sum, c) => sum + c.current_uses, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{inactiveCodes.length}</p>
            </div>
            <XCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Active Codes */}
      {activeCodes.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Active Codes ({activeCodes.length})
          </h3>
          <div className="space-y-3">
            {activeCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                onCopy={handleCopyCode}
                onDeactivate={handleDeactivateCode}
                onDelete={handleDeleteCode}
                copiedCode={copiedCode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Codes */}
      {inactiveCodes.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-600" />
            Inactive Codes ({inactiveCodes.length})
          </h3>
          <div className="space-y-3">
            {inactiveCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                onCopy={handleCopyCode}
                onDeactivate={handleDeactivateCode}
                onDelete={handleDeleteCode}
                copiedCode={copiedCode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-600" />
                  Generate Beta Code
                </h3>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expires In (days)
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., For iOS testers"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generating}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CodeCard = ({ code, onCopy, onDeactivate, onDelete, copiedCode }) => {
  const statusColor = code.is_active && !isExpired(code.expires_at) && !isFullyUsed(code) ? 'green' : 'gray';
  const isExpiredCode = isExpired(code.expires_at);
  const isFullyUsedCode = isFullyUsed(code);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border-l-4 border-purple-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <code className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400">
              {code.code}
            </code>
            <button
              onClick={() => onCopy(code.code)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy code"
            >
              {copiedCode === code.code ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <span className={`px-2 py-1 bg-${statusColor}-100 dark:bg-${statusColor}-900/30 text-${statusColor}-700 dark:text-${statusColor}-300 text-xs font-medium rounded-full`}>
              {code.is_active ? (isExpiredCode ? 'Expired' : isFullyUsedCode ? 'Fully Used' : 'Active') : 'Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Uses: {code.current_uses} / {code.max_uses}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Created: {new Date(code.created_at).toLocaleDateString()}</span>
            </div>
            {code.tester_count > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{code.tester_count} testers</span>
              </div>
            )}
          </div>

          {code.notes && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
              Note: {code.notes}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          {code.is_active && !isExpiredCode && (
            <button
              onClick={() => onDeactivate(code.id)}
              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              title="Deactivate"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
          {code.current_uses === 0 && (
            <button
              onClick={() => onDelete(code.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const isExpired = (expiresAt) => new Date(expiresAt) < new Date();
const isFullyUsed = (code) => code.current_uses >= code.max_uses;

export default BetaCodeManagerCFS;
