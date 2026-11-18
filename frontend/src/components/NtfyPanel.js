import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, Check, X as XIcon, RefreshCw, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';
import CustomPanel from './CustomPanel';
import NtfySettings from './NtfySettings';
import { setPanelShift, useFloatSide, useIsMobile } from '../utils/autoPlacement';

const TYPE_LABELS = {
  expiry: 'Expiring items',
  feature_release: 'Feature releases',
  broadcast: 'Announcements',
  test: 'Test ping',
};

const TYPE_COLORS = {
  expiry: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  feature_release: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  broadcast: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  test: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const fmtTime = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return d.toLocaleString('en-US', sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/**
 * NtfyPanel — slide-out GUI opened from the floating Apps menu.
 * Status + per-type toggles (writes straight to /ntfy/settings), a test
 * ping, and a feed of the user's recent pushes from ntfy_notifications.
 * Topic/admin configuration opens as a second view inside this same
 * panel (NtfySettings) instead of kicking the user out to /settings.
 */
const NtfyPanel = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState(null); // {topic, enabled, types, availableTypes}
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState(null); // {ok, text}
  const [showSettings, setShowSettings] = useState(false);
  const position = useFloatSide('right');
  const isMobile = useIsMobile();

  // Slide the corner button stack out from under this panel, same way the
  // Active List panel does via its 'list' shift source.
  useEffect(() => {
    setPanelShift('ntfy', isOpen && position === 'right' && !isMobile ? 340 : 0);
    return () => setPanelShift('ntfy', 0);
  }, [isOpen, position, isMobile]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get('/ntfy/settings'),
        api.get('/ntfy/recent'),
      ]);
      setSettings(s.data);
      setRecent(Array.isArray(r.data) ? r.data : []);
    } catch {
      setNotice({ ok: false, text: 'Could not load ntfy status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNotice(null);
      setShowSettings(false);
      load();
    }
  }, [isOpen, load]);

  // Returning from the config view — reload so the status card picks up
  // any topic/enabled changes the user just saved there.
  const backFromSettings = () => {
    setShowSettings(false);
    load();
  };

  const save = async (patch) => {
    if (!settings) return;
    const next = {
      topic: settings.topic || '',
      enabled: settings.enabled === true,
      types: settings.types || {},
      ...patch,
    };
    setSettings((s) => ({ ...s, ...patch })); // optimistic
    try {
      const { data } = await api.put('/ntfy/settings', next);
      setSettings((s) => ({ ...s, ...data }));
    } catch {
      setNotice({ ok: false, text: 'Save failed' });
    }
  };

  const toggleType = (type) => {
    const types = { ...(settings?.types || {}) };
    types[type] = types[type] === false; // missing counts as ON → write explicit bool
    save({ types });
  };

  const sendTest = async () => {
    setTesting(true);
    setNotice(null);
    try {
      await api.post('/ntfy/test');
      setNotice({ ok: true, text: 'Test ping sent — check your ntfy app' });
      const { data } = await api.get('/ntfy/recent');
      setRecent(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice({ ok: false, text: err.response?.data?.error || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const connected = settings?.enabled === true && !!settings?.topic;
  const types = settings?.availableTypes || Object.keys(TYPE_LABELS).filter((t) => t !== 'test');

  return (
    <CustomPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Push Notifications"
      width="sm"
      shiftSource="ntfy"
      showBackdrop={false}
      scrollable
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : showSettings ? (
        <div className="p-4">
          <button
            onClick={backFromSettings}
            className="mb-3 flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <NtfySettings />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Connection status */}
          <div className="p-4 space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${connected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${connected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${connected ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`}>
                  {connected ? 'Connected' : 'Not configured'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {connected ? `topic: ${settings.topic}` : 'Set your ntfy topic to start receiving pushes'}
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">On</span>
                <input
                  type="checkbox"
                  checked={settings?.enabled === true}
                  onChange={(e) => save({ enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-primary-600"
                />
              </label>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {connected ? 'Configure topic & alerts' : 'Set up your ntfy topic'}
            </button>

            {notice && (
              <div className={`text-xs px-3 py-2 rounded-lg ${notice.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                {notice.text}
              </div>
            )}

            {/* Type toggles */}
            <div className="space-y-1.5">
              {types.map((t) => {
                const on = settings?.types?.[t] !== false;
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{TYPE_LABELS[t] || t}</span>
                    <span className={`w-8 h-[18px] rounded-full relative transition-colors ${on ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${on ? 'left-[16px]' : 'left-[2px]'}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={sendTest}
              disabled={testing || !settings?.topic}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-semibold"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {testing ? 'Sending…' : 'Send test notification'}
            </button>
          </div>

          {/* Recent sends feed */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent</h3>
              <button onClick={load} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-3 text-center">Nothing sent yet</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((n) => (
                  <li key={n.id} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[n.type] || TYPE_COLORS.test}`}>
                        {TYPE_LABELS[n.type] || n.type || 'push'}
                      </span>
                      <span className="flex-1" />
                      {n.delivered
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <XIcon className="w-3.5 h-3.5 text-red-400" title="ntfy.sh rejected it" />}
                      <span className="text-[10px] text-gray-400">{fmtTime(n.sent_at)}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{n.title}</div>
                    {n.message && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 whitespace-pre-line">{n.message}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </CustomPanel>
  );
};

export default NtfyPanel;
