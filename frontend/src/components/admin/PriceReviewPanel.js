import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Check, X, RefreshCw, Edit3, Ban, Users, ThumbsDown } from 'lucide-react';
import api from '../../services/api';

/**
 * PriceReviewPanel — admin queue for the MDL quality gate.
 * Quarantined submissions (weird names, suspect prices, duplicates) wait
 * here. Approve promotes into the global catalog; Reject discards; Block
 * also blacklists the normalized name so it can never re-enter.
 */
const PriceReviewPanel = () => {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});      // id -> corrected name
  const [blocks, setBlocks] = useState({});    // id -> block name on reject
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const [{ data: q }, { data: s }] = await Promise.all([
        api.get('/mdl/admin/pending', { params: { status, limit: 100 } }),
        api.get('/mdl/admin/quality-stats'),
      ]);
      setQueue(q?.items || []);
      setStats(s || null);
    } catch (e) {
      showMsg('Failed to load review queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, action) => {
    try {
      if (action === 'approve') {
        const corrected = edits[id]?.trim();
        await api.post(`/mdl/admin/pending/${id}/approve`,
          corrected ? { correctedName: corrected } : {});
        showMsg('Approved — promoted to global catalog');
      } else {
        await api.post(`/mdl/admin/pending/${id}/reject`,
          blocks[id] ? { block: true } : {});
        showMsg(blocks[id] ? 'Rejected + name blocked' : 'Rejected');
      }
      setQueue((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setBlocks((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      showMsg(e.response?.data?.error || `Failed to ${action}`, 'error');
    }
  };

  const FLAG_LABELS = {
    long_name: 'Too long', no_letters: 'No letters', excessive_digits: 'Mostly digits',
    special_chars: 'Special chars', url_or_email: 'URL/email', repeated_chars: 'Char spam',
    repeated_word: 'Repeated word', gibberish: 'Gibberish', profanity: 'Profanity',
    quantity_prefix: 'Qty prefix', shouting: 'ALL CAPS', price_invalid: 'Bad price',
    price_tiny: 'Tiny price', price_absurd: 'Absurd price', price_extreme: 'Extreme price',
    price_outlier: 'Price outlier', possible_duplicate: 'Possible dupe',
    assessment_error: 'Check failed', rate_limited: 'Rate limited',
  };
  const flagList = (f) => (Array.isArray(f) ? f : []);

  const STATUSES = ['pending', 'approved', 'auto_confirmed', 'rejected', 'blocked'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          MDL Quality Gate
        </h3>
        <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full font-medium border transition-colors ${
                status === s
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s.replace('_', ' ')} · {stats.byStatus?.[s] ?? 0}
            </button>
          ))}
          <span className="px-3 py-1.5 rounded-full text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600">
            {stats.blockedNames} names blocked
          </span>
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Suspect submissions sit here — they never touch the global catalog or
        suggestions until promoted. Items also self-confirm when a second
        distinct user submits them.
      </p>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading…</div>
      ) : queue.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Check className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No {status} items — all clear
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((r) => (
            <div key={r.id} className="p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono font-medium text-gray-900 dark:text-white break-all">"{r.raw_name}"</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {r.price != null && <>${Number(r.price).toFixed(2)} • </>}
                    {r.store && <>{r.store} • </>}
                    {r.username ? `by ${r.username} • ` : ''}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    {r.quality_score != null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.quality_score >= 75 ? 'bg-green-200/70 text-green-800 dark:bg-green-800/40 dark:text-green-300'
                        : r.quality_score >= 40 ? 'bg-amber-200/70 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300'
                        : 'bg-red-200/70 text-red-800 dark:bg-red-800/40 dark:text-red-300'
                      }`}>
                        score {r.quality_score}
                      </span>
                    )}
                    {flagList(r.flags).map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded-full text-xs bg-amber-200/70 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300">
                        {FLAG_LABELS[f] || f}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" title="Community confirmations / denials">
                      <Users className="w-3 h-3" /> {r.confirmations ?? 1}
                      <ThumbsDown className="w-3 h-3 ml-1" /> {r.denials ?? 0}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => decide(r.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    title="Approve — promote to global catalog"
                  >
                    <Check className="w-4 h-4" /> OK
                  </button>
                  <button
                    onClick={() => decide(r.id, 'reject')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    title="Reject — discard"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 flex-1">
                  <Edit3 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    value={edits[r.id] || ''}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Corrected name (optional — used on approve)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 cursor-pointer flex-shrink-0" title="Also blacklist this name so it can never re-enter">
                  <input
                    type="checkbox"
                    checked={!!blocks[r.id]}
                    onChange={(e) => setBlocks((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                    className="accent-red-600"
                  />
                  <Ban className="w-3.5 h-3.5" /> Block name
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriceReviewPanel;
