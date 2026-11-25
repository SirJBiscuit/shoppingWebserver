import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, ShieldCheck, MapPin, AlertTriangle, MessageSquare,
  ListChecks, Code, GitCommitHorizontal, Timer, RefreshCw,
  Database, Store, DollarSign, Signpost, Bug, Lightbulb,
  KeyRound, Vote, CalendarDays, Activity
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Live app vitals for admins — one cheap poll of /beta/admin/stats/live.
// Compact tile grid (grouped: People / Beta / Catalog / Code) inside a
// fixed-height panel with a 3D-styled scrollbar. Code stats come from
// codestats.json written at deploy time.

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

const fmtAge = (iso) => {
  if (!iso) return '—';
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  if (days >= 30) return `${Math.floor(days / 30)}mo`;
  return `${days}d`;
};

const Tile = ({ icon: Icon, label, value, sub, tone = 'slate' }) => {
  const tones = {
    slate: 'text-slate-500 dark:text-slate-300',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/70 dark:bg-slate-800/70 border border-gray-200/80 dark:border-slate-700/80 min-w-0"
      title={sub ? `${label} — ${sub}` : label}
    >
      <Icon className={`w-3 h-3 flex-shrink-0 ${tones[tone]}`} />
      <span className={`text-[11px] font-bold ${tones[tone]} tabular-nums`}>{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 truncate">{label}</span>
      {sub && <span className="text-[9px] text-gray-400 dark:text-slate-500 truncate hidden xl:inline">({sub})</span>}
    </div>
  );
};

const GroupLabel = ({ children }) => (
  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 px-0.5 self-center">{children}</span>
);

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
  const mdl = s.mdl || {};

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/60 shadow-sm">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
          Live stats
        </span>
        <button
          type="button"
          onClick={() => load(true)}
          title="Refresh stats"
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3 h-3 ${spinning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="scrollbar-3d max-h-[132px] overflow-y-auto px-3 pb-2.5 pt-1 space-y-1.5">
        <div className="flex flex-wrap gap-1">
          <GroupLabel>People</GroupLabel>
          <Tile icon={Users} label="users" value={fmt(s.users?.total)} sub={`${s.users?.active_7d ?? '—'} this wk`} tone="blue" />
          <Tile icon={ShieldCheck} label="testers" value={fmt(s.testers?.total)} sub={`${s.testers?.active_7d ?? '—'} active`} tone="amber" />
          <Tile icon={ShieldCheck} label="suspended" value={fmt(s.testers?.suspended)} tone={s.testers?.suspended > 0 ? 'red' : 'slate'} />
          <Tile icon={Activity} label="uptime" value={fmtUptime(s.uptime_sec)} tone="emerald" />
        </div>

        <div className="flex flex-wrap gap-1">
          <GroupLabel>Beta</GroupLabel>
          <Tile icon={MapPin} label="open pins" value={fmt(s.pins?.open)} sub={`${fmt(s.pins?.total)} total`} tone="violet" />
          <Tile icon={Bug} label="bugs" value={fmt(s.feedback?.bugs)} tone={s.feedback?.bugs > 0 ? 'red' : 'slate'} />
          <Tile icon={Lightbulb} label="ideas" value={fmt(s.feedback?.features)} tone="blue" />
          <Tile icon={AlertTriangle} label="errors 24h" value={fmt(s.errors?.last_24h)} tone={s.errors?.last_24h > 0 ? 'red' : 'emerald'} />
          <Tile icon={MessageSquare} label="chat 24h" value={fmt(s.chat?.last_24h)} sub={`${fmt(s.chat?.total)} total`} tone="blue" />
          <Tile icon={KeyRound} label="codes" value={fmt(s.codes?.active)} sub={`${fmt(s.codes?.total)} total`} tone="slate" />
          <Tile icon={Vote} label="open polls" value={fmt(s.polls?.open)} sub={`${fmt(s.polls?.total)} total`} tone="slate" />
        </div>

        <div className="flex flex-wrap gap-1">
          <GroupLabel>Catalog</GroupLabel>
          <Tile icon={ListChecks} label="items" value={fmt(s.items_total)} sub={`${fmt(s.lists_total)} lists`} tone="emerald" />
          <Tile icon={Database} label="mdl items" value={fmt(mdl.items)} tone="slate" />
          <Tile icon={DollarSign} label="priced" value={mdl.price_pct != null ? `${mdl.price_pct}%` : '—'} sub={`${fmt(mdl.price_reports)} reports`} tone="emerald" />
          <Tile icon={Signpost} label="aisles" value={mdl.aisle_pct != null ? `${mdl.aisle_pct}%` : '—'} sub={`${fmt(mdl.aisle_reports)} reports`} tone="violet" />
          <Tile icon={Store} label="stores" value={fmt(mdl.stores)} tone="slate" />
        </div>

        <div className="flex flex-wrap gap-1">
          <GroupLabel>Code</GroupLabel>
          <Tile icon={Code} label="loc" value={fmt(code.loc)} tone="slate" />
          <Tile icon={GitCommitHorizontal} label="commits" value={fmt(code.commits)} tone="slate" />
          <Tile icon={Timer} label="est. hours" value={code.hours_est != null ? `~${fmt(code.hours_est)}` : '—'} tone="slate" />
          <Tile icon={CalendarDays} label="app age" value={fmtAge(code.first_commit)}
            sub={code.first_commit ? `since ${new Date(code.first_commit).toLocaleDateString()}` : null} tone="slate" />
        </div>
      </div>
    </div>
  );
};

export default AdminStatsStrip;
