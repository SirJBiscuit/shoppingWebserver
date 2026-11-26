import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, X, Minus, Check, Ban, Trash2, RefreshCw, Store, GitMerge, Pencil, Sparkles, Image as ImageIcon } from 'lucide-react';
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
  const [view, setView] = useState('terms'); // terms | stores | icons
  const [status, setStatus] = useState('pending');
  const [kind, setKind] = useState('');
  const [terms, setTerms] = useState(null);
  const [stores, setStores] = useState(null);
  const [icons, setIcons] = useState(null);
  const [editStore, setEditStore] = useState(null);
  const [forgetId, setForgetId] = useState(null); // {type:'term'|'store', id}
  const [msg, setMsg] = useState(null);
  const drag = useRef(null);

  const load = useCallback(async () => {
    if (view === 'stores') {
      try {
        const { data } = await api.get('/mdl/admin/stores');
        setStores(Array.isArray(data) ? data : []);
      } catch {
        setStores([]);
      }
      return;
    }
    if (view === 'icons') {
      try {
        const { data } = await api.get('/images/admin/shared-icons', { params: { status } });
        setIcons(Array.isArray(data) ? data : []);
      } catch {
        setIcons([]);
      }
      return;
    }
    try {
      const { data } = await api.get('/mdl/admin/terms', {
        params: { status, ...(kind ? { kind } : {}) },
      });
      setTerms(Array.isArray(data) ? data : []);
    } catch {
      setTerms([]);
    }
  }, [status, kind, view]);

  useEffect(() => { load(); }, [load]);

  // Group stores by normalized name — dup groups get a Merge button
  const dupGroups = (stores || []).reduce((m, s) => {
    const k = (s.name || '').trim().toLowerCase();
    if (!m[k]) m[k] = [];
    m[k].push(s);
    return m;
  }, {});
  const mergeGroups = Object.values(dupGroups).filter((g) => g.length > 1);

  const mergeStore = async (group) => {
    // Keep the most-referenced row (admin can edit first if needed)
    const sorted = [...group].sort((a, b) => (b.ref_count || 0) - (a.ref_count || 0));
    try {
      await api.post('/mdl/admin/stores/merge', { keep_id: sorted[0].id, remove_ids: sorted.slice(1).map((s) => s.id) });
      setMsg(`Merged ${sorted.length - 1} duplicate${sorted.length > 2 ? 's' : ''} into "${sorted[0].name}"`);
      load();
    } catch {
      setMsg('Merge failed');
    }
  };

  const dedupeAll = async () => {
    try {
      const { data } = await api.post('/mdl/admin/stores/dedupe');
      setMsg(`Deduped ${data.groups} group${data.groups === 1 ? '' : 's'} — merged ${data.merged} store${data.merged === 1 ? '' : 's'}`);
      load();
    } catch {
      setMsg('Dedupe failed');
    }
  };

  const saveStore = async () => {
    if (!editStore) return;
    try {
      await api.put(`/mdl/admin/stores/${editStore.id}`, editStore);
      setEditStore(null);
      load();
    } catch {
      setMsg('Save failed');
    }
  };

  const act = async (id, next) => {
    try {
      await api.post(`/mdl/admin/terms/${id}/status`, { status: next });
      load();
    } catch {
      setMsg('Action failed');
    }
  };

  const iconAct = async (id, next) => {
    try {
      await api.post(`/images/admin/shared-icons/${id}/status`, { status: next });
      load();
    } catch {
      setMsg('Action failed');
    }
  };

  const forget = async () => {
    if (!forgetId) return;
    const url = forgetId.type === 'store'
      ? `/mdl/admin/stores/${forgetId.id}`
      : `/mdl/admin/terms/${forgetId.id}`;
    try {
      await api.delete(url);
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
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">MDL</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {view === 'terms' && 'learned vocabulary — approve to go global'}
            {view === 'stores' && 'store locations — dedupe & merge'}
            {view === 'icons' && 'donated icons — approve to share with everyone'}
          </span>
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
            {/* View switch — learned terms vs store locations */}
            <div className="flex gap-1 px-3 pt-2 shrink-0">
              {[['terms', 'Terms', Brain], ['stores', 'Stores', Store], ['icons', 'Icons', ImageIcon]].map(([v, lbl, Ic]) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium ${view === v ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  <Ic className="w-3 h-3" />{lbl}
                </button>
              ))}
            </div>

            {/* Filters — status tabs + kind chips */}
            {(view === 'terms' || view === 'icons') && (
            <div className="px-3 pt-2 pb-1.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
              <div className="flex gap-1">
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <button key={k} type="button" onClick={() => setStatus(k)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium ${status === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            {view === 'terms' && (
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
            )}
            </div>
            )}

            {view === 'stores' && (
              <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-slate-800 shrink-0">
                <button type="button" onClick={dedupeAll}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> Dedupe all
                </button>
                <span className="text-[10px] text-slate-500">
                  {stores ? `${stores.length} stores · ${mergeGroups.length} dup group${mergeGroups.length === 1 ? '' : 's'}` : 'Loading…'}
                </span>
              </div>
            )}

            {msg && <p className="text-[11px] text-red-400 px-3 pt-2 shrink-0">{msg}</p>}

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-3d">
              {view === 'stores' && (
                <>
                  {(stores || []).map((s) => (
                    <div key={s.id} className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100 font-medium truncate">
                          {s.name}
                          {s.is_dup && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">dup</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {[s.chain, s.city, s.state].filter(Boolean).join(' · ') || 'no location'}
                          {' · '}{s.ref_count || 0} refs · {s.is_public ? 'public' : (s.owner_name ? `@${s.owner_name}` : 'shared')}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => setEditStore({ ...s })} title="Edit store"
                          className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setForgetId({ type: 'store', id: s.id })} title="Delete store"
                          className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {mergeGroups.map((g) => (
                    <div key={g[0].id} className="px-3 py-2 border-b border-slate-800/60 bg-amber-500/5 flex items-center gap-2">
                      <GitMerge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="flex-1 text-[11px] text-amber-200 truncate">
                        {g.length}× “{g[0].name}” — merge into the most-referenced row
                      </span>
                      <button type="button" onClick={() => mergeStore(g)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-amber-600/30 text-amber-200 hover:bg-amber-600/50 font-medium shrink-0">
                        Merge
                      </button>
                    </div>
                  ))}
                  {stores && !stores.length && <p className="text-sm text-slate-500 text-center py-10">No stores yet</p>}
                  {stores === null && <p className="text-sm text-slate-500 text-center py-10">Loading…</p>}
                </>
              )}
              {view === 'terms' && (terms || []).map((t) => (
                <div key={t.id} className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-100 font-medium truncate">{t.term}</div>
                    <div className="text-[10px] text-slate-500">
                      {t.kind} · used {t.usage_count}× · by {t.created_by_name || 'unknown'}
                      {t.votes_for > 0 && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-violet-600/30 text-violet-300 font-bold" title="Beta tester A/B votes">
                          ▲{t.votes_for}
                        </span>
                      )}
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
                    <button type="button" onClick={() => setForgetId({ type: 'term', id: t.id })} title="Forget — delete permanently"
                      className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {view === 'terms' && terms && !terms.length && (
                <p className="text-sm text-slate-500 text-center py-10">No {status} terms{kind ? ` (${kind})` : ''}</p>
              )}
              {view === 'terms' && terms === null && <p className="text-sm text-slate-500 text-center py-10">Loading…</p>}
              {view === 'icons' && (
                <>
                  {(icons || []).map((ic) => (
                    <div key={ic.id} className="px-3 py-2 border-b border-slate-800/60 flex items-center gap-2.5">
                      <img
                        src={ic.thumbnail_url || ic.image_url}
                        alt="shared icon"
                        className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-100 font-medium truncate">
                          {ic.image_url?.split('/').pop()?.slice(0, 40) || `icon #${ic.id}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          donated by {ic.uploaded_by_name || 'unknown'}
                          {ic.shared_at && ` · ${new Date(ic.shared_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_META[ic.shared_status]?.cls || 'bg-slate-800 text-slate-400'}`}>
                        {ic.shared_status}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {ic.shared_status !== 'approved' && (
                          <button type="button" onClick={() => iconAct(ic.id, 'approved')} title="Approve — visible to everyone"
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {ic.shared_status !== 'rejected' && (
                          <button type="button" onClick={() => iconAct(ic.id, 'rejected')} title="Reject — stays private to the uploader"
                            className="p-1.5 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/40">
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {icons && !icons.length && <p className="text-sm text-slate-500 text-center py-10">No {status} shared icons</p>}
                  {icons === null && <p className="text-sm text-slate-500 text-center py-10">Loading…</p>}
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {editStore && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Edit store #{editStore.id}</p>
            {[['name', 'Name'], ['chain', 'Chain'], ['city', 'City'], ['state', 'State'], ['zip_code', 'Zip']].map(([f, lbl]) => (
              <label key={f} className="block">
                <span className="text-[10px] text-slate-500">{lbl}</span>
                <input
                  value={editStore[f] || ''}
                  onChange={(e) => setEditStore((s) => ({ ...s, [f]: e.target.value }))}
                  className="w-full mt-0.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={!!editStore.is_public}
                onChange={(e) => setEditStore((s) => ({ ...s, is_public: e.target.checked }))} />
              Public store
            </label>
            <div className="flex gap-1.5 pt-1">
              <button type="button" onClick={saveStore}
                className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium">Save</button>
              <button type="button" onClick={() => setEditStore(null)}
                className="flex-1 text-[11px] px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {forgetId && (
        <div className="fixed inset-0 z-[99999]">
          <ConfirmModal
            isOpen
            type="danger"
            title={forgetId.type === 'store' ? 'Delete this store?' : 'Forget this term?'}
            message={forgetId.type === 'store'
              ? 'The store row will be deleted — references follow their foreign-key rules (cascade or null).'
              : 'The term will be deleted permanently — it stops appearing in every user\'s autofill and can\'t be re-learned automatically.'}
            confirmText={forgetId.type === 'store' ? 'Delete store' : 'Forget'}
            onConfirm={forget}
            onCancel={() => setForgetId(null)}
          />
        </div>
      )}
    </Portal>
  );
};

export default MdlFloatPanel;
