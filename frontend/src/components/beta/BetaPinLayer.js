import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  MapPin, Plus, X, Eye, EyeOff, MessageSquare, ChevronRight,
  Check, Clock, Trash2, Layers, ExternalLink,
  BarChart3, ThumbsUp, ThumbsDown, Lock, Pencil
} from 'lucide-react';

// ---------------------------------------------------------------------------
// BetaPinLayer — global beta feedback overlay
//
// Beta testers: floating pin button enters drop mode → click anywhere →
// severity badge + note → pin lands on this page for the admin.
// Admins: same pin tools plus right-click triage on any pin, a visibility
// toggle, and a slide-in viewer panel (pins across all pages + message
// threads). Rendered once inside <Router> in App.js.
// ---------------------------------------------------------------------------

const SEVERITIES = [
  { key: 'critical', label: 'Big priority', color: '#ef4444' },
  { key: 'annoying', label: 'Annoying',     color: '#f97316' },
  { key: 'minor',    label: 'Low',          color: '#eab308' },
  { key: 'weird',    label: 'Acts weird',   color: '#d946ef' },
];
const sevOf = (key) => SEVERITIES.find((s) => s.key === key) || SEVERITIES[2];

const STATUS_META = {
  open:        { label: 'Open',        cls: 'bg-slate-500/20 text-slate-200' },
  in_progress: { label: 'In progress', cls: 'bg-blue-500/20 text-blue-300' },
  fixed:       { label: 'Fixed',       cls: 'bg-emerald-500/20 text-emerald-300' },
  hidden:      { label: 'Hidden',      cls: 'bg-zinc-500/20 text-zinc-400' },
  removed:     { label: 'Removed',     cls: 'bg-red-500/20 text-red-300' },
};

const relTime = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// Cluster pins that overlap within ~2.5% of the viewport on both axes.
// Returns [{ x, y, pins: [...] }] so overlapping markers collapse into one
// fan-out badge — the layering system for stacked pins.
const clusterPins = (pins) => {
  const clusters = [];
  for (const p of pins) {
    const hit = clusters.find((c) =>
      Math.abs(c.x - p.x_pct) < 2.5 && Math.abs(c.y - p.y_pct) < 2.5);
    if (hit) hit.pins.push(p);
    else clusters.push({ x: Number(p.x_pct), y: Number(p.y_pct), pins: [p] });
  }
  return clusters;
};

const BetaPinLayer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = !!(user?.is_admin || user?.isAdmin);
  const isBeta = !!(user?.is_beta_tester || user?.isBetaTester);
  const canUse = isAdmin || isBeta;
  const page = location.pathname;

  const [pins, setPins] = useState([]);
  const [showPins, setShowPins] = useState(() => localStorage.getItem('betaPinsVisible') !== '0');
  const [dropMode, setDropMode] = useState(false);
  const [draft, setDraft] = useState(null);          // {xPct, yPct, px, py}
  const [draftSev, setDraftSev] = useState('minor');
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftPrivate, setDraftPrivate] = useState(false); // admin: private pin
  const [detail, setDetail] = useState(null);        // pin detail card
  const [editMode, setEditMode] = useState(false);   // admin: editing pin
  const [editNote, setEditNote] = useState('');
  const [editSev, setEditSev] = useState('minor');
  const [ctx, setCtx] = useState(null);              // admin context menu {x,y,pin}
  const [fanout, setFanout] = useState(null);        // cluster fan-out {x,y,pins}
  const [error, setError] = useState('');

  // Admin viewer panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState('pins');
  const [allPins, setAllPins] = useState([]);
  const [byPage, setByPage] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [feedback, setFeedback] = useState([]);
  const [openThread, setOpenThread] = useState(null);   // feedback id
  const [replies, setReplies] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  // Feature polls
  const [polls, setPolls] = useState([]);            // tester view
  const [pollsOpen, setPollsOpen] = useState(false); // tester popover
  const [adminPolls, setAdminPolls] = useState([]);  // admin view + tallies
  const [pollNotes, setPollNotes] = useState([]);    // voter notes
  const [newPoll, setNewPoll] = useState({ title: '', description: '' });
  const ctxRef = useRef(null);

  // -------------------------------------------------------------- data
  const loadPagePins = useCallback(async () => {
    try {
      const { data } = await api.get('/beta/pins', {
        params: { page, mine: isAdmin ? '0' : '1' }
      });
      setPins(data.pins || []);
    } catch { /* silent — layer must never break the app */ }
  }, [page, isAdmin]);

  const loadAdminPins = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/beta/pins/admin/all');
      setAllPins(data.pins || []);
      setByPage(data.byPage || []);
    } catch { /* silent */ }
  }, [isAdmin]);

  const loadFeedback = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/beta/feedback/admin/all');
      setFeedback((data || []).slice(0, 30));
    } catch { /* silent */ }
  }, [isAdmin]);

  const loadPolls = useCallback(async () => {
    try {
      const { data } = await api.get('/beta/polls');
      setPolls(data.polls || []);
    } catch { /* silent */ }
  }, []);

  const loadAdminPolls = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/beta/polls/admin/all');
      setAdminPolls(data.polls || []);
      setPollNotes(data.notes || []);
    } catch { /* silent */ }
  }, [isAdmin]);

  useEffect(() => { if (canUse) { loadPagePins(); loadPolls(); } }, [canUse, loadPagePins, loadPolls]);
  useEffect(() => { if (pollsOpen) loadPolls(); }, [pollsOpen, loadPolls]);
  useEffect(() => { if (panelOpen) { loadAdminPins(); loadFeedback(); loadAdminPolls(); } },
    [panelOpen, loadAdminPins, loadFeedback, loadAdminPolls]);
  useEffect(() => { setDetail(null); setFanout(null); setCtx(null); }, [page]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      setDropMode(false); setDraft(null); setDetail(null);
      setCtx(null); setFanout(null);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => { localStorage.setItem('betaPinsVisible', showPins ? '1' : '0'); }, [showPins]);

  // Close context menu / fanout on any outside click
  useEffect(() => {
    if (!ctx && !fanout) return;
    const off = () => { setCtx(null); setFanout(null); };
    window.addEventListener('click', off);
    return () => window.removeEventListener('click', off);
  }, [ctx, fanout]);

  const clusters = useMemo(() => clusterPins(pins), [pins]);

  // -------------------------------------------------------------- actions
  const beginDrop = (e) => {
    const xPct = (e.clientX / window.innerWidth) * 100;
    const yPct = (e.clientY / window.innerHeight) * 100;
    setDraft({ xPct, yPct, px: e.clientX, py: e.clientY });
    setDraftSev('minor'); setDraftNote(''); setError('');
    setDropMode(false);
  };

  const submitPin = async () => {
    if (!draftNote.trim()) { setError('Describe what\'s happening here'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/beta/pins', {
        pagePath: page, x: draft.xPct, y: draft.yPct,
        severity: draftSev, note: draftNote.trim(),
        isPrivate: isAdmin ? draftPrivate : undefined
      });
      setDraft(null); setDraftPrivate(false);
      loadPagePins(); if (isAdmin) loadAdminPins();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save pin');
    } finally { setSaving(false); }
  };

  const setStatus = async (pin, status) => {
    try {
      await api.post(`/beta/pins/admin/${pin.id}/status`, { status });
      setCtx(null); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch { /* silent */ }
  };

  const setPrivate = async (pin, isPrivate) => {
    try {
      await api.patch(`/beta/pins/${pin.id}`, { isPrivate });
      setCtx(null); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch { /* silent */ }
  };

  const startEdit = (pin) => {
    setEditNote(pin.note); setEditSev(pin.severity);
    setEditMode(true); setCtx(null);
  };

  const saveEdit = async () => {
    if (!editNote.trim()) return;
    try {
      await api.patch(`/beta/pins/${detail.id}`, {
        note: editNote.trim(), severity: editSev
      });
      setEditMode(false); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch { /* silent */ }
  };

  const votePoll = async (pollId, vote) => {
    try {
      await api.post(`/beta/polls/${pollId}/vote`, { vote });
      loadPolls();
    } catch { /* silent */ }
  };

  const createPoll = async () => {
    if (!newPoll.title.trim()) return;
    try {
      await api.post('/beta/polls/admin', {
        title: newPoll.title.trim(), description: newPoll.description.trim() || null
      });
      setNewPoll({ title: '', description: '' });
      loadAdminPolls();
    } catch { /* silent */ }
  };

  const setPollStatus = async (id, status) => {
    try {
      await api.post(`/beta/polls/admin/${id}/status`, { status });
      loadAdminPolls();
    } catch { /* silent */ }
  };

  const bulk = async (action) => {
    if (!sel.size) return;
    try {
      await api.post('/beta/pins/admin/bulk', { ids: [...sel], action });
      setSel(new Set()); loadPagePins(); loadAdminPins();
    } catch { /* silent */ }
  };

  const openReplies = async (fb) => {
    if (openThread === fb.id) { setOpenThread(null); return; }
    setOpenThread(fb.id); setReplyBody('');
    try {
      const { data } = await api.get(`/beta/feedback/${fb.id}/replies`);
      setReplies(data.replies || []);
    } catch { setReplies([]); }
  };

  const sendReply = async (fbId) => {
    if (!replyBody.trim()) return;
    try {
      const { data } = await api.post(`/beta/feedback/${fbId}/reply`, { body: replyBody.trim() });
      setReplies((r) => [...r, { ...data, username: user.username }]);
      setReplyBody('');
    } catch { /* silent */ }
  };

  if (!user || !canUse) return null;

  // -------------------------------------------------------------- render
  return (
    <>
      {/* Drop-mode capture overlay */}
      {dropMode && (
        <div
          className="fixed inset-0 z-[9998] cursor-crosshair"
          style={{ background: 'rgba(15,23,42,0.15)', outline: '3px dashed rgba(239,68,68,0.6)', outlineOffset: -8 }}
          onClick={beginDrop}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
            Click anywhere to pin a note — Esc to cancel
          </div>
        </div>
      )}

      {/* Pin markers — only when visible and not mid-drop */}
      {showPins && !dropMode && clusters.map((c, i) => (
        <button
          key={`c-${c.pins.map((p) => p.id).join('-')}`}
          className="fixed z-[9990] -translate-x-1/2 -translate-y-full group"
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
          onClick={(e) => {
            e.stopPropagation();
            if (c.pins.length === 1) { setDetail(c.pins[0]); setFanout(null); }
            else { setFanout({ x: e.clientX, y: e.clientY, pins: c.pins }); setDetail(null); }
          }}
          onContextMenu={(e) => {
            if (!isAdmin) return;
            e.preventDefault(); e.stopPropagation();
            // Right-click opens actions for the top pin of the stack
            setCtx({ x: e.clientX, y: e.clientY, pin: c.pins[0] });
            setDetail(null); setFanout(null);
          }}
          title={c.pins.length > 1 ? `${c.pins.length} pins here` : c.pins[0].note}
        >
          <span className="relative block drop-shadow-lg">
            <MapPin
              className="w-7 h-7"
              style={{ color: sevOf(c.pins[0].severity).color }}
              fill={sevOf(c.pins[0].severity).color}
              stroke="#0f172a" strokeWidth={1}
            />
            {c.pins.length > 1 && (
              <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white/40">
                {c.pins.length}
              </span>
            )}
            {c.pins[0].status === 'in_progress' && (
              <Clock className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-blue-400 bg-slate-900 rounded-full" />
            )}
            {c.pins[0].status === 'fixed' && (
              <Check className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-emerald-400 bg-slate-900 rounded-full" />
            )}
          </span>
        </button>
      ))}

      {/* Cluster fan-out — pick which stacked pin to inspect */}
      {fanout && (
        <div
          className="fixed z-[9999] w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2"
          style={{ left: Math.min(fanout.x, window.innerWidth - 300), top: Math.min(fanout.y, window.innerHeight - 260) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1">
            <Layers className="w-3.5 h-3.5" /> {fanout.pins.length} stacked pins
          </div>
          {fanout.pins.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 flex items-start gap-2"
              onClick={() => { setDetail(p); setFanout(null); }}
              onContextMenu={(e) => {
                if (!isAdmin) return;
                e.preventDefault();
                setCtx({ x: e.clientX, y: e.clientY, pin: p }); setFanout(null);
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: sevOf(p.severity).color }} />
              <span className="min-w-0">
                <span className="block text-xs text-slate-400">{p.username} · {relTime(p.created_at)}</span>
                <span className="block text-sm text-slate-100 truncate">{p.note}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pin detail card */}
      {detail && !ctx && (
        <div
          className="fixed z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          style={{
            left: Math.min((detail.x_pct / 100) * window.innerWidth + 16, window.innerWidth - 336),
            top: Math.min((detail.y_pct / 100) * window.innerHeight + 8, window.innerHeight - 240),
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sevOf(detail.severity).color }} />
              <span className="text-sm font-semibold text-slate-100 truncate">{sevOf(detail.severity).label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_META[detail.status]?.cls}`}>
                {STATUS_META[detail.status]?.label}
              </span>
              {detail.is_private && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              )}
            </div>
            <button onClick={() => { setDetail(null); setEditMode(false); }} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          {editMode && isAdmin ? (
            <div className="mt-2">
              <div className="flex gap-1 mb-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setEditSev(s.key)}
                    className={`flex-1 text-[10px] py-1 rounded border ${editSev === s.key ? 'border-white/60 text-white' : 'border-slate-700 text-slate-400'}`}
                    style={editSev === s.key ? { background: `${s.color}33` } : {}}
                  >{s.label}</button>
                ))}
              </div>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 resize-none focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button onClick={saveEdit} className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">Save</button>
                <button onClick={() => setEditMode(false)} className="text-xs px-2.5 py-1 rounded bg-slate-700 text-slate-300">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{detail.note}</p>
          )}
          <div className="text-xs text-slate-400 mt-2">
            {detail.username || 'you'} · {relTime(detail.created_at)}
          </div>
          {detail.admin_note && (
            <div className="mt-2 text-xs bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-blue-200">
              Admin: {detail.admin_note}
            </div>
          )}
          {isAdmin && !editMode && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <button onClick={() => setStatus(detail, 'in_progress')} className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50">In progress</button>
              <button onClick={() => setStatus(detail, 'fixed')} className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50">Fixed</button>
              <button onClick={() => setStatus(detail, 'hidden')} className="text-xs px-2 py-1 rounded bg-zinc-600/30 text-zinc-300 hover:bg-zinc-600/50">Hide</button>
              <button onClick={() => startEdit(detail)} className="text-xs px-2 py-1 rounded bg-slate-600/40 text-slate-200 hover:bg-slate-600/70 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => setPrivate(detail, !detail.is_private)} className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {detail.is_private ? 'Public' : 'Private'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin right-click context menu */}
      {ctx && isAdmin && (
        <div
          ref={ctxRef}
          className="fixed z-[9999] w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-sm"
          style={{ left: Math.min(ctx.x, window.innerWidth - 216), top: Math.min(ctx.y, window.innerHeight - 220) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-800 truncate">
            {ctx.pin.username} · {sevOf(ctx.pin.severity).label}
          </div>
          <button className="ctx-item" onClick={() => { setDetail(ctx.pin); setCtx(null); }}>
            <ChevronRight className="w-4 h-4" /> View details
          </button>
          <button className="ctx-item" onClick={() => { setDetail(ctx.pin); startEdit(ctx.pin); }}>
            <Pencil className="w-4 h-4 text-slate-400" /> Edit note
          </button>
          <button className="ctx-item" onClick={() => setPrivate(ctx.pin, !ctx.pin.is_private)}>
            <Lock className="w-4 h-4 text-amber-400" /> {ctx.pin.is_private ? 'Make public' : 'Make private'}
          </button>
          <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'in_progress')}>
            <Clock className="w-4 h-4 text-blue-400" /> Mark in progress
          </button>
          <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'fixed')}>
            <Check className="w-4 h-4 text-emerald-400" /> Mark fixed
          </button>
          <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'hidden')}>
            <EyeOff className="w-4 h-4 text-zinc-400" /> Hide pin
          </button>
          <button className="ctx-item text-red-300 hover:bg-red-500/10" onClick={() => setStatus(ctx.pin, 'removed')}>
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        </div>
      )}

      {/* New-pin draft popup */}
      {draft && (
        <div
          className="fixed z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          style={{ left: Math.min(draft.px, window.innerWidth - 336), top: Math.min(draft.py, window.innerHeight - 300) }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-400" /> Pin this spot
            </span>
            <button onClick={() => setDraft(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-1.5 mb-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.key}
                onClick={() => setDraftSev(s.key)}
                className={`flex-1 text-[11px] py-1.5 rounded-lg border transition ${draftSev === s.key ? 'border-white/60 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                style={draftSev === s.key ? { background: `${s.color}33` } : {}}
              >
                <span className="block w-2 h-2 rounded-full mx-auto mb-0.5" style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            autoFocus
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="What's it doing? What did you expect?"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500"
          />
          {isAdmin && (
            <label className="flex items-center gap-2 mt-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draftPrivate}
                onChange={(e) => setDraftPrivate(e.target.checked)}
                className="accent-amber-500"
              />
              <Lock className="w-3 h-3 text-amber-400" /> Private — only admins see this pin
            </label>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <button
            onClick={submitPin}
            disabled={saving}
            className="w-full mt-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            {saving ? 'Pinning…' : 'Drop pin'}
          </button>
        </div>
      )}

      {/* Tester polls popover — vote on admin feature ideas */}
      {pollsOpen && !isAdmin && (
        <div className="fixed bottom-24 right-5 z-[9989] w-80 max-h-[60vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
          <div className="sticky top-0 bg-slate-900 flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Vote on features
            </span>
            <button onClick={() => setPollsOpen(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
          {polls.map((p) => (
            <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100">{p.title}</div>
                  {p.description && <div className="text-xs text-slate-400 mt-0.5">{p.description}</div>}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${p.status === 'open' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {p.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => p.status === 'open' && votePoll(p.id, 'yes')}
                  disabled={p.status !== 'open'}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition ${p.my_vote === 'yes' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} disabled:opacity-50`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> {p.yes_votes}
                </button>
                <button
                  onClick={() => p.status === 'open' && votePoll(p.id, 'no')}
                  disabled={p.status !== 'open'}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition ${p.my_vote === 'no' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} disabled:opacity-50`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> {p.no_votes}
                </button>
                {p.total_votes > 0 && (
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {Math.round((p.yes_votes / p.total_votes) * 100)}% want it
                  </span>
                )}
              </div>
            </div>
          ))}
          {!polls.length && <p className="text-sm text-slate-500 text-center py-6">No open polls</p>}
        </div>
      )}

      {/* Floating controls (bottom-right, above content, below overlays) */}
      {!dropMode && (
        <div className="fixed bottom-5 right-5 z-[9989] flex flex-col items-end gap-2">
          {!isAdmin && (
            <button
              onClick={() => setPollsOpen((o) => !o)}
              className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition relative ${pollsOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              title="Vote on upcoming features"
            >
              <BarChart3 className="w-5 h-5" />
              {polls.some((p) => p.status === 'open' && !p.my_vote) && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />
              )}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition ${panelOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              title="Beta viewer"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowPins((v) => !v)}
            className="w-11 h-11 rounded-full shadow-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition"
            title={showPins ? 'Hide pins' : 'Show pins'}
          >
            {showPins ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setDropMode(true)}
            className="w-12 h-12 rounded-full shadow-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
            title="Pin feedback on this page"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Admin beta viewer panel */}
      {isAdmin && panelOpen && (
        <div className="fixed top-0 right-0 bottom-0 z-[9988] w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex gap-2">
              {['pins', 'messages', 'polls'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-sm px-3 py-1.5 rounded-lg capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => setPanelOpen(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
          </div>

          {tab === 'pins' && (
            <div className="flex-1 overflow-y-auto">
              {/* Bulk action bar */}
              <div className="sticky top-0 bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 z-10">
                <span className="text-xs text-slate-400 mr-auto">{sel.size} selected</span>
                {['fixed', 'open', 'hide', 'remove'].map((a) => (
                  <button
                    key={a}
                    onClick={() => bulk(a)}
                    disabled={!sel.size}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 capitalize"
                  >
                    {a}
                  </button>
                ))}
              </div>

              {/* Page groups */}
              <div className="px-3 pt-2 text-xs text-slate-500 uppercase tracking-wide">Pages with live pins</div>
              <div className="flex flex-wrap gap-1.5 px-3 py-2">
                {byPage.map((p) => (
                  <button
                    key={p.page_path}
                    onClick={() => { if (p.page_path !== page) navigate(p.page_path); }}
                    className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${p.page_path === page ? 'border-blue-500/50 text-blue-300 bg-blue-500/10' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {p.page_path === '/' ? 'Dashboard' : p.page_path}
                    <span className="bg-slate-700 rounded-full px-1.5">{p.c}</span>
                    {p.page_path !== page && <ExternalLink className="w-3 h-3" />}
                  </button>
                ))}
                {!byPage.length && <span className="text-xs text-slate-500">No live pins</span>}
              </div>

              {/* Pin list */}
              {allPins.filter((p) => p.status !== 'removed').map((p) => (
                <label key={p.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sel.has(p.id)}
                    onChange={(e) => {
                      const next = new Set(sel);
                      e.target.checked ? next.add(p.id) : next.delete(p.id);
                      setSel(next);
                    }}
                    className="mt-1 accent-blue-500"
                  />
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: sevOf(p.severity).color }} />
                  <span className="min-w-0 flex-1" onClick={(e) => { e.preventDefault(); setDetail(p); }}>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="truncate">{p.username}</span>
                      <span>·</span><span className="truncate">{p.page_path}</span>
                      <span>·</span><span>{relTime(p.created_at)}</span>
                    </span>
                    <span className="block text-sm text-slate-200 truncate">{p.note}</span>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${STATUS_META[p.status]?.cls}`}>
                      {STATUS_META[p.status]?.label}
                    </span>
                  </span>
                </label>
              ))}
              {!allPins.length && <p className="text-sm text-slate-500 text-center py-8">No pins yet</p>}
            </div>
          )}

          {tab === 'messages' && (
            <div className="flex-1 overflow-y-auto">
              {feedback.map((f) => (
                <div key={f.id} className="border-b border-slate-800/60">
                  <button className="w-full text-left px-3 py-2.5 hover:bg-slate-800/40" onClick={() => openReplies(f)}>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800">{f.type}</span>
                      <span className={`px-1.5 py-0.5 rounded ${STATUS_META[f.status]?.cls || 'bg-slate-800 text-slate-300'}`}>{f.status}</span>
                      <span className="ml-auto">{f.username} · {relTime(f.created_at)}</span>
                    </div>
                    <div className="text-sm text-slate-100 font-medium mt-1 truncate">{f.title}</div>
                  </button>
                  {openThread === f.id && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-slate-300 mb-2">{f.description}</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {replies.map((r) => (
                          <div key={r.id} className={`text-xs p-2 rounded-lg ${r.is_admin ? 'bg-blue-600/20 text-blue-100 ml-4' : 'bg-slate-800 text-slate-200 mr-4'}`}>
                            <span className="text-[10px] text-slate-400 block">{r.is_admin ? 'Admin' : r.username} · {relTime(r.created_at)}</span>
                            {r.body}
                          </div>
                        ))}
                        {!replies.length && <p className="text-xs text-slate-500">No replies yet</p>}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <input
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendReply(f.id)}
                          placeholder="Reply…"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={() => sendReply(f.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">Send</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!feedback.length && <p className="text-sm text-slate-500 text-center py-8">No feedback yet</p>}
            </div>
          )}

          {tab === 'polls' && (
            <div className="flex-1 overflow-y-auto">
              {/* Create poll */}
              <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/30">
                <input
                  value={newPoll.title}
                  onChange={(e) => setNewPoll((n) => ({ ...n, title: e.target.value }))}
                  placeholder="New feature idea…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <input
                  value={newPoll.description}
                  onChange={(e) => setNewPoll((n) => ({ ...n, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 mt-1.5 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={createPoll}
                  disabled={!newPoll.title.trim()}
                  className="w-full mt-1.5 text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium"
                >
                  Post poll to beta testers
                </button>
              </div>

              {adminPolls.map((p) => {
                const pct = p.total_votes ? Math.round((p.yes_votes / p.total_votes) * 100) : 0;
                const notes = pollNotes.filter((n) => n.poll_id === p.id);
                return (
                  <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-100">{p.title}</div>
                        {p.description && <div className="text-xs text-slate-400 mt-0.5">{p.description}</div>}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_META[p.status]?.cls || 'bg-slate-800 text-slate-300'}`}>
                        {p.status}
                      </span>
                    </div>
                    {/* Tally bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span><ThumbsUp className="w-3 h-3 inline text-emerald-400" /> {p.yes_votes}</span>
                        <span>{p.total_votes} votes · {pct}% yes</span>
                        <span>{p.no_votes} <ThumbsDown className="w-3 h-3 inline text-red-400" /></span>
                      </div>
                      <div className="h-1.5 bg-red-500/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {notes.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {notes.slice(0, 3).map((n, i) => (
                          <div key={i} className="text-[11px] text-slate-400 bg-slate-800/60 rounded px-2 py-1">
                            <span className={n.vote === 'yes' ? 'text-emerald-400' : 'text-red-400'}>{n.vote === 'yes' ? '+' : '−'}</span>{' '}
                            <span className="text-slate-300">{n.username}:</span> {n.note}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-2">
                      {p.status === 'open' && <>
                        <button onClick={() => setPollStatus(p.id, 'planned')} className="text-[11px] px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50">Planned</button>
                        <button onClick={() => setPollStatus(p.id, 'released')} className="text-[11px] px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50">Released</button>
                        <button onClick={() => setPollStatus(p.id, 'declined')} className="text-[11px] px-2 py-1 rounded bg-red-600/30 text-red-300 hover:bg-red-600/50">Decline</button>
                      </>}
                      {p.status !== 'open' && (
                        <button onClick={() => setPollStatus(p.id, 'open')} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Reopen</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!adminPolls.length && <p className="text-sm text-slate-500 text-center py-8">No polls yet</p>}
            </div>
          )}
        </div>
      )}

      {/* Context-menu item styles */}
      <style>{`
        .ctx-item { display:flex; align-items:center; gap:8px; width:100%; padding:7px 12px;
          color:#cbd5e1; } .ctx-item:hover { background:rgba(59,130,246,0.12); }
      `}</style>
    </>
  );
};

export default BetaPinLayer;
