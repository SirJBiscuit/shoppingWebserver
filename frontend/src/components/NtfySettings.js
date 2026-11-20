import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Send, ShieldCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '';

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const USER_TYPE_LABELS = {
  expiry: 'Expiring items (daily digest)',
  feature_release: 'New feature releases',
  broadcast: 'Announcements & broadcasts',
};

const ADMIN_TYPE_LABELS = {
  changelog: 'Changelog publishes',
  beta_signup: 'New beta signups',
  beta_feedback: 'Beta feedback activity',
  downtime: 'Server down / unreachable alerts',
};

const TopicSection = ({ title, icon: Icon, settings, onChange, onSave, onTest, saving, testing, message }) => {
  const set = (k, v) => onChange({ ...settings, [k]: v });
  const toggleType = (k) => onChange({
    ...settings,
    types: { ...settings.types, [k]: settings.types[k] === false },
  });

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          {title}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600 dark:text-gray-400">Enabled</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
            className="w-4 h-4 rounded accent-primary-600"
          />
        </label>
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          ntfy topic — subscribe to this in the{' '}
          <a
            href="https://ntfy.sh/app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-0.5"
          >
            ntfy app <ExternalLink className="w-3 h-3" />
          </a>
        </label>
        <input
          type="text"
          value={settings.topic}
          onChange={(e) => set('topic', e.target.value)}
          placeholder="e.g. listzy-mykitchen-x7f2"
          className="input-field w-full"
        />
      </div>

      <div className="space-y-1.5">
        {/* Master toggle — enables/disables every type while each saved
            choice in `types` is remembered (missing key still counts ON) */}
        <label className="flex items-center gap-2 cursor-pointer text-sm pb-1 border-b border-gray-200 dark:border-gray-700">
          <input
            type="checkbox"
            checked={Object.keys(settings.typeLabels).every((k) => settings.types[k] !== false)}
            onChange={(e) => onChange({
              ...settings,
              types: Object.fromEntries(
                Object.keys(settings.typeLabels).map((k) => [k, e.target.checked])
              ),
            })}
            disabled={!settings.enabled}
            className="w-4 h-4 rounded accent-primary-600"
          />
          <span className={`font-semibold ${settings.enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
            All notifications
          </span>
        </label>
        {Object.entries(settings.typeLabels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={settings.types[key] !== false}
              onChange={() => toggleType(key)}
              disabled={!settings.enabled}
              className="w-4 h-4 rounded accent-primary-600"
            />
            <span className={settings.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
              {label}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onTest}
          disabled={testing || !settings.topic}
          className="btn-secondary flex items-center gap-1.5"
          title="Send a test push to this topic"
        >
          <Send className="w-4 h-4" />
          {testing ? 'Sending…' : 'Test'}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};

const NtfySettings = () => {
  const { user } = useAuth();
  const [userCfg, setUserCfg] = useState({ topic: '', enabled: false, types: {}, typeLabels: USER_TYPE_LABELS });
  const [adminCfg, setAdminCfg] = useState({ topic: '', enabled: false, types: {}, typeLabels: ADMIN_TYPE_LABELS });
  const [savingUser, setSavingUser] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [testingUser, setTestingUser] = useState(false);
  const [testingAdmin, setTestingAdmin] = useState(false);
  const [userMsg, setUserMsg] = useState(null);
  const [adminMsg, setAdminMsg] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/ntfy/settings`, { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setUserCfg({ topic: d.topic || '', enabled: d.enabled === true, types: d.types || {}, typeLabels: USER_TYPE_LABELS });
      }
      if (user?.isAdmin || user?.is_admin) {
        const ares = await fetch(`${API_URL}/api/ntfy/admin/settings`, { headers: authHeaders() });
        if (ares.ok) {
          const ad = await ares.json();
          setAdminCfg({ topic: ad.topic || '', enabled: ad.enabled === true, types: ad.types || {}, typeLabels: ADMIN_TYPE_LABELS });
        }
      }
    } catch {
      setLoadError('Could not load push notification settings.');
    }
  }, [user?.isAdmin]);

  useEffect(() => { load(); }, [load]);

  const save = async (path, cfg, setSaving, setMsg, strip) => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ topic: cfg.topic, enabled: cfg.enabled, types: strip(cfg.types) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const test = async (path, setTesting, setMsg) => {
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Test failed');
      setMsg({ ok: true, text: 'Test sent — check your phone!' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setTesting(false);
    }
  };

  // Only explicitly-set toggles get persisted (missing = on)
  const strip = (types) => {
    const out = {};
    for (const [k, v] of Object.entries(types || {})) {
      if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Get push alerts on your phone or desktop via{' '}
        <a
          href="https://ntfy.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          ntfy.sh
        </a>
        . Pick a unique topic name, subscribe to it in the app, and paste it here.
      </p>

      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}

      <TopicSection
        title="Your notifications"
        icon={BellRing}
        settings={userCfg}
        onChange={setUserCfg}
        onSave={() => save('/api/ntfy/settings', userCfg, setSavingUser, setUserMsg, strip)}
        onTest={() => test('/api/ntfy/test', setTestingUser, setUserMsg)}
        saving={savingUser}
        testing={testingUser}
        message={userMsg}
      />

      {(user?.isAdmin || user?.is_admin) && (
        <TopicSection
          title="Admin alerts (all server events)"
          icon={ShieldCheck}
          settings={adminCfg}
          onChange={setAdminCfg}
          onSave={() => save('/api/ntfy/admin/settings', adminCfg, setSavingAdmin, setAdminMsg, strip)}
          onTest={() => test('/api/ntfy/admin/test', setTestingAdmin, setAdminMsg)}
          saving={savingAdmin}
          testing={testingAdmin}
          message={adminMsg}
        />
      )}
    </div>
  );
};

export default NtfySettings;
