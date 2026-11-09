import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Check, X, RefreshCw, Edit3 } from 'lucide-react';
import api from '../../services/api';

/**
 * PriceReviewPanel — review queue for weird price-learning submissions.
 * When MDL can't confidently handle a name/price, it lands here; approving
 * (optionally with a corrected name) teaches the system how to treat it.
 */
const PriceReviewPanel = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({}); // id -> corrected name
  const [msg, setMsg] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/price-review/queue');
      setQueue(data?.items || []);
    } catch (e) {
      showMsg('Failed to load review queue', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, action) => {
    try {
      const corrected = edits[id]?.trim();
      await api.post(`/price-review/${id}/${action}`, corrected ? { correctedName: corrected } : {});
      setQueue((prev) => prev.filter((r) => r.id !== id));
      setEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      showMsg(action === 'approve' ? 'Approved — learned' : 'Rejected');
    } catch (e) {
      showMsg(e.response?.data?.error || `Failed to ${action}`, 'error');
    }
  };

  const REASON_LABELS = {
    long_name: 'Name too long',
    no_letters: 'No letters',
    excessive_digits: 'Mostly digits',
    special_chars: 'Special characters',
    extreme_price: 'Unusual price',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          Price-Learning Review Queue
        </h3>
        <button onClick={load} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Submissions MDL flagged as unusual. Approve to teach the system (optionally correct the name first), or reject to discard.
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
          Queue is empty — all clear
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
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(r.reason || '').split(',').filter(Boolean).map((reason) => (
                      <span key={reason} className="px-2 py-0.5 rounded-full text-xs bg-amber-200/70 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300">
                        {REASON_LABELS[reason] || reason}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => decide(r.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    title="Approve — add to catalog & learn"
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
              <div className="flex items-center gap-2 mt-3">
                <Edit3 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  value={edits[r.id] || ''}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="Corrected name (optional — used on approve)"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriceReviewPanel;
