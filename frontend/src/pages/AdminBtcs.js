import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Award, Search, RefreshCw, Users, TrendingUp, Trophy } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BtcsModal from '../components/admin/BtcsModal';
import BetaChatroom from '../components/beta/BetaChatroom';

const TIER_COLORS = {
  Elite: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Veteran: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Contributor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Rookie: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const AdminBtcs = () => {
  const { user } = useAuth();
  const [testers, setTesters] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selected, setSelected] = useState(null);

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

  useEffect(() => { load(); }, [load]);

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

  if (user && user.is_admin !== true) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Award className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BTCS</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Beta Tester Contribution System — scores, tiers, chatroom & controls</p>
            </div>
          </div>
          <button type="button" onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1"><Users className="w-3.5 h-3.5" /> Testers</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1"><TrendingUp className="w-3.5 h-3.5" /> Avg score</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avg}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1"><Trophy className="w-3.5 h-3.5" /> Top tester</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{stats.top?.name || stats.top?.username || '—'}</div>
            {stats.top && <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">{stats.top.btcs_score} pts</div>}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Tier spread</div>
            <div className="flex flex-wrap gap-1">
              {(meta?.tiers || []).map((t) => (
                <button type="button" key={t.key} onClick={() => setTierFilter(tierFilter === t.label ? 'all' : t.label)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TIER_COLORS[t.label]} ${tierFilter === t.label ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}>
                  {t.label} {stats.byTier[t.label] || 0}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search testers…"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none" />
              {(tierFilter !== 'all' || search) && (
                <button type="button" onClick={() => { setSearch(''); setTierFilter('all'); }} className="text-xs text-indigo-500 hover:underline">Clear</button>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
              {visible.map((t, i) => (
                <button type="button" key={t.id} onClick={() => setSelected(t)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <span className={`w-7 text-center text-sm font-bold shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300 dark:text-gray-600'}`}>
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
                </button>
              ))}
              {!loading && !visible.length && (
                <p className="text-sm text-gray-500 text-center py-8">No testers match</p>
              )}
            </div>
          </div>

          {/* Right column — tier legend + chatroom */}
          <div className="space-y-6">
            {meta && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Tier ladder</div>
                <div className="space-y-1.5">
                  {[...meta.tiers].sort((a, b) => a.min - b.min).map((t) => (
                    <div key={t.key} className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[t.label]}`}>{t.label}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{t.min}+ pts · {t.perks?.pinLimit ?? 30} pins/page</span>
                    </div>
                  ))}
                </div>
                {meta.weights && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Feedback {meta.weights.feedback} (+{meta.weights.bugBonus} bug) · Pins {meta.weights.pin} (+{meta.weights.pinFixedBonus} fixed) · Poll votes {meta.weights.pollVote} · MDL items {meta.weights.mdlItem} · Prices {meta.weights.mdlPrice} · Aisles {meta.weights.aisleReport} · Recipes {meta.weights.recipe}
                  </div>
                )}
              </div>
            )}
            <BetaChatroom tiers={tierMap} className="h-[480px]" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <BtcsModal tester={selected} onClose={() => { setSelected(null); load(); }} />}
      </AnimatePresence>
    </div>
  );
};

export default AdminBtcs;
