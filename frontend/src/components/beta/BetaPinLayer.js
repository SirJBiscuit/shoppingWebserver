import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Popup, Portal } from '../../utils/autoPlacement';
import {
  MapPin, Plus, X, Eye, EyeOff, MessageSquare, ChevronRight,
  Check, Clock, Trash2, Layers, ExternalLink,
  BarChart3, ThumbsUp, ThumbsDown, Lock, Pencil, Move, Download, RotateCcw,
  LocateFixed, Copy, Flag, Bug, Lightbulb, AlertTriangle, HelpCircle, Star
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

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Selectable marker indicators — a bug report reads better as a bug than
// as a generic pin. Key is stored in beta_pins.icon.
const PIN_ICONS = [
  { key: 'pin',      Icon: MapPin,        label: 'Pin' },
  { key: 'flag',     Icon: Flag,          label: 'Flag' },
  { key: 'bug',      Icon: Bug,           label: 'Bug' },
  { key: 'idea',     Icon: Lightbulb,     label: 'Idea' },
  { key: 'warn',     Icon: AlertTriangle, label: 'Warning' },
  { key: 'question', Icon: HelpCircle,    label: 'Question' },
  { key: 'star',     Icon: Star,          label: 'Star' },
  { key: 'eye',      Icon: Eye,           label: 'Look' },
];
const pinIconOf = (key) => (PIN_ICONS.find((i) => i.key === key) || PIN_ICONS[0]).Icon;

// Small icon picker row shared by the draft popup and admin edit mode.
const IconPicker = ({ value, onChange }) => (
  <div className="flex gap-1 mb-2">
    {PIN_ICONS.map(({ key, Icon, label }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        title={label}
        className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center transition ${
          value === key
            ? 'border-red-400 bg-red-500/20 text-red-300'
            : 'border-slate-700 text-slate-400 hover:border-slate-500'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
      </button>
    ))}
  </div>
);

// Tiny visible label under each floating button — same scheme the
// dashboard floating buttons use.
const FabLabel = ({ children }) => (
  <span className="text-[9px] font-semibold text-slate-200 bg-slate-900/85 px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap pointer-events-none">
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Element anchoring — a pin grabs the DOM element under the click and rides
// it (live getBoundingClientRect) so it survives scrolling, reflow and
// responsive layout changes. Stored: a generated CSS path + click offset
// inside the element rect. x_pct/y_pct stay as the fallback when the
// selector no longer resolves.
// ---------------------------------------------------------------------------

// Best-effort CSS path for an element. Prefers ids, otherwise builds
// tag.class:nth-of-type segments (max depth 6) so the path survives small
// DOM changes. Returns null for body/document.
const selectorFor = (el) => {
  if (!el || el === document.body || el === document.documentElement) return null;
  const parts = [];
  let cur = el;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (cur.id) { parts.unshift(`#${CSS.escape(cur.id)}`); break; }
    let part = cur.tagName.toLowerCase();
    const cls = typeof cur.className === 'string'
      ? cur.className.trim().split(/\s+/).filter((c) => c && !c.includes(':')).slice(0, 2)
      : [];
    if (cls.length) part += cls.map((c) => `.${CSS.escape(c)}`).join('');
    if (cur.parentElement) {
      const sibs = [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName);
      if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    }
    parts.unshift(part);
    cur = cur.parentElement;
    if (parts.length >= 6) break;
  }
  return parts.join(' > ');
};

// Human-readable description of an element — shown while dropping (live
// readout), on the pin card, in the admin list and in the exported bug
// list. e.g. `button.add-item "Add item"`
const describeElement = (el) => {
  if (!el || !el.tagName) return '';
  let s = el.tagName.toLowerCase();
  if (el.id) s += `#${el.id}`;
  else {
    const cls = typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    if (cls.length) s += `.${cls.join('.')}`;
  }
  const role = el.getAttribute && el.getAttribute('role');
  if (role) s += `[${role}]`;
  const txt = (el.innerText
    || (el.getAttribute && el.getAttribute('aria-label'))
    || (el.getAttribute && el.getAttribute('title')) || '')
    .trim().replace(/\s+/g, ' ').slice(0, 60);
  if (txt) s += ` "${txt}"`;
  return s.slice(0, 300);
};

// Element truly under a point — the capture overlay sits on top, so we hide
// it for a sync peek at elementsFromPoint, then skip our own UI bits.
const pickAnchor = (x, y, overlayEl) => {
  if (overlayEl) overlayEl.style.display = 'none';
  const stack = document.elementsFromPoint
    ? document.elementsFromPoint(x, y)
    : [document.elementFromPoint(x, y)];
  if (overlayEl) overlayEl.style.display = '';
  return stack.find((el) => el && !el.closest('.bp-marker, .bp-floating, .bp-popup')) || null;
};

// Cluster resolved marker positions (viewport px) within ~42px of each other.
const clusterPositions = (items) => {
  const clusters = [];
  for (const it of items) {
    const hit = clusters.find((c) => Math.abs(c.x - it.pos.x) < 42 && Math.abs(c.y - it.pos.y) < 42);
    if (hit) hit.pins.push(it.p);
    else clusters.push({ x: it.pos.x, y: it.pos.y, anchored: it.pos.anchored, pins: [it.p] });
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
  const [draftIcon, setDraftIcon] = useState('pin');
  const [editIcon, setEditIcon] = useState('pin');
  const [saving, setSaving] = useState(false);
  const [draftPrivate, setDraftPrivate] = useState(false); // admin: private pin
  const [detail, setDetail] = useState(null);        // pin detail card
  const [editMode, setEditMode] = useState(false);   // admin: editing pin
  const [editNote, setEditNote] = useState('');
  const [editSev, setEditSev] = useState('minor');
  const [ctx, setCtx] = useState(null);              // admin context menu {x,y,pin}
  const [fanout, setFanout] = useState(null);        // cluster fan-out {x,y,pins}
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');          // transient action errors
  const [docH, setDocH] = useState(0);               // document height for fallback positions
  const [tick, setTick] = useState(0);               // scroll/layout tick — re-resolve pins
  const [hoverRect, setHoverRect] = useState(null);  // drop/move element highlight
  const [hoverLabel, setHoverLabel] = useState('');  // live element readout
  const [moving, setMoving] = useState(null);        // admin: pin being repositioned
  const dropRef = useRef(null);
  const moveRef = useRef(null);
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
  const [newPoll, setNewPoll] = useState({ title: '', description: '', options: [] });
  const [optDraft, setOptDraft] = useState('');       // admin: option being typed
  // Tester panel — own feedback threads + compose
  const [testerTab, setTesterTab] = useState('votes');
  const [myFeedback, setMyFeedback] = useState([]);
  const [fbForm, setFbForm] = useState({ type: 'idea', title: '', description: '' });
  const [fbSending, setFbSending] = useState(false);
  const [fbSent, setFbSent] = useState(false);

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

  // Tester's own feedback threads
  const loadMyFeedback = useCallback(async () => {
    if (isAdmin) return;
    try {
      const { data } = await api.get('/beta/feedback/my');
      setMyFeedback(data || []);
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
  useEffect(() => { if (pollsOpen) { loadPolls(); loadMyFeedback(); } }, [pollsOpen, loadPolls, loadMyFeedback]);
  useEffect(() => { if (isAdmin) loadAdminPins(); }, [isAdmin, loadAdminPins]);
  useEffect(() => { if (panelOpen) { loadAdminPins(); loadFeedback(); loadAdminPolls(); } },
    [panelOpen, loadAdminPins, loadFeedback, loadAdminPolls]);
  useEffect(() => {
    setDetail(null); setFanout(null); setCtx(null);
    if (pendingDetail.current) {
      setDetail(pendingDetail.current);
      pendingDetail.current = null;
    }
  }, [page]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      setDropMode(false); setDraft(null); setDetail(null);
      setCtx(null); setFanout(null); setMoving(null); setHoverRect(null); setHoverLabel('');
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => { localStorage.setItem('betaPinsVisible', showPins ? '1' : '0'); }, [showPins]);

  // Transient error toast — failed API calls tell the user instead of
  // dying silently (the old behaviour made buttons look broken).
  const toastErr = (msg) => {
    setToast(msg || 'Something went wrong');
    setTimeout(() => setToast(''), 3500);
  };

  // Track document height — used for the doc-% fallback when a pin's
  // element anchor no longer resolves.
  useEffect(() => {
    const measure = () => setDocH(document.documentElement.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [page]);

  // Element-anchored pins re-resolve from live rects — bump a tick on
  // scroll (rAF-throttled) so fixed markers track their elements.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Close context menu / fanout on any outside click
  useEffect(() => {
    if (!ctx && !fanout) return;
    const off = () => { setCtx(null); setFanout(null); };
    window.addEventListener('click', off);
    return () => window.removeEventListener('click', off);
  }, [ctx, fanout]);

  // Resolve every pin to a viewport position. Element-anchored pins track
  // their DOM element live; others fall back to the stored document-%.
  const resolvePin = (p, elCache) => {
    if (p.element_selector) {
      try {
        // Cache selector→rect per render pass — many pins can share one
        // element, and querySelector+getBoundingClientRect per pin per
        // scroll frame is what made big pin sets lag.
        let cached = elCache && elCache.get(p.element_selector);
        if (cached === undefined) {
          const el = document.querySelector(p.element_selector);
          cached = el ? { rect: el.getBoundingClientRect() } : null;
          if (elCache) elCache.set(p.element_selector, cached);
        }
        if (cached) {
          const r = cached.rect;
          const ox = p.offset_x !== null && p.offset_x !== undefined ? Number(p.offset_x) : 0.5;
          const oy = p.offset_y !== null && p.offset_y !== undefined ? Number(p.offset_y) : 0.5;
          return { x: r.left + ox * r.width, y: r.top + oy * r.height, anchored: true };
        }
      } catch { /* stale/invalid selector — fall through */ }
    }
    const docW = document.documentElement.clientWidth || window.innerWidth;
    const dh = docH || window.innerHeight;
    return {
      x: (Number(p.x_pct) / 100) * docW,
      y: (Number(p.y_pct) / 100) * dh - window.scrollY,
      anchored: false,
      // Selector existed but its element isn't mounted right now (closed
      // modal/panel/etc.) — hide the marker until it exists again.
      hidden: !!p.element_selector,
    };
  };

  const positioned = useMemo(
    () => {
      const elCache = new Map();
      return pins.map((p) => ({ p, pos: resolvePin(p, elCache) }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pins, docH, tick, page]
  );
  const clusters = useMemo(
    () => clusterPositions(positioned.filter((it) =>
      !it.pos.hidden
      // Viewport culling — offscreen markers cost DOM + click handlers
      // for nothing. 80px margin so edge clusters still fan out.
      && it.pos.x > -80 && it.pos.y > -80
      && it.pos.x < window.innerWidth + 80 && it.pos.y < window.innerHeight + 80
    )),
    [positioned]
  );

  // Position of the pin being inspected — drives the connector line that
  // shows where the marker actually is (it may sit under a toolbar).
  const detailPos = detail ? resolvePin(detail) : null;
  const openPinCount = useMemo(
    () => allPins.filter((p) => p.status === 'open' || p.status === 'in_progress').length,
    [allPins]
  );

  // Admin: jump from the pins list to a pin — navigate if it's on another
  // page, then reopen the detail card once the page renders.
  const pendingDetail = useRef(null);
  const goToPin = (p) => {
    setPanelOpen(false);
    if (p.page_path !== page) {
      pendingDetail.current = p;
      navigate(p.page_path);
    } else {
      setDetail(p);
    }
  };

  // -------------------------------------------------------------- actions
  const beginDrop = (e) => {
    // Fallback coords: x as % of document width, y as % of scroll height.
    const docW = document.documentElement.clientWidth || window.innerWidth;
    const docHNow = document.documentElement.scrollHeight || window.innerHeight;
    const xPct = Math.min(100, Math.max(0, (e.clientX / docW) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY + window.scrollY) / docHNow) * 100));

    // Primary anchor: the element actually under the click.
    const el = pickAnchor(e.clientX, e.clientY, dropRef.current);
    let anchor = {};
    if (el) {
      const sel = selectorFor(el);
      if (sel) {
        const r = el.getBoundingClientRect();
        anchor = {
          selector: sel,
          offX: clamp01((e.clientX - r.left) / (r.width || 1)),
          offY: clamp01((e.clientY - r.top) / (r.height || 1)),
          elementLabel: describeElement(el),
        };
      }
    }

    setDraft({ xPct, yPct, px: e.clientX, py: e.clientY, ...anchor });
    setDraftSev('minor'); setDraftNote(''); setDraftIcon('pin'); setError(''); setHoverRect(null); setHoverLabel('');
    setDropMode(false);
  };

  const submitPin = async () => {
    if (!draftNote.trim()) { setError('Describe what\'s happening here'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/beta/pins', {
        pagePath: page, x: draft.xPct, y: draft.yPct,
        severity: draftSev, note: draftNote.trim(),
        isPrivate: isAdmin ? draftPrivate : undefined,
        selector: draft.selector, offX: draft.offX, offY: draft.offY,
        elementLabel: draft.elementLabel,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        icon: draftIcon
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
    } catch (e) { toastErr(e.response?.data?.error || 'Status update failed'); }
  };

  const setPrivate = async (pin, isPrivate) => {
    try {
      await api.patch(`/beta/pins/${pin.id}`, { isPrivate });
      setCtx(null); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch (e) { toastErr(e.response?.data?.error || 'Privacy update failed'); }
  };

  const startEdit = (pin) => {
    setEditNote(pin.note); setEditSev(pin.severity);
    setEditIcon(pin.icon || 'pin');
    setEditMode(true); setCtx(null);
  };

  // Move mode: admin picks a new spot — re-anchors the pin to whatever
  // element is under the drop point (or falls back to doc-%).
  const startMove = (pin) => {
    setMoving(pin); setCtx(null); setDetail(null); setFanout(null); setHoverRect(null);
  };

  const finishMove = async (e) => {
    if (!moving) return;
    const docW = document.documentElement.clientWidth || window.innerWidth;
    const docHNow = document.documentElement.scrollHeight || window.innerHeight;
    const xPct = Math.min(100, Math.max(0, (e.clientX / docW) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY + window.scrollY) / docHNow) * 100));

    let anchor = {};
    const el = pickAnchor(e.clientX, e.clientY, moveRef.current);
    if (el) {
      const sel = selectorFor(el);
      if (sel) {
        const r = el.getBoundingClientRect();
        anchor = {
          selector: sel,
          offX: clamp01((e.clientX - r.left) / (r.width || 1)),
          offY: clamp01((e.clientY - r.top) / (r.height || 1)),
          elementLabel: describeElement(el),
        };
      }
    }
    try {
      await api.post(`/beta/pins/admin/${moving.id}/move`, { x: xPct, y: yPct, ...anchor });
    } catch (e) { toastErr(e.response?.data?.error || 'Move failed'); }
    setMoving(null); setHoverRect(null); setHoverLabel('');
    loadPagePins(); loadAdminPins();
  };

  // Ordered bug-list export — downloads the markdown the backend builds
  // (severity first: critical → weird, grouped by page, private pins kept).
  const exportPins = async () => {
    try {
      const { data } = await api.get('/beta/pins/admin/export');
      const blob = new Blob([data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bug-list-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toastErr(e.response?.data?.error || 'Export failed'); }
  };

  // Debug helpers — find the element a pin is attached to and flash it,
  // or copy its selector for devtools / the exported list.
  const locateElement = (p) => {
    if (!p.element_selector) { toastErr('This pin has no element anchor'); return; }
    let el = null;
    try { el = document.querySelector(p.element_selector); } catch { /* stale selector */ }
    if (!el) { toastErr('Element is not on the page right now'); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const f = document.createElement('div');
      f.style.cssText = `position:fixed;z-index:9999;pointer-events:none;border:2px solid #22d3ee;`
        + `border-radius:6px;box-shadow:0 0 0 4px rgba(34,211,238,.3);`
        + `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;transition:opacity .4s`;
      document.body.appendChild(f);
      setTimeout(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), 450); }, 1000);
    }, 400);
  };

  const copyText = async (text, okMsg) => {
    try { await navigator.clipboard.writeText(text); toastErr(okMsg || 'Copied'); }
    catch { toastErr('Copy failed'); }
  };

  const saveEdit = async () => {
    if (!editNote.trim()) return;
    try {
      await api.patch(`/beta/pins/${detail.id}`, {
        note: editNote.trim(), severity: editSev, icon: editIcon
      });
      setEditMode(false); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch (e) { toastErr(e.response?.data?.error || 'Edit failed'); }
  };

  const votePoll = async (pollId, vote, optionIndex) => {
    try {
      await api.post(`/beta/polls/${pollId}/vote`, { vote, optionIndex });
      loadPolls();
    } catch { /* silent */ }
  };

  const addOption = () => {
    const o = optDraft.trim();
    if (!o || newPoll.options.length >= 6 || newPoll.options.includes(o)) return;
    setNewPoll((n) => ({ ...n, options: [...n.options, o] }));
    setOptDraft('');
  };

  const createPoll = async () => {
    if (!newPoll.title.trim()) return;
    try {
      await api.post('/beta/polls/admin', {
        title: newPoll.title.trim(),
        description: newPoll.description.trim() || null,
        options: newPoll.options.length >= 2 ? newPoll.options : undefined
      });
      setNewPoll({ title: '', description: '', options: [] });
      setOptDraft('');
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
    } catch (e) { toastErr(e.response?.data?.error || 'Bulk action failed'); }
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

  // Tester → admin: send an idea/bug/feature request
  const submitFeedback = async () => {
    if (!fbForm.title.trim() || !fbForm.description.trim()) return;
    setFbSending(true);
    try {
      await api.post('/beta/feedback', {
        type: fbForm.type,
        title: fbForm.title.trim(),
        description: fbForm.description.trim()
      });
      setFbForm({ type: 'idea', title: '', description: '' });
      setFbSent(true);
      loadMyFeedback();
    } catch (e) { toastErr(e.response?.data?.error || 'Failed to send'); }
    finally { setFbSending(false); }
  };

  if (!user || !canUse) return null;

  // -------------------------------------------------------------- render
  // The WHOLE layer lives in a body portal — renders inside the React tree
  // anywhere would leave `fixed` markers/buttons trapped under transformed
  // or stacked ancestors (which made them unclickable).
  return (
    <Portal>
    <>
      {/* Drop-mode capture overlay — hover highlights the element that
          would become the pin's anchor */}
      {dropMode && (
        <>
          <div
            ref={dropRef}
            className="fixed inset-0 z-[9998] cursor-crosshair"
            style={{ background: 'rgba(15,23,42,0.15)', outline: '3px dashed rgba(239,68,68,0.6)', outlineOffset: -8 }}
            onClick={beginDrop}
            onMouseMove={(e) => {
              const el = pickAnchor(e.clientX, e.clientY, dropRef.current);
              setHoverRect(el ? el.getBoundingClientRect() : null);
              setHoverLabel(el ? describeElement(el) : '');
            }}
            onMouseLeave={() => { setHoverRect(null); setHoverLabel(''); }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
              Click an element to pin a note — Esc to cancel
            </div>
          </div>
          {hoverRect && (
            <div
              className="fixed z-[9999] pointer-events-none rounded"
              style={{
                left: hoverRect.left, top: hoverRect.top,
                width: hoverRect.width, height: hoverRect.height,
                border: '2px solid rgba(239,68,68,0.9)',
                boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.4)'
              }}
            >
              {/* Live readout — which element the pin will attach to */}
              {hoverLabel && (
                <div className={`absolute left-0 ${hoverRect.bottom + 44 > window.innerHeight ? 'bottom-full mb-1' : 'top-full mt-1'} whitespace-nowrap bg-slate-900 text-red-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg max-w-[60vw] overflow-hidden text-ellipsis`}>
                  {hoverLabel}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Move mode — admin picks a new spot; pin re-anchors to the element
          under the drop point. Esc cancels. */}
      {moving && (
        <>
          <div
            ref={moveRef}
            className="fixed inset-0 z-[9998] cursor-move"
            style={{ background: 'rgba(15,23,42,0.2)', outline: '3px dashed rgba(59,130,246,0.6)', outlineOffset: -8 }}
            onClick={finishMove}
            onMouseMove={(e) => {
              const el = pickAnchor(e.clientX, e.clientY, moveRef.current);
              setHoverRect(el ? el.getBoundingClientRect() : null);
              setHoverLabel(el ? describeElement(el) : '');
            }}
            onMouseLeave={() => { setHoverRect(null); setHoverLabel(''); }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
              Moving pin #{moving.id} — click the new spot (Esc cancels)
            </div>
          </div>
          {hoverRect && (
            <div
              className="fixed z-[9999] pointer-events-none rounded"
              style={{
                left: hoverRect.left, top: hoverRect.top,
                width: hoverRect.width, height: hoverRect.height,
                border: '2px solid rgba(59,130,246,0.9)',
                boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.4)'
              }}
            >
              {/* Live readout — which element the pin will re-attach to */}
              {hoverLabel && (
                <div className={`absolute left-0 ${hoverRect.bottom + 44 > window.innerHeight ? 'bottom-full mb-1' : 'top-full mt-1'} whitespace-nowrap bg-slate-900 text-blue-300 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg max-w-[60vw] overflow-hidden text-ellipsis`}>
                  {hoverLabel}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Pin markers — fixed at live-resolved positions. Element-anchored
          pins track their element every render; fallback pins (selector
          dead, or pre-anchor legacy) sit at their stored doc-% spot and
          render dimmed. */}
      {showPins && !dropMode && clusters.map((c) => (
        <button
          key={`c-${c.pins.map((p) => p.id).join('-')}`}
          className={`bp-marker fixed z-[9990] -translate-x-1/2 -translate-y-full group ${c.anchored ? '' : 'opacity-70'}`}
          style={{ left: c.x, top: c.y }}
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
          title={c.pins.length > 1 ? `${c.pins.length} pins here` : `${c.pins[0].note}${c.anchored ? '' : ' (approximate spot)'}`}
        >
          <span className="relative block drop-shadow-lg">
            {(() => {
              const PIcon = pinIconOf(c.pins[0].icon);
              return (
                <PIcon
                  className="w-7 h-7"
                  style={{ color: sevOf(c.pins[0].severity).color }}
                  fill={sevOf(c.pins[0].severity).color}
                  stroke="#0f172a" strokeWidth={1}
                />
              );
            })()}
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
        <Popup
          x={fanout.x} y={fanout.y} width={288}
          className="bp-popup z-[9999] w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-3"
        >
        <div onClick={(e) => e.stopPropagation()}>
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
        </Popup>
      )}

      {/* Connector line + pulse ring — the detail card can float far from
          the pin (or the pin marker can sit UNDER a toolbar/sidebar), so
          draw a line from the card back to the resolved position plus a
          ring that marks the exact spot above everything else. */}
      {detail && detailPos && !ctx && (
        <svg className="fixed inset-0 z-[9995] pointer-events-none" width="100%" height="100%">
          <line
            x1={detailPos.x} y1={detailPos.y - 14}
            x2={detailPos.x + 16 + 20} y2={detailPos.y + 8 + 20}
            stroke={sevOf(detail.severity).color}
            strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round"
            opacity="0.85"
          />
          <circle
            cx={detailPos.x} cy={detailPos.y - 14} r="13"
            fill="none" stroke={sevOf(detail.severity).color} strokeWidth="2.5" opacity="0.9"
          />
          <circle
            cx={detailPos.x} cy={detailPos.y - 14} r="13"
            fill="none" stroke={sevOf(detail.severity).color} strokeWidth="2"
          >
            <animate attributeName="r" values="13;26" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </svg>
      )}

      {/* Pin detail card — anchored next to the pin's live position */}
      {detail && !ctx && (
        <Popup
          x={resolvePin(detail).x + 16}
          y={resolvePin(detail).y + 8}
          width={320}
          className="bp-popup z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-4"
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
              <IconPicker value={editIcon} onChange={setEditIcon} />
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
          {/* Debug — which element the pin is attached to */}
          {(detail.element_label || detail.element_selector) && (
            <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2 py-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                <LocateFixed className="w-3 h-3" /> Pinned element
                <span className={`ml-auto normal-case font-normal ${resolvePin(detail).anchored ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {resolvePin(detail).anchored ? 'tracking live' : 'not found — approx spot'}
                </span>
              </div>
              {detail.element_label && (
                <div className="text-[11px] text-slate-300 mt-0.5 break-words">{detail.element_label}</div>
              )}
              {detail.element_selector && (
                <button
                  onClick={() => copyText(detail.element_selector, 'Selector copied')}
                  title="Copy selector"
                  className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 w-full min-w-0 text-left"
                >
                  <Copy className="w-3 h-3 shrink-0" />
                  <span className="truncate">{detail.element_selector}</span>
                </button>
              )}
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                {detail.viewport && <span>viewport {detail.viewport} when pinned</span>}
                {detail.element_selector && (
                  <button
                    onClick={() => locateElement(detail)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 ml-auto"
                  >
                    <LocateFixed className="w-3 h-3" /> Locate
                  </button>
                )}
              </div>
            </div>
          )}
          {isAdmin && !editMode && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {detail.status === 'open' && (
                <button onClick={() => setStatus(detail, 'in_progress')} className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50">In progress</button>
              )}
              {(detail.status === 'open' || detail.status === 'in_progress') && (
                <>
                  <button onClick={() => setStatus(detail, 'fixed')} className="text-xs px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50">Fixed</button>
                  <button onClick={() => setStatus(detail, 'hidden')} className="text-xs px-2 py-1 rounded bg-zinc-600/30 text-zinc-300 hover:bg-zinc-600/50">Hide</button>
                  <button onClick={() => setStatus(detail, 'removed')} className="text-xs px-2 py-1 rounded bg-red-600/30 text-red-200 hover:bg-red-600/50 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </>
              )}
              {(detail.status === 'hidden' || detail.status === 'fixed' || detail.status === 'removed') && (
                <button onClick={() => setStatus(detail, 'open')} className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Reopen
                </button>
              )}
              <button onClick={() => startMove(detail)} className="text-xs px-2 py-1 rounded bg-violet-600/30 text-violet-200 hover:bg-violet-600/50 flex items-center gap-1">
                <Move className="w-3 h-3" /> Move
              </button>
              <button onClick={() => startEdit(detail)} className="text-xs px-2 py-1 rounded bg-slate-600/40 text-slate-200 hover:bg-slate-600/70 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => setPrivate(detail, !detail.is_private)} className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 flex items-center gap-1">
                <Lock className="w-3 h-3" /> {detail.is_private ? 'Public' : 'Private'}
              </button>
            </div>
          )}
        </Popup>
      )}

      {/* Admin right-click context menu */}
      {ctx && isAdmin && (
        <Popup
          x={ctx.x} y={ctx.y} width={208}
          className="bp-popup z-[9999] w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 text-sm"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-3"
        >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-800 truncate">
            {ctx.pin.username} · {sevOf(ctx.pin.severity).label}
          </div>
          <button className="ctx-item" onClick={() => { setDetail(ctx.pin); setCtx(null); }}>
            <ChevronRight className="w-4 h-4" /> View details
          </button>
          <button className="ctx-item" onClick={() => { setDetail(ctx.pin); startEdit(ctx.pin); }}>
            <Pencil className="w-4 h-4 text-slate-400" /> Edit note
          </button>
          <button className="ctx-item" onClick={() => startMove(ctx.pin)}>
            <Move className="w-4 h-4 text-violet-400" /> Move pin
          </button>
          <button className="ctx-item" onClick={() => setPrivate(ctx.pin, !ctx.pin.is_private)}>
            <Lock className="w-4 h-4 text-amber-400" /> {ctx.pin.is_private ? 'Make public' : 'Make private'}
          </button>
          {(ctx.pin.status === 'open') && (
            <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'in_progress')}>
              <Clock className="w-4 h-4 text-blue-400" /> Mark in progress
            </button>
          )}
          {(ctx.pin.status === 'open' || ctx.pin.status === 'in_progress') && (
            <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'fixed')}>
              <Check className="w-4 h-4 text-emerald-400" /> Mark fixed
            </button>
          )}
          {(ctx.pin.status !== 'open' && ctx.pin.status !== 'in_progress') && (
            <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'open')}>
              <RotateCcw className="w-4 h-4 text-blue-400" /> Reopen
            </button>
          )}
          {(ctx.pin.status === 'open' || ctx.pin.status === 'in_progress') && (
            <>
              <button className="ctx-item" onClick={() => setStatus(ctx.pin, 'hidden')}>
                <EyeOff className="w-4 h-4 text-zinc-400" /> Hide pin
              </button>
              <button className="ctx-item text-red-300 hover:bg-red-500/10" onClick={() => setStatus(ctx.pin, 'removed')}>
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </>
          )}
        </div>
        </Popup>
      )}

      {/* New-pin draft popup */}
      {draft && (
        <Popup
          x={draft.px} y={draft.py} width={320}
          className="bp-popup z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-4"
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
          <IconPicker value={draftIcon} onChange={setDraftIcon} />
          {draft.selector && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-slate-400">
              <LocateFixed className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Pinned to: <span className="text-slate-200">{draft.elementLabel || draft.selector}</span></span>
            </div>
          )}
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
        </Popup>
      )}

      {/* Tester beta viewer — polls + messages with the admin */}
      {pollsOpen && !isAdmin && (
        <div className="fixed top-0 right-0 bottom-0 z-[9988] w-96 max-w-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mr-1">Beta Viewer</span>
              {[['votes', 'Polls'], ['messages', 'Messages']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTesterTab(t)}
                  className={`text-sm px-3 py-1.5 rounded-lg ${testerTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setPollsOpen(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
          </div>

          {testerTab === 'votes' && (
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {polls.map((p) => {
                const hasOptions = Array.isArray(p.options) && p.options.length >= 2;
                const pct = p.total_votes ? Math.round((p.yes_votes / p.total_votes) * 100) : 0;
                return (
                  <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-100">{p.title}</div>
                        {p.description && <div className="text-xs text-slate-400 mt-0.5 max-h-16 overflow-y-auto scrollbar-3d pr-1">{p.description}</div>}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${p.status === 'open' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {p.status}
                      </span>
                    </div>
                    {hasOptions ? (
                      <div className="flex flex-col gap-1 mt-2">
                        {p.options.map((opt, i) => {
                          const v = p.option_tally?.[i] || 0;
                          const opct = p.total_votes ? Math.round((v / p.total_votes) * 100) : 0;
                          return (
                            <button
                              key={i}
                              onClick={() => p.status === 'open' && votePoll(p.id, null, i)}
                              disabled={p.status !== 'open'}
                              className={`relative text-left text-xs px-2.5 py-1.5 rounded-lg overflow-hidden transition disabled:opacity-60 ${p.my_option === i ? 'bg-blue-600/40 text-blue-100 ring-1 ring-blue-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                            >
                              <span className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${opct}%` }} />
                              <span className="relative flex justify-between gap-2">
                                <span className="truncate">{opt}</span>
                                <span className="shrink-0">{v}</span>
                              </span>
                            </button>
                          );
                        })}
                        <span className="text-[10px] text-slate-500">
                          {p.total_votes} votes{p.my_option !== null && p.my_option !== undefined ? ' · tap a choice to change your vote' : ''}
                        </span>
                      </div>
                    ) : (
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
                          <span className="text-[10px] text-slate-500 ml-auto">{pct}% want it</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!polls.length && <p className="text-sm text-slate-500 text-center py-8">No open polls</p>}
            </div>
          )}

          {testerTab === 'messages' && (
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {/* New message to the admin */}
              <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/30">
                <div className="flex gap-1.5 mb-1.5">
                  {[['idea', 'Idea'], ['feature', 'Feature'], ['bug', 'Bug'], ['general', 'Other']].map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => setFbForm((f) => ({ ...f, type: t }))}
                      className={`text-[11px] px-2 py-1 rounded-lg ${fbForm.type === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  value={fbForm.title}
                  onChange={(e) => setFbForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Title…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  value={fbForm.description}
                  onChange={(e) => setFbForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Tell the admin what's on your mind…"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 mt-1.5 resize-y scrollbar-3d focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={submitFeedback}
                  disabled={fbSending || !fbForm.title.trim() || !fbForm.description.trim()}
                  className="w-full mt-1.5 text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium"
                >
                  {fbSending ? 'Sending…' : 'Send to admin'}
                </button>
                <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  The admin reads everything, but replies may take a little while — thanks for hanging tight!
                </p>
                {fbSent && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1 mt-1.5">
                    Sent! The admin will get back to you right here when they can.
                  </p>
                )}
              </div>

              {/* My threads */}
              {myFeedback.map((f) => (
                <div key={f.id} className="border-b border-slate-800/60">
                  <button className="w-full text-left px-3 py-2.5 hover:bg-slate-800/40" onClick={() => openReplies(f)}>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800">{f.type}</span>
                      <span className={`px-1.5 py-0.5 rounded ${STATUS_META[f.status]?.cls || 'bg-slate-800 text-slate-300'}`}>{(f.status || 'new').replace(/_/g, ' ')}</span>
                      <span className="ml-auto">{relTime(f.created_at)}</span>
                    </div>
                    <div className="text-sm text-slate-100 font-medium mt-1 truncate">{f.title}</div>
                  </button>
                  {openThread === f.id && (
                    <div className="px-3 pb-3">
                      <div className="text-xs text-slate-400 max-h-16 overflow-y-auto scrollbar-3d pr-1 mb-2">{f.description}</div>
                      {f.admin_response && (
                        <div className="text-xs bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-blue-200 mb-2">
                          Admin: {f.admin_response}
                        </div>
                      )}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-3d">
                        {replies.map((r) => (
                          <div key={r.id} className={`text-xs p-2 rounded-lg ${r.is_admin ? 'bg-blue-600/20 text-blue-100 ml-4' : 'bg-slate-800 text-slate-200 mr-4'}`}>
                            <span className="text-[10px] text-slate-400 block">{r.is_admin ? 'Admin' : 'You'} · {relTime(r.created_at)}</span>
                            {r.body}
                          </div>
                        ))}
                        {!replies.length && <p className="text-xs text-slate-500">No replies yet — the admin will get back to you.</p>}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <input
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendReply(f.id)}
                          placeholder="Add a reply…"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={() => sendReply(f.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">Send</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!myFeedback.length && <p className="text-sm text-slate-500 text-center py-8">No messages yet — send one above!</p>}
            </div>
          )}
        </div>
      )}

      {/* Floating controls — pushed LEFT of the app's own bottom-right
          button column (Apps / Active List / editor) and kept under their
          z-layer so the app buttons always win clicks. */}
      {!dropMode && !moving && (
        <div className="bp-floating fixed bottom-5 right-24 z-[45] flex flex-col items-end gap-3">
          {!isAdmin && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setPollsOpen((o) => !o)}
                className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition relative ${pollsOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Beta Viewer — polls & messages"
              >
                <BarChart3 className="w-5 h-5" />
                {polls.some((p) => p.status === 'open' && !p.my_vote && p.my_option === null) && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />
                )}
              </button>
              <FabLabel>Beta</FabLabel>
            </div>
          )}
          {isAdmin && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setPanelOpen((o) => !o)}
                className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition relative ${panelOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Admin Viewer — pins, messages & polls"
              >
                <MessageSquare className="w-5 h-5" />
                {openPinCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-slate-900">
                    {openPinCount}
                  </span>
                )}
              </button>
              <FabLabel>Admin</FabLabel>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowPins((v) => !v)}
              className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition ${showPins ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
              title={showPins ? 'Hide pins' : 'Show pins'}
            >
              {showPins ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <FabLabel>{showPins ? 'Hide' : 'Show'}</FabLabel>
          </div>
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setDropMode(true)}
              className="w-12 h-12 rounded-full shadow-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition"
              title="Pin feedback on this page"
            >
              <Plus className="w-6 h-6" />
            </button>
            <FabLabel>Pin</FabLabel>
          </div>
        </div>
      )}

      {/* Admin beta viewer panel */}
      {isAdmin && panelOpen && (
        <div className="fixed top-0 right-0 bottom-0 z-[9988] w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mr-1">Admin Viewer</span>
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
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {/* Bulk action bar */}
              <div className="sticky top-0 bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 z-10">
                <span className="text-xs text-slate-400 mr-auto">{sel.size} selected</span>
                {['fixed', 'in_progress', 'open', 'hide', 'remove'].map((a) => (
                  <button
                    key={a}
                    onClick={() => bulk(a)}
                    disabled={!sel.size}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 capitalize"
                  >
                    {a === 'in_progress' ? 'working' : a}
                  </button>
                ))}
                <button
                  onClick={exportPins}
                  title="Download the ordered bug list (.md) — critical first, grouped by page"
                  className="text-[11px] px-2 py-1 rounded bg-blue-700/60 text-blue-100 hover:bg-blue-600 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
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
                  <span className="min-w-0 flex-1" onClick={(e) => { e.preventDefault(); goToPin(p); }}>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="truncate">{p.username}</span>
                      <span>·</span><span className="truncate">{p.page_path}</span>
                      <span>·</span><span>{relTime(p.created_at)}</span>
                    </span>
                    <span className="block text-sm text-slate-200 truncate">{p.note}</span>
                    {p.element_label && (
                      <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                        <LocateFixed className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />{p.element_label}
                      </span>
                    )}
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
            <div className="flex-1 overflow-y-auto scrollbar-3d">
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
                      <div className="text-xs text-slate-300 max-h-16 overflow-y-auto scrollbar-3d pr-1 mb-2">{f.description}</div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-3d">
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
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {/* Create poll */}
              <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/30">
                <input
                  value={newPoll.title}
                  onChange={(e) => setNewPoll((n) => ({ ...n, title: e.target.value }))}
                  placeholder="New feature idea…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  value={newPoll.description}
                  onChange={(e) => setNewPoll((n) => ({ ...n, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 mt-1.5 resize-y scrollbar-3d focus:outline-none focus:border-blue-500"
                />
                {/* Multi-choice options — 2+ turns it into a pick-one poll */}
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={optDraft}
                    onChange={(e) => setOptDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOption()}
                    placeholder="Add a choice… (2+ = testers pick one)"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={addOption}
                    disabled={!optDraft.trim() || newPoll.options.length >= 6}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {newPoll.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {newPoll.options.map((o, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 text-slate-300 rounded-full px-2 py-0.5 flex items-center gap-1">
                        {o}
                        <button
                          onClick={() => setNewPoll((n) => ({ ...n, options: n.options.filter((_, x) => x !== i) }))}
                          className="text-slate-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {newPoll.options.length === 1 && (
                      <span className="text-[10px] text-amber-400">need 2+ for multi-choice</span>
                    )}
                  </div>
                )}
                <button
                  onClick={createPoll}
                  disabled={!newPoll.title.trim()}
                  className="w-full mt-1.5 text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium"
                >
                  {newPoll.options.length >= 2 ? 'Post multi-choice poll to beta testers' : 'Post poll to beta testers'}
                </button>
              </div>

              {adminPolls.map((p) => {
                const pct = p.total_votes ? Math.round((p.yes_votes / p.total_votes) * 100) : 0;
                const notes = pollNotes.filter((n) => n.poll_id === p.id);
                return (
                  <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-100">{p.title}</div>
                        {p.description && <div className="text-xs text-slate-400 mt-0.5 max-h-16 overflow-y-auto scrollbar-3d pr-1">{p.description}</div>}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_META[p.status]?.cls || 'bg-slate-800 text-slate-300'}`}>
                        {p.status}
                      </span>
                    </div>
                    {Array.isArray(p.options) && p.options.length >= 2 ? (
                      <div className="mt-2 space-y-1">
                        {p.options.map((opt, i) => {
                          const v = p.option_tally?.[i] || 0;
                          const opct = p.total_votes ? Math.round((v / p.total_votes) * 100) : 0;
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                <span className="truncate pr-2">{opt}</span>
                                <span>{v} · {opct}%</span>
                              </div>
                              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${opct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <div className="text-[10px] text-slate-500">{p.total_votes} votes</div>
                      </div>
                    ) : (
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
                    )}
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

      {/* Transient action error toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 border border-slate-600 text-slate-100 text-sm px-4 py-2 rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </>
    </Portal>
  );
};

export default BetaPinLayer;
