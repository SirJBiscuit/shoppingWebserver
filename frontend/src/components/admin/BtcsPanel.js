import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Award, Search, RefreshCw, Users, TrendingUp, Trophy, Download, Upload,
  HardDrive, Clock, Shield, AlertTriangle, KeyRound, FileText, Ban,
  MessageSquare, Trash2, Send, Activity, X,
  Globe, RotateCcw, GitCompare, Timer
} from 'lucide-react';
import api from '../../services/api';
import BtcsModal from './BtcsModal';
import BetaChatroom from '../beta/BetaChatroom';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

const TIER_COLORS = {
  Elite: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Veteran: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Contributor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Rookie: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const ago = (ts) => {
  if (!ts) return '—';
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Right-click menu on a tester row — sub-views keep inputs inside the menu.
const CtxItem = ({ icon: Icon, label, hint, danger, onClick }) => (
  <button type="button" onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors rounded-lg ${
      danger ? 'text-red-300 hover:bg-red-900/30' : 'text-slate-200 hover:bg-slate-700/70'}`}>
    <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
    <span className="flex-1 truncate">{label}</span>
    {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
  </button>
);

const TesterContextMenu = ({ x, y, tester, onClose, onOpen, onDone }) => {
  const [view, setView] = useState('menu'); // menu | name | note | password | thanks | snapshots | activity
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [snapshots, setSnapshots] = useState(null);
  const [activity, setActivity] = useState(null);

  const act = async (fn, okMsg) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      setResult(r?.tempPassword ? `Temp password: ${r.tempPassword}` : (okMsg || 'Done'));
      setTimeout(() => { onDone?.(); onClose(); }, okMsg && !r?.tempPassword ? 700 : 2500);
    } catch (e) {
      setResult(e.response?.data?.error || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const loadSnapshots = async () => {
    setView('snapshots');
    try {
      const { data } = await api.get('/beta/admin/backups');
      setSnapshots(data.files || []);
    } catch { setSnapshots([]); }
  };

  const loadActivity = async () => {
    setView('activity');
    try {
      const { data } = await api.get(`/beta/admin/testers/${tester.id}/activity`);
      setActivity(Array.isArray(data) ? data : []);
    } catch { setActivity([]); }
  };

  const panel = (children) => (
    <div className="fixed z-[95] w-64 rounded-xl bg-slate-900/95 backdrop-blur border border-slate-700 shadow-2xl overflow-hidden"
      style={{ left: Math.min(x, window.innerWidth - 270), top: Math.min(y, window.innerHeight - 340) }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700">
        <Award className="w-3.5 h-3.5 text-amber-400" />
        <span className="flex-1 text-[11px] font-bold text-slate-300 truncate">
          {tester.name || tester.username || `User ${tester.id}`}
        </span>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
      </div>
      {children}
    </div>
  );

  const inputView = (title, placeholder, onSubmit, multiline) => (
    <div className="p-3 space-y-2">
      <div className="text-[11px] font-semibold text-slate-400 uppercase">{title}</div>
      {multiline ? (
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={placeholder}
          className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none" />
      ) : (
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
          className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500" />
      )}
      {result && <p className="text-[11px] text-amber-300">{result}</p>}
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setView('menu')} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800">Back</button>
        <button type="button" onClick={onSubmit} disabled={busy || !text.trim()}
          className="flex-1 text-xs py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50">Save</button>
      </div>
    </div>
  );

  if (view === 'name') return panel(inputView('Display name', 'New display name…',
    () => act(() => api.patch(`/beta/admin/testers/${tester.id}`, { displayName: text.trim() }).then(() => null), 'Name updated')));
  if (view === 'note') return panel(inputView('Admin note', 'Private note about this tester…',
    () => act(() => api.patch(`/beta/admin/testers/${tester.id}`, { adminNotes: text }).then(() => null), 'Note saved'), true));
  if (view === 'thanks') return panel(inputView('Thank-you message', 'Sent to this tester…',
    () => act(() => api.post(`/beta/admin/testers/${tester.id}/thank-you`, { message: text.trim() }).then(() => null), 'Message sent'), true));
  if (view === 'password') return panel(
    <div className="p-3 space-y-2">
      <div className="text-[11px] font-semibold text-slate-400 uppercase">Change password</div>
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="New password (blank = generate temp)…"
        className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500" />
      {result && <p className="text-[11px] text-amber-300 break-all select-all">{result}</p>}
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setView('menu')} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800">Back</button>
        <button type="button" disabled={busy}
          onClick={() => act(() => api.post(`/beta/admin/testers/${tester.id}/reset-password`, text.trim() ? { password: text.trim() } : {}).then((r) => r.data), 'Password changed')}
          className="flex-1 text-xs py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50">
          {text.trim() ? 'Set password' : 'Generate temp'}
        </button>
      </div>
    </div>
  );
  if (view === 'snapshots') return panel(
    <div className="max-h-72 overflow-y-auto p-1.5">
      <div className="px-2 py-1 text-[10px] text-slate-500 uppercase font-semibold">Restore {tester.username || tester.name} to…</div>
      {(snapshots || []).map((s) => (
        <CtxItem key={s.filename} icon={RotateCcw} label={ago(s.created_at)}
          hint={new Date(s.created_at).toLocaleString()}
          onClick={() => act(async () => {
            await api.post(`/beta/admin/backups/${s.filename}/restore-user`, { user_id: tester.id });
            return null;
          }, 'Restored — like nothing ever changed')} />
      ))}
      {snapshots && !snapshots.length && <p className="text-xs text-slate-500 px-3 py-3">No save points yet — create one in Recovery</p>}
      {snapshots === null && <p className="text-xs text-slate-500 px-3 py-3">Loading…</p>}
    </div>
  );
  if (view === 'activity') return panel(
    <div className="max-h-72 overflow-y-auto p-1.5">
      <div className="px-2 py-1 text-[10px] text-slate-500 uppercase font-semibold">Recent activity</div>
      {(activity || []).slice(0, 40).map((a, i) => (
        <div key={i} className="px-2.5 py-1.5 text-[11px] text-slate-300 border-b border-slate-800/60 last:border-0">
          <span className={`inline-block w-14 text-[9px] font-bold uppercase mr-1 ${a.kind === 'error' ? 'text-red-400' : 'text-slate-500'}`}>{a.kind}</span>
          <span className="break-words">{a.label}</span>
          <span className="block text-[9px] text-slate-600 mt-0.5">{a.at ? new Date(a.at).toLocaleString() : ''}</span>
        </div>
      ))}
      {activity && !activity.length && <p className="text-xs text-slate-500 px-3 py-3">No activity yet</p>}
      {activity === null && <p className="text-xs text-slate-500 px-3 py-3">Loading…</p>}
    </div>
  );

  return panel(
    <div className="p-1.5">
      <CtxItem icon={Award} label="BTCS details" onClick={() => { onOpen(tester); onClose(); }} />
      <CtxItem icon={Activity} label="Activity timeline" onClick={loadActivity} />
      <div className="my-1 border-t border-slate-700/60" />
      <CtxItem icon={HardDrive} label="Save point for this user" hint="instant"
        onClick={() => act(() => api.post('/beta/admin/backups/save-user', { user_id: tester.id }).then(() => null), 'Save point created')} />
      <CtxItem icon={RotateCcw} label="Restore to save point…" hint="undo" onClick={loadSnapshots} />
      <div className="my-1 border-t border-slate-700/60" />
      <CtxItem icon={FileText} label="Edit display name" onClick={() => { setText(tester.display_name || tester.name || ''); setView('name'); }} />
      <CtxItem icon={FileText} label="Admin note" onClick={() => { setText(tester.admin_notes || ''); setView('note'); }} />
      <CtxItem icon={KeyRound} label="Change password" onClick={() => { setText(''); setResult(null); setView('password'); }} />
      <CtxItem icon={Send} label="Send thank-you" onClick={() => { setText(''); setView('thanks'); }} />
      <div className="my-1 border-t border-slate-700/60" />
      <CtxItem icon={Timer} label="Extend access +30 days"
        onClick={() => act(() => api.post(`/beta/admin/testers/${tester.id}/extend`, { days: 30 }).then(() => null), '+30 days added')} />
      <CtxItem icon={MessageSquare} label={tester.can_chat === false ? 'Allow chatroom' : 'Block chatroom'}
        onClick={() => act(() => api.patch(`/beta/admin/testers/${tester.id}`, { canChat: tester.can_chat === false }).then(() => null), 'Chat access updated')} />
      <CtxItem icon={Ban} label={tester.suspended ? 'Unsuspend tester' : 'Suspend tester'} danger={!tester.suspended}
        onClick={() => act(() => api.patch(`/beta/admin/testers/${tester.id}`, { suspended: !tester.suspended }).then(() => null), tester.suspended ? 'Unsuspended' : 'Suspended')} />
      {result && <p className="text-[11px] text-amber-300 px-3 py-1">{result}</p>}
    </div>
  );
};

const BtcsPanel = ({ onClose, compact = false }) => {
  const [testers, setTesters] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [ctx, setCtx] = useState(null);         // {x, y, tester}
  const [backupMsg, setBackupMsg] = useState(null);
  const [backups, setBackups] = useState(null); // {dir, files}
  const [settings, setSettings] = useState(null);
  const [features, setFeatures] = useState(null);
  const [errors, setErrors] = useState(null);
  const [errSummary, setErrSummary] = useState(null);
  const [section, setSection] = useState('testers'); // testers | features | recovery | errors
  const [confirm, setConfirm] = useState(null); // {title, message, onConfirm}
  const [diff, setDiff] = useState(null);       // {file, rows}
  const [restoreUser, setRestoreUser] = useState(null); // {file, users}
  const restoreRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        api.get('/beta/admin/testers'),
        api.get('/beta/admin/btcs/meta').catch(() => null),
      ]);
      setTesters(Array.isArray(t.data) ? t.data : []);
      if (m) setMeta(m.data);
    } catch {
      setTesters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([
        api.get('/beta/admin/backups'),
        api.get('/beta/admin/backups/settings'),
      ]);
      setBackups(b.data);
      setSettings(s.data);
    } catch { setBackups({ files: [] }); }
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      const { data } = await api.get('/beta/admin/features');
      setFeatures(Array.isArray(data) ? data : []);
    } catch { setFeatures([]); }
  }, []);

  const loadErrors = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        api.get('/errors/admin?limit=60'),
        api.get('/errors/admin/summary'),
      ]);
      setErrors(Array.isArray(e.data) ? e.data : []);
      setErrSummary(Array.isArray(s.data) ? s.data : []);
    } catch { setErrors([]); setErrSummary([]); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (section === 'recovery') loadBackups();
    if (section === 'features') loadFeatures();
    if (section === 'errors') loadErrors();
  }, [section, loadBackups, loadFeatures, loadErrors]);

  // Click-anywhere dismiss for the tester context menu
  useEffect(() => {
    if (!ctx) return undefined;
    const off = () => setCtx(null);
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [ctx]);

  const downloadBackup = async () => {
    try {
      const { data } = await api.get('/beta/admin/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `beta-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg('Backup downloaded');
    } catch { setBackupMsg('Download failed'); }
  };

  const saveServerBackup = async () => {
    try {
      const { data } = await api.post('/beta/admin/backups/save');
      setBackupMsg(`Saved to server: ${data.filename}`);
      loadBackups();
    } catch { setBackupMsg('Server save failed'); }
  };

  const restoreBackup = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const { data } = await api.post('/beta/admin/backup/restore', parsed);
      setBackupMsg(`Restored ${data.usersRestored} accounts / ${data.userRows} rows` +
        (data.safety_snapshot ? ` — safety point: ${data.safety_snapshot}` : ''));
      load(); loadBackups();
    } catch (e) {
      setBackupMsg(e.response?.data?.error || 'Restore failed — is this a valid backup file?');
    } finally {
      if (restoreRef.current) restoreRef.current.value = '';
    }
  };

  const saveSettings = async (patch) => {
    try {
      const { data } = await api.put('/beta/admin/backups/settings', patch);
      setSettings(data);
    } catch { setBackupMsg('Settings save failed'); }
  };

  const setFeatureDefault = async (key, val) => {
    // cycle: null → true → false → null
    const next = val === null || val === undefined ? true : (val === true ? false : null);
    try {
      await api.put(`/beta/admin/features/${key}`, { beta_default: next });
      loadFeatures();
    } catch { /* silent */ }
  };

  const tierMap = useMemo(
    () => Object.fromEntries(testers.map((t) => [t.id, t.btcs_tier_label])),
    [testers]
  );

  const stats = useMemo(() => {
    const scores = testers.map((t) => t.btcs_score || 0);
    const total = testers.length;
    const avg = total ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
    const byTier = {};
    testers.forEach((t) => { byTier[t.btcs_tier_label] = (byTier[t.btcs_tier_label] || 0) + 1; });
    return { total, avg, byTier, top: testers.reduce((m, t) => (t.btcs_score > (m?.btcs_score || 0) ? t : m), null) };
  }, [testers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return testers
      .filter((t) => tierFilter === 'all' || (t.btcs_tier_label || 'Rookie') === tierFilter)
      .filter((t) => !q || [t.name, t.username, t.email, t.beta_username, t.display_name]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => (b.btcs_score || 0) - (a.btcs_score || 0));
  }, [testers, search, tierFilter]);

  const SectionBtn = ({ id, icon: Icon, children }) => (
    <button type="button" onClick={() => setSection(id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
        section === id ? 'bg-amber-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Section tabs */}
      <div className="flex items-center gap-1 flex-wrap pb-3 border-b border-gray-200 dark:border-gray-700">
        <SectionBtn id="testers" icon={Users}>Testers</SectionBtn>
        <SectionBtn id="features" icon={Globe}>Global features</SectionBtn>
        <SectionBtn id="recovery" icon={HardDrive}>Recovery</SectionBtn>
        <SectionBtn id="errors" icon={AlertTriangle}>Errors</SectionBtn>
        <div className="flex-1" />
        <button type="button" onClick={downloadBackup}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
          title="Full snapshot → downloads as JSON (all users, lists, items, customizations)">
          <Download className="w-3.5 h-3.5" /> To computer
        </button>
        <button type="button" onClick={saveServerBackup}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
          title="Write a save point on the server right now">
          <HardDrive className="w-3.5 h-3.5" /> Save point
        </button>
        <button type="button" onClick={() => restoreRef.current?.click()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
          title="Restore a full backup file (safety snapshot taken first)">
          <Upload className="w-3.5 h-3.5" /> Restore file
        </button>
        <input ref={restoreRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => restoreBackup(e.target.files?.[0])} />
        <button type="button" onClick={load} disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {backupMsg && <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">{backupMsg}</p>}

      <div className="flex-1 min-h-0 overflow-y-auto pt-3">
        {section === 'testers' && (
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <div>
              {/* Stat strip */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase"><Users className="w-3 h-3" /> Testers</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase"><TrendingUp className="w-3 h-3" /> Avg</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.avg}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase"><Trophy className="w-3 h-3" /> Top</div>
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{stats.top?.name || '—'}</div>
                </div>
              </div>
              {/* Leaderboard */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search testers…"
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none" />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[52vh] overflow-y-auto">
                  {visible.map((t, i) => (
                    <div key={t.id} role="button" tabIndex={0}
                      onClick={() => setSelected(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(t); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, tester: t }); }}
                      title="Right-click for tester controls"
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
                      <span className={`w-6 text-center text-sm font-bold shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300 dark:text-gray-600'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {t.name || t.username || `User ${t.id}`}
                          {t.suspended && <span className="ml-2 text-[10px] px-1 py-px rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 font-semibold">SUSPENDED</span>}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{t.username}{t.email ? ` · ${t.email}` : ''}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.btcs_score || 0}<span className="text-[10px] font-normal text-gray-400 ml-0.5">pts</span></div>
                        <span className={`inline-block px-1.5 py-px rounded text-[10px] font-semibold ${TIER_COLORS[t.btcs_tier_label] || TIER_COLORS.Rookie}`}>{t.btcs_tier_label || 'Rookie'}</span>
                      </div>
                    </div>
                  ))}
                  {!loading && !visible.length && <p className="text-sm text-gray-500 text-center py-8">No testers match</p>}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {meta && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Tier ladder</div>
                  <div className="space-y-1">
                    {[...meta.tiers].sort((a, b) => a.min - b.min).map((t) => (
                      <div key={t.key} className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded font-semibold ${TIER_COLORS[t.label]}`}>{t.label}</span>
                        <span className="text-gray-500 dark:text-gray-400">{t.min}+ pts · {t.perks?.pinLimit ?? 30} pins</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <BetaChatroom tiers={tierMap} className="h-[380px]" />
            </div>
          </div>
        )}

        {section === 'features' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Global beta feature access</div>
              <p className="text-xs text-gray-500 mt-0.5">
                One switch per feature for <b>every</b> beta tester — click to cycle
                <span className="text-gray-400"> follow flags → </span><span className="text-emerald-500">allow all → </span><span className="text-red-400">deny all</span>.
                Per-tester overrides (BtcsModal) still win.
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
              {(features || []).map((f) => (
                <button key={f.feature_key} type="button" onClick={() => setFeatureDefault(f.feature_key, f.beta_default)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{f.feature_name}</div>
                    <div className="text-[10px] text-gray-400">{f.feature_key} · {f.category}</div>
                  </div>
                  {f.hide_from_beta && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">hidden by flag</span>}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                    f.beta_default === true ? 'bg-emerald-500/15 text-emerald-400'
                    : f.beta_default === false ? 'bg-red-500/15 text-red-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {f.beta_default === true ? 'allow all' : f.beta_default === false ? 'deny all' : 'follow flags'}
                  </span>
                </button>
              ))}
              {features && !features.length && <p className="text-sm text-gray-500 text-center py-8">No beta-adjustable features</p>}
            </div>
          </div>
        )}

        {section === 'recovery' && (
          <div className="space-y-4">
            {/* Auto-backup settings */}
            {settings && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Automatic save points</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <input type="checkbox" checked={!!settings.enabled} onChange={(e) => saveSettings({ enabled: e.target.checked })} />
                    Enabled
                  </label>
                  <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    Every
                    <select value={settings.interval_minutes} onChange={(e) => saveSettings({ interval_minutes: parseInt(e.target.value, 10) })}
                      className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-800 dark:text-gray-200">
                      <option value={60}>hour</option>
                      <option value={360}>6 hours</option>
                      <option value={720}>12 hours</option>
                      <option value={1440}>day</option>
                      <option value={10080}>week</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    Keep last
                    <input type="number" min="1" max="500" defaultValue={settings.keep}
                      onBlur={(e) => saveSettings({ keep: parseInt(e.target.value, 10) })}
                      className="w-16 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-800 dark:text-gray-200" />
                  </label>
                  <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300 flex-1 min-w-48">
                    Folder
                    <input type="text" defaultValue={settings.directory || ''} placeholder="default: backend/backups/beta"
                      onBlur={(e) => saveSettings({ directory: e.target.value })}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-gray-800 dark:text-gray-200" />
                  </label>
                  {settings.last_run_at && <span className="text-gray-400">last run {ago(settings.last_run_at)}</span>}
                </div>
              </div>
            )}

            {/* Server snapshots */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Server save points</span>
                {backups?.dir && <span className="text-[10px] text-gray-400 truncate">{backups.dir}</span>}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[46vh] overflow-y-auto">
                {(backups?.files || []).map((f) => (
                  <div key={f.filename} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate">{f.filename}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(f.created_at).toLocaleString()} · {(f.size_bytes / 1024).toFixed(0)} KB · {ago(f.created_at)}
                        </div>
                      </div>
                      <button type="button" title="Download this snapshot (plain JSON)"
                        onClick={async () => {
                          try {
                            const { data } = await api.get(`/beta/admin/backups/${f.filename}/download`, { responseType: 'blob' });
                            const url = URL.createObjectURL(data);
                            const a = document.createElement('a');
                            a.href = url; a.download = f.filename.replace(/\.gz$/, ''); a.click();
                            URL.revokeObjectURL(url);
                          } catch { /* silent */ }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"><Download className="w-3.5 h-3.5" /></button>
                      <button type="button" title="What changed since this save point?"
                        onClick={async () => {
                          try {
                            const { data } = await api.get(`/beta/admin/backups/${f.filename}/diff`);
                            setDiff({ file: f.filename, exported_at: data.exported_at, rows: data.changes });
                          } catch { /* silent */ }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"><GitCompare className="w-3.5 h-3.5" /></button>
                      <button type="button" title="Restore one user to this point"
                        onClick={async () => {
                          try {
                            const { data } = await api.get(`/beta/admin/backups/${f.filename}/users`);
                            setRestoreUser({ file: f.filename, users: data.users, exported_at: data.exported_at });
                          } catch { /* silent */ }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"><Users className="w-3.5 h-3.5" /></button>
                      <button type="button" title="Restore EVERYTHING to this point"
                        onClick={() => setConfirm({
                          title: 'Restore full snapshot?',
                          message: `Every user account and all data rolls back to ${new Date(f.created_at).toLocaleString()}. A safety snapshot is taken first.`,
                          onConfirm: async () => {
                            const { data } = await api.post(`/beta/admin/backups/${f.filename}/restore`);
                            setBackupMsg(`Restored ${data.usersRestored} accounts / ${data.userRows} rows`);
                            load(); loadBackups();
                          },
                        })}
                        className="p-1.5 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button type="button" title="Delete this snapshot"
                        onClick={() => setConfirm({
                          title: 'Delete snapshot?',
                          message: `${f.filename} will be permanently removed.`,
                          danger: true,
                          onConfirm: async () => {
                            await api.delete(`/beta/admin/backups/${f.filename}`);
                            loadBackups();
                          },
                        })}
                        className="p-1.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {backups && !backups.files?.length && (
                  <p className="text-sm text-gray-500 text-center py-6">No save points yet — hit "Save point" or enable auto backups</p>
                )}
              </div>
            </div>

            {/* Diff result */}
            {diff && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GitCompare className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    Changes since {new Date(diff.exported_at).toLocaleString()}
                  </span>
                  <button type="button" onClick={() => setDiff(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                {diff.rows.length === 0 && <p className="text-xs text-gray-500">No changes — live data matches the snapshot.</p>}
                <div className="max-h-48 overflow-y-auto">
                  {diff.rows.map((d) => (
                    <div key={d.table} className="flex items-center gap-3 text-xs py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-mono text-gray-700 dark:text-gray-300 flex-1 truncate">{d.table}</span>
                      {d.error ? <span className="text-gray-400">{d.error}</span> : (
                        <>
                          {d.added > 0 && <span className="text-emerald-500">+{d.added} new</span>}
                          {d.removed > 0 && <span className="text-red-400">−{d.removed} gone</span>}
                          {d.changed > 0 && <span className="text-amber-500">~{d.changed} changed</span>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {section === 'errors' && (
          <div className="space-y-4">
            {errSummary?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">Repeat offenders (7d)</span>
                  <button type="button" onClick={() => setConfirm({
                    title: 'Clear error log?', message: 'All logged errors will be deleted.', danger: true,
                    onConfirm: async () => { await api.delete('/errors/admin'); loadErrors(); },
                  })} className="text-xs text-red-400 hover:underline">Clear all</button>
                </div>
                {errSummary.slice(0, 8).map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">{e.count}×</span>
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300" title={e.message}>{e.message}</span>
                    <span className="text-gray-400 shrink-0">{ago(e.last_seen)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Recent errors — what caused the problem
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[44vh] overflow-y-auto">
                {(errors || []).map((e) => (
                  <div key={e.id} className="px-4 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        e.source === 'client' ? 'bg-blue-500/10 text-blue-400'
                        : e.source === 'process' ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'}`}>{e.source}</span>
                      <span className="flex-1 truncate text-gray-800 dark:text-gray-200" title={e.stack || e.message}>{e.message}</span>
                      <span className="text-gray-400 shrink-0">{ago(e.created_at)}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex gap-3">
                      {e.method && <span>{e.method}</span>}
                      {e.path && <span className="truncate">{e.path}</span>}
                      {e.username && <span>by {e.username}</span>}
                    </div>
                  </div>
                ))}
                {errors && !errors.length && <p className="text-sm text-gray-500 text-center py-6">No errors logged — clean bill of health</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tester right-click context menu */}
      {ctx && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <TesterContextMenu x={ctx.x} y={ctx.y} tester={ctx.tester}
            onClose={() => setCtx(null)} onOpen={setSelected} onDone={load} />
        </div>
      )}

      {/* Restore-user picker */}
      {restoreUser && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50" onClick={() => setRestoreUser(null)}>
          <div className="w-80 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">Restore a user</span>
              <button type="button" onClick={() => setRestoreUser(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">
              Rolls ONE account back to {new Date(restoreUser.exported_at).toLocaleString()} — their lists,
              items, customizations, everything. Other accounts untouched. Safety snapshot taken first.
            </p>
            {restoreUser.users.map((u) => (
              <button key={u.id} type="button"
                onClick={() => setConfirm({
                  title: `Restore ${u.username}?`,
                  message: `This account rolls back to the snapshot exactly — like nothing ever changed for them.`,
                  onConfirm: async () => {
                    setRestoreUser(null);
                    const { data } = await api.post(`/beta/admin/backups/${restoreUser.file}/restore-user`, { user_id: u.id });
                    setBackupMsg(`Restored ${u.username}: ${data.userRows} rows replayed`);
                    load();
                  },
                })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200">
                <span className="flex-1 truncate">{u.username}</span>
                {u.is_admin && <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-500 font-bold">ADMIN</span>}
                {u.is_beta_tester && <span className="text-[9px] px-1 rounded bg-blue-500/15 text-blue-400 font-bold">BETA</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && <BtcsModal tester={selected} onClose={() => { setSelected(null); load(); }} compact={compact} />}
      </AnimatePresence>

      {confirm && (
        <ConfirmModal
          isOpen
          title={confirm.title}
          message={confirm.message}
          type={confirm.danger ? 'danger' : 'warning'}
          confirmText="Do it"
          onConfirm={async () => { const fn = confirm.onConfirm; setConfirm(null); await fn(); }}
          onCancel={() => setConfirm(null)}
          backdropClassName={compact ? 'z-[95] p-4' : undefined}
        />
      )}
    </div>
  );
};

export default BtcsPanel;
