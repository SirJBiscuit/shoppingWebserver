import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, ShieldCheck, MapPin, AlertTriangle, MessageSquare,
  ListChecks, Code, GitCommitHorizontal, Timer, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Live app vitals for admins — one cheap poll of /beta/admin/stats/live.
// Real stats only: testers, users, open pins, 24h errors/chat, list/item
// totals, uptime, and repo stats (LOC, commits, estimated dev hours)
// exported by the deploy scripts into codestats.json.

const POLL_MS = 60 * 1000;

const fmt = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const fmtUptime = (sec) => {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const Chip = ({ icon: Icon, label, value, sub, tone = 'slate' }) => {
  const tones = {
    slate: 'text-slate-600 dark:text-slate-300',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 shadow-sm whitespace-nowrap"
      title={sub ? `${label} — ${sub}` : label}
    >
      <Icon className={`w-3.5 h-3.5 ${tones[tone]}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 dark:text-slate-500">({sub})</span>}
    </div>
  );
};

const AdminStatsStrip = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const { data } = await api.get('/beta/admin/stats/live');
      setStats(data);
    } catch { /* keep last good data */ }
    finally { setSpinning(false); }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return undefined;
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => clearInterval(timer.current);
  }, [user?.isAdmin, load]);

  if (!user?.isAdmin) return null;

  const s = stats || {};
  const code = s.code || {};
  const hours = code.hours_est != null ? `~${fmt(code.hours_est)}h` : '—';

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
      <Chip icon={ShieldCheck} label="Testers" value={fmt(s.testers?.total)}
        sub={s.testers?.active_7d != null ? `${s.testers.active_7d} active` : null} tone="amber" />
      <Chip icon={Users} label="Users" value={fmt(s.users?.total)}
        sub={s.users?.active_7d != null ? `${s.users.active_7d} wk` : null} tone="blue" />
      <Chip icon={MapPin} label="Pins" value={fmt(s.pins?.open)}
        sub={s.pins?.total != null ? `${fmt(s.pins.total)} total` : null} tone="violet" />
      <Chip icon={AlertTriangle} label="Errors 24h" value={fmt(s.errors_24h)}
        tone={s.errors_24h > 0 ? 'red' : 'emerald'} />
      <Chip icon={MessageSquare} label="Chat 24h" value={fmt(s.chat_24h)} tone="blue" />
      <Chip icon={ListChecks} label="Items" value={fmt(s.items_total)}
        sub={s.lists_total != null ? `${fmt(s.lists_total)} lists` : null} tone="emerald" />
      <Chip icon={Code} label="LOC" value={fmt(code.loc)} tone="slate" />
      <Chip icon={GitCommitHorizontal} label="Commits" value={fmt(code.commits)} tone="slate" />
      <Chip icon={Timer} label="Est. hours" value={hours}
        sub={s.uptime_sec != null ? `up ${fmtUptime(s.uptime_sec)}` : null} tone="slate" />
      <button
        type="button"
        onClick={() => load(true)}
        title="Refresh stats"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition flex-shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default AdminStatsStrip;
