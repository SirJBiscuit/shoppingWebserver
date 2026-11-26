import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, X, Minus, Check, Ban, Trash2, RefreshCw } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';
import api from '../../services/api';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

const KINDS = ['unit', 'category', 'aisle', 'store', 'item', 'icon'];
const STATUS_META = {
  pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300' },
  approved: { label: 'Approved', cls: 'bg-emerald-500/20 text-emerald-300' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/20 text-red-300' },
};

/**
 * MdlFloatPanel — floating MDL control panel for admins. Review the
 * learned-vocabulary pool (custom units, categories, aisle names, store
 * names, icons) that users teach through the quick pickers: approve to
 * send a term global, reject to hide it, forget to erase it entirely.
 * Opened from the admin rail's Brain button (BetaPinLayer).
 */
const MdlFloatPanel = ({ onClose }) => {
  const [pos, setPos] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [status, setStatus] = useState('pending');
  const [kind, setKind] = useState('');
  const [terms, setTerms] = useState(null);
  const [forgetId, setForgetId] = useState(null);
  const [msg, setMsg] = useState(null);
  const drag = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/mdl/admin/terms', {
        params: { status, ...(kind ? { kind } : {}) },
      });
      setTerms(Array.isArray(data) ? data : []);
    } catch {
      setTerms([]);
    }
  }, [status, kind]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, next) => {
    try {
      await api.post(`/mdl/admin/terms/${id}/status`, { status: next });
      load();
    } catch {
      setMsg('Action failed');
    }
  };

  const forget = async (id) => {
    try {
      await api.delete(`/mdl/admin/terms/${id}`);
      setForgetId(null);
      load();
    } catch {
      setMsg('Delete failed');
    }
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    const move = (ev) => {
      if (!drag.current) return;
      setPos({
        x: Math.min(Math.max(0, ev.clientX - drag.current.dx), window.innerWidth - 200),
        y: Math.min(Math.max(0, ev.clientY - drag.current.dy), window.innerHeight - 60),
      });
    };
    const up = () => { drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[80] flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        style={pos
          ? { left: pos.x, top: pos.y, width: 'min(560px, calc(100vw - 24px))', height: minimized ? 'auto' : 'min(600px, calc(100vh - 24px))' }
          : { right: 56, top: 12, width: 'min(560px, calc(100vw - 72px))', height: minimized ? 'auto' : 'min(600px, calc(100vh - 24px))' }}
      >
        {/* Title bar — drag handle */}
        <div
          onPointerDown={onPointerDown}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-700 cursor-move select-none touch-none shrink-0"
        >
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">MDL Terms</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">learned vocabulary — approve to go global</span>
          <div className="flex-1" />
          <button type="button" onClick={load} className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title={minimized ? 'Expand' : 'Minimize'}>
            <Minus className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!minimized && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Filters — status tabs + kind chips */}
            <div className="px-3 pt-2 pb-1.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
              <div className="flex gap-1">
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <button key={k} type="button" onClick={() => setStatus(k)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${status === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <button type="button" onClick={() => setKind('')}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${!kind ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  all
                </button>
                {KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k === kind ? '' : k)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${kind === k ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {msg && <p className="text-[11px] text-red-400 px-3 pt-2 shrink-0">{msg}</p>}

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-3d">
              {(terms || []).map((t) => (
                <div key={t.id} className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-100 font-medium truncate">{t.term}</div>
                    <div className="text-[10px] text-slate-500">
                      {t.kind} · used {t.usage_count}× · by {t.created_by_name || 'unknown'}
                      {t.approved_by_name && ` · ${t.status} by ${t.approved_by_name}`}
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_META[t.status]?.cls || 'bg-slate-800 text-slate-400'}`}>
                    {t.status}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    {t.status !== 'approved' && (
                      <button type="button" onClick={() => act(t.id, 'approved')} title="Approve — visible to everyone"
                        className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.status !== 'rejected' && (
                      <button type="button" onClick={() => act(t.id, 'rejected')} title="Reject — hidden from autofill"
                        className="p-1.5 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/40">
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => setForgetId(t.id)} title="Forget — delete permanently"
                      className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {terms && !terms.length && (
                <p className="text-sm text-slate-500 text-center py-10">No {status} terms{kind ? ` (${kind})` : ''}</p>
              )}
              {terms === null && <p className="text-sm text-slate-500 text-center py-10">Loading…</p>}
            </div>
          </div>
        )}
      </motion.div>

      {forgetId && (
        <div className="fixed inset-0 z-[99999]">
          <ConfirmModal
            isOpen
            type="danger"
            title="Forget this term?"
            message="The term will be deleted permanently — it stops appearing in every user's autofill and can't be re-learned automatically."
            confirmText="Forget"
            onConfirm={() => forget(forgetId)}
            onCancel={() => setForgetId(null)}
          />
        </div>
      )}
    </Portal>
  );
};

export default MdlFloatPanel;
