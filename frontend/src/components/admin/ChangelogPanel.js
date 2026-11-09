import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Trash2, Rocket, RefreshCw, Eye } from 'lucide-react';
import api from '../../services/api';

/**
 * ChangelogPanel — manage "coming soon" features.
 * Releasing an entry moves it to the changelog history and sends a
 * "new feature released" notification to every user (or beta testers only).
 */
const ChangelogPanel = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [betaOnly, setBetaOnly] = useState(false);
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/changelog/admin/features');
      setFeatures(data || []);
    } catch (e) {
      showMsg('Failed to load changelog features', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addFeature = async () => {
    if (!title.trim()) return;
    try {
      await api.post('/changelog/admin/features', {
        title: title.trim(),
        description: description.trim() || null,
        beta_only: betaOnly,
      });
      setTitle(''); setDescription(''); setBetaOnly(false);
      load();
      showMsg('Upcoming feature added');
    } catch (e) {
      showMsg(e.response?.data?.error || 'Failed to add feature', 'error');
    }
  };

  const release = async (id) => {
    try {
      await api.patch(`/changelog/admin/features/${id}`, { status: 'released', notify_on_release: true });
      load();
      showMsg('Released — users notified');
    } catch (e) {
      showMsg('Failed to release feature', 'error');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/changelog/admin/features/${id}`);
      setFeatures((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      showMsg('Failed to delete', 'error');
    }
  };

  const upcoming = features.filter((f) => f.status !== 'released');
  const released = features.filter((f) => f.status === 'released');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Upcoming Features (visible to users)
        </h3>
        <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
          {msg.text}
        </div>
      )}

      {/* Add form */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Feature title (e.g. Barcode Scanner)"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={betaOnly} onChange={(e) => setBetaOnly(e.target.checked)} className="rounded" />
            Beta testers only
          </label>
          <button
            onClick={addFeature}
            disabled={!title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Upcoming
          </button>
        </div>
      </div>

      {/* Upcoming list */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading…</div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No upcoming features announced
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{f.title}</p>
                {f.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {f.beta_only ? 'Beta only' : 'All users'} • {f.status} • added {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => release(f.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                title="Mark released & notify users"
              >
                <Rocket className="w-4 h-4" /> Release
              </button>
              <button onClick={() => remove(f.id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Released history */}
      {released.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Released</h4>
          <div className="space-y-1">
            {released.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                <Rocket className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{f.title}</span>
                <span className="text-xs text-gray-400">{new Date(f.released_at || f.updated_at).toLocaleDateString()}</span>
                <button onClick={() => remove(f.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangelogPanel;
