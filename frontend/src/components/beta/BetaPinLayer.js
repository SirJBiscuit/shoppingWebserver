import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FormattedNote from '../FormattedNote';
import { Popup, Portal, Connector, ScrollStrip, useCornerStack, usePanelShift, setPanelShift, useIsMobile, useFloatSide } from '../../utils/autoPlacement';
import { pinDisplayPos, usePinLayerTick } from '../../utils/pinLayer';
import {
  MapPin, Plus, X, Eye, EyeOff, MessageSquare, ChevronRight,
  Check, Clock, Trash2, Layers, ExternalLink,
  BarChart3, ThumbsUp, ThumbsDown, Lock, Pencil, Move, Download, RotateCcw,
  LocateFixed, Copy, Flag, Bug, Lightbulb, AlertTriangle, HelpCircle, Star,
  Crosshair, Ghost, PanelRightClose, PanelRightOpen, Pin, Archive,
  Search, SlidersHorizontal
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
  { key: 'critical',     label: 'Big priority',   color: '#ef4444' },
  { key: 'problem',      label: 'Problem',        color: '#e11d48' },
  { key: 'annoying',     label: 'Annoying',       color: '#f97316' },
  { key: 'needs_tweak',  label: 'Needs tweaked',  color: '#8b5cf6' },
  { key: 'minor',        label: 'Low',            color: '#eab308' },
  { key: 'low_priority', label: 'Low priority',   color: '#64748b' },
  { key: 'weird',        label: 'Acts weird',     color: '#d946ef' },
  { key: 'look',         label: 'Look at it',     color: '#38bdf8' },
];
const sevOf = (key) => SEVERITIES.find((s) => s.key === key)
  || SEVERITIES.find((s) => s.key === 'minor');

const STATUS_META = {
  open:        { label: 'Open',        cls: 'bg-slate-500/20 text-slate-200' },
  in_progress: { label: 'In progress', cls: 'bg-blue-500/20 text-blue-300' },
  fixed:       { label: 'Fixed',       cls: 'bg-emerald-500/20 text-emerald-300' },
  hidden:      { label: 'Hidden',      cls: 'bg-zinc-500/20 text-zinc-400' },
  removed:     { label: 'Removed',     cls: 'bg-red-500/20 text-red-300' },
  // Poll progress statuses
  thinking:    { label: 'Thinking',      cls: 'bg-amber-500/20 text-amber-300' },
  working:     { label: 'Working on it', cls: 'bg-violet-500/20 text-violet-300' },
  shipped:     { label: 'Shipped',       cls: 'bg-emerald-500/20 text-emerald-300' },
  dropped:     { label: 'Dropped',       cls: 'bg-red-500/20 text-red-300' },
};

// Admin viewer filter windows + sort modes
const TIME_WINDOWS = { '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3 };
const SORT_MODES = [
  { key: 'new',      label: 'Newest' },
  { key: 'old',      label: 'Oldest' },
  { key: 'priority', label: 'Priority' },
  { key: 'page',     label: 'By page' },
];
const PIN_STATUSES = ['open', 'in_progress', 'fixed', 'hidden'];

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

// Pin purpose — bug pins go into the admin export list; note/idea pins are
// exempt so testers can drop reminders or suggestions without polluting it.
const PIN_KINDS = [
  { key: 'bug',  label: 'Bug' },
  { key: 'note', label: 'Note' },
  { key: 'idea', label: 'Idea' },
];

// Private admin ideas board tags/statuses (beta_admin_ideas)
const IDEA_TAGS = ['idea', 'task', 'note', 'plan', 'investigate', 'risk'];
const IDEA_STATUSES = ['open', 'in_progress', 'done', 'archived'];
const KIND_META = {
  bug:  { label: 'Bug',  cls: 'bg-red-500/20 text-red-300' },
  note: { label: 'Note', cls: 'bg-amber-500/20 text-amber-300' },
  idea: { label: 'Idea', cls: 'bg-violet-500/20 text-violet-300' },
};

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
  const [draftKind, setDraftKind] = useState('bug');
  const [editKind, setEditKind] = useState('bug');
  const [detailDrag, setDetailDrag] = useState({ dx: 0, dy: 0 }); // drag offset
  const [inspectMode, setInspectMode] = useState(false);  // admin: element inspector
  const [inspectData, setInspectData] = useState(null);   // {x,y,selector,label,rect}
  const [showGhosts, setShowGhosts] = useState(false);    // deleted-pin ghost markers
  const [stackHidden, setStackHidden] = useState(() =>    // hide beta controls
    localStorage.getItem('betaStackHidden') === '1');
  const [ghostDetail, setGhostDetail] = useState(null);   // clicked history entry
  const [historyItems, setHistoryItems] = useState([]);   // pin history rows
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
  const stackRef = useRef(null);              // beta floating stack (for coord)
  const inspectRef = useRef(null);            // inspector overlay (pickAnchor skip)
  // Admin viewer panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState('pins');
  const [allPins, setAllPins] = useState([]);
  const [byPage, setByPage] = useState([]);
  const [sel, setSel] = useState(new Set());
  // Admin viewer — search + filter/sort popup state
  const [pinSearch, setPinSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(null); // {x,y} anchor for Popup
  const [sortMode, setSortMode] = useState('new');       // new|old|priority|page
  const [timeFilter, setTimeFilter] = useState('all');   // all|24h|7d|30d
  const [authorFilter, setAuthorFilter] = useState('all'); // 'all'|username
  const [roleFilter, setRoleFilter] = useState('all');   // all|admin|beta
  const [sevFilter, setSevFilter] = useState(new Set()); // empty = all
  const [statusFilter, setStatusFilter] = useState(new Set()); // empty = all non-removed
  const [feedback, setFeedback] = useState([]);
  const [openThread, setOpenThread] = useState(null);   // feedback id
  const [replies, setReplies] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  // Feature polls
  const [polls, setPolls] = useState([]);            // tester view
  const [pollsOpen, setPollsOpen] = useState(false); // tester popover
  const [adminPolls, setAdminPolls] = useState([]);  // admin view + tallies
  const [pollNotes, setPollNotes] = useState([]);    // voter notes
  const [newPoll, setNewPoll] = useState({ title: '', description: '', options: [], color: '', icon: '' });
  const [optDraft, setOptDraft] = useState('');       // admin: option being typed
  const [editPoll, setEditPoll] = useState(null);     // admin: poll being edited
  const [editOptDraft, setEditOptDraft] = useState('');
  // Private admin ideas board
  const [ideas, setIdeas] = useState([]);
  const [ideaDraft, setIdeaDraft] = useState({ title: '', body: '', tag: 'idea', color: '' });
  const [ideaEdit, setIdeaEdit] = useState(null);     // {id,title,body,tag,color}
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

  // Pin history — deleted/restored snapshots for the history viewer + ghosts
  const loadHistory = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/beta/pins/admin/history');
      setHistoryItems(data.history || []);
    } catch { /* silent */ }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && (showGhosts || (panelOpen && tab === 'history'))) loadHistory();
  }, [isAdmin, showGhosts, panelOpen, tab, loadHistory]);

  // Private admin ideas board
  const loadIdeas = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/beta/ideas/admin');
      setIdeas(data.ideas || []);
    } catch { /* silent */ }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && panelOpen && tab === 'ideas') loadIdeas();
  }, [isAdmin, panelOpen, tab, loadIdeas]);

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
      setInspectMode(false); setInspectData(null); setGhostDetail(null);
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

  // API failures: show the server's error plus its `detail` (real DB error)
  // when present — this is how the pin-status 500 root cause gets surfaced.
  const apiErr = (e, fallback) => {
    const base = e.response?.data?.error || fallback;
    const detail = e.response?.data?.detail;
    toastErr(detail ? `${base}: ${detail}` : base);
  };

  // 'Remove' = real delete now — the row survives as a history snapshot.
  const deletePin = async (pin) => {
    try {
      await api.delete(`/beta/pins/admin/${pin.id}`);
      setCtx(null); setDetail(null); setGhostDetail(null);
      loadPagePins(); loadAdminPins(); if (showGhosts) loadHistory();
    } catch (e) { apiErr(e, 'Delete failed'); }
  };

  const restorePin = async (h) => {
    try {
      await api.post(`/beta/pins/admin/history/${h.id}/restore`);
      setGhostDetail(null);
      loadPagePins(); loadAdminPins(); loadHistory();
      toastErr('Pin restored as open');
    } catch (e) { apiErr(e, 'Restore failed'); }
  };

  // Deleted pins that haven't been restored — the ghost set.
  const ghostList = historyItems.filter((h) =>
    h.event === 'deleted' &&
    !historyItems.some((r) => r.event === 'restored' && r.pin_id === h.pin_id)
  );

  // Draggable detail card — pointer-down on the header drags the popup via
  // a translate offset on top of Popup's clamped position. Buttons and
  // inputs inside the header are excluded so clicks still work.
  const startDetailDrag = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    e.preventDefault();
    const startX = e.clientX - detailDrag.dx;
    const startY = e.clientY - detailDrag.dy;
    const onMove = (ev) => {
      setDetailDrag({ dx: ev.clientX - startX, dy: ev.clientY - startY });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // New pin opened → card snaps back next to the pin marker.
  useEffect(() => { setDetailDrag({ dx: 0, dy: 0 }); }, [detail?.id]);

  // Corner-stack API: publish the beta controls' occupied height (viewport
  // bottom → stack top) so the Apps/Active List column floats above it.
  // Hiding the stack (stackHidden) publishes 0 and the column drops down.
  useCornerStack('beta', stackRef,
    !dropMode && !moving && canUse && !stackHidden,
    [isAdmin, pins, allPins]);
  const panelShift = usePanelShift();
  const isMobile = useIsMobile();
  // Shared side — the whole corner assembly (apps stack, beta stack, admin
  // sidebar) moves between left/right together.
  const floatSide = useFloatSide('right');

  // Admin viewer is a 384px right-edge panel — shift every corner column
  // left while it's open so the beta stack + Active List buttons stay
  // reachable beside it (only when the columns live on the right).
  useEffect(() => {
    setPanelShift('viewer', panelOpen && !isMobile && floatSide === 'right' ? 400 : 0);
    return () => setPanelShift('viewer', 0);
  }, [panelOpen, isMobile, floatSide]);
  useEffect(() => {
    localStorage.setItem('betaStackHidden', stackHidden ? '1' : '0');
  }, [stackHidden]);

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

  // pinLayer tick: capture-phase scroll catches INNER scroll containers
  // (pantry grids, lab lists, slide-out panels — scroll doesn't bubble but
  // does reach capture on document). The 1s poll re-checks occlusion when
  // popups/menus open or chrome appears without any scroll.
  const layerTick = usePinLayerTick(1000);

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
    [pins, docH, tick, layerTick, page]
  );
  // Occlusion-aware clustering: resolve each cluster's DISPLAY position
  // through pinLayer — chrome (toolbars/sidebars/panels) nudges the marker
  // to a free edge; transient overlays (menus/modals) underlap it.
  const clusters = useMemo(
    () => {
      const base = clusterPositions(positioned.filter((it) =>
        !it.pos.hidden
        // Viewport culling — offscreen markers cost DOM + click handlers
        // for nothing. 80px margin so edge clusters still fan out.
        && it.pos.x > -80 && it.pos.y > -80
        && it.pos.x < window.innerWidth + 80 && it.pos.y < window.innerHeight + 80
      ));
      return base.map((c) => {
        let anchorEl = null;
        const sel = c.pins[0]?.element_selector;
        if (sel) { try { anchorEl = document.querySelector(sel); } catch { /* stale */ } }
        const disp = pinDisplayPos(c.x, c.y, { anchorEl });
        return { ...c, x: disp.x, y: disp.y, mode: disp.mode, trueX: disp.trueX, trueY: disp.trueY };
      }).filter((c) => c.mode !== 'hidden');
    },
    // layerTick re-checks every inner-scroll/resize/poll beat
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positioned, layerTick]
  );

  // Position of the pin being inspected — drives the connector line that
  // shows where the marker actually is (it may sit under a toolbar).
  const detailPos = detail ? resolvePin(detail) : null;
  const openPinCount = useMemo(
    () => allPins.filter((p) => p.status === 'open' || p.status === 'in_progress').length,
    [allPins]
  );

  // Admin viewer — distinct authors for the filter popup
  const pinAuthors = useMemo(
    () => [...new Set(allPins.map((p) => p.username).filter(Boolean))].sort(),
    [allPins]
  );
  const activeFilterCount = useMemo(
    () => (timeFilter !== 'all') + (authorFilter !== 'all') + (roleFilter !== 'all')
      + sevFilter.size + statusFilter.size + (sortMode !== 'new'),
    [timeFilter, authorFilter, roleFilter, sevFilter, statusFilter, sortMode]
  );
  const clearFilters = () => {
    setTimeFilter('all'); setAuthorFilter('all'); setRoleFilter('all');
    setSevFilter(new Set()); setStatusFilter(new Set()); setSortMode('new');
  };
  // Search + filter + sort pipeline for the pins tab
  const filteredPins = useMemo(() => {
    let list = allPins.filter((p) => p.status !== 'removed');
    if (statusFilter.size) list = list.filter((p) => statusFilter.has(p.status));
    if (sevFilter.size) list = list.filter((p) => sevFilter.has(p.severity));
    if (authorFilter !== 'all') list = list.filter((p) => p.username === authorFilter);
    if (roleFilter === 'admin') list = list.filter((p) => p.author_is_admin);
    if (roleFilter === 'beta') list = list.filter((p) => p.author_is_beta && !p.author_is_admin);
    if (timeFilter !== 'all') {
      const cut = Date.now() - TIME_WINDOWS[timeFilter];
      list = list.filter((p) => new Date(p.created_at).getTime() >= cut);
    }
    const q = pinSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => [p.note, p.username, p.page_path, p.element_label]
        .some((v) => String(v || '').toLowerCase().includes(q)));
    }
    const sevRank = (s) => { const i = SEVERITIES.findIndex((x) => x.key === s); return i < 0 ? 99 : i; };
    const t = (p) => new Date(p.created_at).getTime();
    return [...list].sort((a, b) => {
      if (sortMode === 'old') return t(a) - t(b);
      if (sortMode === 'priority') return sevRank(a.severity) - sevRank(b.severity) || t(b) - t(a);
      if (sortMode === 'page') return String(a.page_path).localeCompare(String(b.page_path)) || t(b) - t(a);
      return t(b) - t(a);
    });
  }, [allPins, pinSearch, timeFilter, authorFilter, roleFilter, sevFilter, statusFilter, sortMode]);

  const toggleSet = (set, setter, key) => setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

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
    setDraftSev('minor'); setDraftNote(''); setDraftIcon('pin'); setDraftKind('bug');
    setError(''); setHoverRect(null); setHoverLabel('');
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
        icon: draftIcon, kind: draftKind,
        selector: draft.selector, offX: draft.offX, offY: draft.offY,
        elementLabel: draft.elementLabel,
        viewport: `${window.innerWidth}x${window.innerHeight}`
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
    } catch (e) { apiErr(e, 'Status update failed'); }
  };

  const setPrivate = async (pin, isPrivate) => {
    try {
      await api.patch(`/beta/pins/${pin.id}`, { isPrivate });
      setCtx(null); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch (e) { apiErr(e, 'Privacy update failed'); }
  };

  const startEdit = (pin) => {
    setEditNote(pin.note); setEditSev(pin.severity);
    setEditIcon(pin.icon || 'pin'); setEditKind(pin.kind || 'bug');
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
    } catch (e) { apiErr(e, 'Move failed'); }
    setMoving(null); setHoverRect(null); setHoverLabel('');
    loadPagePins(); loadAdminPins();
  };

  // Ordered bug-list export — downloads the markdown the backend builds
  // (severity first: critical → look, grouped by page, private pins kept).
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
        note: editNote.trim(), severity: editSev, icon: editIcon, kind: editKind
      });
      setEditMode(false); setDetail(null);
      loadPagePins(); loadAdminPins();
    } catch (e) { apiErr(e, 'Edit failed'); }
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
        options: newPoll.options.length >= 2 ? newPoll.options : undefined,
        textColor: newPoll.color || undefined,
        icon: newPoll.icon || undefined
      });
      setNewPoll({ title: '', description: '', options: [], color: '', icon: '' });
      setOptDraft('');
      loadAdminPolls();
    } catch { /* silent */ }
  };

  // Admin poll editing — title/description support FormattedNote marks
  // (**bold**, *italic*) and text_color paints the title.
  const startEditPoll = (p) => {
    setEditPoll({
      id: p.id, title: p.title, description: p.description || '',
      options: Array.isArray(p.options) ? [...p.options] : [],
      color: p.text_color || '', icon: p.icon || ''
    });
    setEditOptDraft('');
  };

  const addEditOption = () => {
    const o = editOptDraft.trim();
    if (!o || editPoll.options.length >= 6 || editPoll.options.includes(o)) return;
    setEditPoll((n) => ({ ...n, options: [...n.options, o] }));
    setEditOptDraft('');
  };

  const savePollEdit = async () => {
    if (!editPoll?.title.trim()) return;
    try {
      await api.patch(`/beta/polls/admin/${editPoll.id}`, {
        title: editPoll.title.trim(),
        description: editPoll.description.trim() || null,
        options: editPoll.options,
        textColor: editPoll.color || null,
        icon: editPoll.icon || null
      });
      setEditPoll(null); setEditOptDraft('');
      loadAdminPolls();
    } catch (e) { apiErr(e, 'Poll update failed'); }
  };

  const setPollStatus = async (id, status) => {
    try {
      await api.post(`/beta/polls/admin/${id}/status`, { status });
      loadAdminPolls();
    } catch { /* silent */ }
  };

  const deletePoll = async (id) => {
    try {
      await api.delete(`/beta/polls/admin/${id}`);
      loadAdminPolls();
    } catch (e) { apiErr(e, 'Delete failed'); }
  };

  // Private ideas board CRUD
  const createIdea = async () => {
    if (!ideaDraft.title.trim()) return;
    try {
      await api.post('/beta/ideas/admin', ideaDraft);
      setIdeaDraft({ title: '', body: '', tag: 'idea', color: '' });
      loadIdeas();
    } catch (e) { apiErr(e, 'Create failed'); }
  };

  const updateIdea = async (id, fields) => {
    try {
      await api.patch(`/beta/ideas/admin/${id}`, fields);
      loadIdeas();
    } catch (e) { apiErr(e, 'Update failed'); }
  };

  const deleteIdea = async (id) => {
    try {
      await api.delete(`/beta/ideas/admin/${id}`);
      loadIdeas();
    } catch (e) { apiErr(e, 'Delete failed'); }
  };

  const saveIdeaEdit = async () => {
    if (!ideaEdit?.title.trim()) return;
    await updateIdea(ideaEdit.id, {
      title: ideaEdit.title.trim(), body: ideaEdit.body,
      tag: ideaEdit.tag, color: ideaEdit.color || null
    });
    setIdeaEdit(null);
  };

  const bulk = async (action) => {
    if (!sel.size) return;
    try {
      if (action === 'remove') {
        await api.post('/beta/pins/admin/bulk-delete', { ids: [...sel] });
      } else {
        await api.post('/beta/pins/admin/bulk', { ids: [...sel], action });
      }
      setSel(new Set()); loadPagePins(); loadAdminPins();
      if (showGhosts || tab === 'history') loadHistory();
    } catch (e) { apiErr(e, 'Bulk action failed'); }
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
          render dimmed. Pins whose spot sits under fixed chrome (toolbars,
          sidebars, panels) are nudged to the nearest free edge by pinLayer
          and get a dashed ring + tether back to the true spot. */}
      {showPins && !dropMode && clusters.map((c) => (
        <React.Fragment key={`c-${c.pins.map((p) => p.id).join('-')}`}>
        {c.mode === 'nudged' && (
          <Connector
            from={{ x: c.x, y: c.y - 10 }}
            to={{ x: c.trueX, y: c.trueY - 6 }}
            color={sevOf(c.pins[0].severity).color}
            zIndex={9989}
            ring={false}
          />
        )}
        <button
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
            {c.pins[0].status === 'hidden' && (
              <EyeOff className="absolute -bottom-1 -left-1 w-3 h-3 text-zinc-400 bg-slate-900 rounded-full" />
            )}
            {c.mode === 'nudged' && (
              <span className="absolute -inset-1 rounded-full border border-dashed border-white/60 animate-pulse pointer-events-none" />
            )}
          </span>
        </button>
        </React.Fragment>
      ))}

      {/* Sort & filter popup — keeps the viewer clean; one funnel button
          opens this card with every grouping control inside. */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-[9995]" onClick={() => setFiltersOpen(null)} />
          <Popup
            x={filtersOpen.x} y={filtersOpen.y} width={272}
            className="bp-popup z-[9996] w-[272px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl"
            sheetClassName="bg-slate-900 border-t border-slate-700 p-3"
          >
            <div onClick={(e) => e.stopPropagation()} className="max-h-[70vh] overflow-y-auto scrollbar-3d">
              {/* Sort */}
              <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sort by</div>
              <div className="flex flex-wrap gap-1 px-3 pb-2">
                {SORT_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setSortMode(m.key)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      sortMode === m.key
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >{m.label}</button>
                ))}
              </div>

              {/* Time */}
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-800">When</div>
              <div className="flex flex-wrap gap-1 px-3 pb-2">
                {[['all', 'Any time'], ['24h', 'Last 24h'], ['7d', 'Last 7d'], ['30d', 'Last 30d']].map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setTimeFilter(k)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      timeFilter === k
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >{lbl}</button>
                ))}
              </div>

              {/* Author + role */}
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-800">Who</div>
              <div className="flex flex-wrap gap-1 px-3 pb-1.5">
                {[['all', 'Everyone'], ['admin', 'Admins'], ['beta', 'Beta testers']].map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setRoleFilter(k)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      roleFilter === k
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >{lbl}</button>
                ))}
              </div>
              <div className="px-3 pb-2">
                <select
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All users</option>
                  {pinAuthors.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-800">Priority</div>
              <div className="flex flex-wrap gap-1 px-3 pb-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => toggleSet(sevFilter, setSevFilter, s.key)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition flex items-center gap-1 ${
                      sevFilter.has(s.key)
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Status */}
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-800">Status</div>
              <div className="flex flex-wrap gap-1 px-3 pb-2">
                {PIN_STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => toggleSet(statusFilter, setStatusFilter, st)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      statusFilter.has(st)
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >{STATUS_META[st]?.label || st}</button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 sticky bottom-0 bg-slate-900">
                <button
                  onClick={clearFilters}
                  disabled={!activeFilterCount}
                  className="text-[11px] px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                >Reset all</button>
                <button
                  onClick={() => setFiltersOpen(null)}
                  className="ml-auto text-[11px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                >Done</button>
              </div>
            </div>
          </Popup>
        </>
      )}

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
        <Connector
          from={{ x: detailPos.x, y: detailPos.y - 14 }}
          to={{ x: detailPos.x + 36 + detailDrag.dx, y: detailPos.y + 28 + detailDrag.dy }}
          color={sevOf(detail.severity).color}
          zIndex={9995}
        />
      )}

      {/* Pinless element inspector — hover highlights, click freezes info.
          Admin debugging tool: reads element positions without dropping a pin. */}
      {inspectMode && isAdmin && (
        <>
          <div
            ref={inspectRef}
            className="fixed inset-0 z-[9997] cursor-crosshair"
            style={{ outline: '3px dashed rgba(56,189,248,0.6)', outlineOffset: -8, background: 'rgba(15,23,42,0.08)' }}
            onMouseMove={(e) => {
              const el = pickAnchor(e.clientX, e.clientY, inspectRef.current);
              setHoverRect(el ? el.getBoundingClientRect() : null);
              setHoverLabel(el ? describeElement(el) : '');
            }}
            onMouseLeave={() => { setHoverRect(null); setHoverLabel(''); }}
            onClick={(e) => {
              const el = pickAnchor(e.clientX, e.clientY, inspectRef.current);
              if (!el) { setInspectData(null); return; }
              const r = el.getBoundingClientRect();
              setInspectData({
                x: e.clientX, y: e.clientY,
                selector: selectorFor(el),
                label: describeElement(el),
                rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
              });
            }}
          />
          {hoverRect && (
            <div className="fixed z-[9996] pointer-events-none rounded" style={{
              left: hoverRect.left, top: hoverRect.top,
              width: hoverRect.width, height: hoverRect.height,
              border: '2px solid rgba(56,189,248,0.9)', background: 'rgba(56,189,248,0.10)',
            }} />
          )}
          {hoverLabel && (
            <div className="fixed z-[9996] pointer-events-none bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 max-w-[420px] truncate"
              style={{ left: Math.max(8, hoverRect?.left ?? 8), top: Math.max(8, (hoverRect?.top ?? 8) - 28) }}
            >{hoverLabel}</div>
          )}
          {inspectData && (
            <Popup x={inspectData.x} y={inspectData.y} width={320}
              className="bp-popup z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
              sheetClassName="bg-slate-900 border-t border-slate-700 p-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-cyan-400" /> Element info
                </span>
                <button onClick={() => setInspectData(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
              </div>
              <div className="text-[11px] text-slate-300 break-words">{inspectData.label}</div>
              {inspectData.selector && (
                <button onClick={() => copyText(inspectData.selector, 'Selector copied')}
                  className="mt-1 flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 w-full min-w-0 text-left"
                ><Copy className="w-3 h-3 shrink-0" /><span className="truncate">{inspectData.selector}</span></button>
              )}
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                <span>size {inspectData.rect.w}×{inspectData.rect.h}px</span>
                <span>at {inspectData.rect.x}, {inspectData.rect.y}px</span>
                <span className="col-span-2">viewport {(inspectData.rect.x / window.innerWidth * 100).toFixed(1)}%, {(inspectData.rect.y / window.innerHeight * 100).toFixed(1)}%</span>
              </div>
              <div className="flex gap-1.5 mt-2.5">
                <button onClick={() => copyText(JSON.stringify({ selector: inspectData.selector, rect: inspectData.rect }, null, 2), 'JSON copied')}
                  className="text-[11px] px-2 py-1 rounded bg-slate-700/70 text-slate-200 hover:bg-slate-600">Copy JSON</button>
                <button onClick={() => { setInspectMode(false); setInspectData(null); setHoverRect(null); setHoverLabel(''); }}
                  className="text-[11px] px-2 py-1 rounded bg-cyan-700/60 text-cyan-100 hover:bg-cyan-600">Exit inspector</button>
              </div>
            </Popup>
          )}
        </>
      )}

      {/* Ghost markers — where deleted pins used to be (admin toggle) */}
      {showGhosts && isAdmin && ghostList
        .filter((g) => g.snapshot?.page_path === page)
        .map((g) => {
          const pos = resolvePin(g.snapshot);
          return (
            <button
              key={`g-${g.id}`}
              className="bp-marker fixed z-[9989] -translate-x-1/2 -translate-y-full opacity-40 hover:opacity-90 transition"
              style={{ left: pos.x, top: pos.y }}
              title={`Deleted pin — ${String(g.snapshot.note || '').slice(0, 60)}`}
              onClick={(e) => { e.stopPropagation(); setGhostDetail(g); }}
            >
              <Ghost className="w-6 h-6 text-slate-400" />
            </button>
          );
        })}

      {/* Ghost detail — read the deleted pin, restore it if it was a mistake */}
      {ghostDetail && (
        <Popup x={resolvePin(ghostDetail.snapshot).x + 16} y={resolvePin(ghostDetail.snapshot).y + 8} width={288}
          className="bp-popup z-[9999] w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Ghost className="w-4 h-4 text-slate-400" /> Deleted pin
            </span>
            <button onClick={() => setGhostDetail(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">{ghostDetail.snapshot.note}</p>
          <div className="text-[11px] text-slate-500 mt-2">
            {ghostDetail.snapshot.username || 'unknown'} · deleted by {ghostDetail.actor_name || 'admin'} · {relTime(ghostDetail.created_at)}
          </div>
          <button onClick={() => restorePin(ghostDetail)}
            className="mt-2.5 text-xs px-2.5 py-1.5 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50 flex items-center gap-1"
          ><RotateCcw className="w-3 h-3" /> Restore pin</button>
        </Popup>
      )}

      {/* Pin detail card — anchored next to the pin's live position */}
      {detail && !ctx && (
        <Popup
          x={resolvePin(detail).x + 16}
          y={resolvePin(detail).y + 8}
          width={320}
          style={{ transform: `translate(${detailDrag.dx}px, ${detailDrag.dy}px)` }}
          className="bp-popup z-[9999] w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3"
          sheetClassName="bg-slate-900 border-t border-slate-700 p-4"
        >
          <div
            className="flex items-start justify-between gap-2 cursor-move touch-none select-none"
            onPointerDown={startDetailDrag}
            title="Drag to move"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sevOf(detail.severity).color }} />
              <span className="text-sm font-semibold text-slate-100 truncate">{sevOf(detail.severity).label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${KIND_META[detail.kind]?.cls || 'bg-slate-700 text-slate-300'}`}>
                {KIND_META[detail.kind]?.label || 'Bug'}
              </span>
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
                {PIN_KINDS.map((k) => (
                  <button
                    key={k.key}
                    onClick={() => setEditKind(k.key)}
                    title={k.key === 'bug' ? 'Included in export' : 'Exempt from export'}
                    className={`flex-1 text-[10px] py-1 rounded border ${editKind === k.key ? 'border-white/60 text-white bg-slate-700/60' : 'border-slate-700 text-slate-400'}`}
                  >{k.label}</button>
                ))}
              </div>
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
                  <button onClick={() => deletePin(detail)} title="Actually deletes the pin — recoverable in History" className="text-xs px-2 py-1 rounded bg-red-600/30 text-red-200 hover:bg-red-600/50 flex items-center gap-1">
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
              <button className="ctx-item text-red-300 hover:bg-red-500/10" onClick={() => deletePin(ctx.pin)}>
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
            {PIN_KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setDraftKind(k.key)}
                title={k.key === 'bug' ? 'Included in export' : 'Exempt from export'}
                className={`flex-1 text-[11px] py-1.5 rounded-lg border transition ${draftKind === k.key ? 'border-white/60 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                style={draftKind === k.key ? { background: (KIND_META[k.key]?.cls || '').includes('amber') ? '#f59e0b33' : k.key === 'idea' ? '#8b5cf633' : '#ef444433' } : {}}
              >
                {k.label}
              </button>
            ))}
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
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 shrink-0">Beta Viewer</span>
            <ScrollStrip
              className="flex-1 min-w-0"
              innerClassName="gap-1 pr-1"
              activeIndex={[['votes'], ['messages']].findIndex(([t]) => t === testerTab)}
            >
              {[['votes', 'Polls'], ['messages', 'Messages']].map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setTesterTab(t)}
                  className={`text-sm px-3 py-1.5 rounded-lg ${testerTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </ScrollStrip>
            <button onClick={() => setPollsOpen(false)} className="text-slate-500 hover:text-slate-300 shrink-0"><X className="w-5 h-5" /></button>
          </div>

          {testerTab === 'votes' && (
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {polls.map((p) => {
                const hasOptions = Array.isArray(p.options) && p.options.length >= 2;
                const pct = p.total_votes ? Math.round((p.yes_votes / p.total_votes) * 100) : 0;
                const PollIc = p.icon ? pinIconOf(p.icon) : null;
                return (
                  <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-100" style={{ color: p.text_color || undefined }}>
                          {PollIc && <PollIc className="w-4 h-4 inline-block mr-1.5" style={{ color: p.text_color || undefined }} />}
                          <FormattedNote text={p.title} />
                        </div>
                        {p.description && <div className="text-xs text-slate-400 mt-0.5 max-h-16 overflow-y-auto scrollbar-3d pr-1"><FormattedNote text={p.description} /></div>}
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
      {!dropMode && !moving && !stackHidden && (
        <div
          ref={stackRef}
          className={`bp-floating fixed bottom-5 ${floatSide === 'left' ? 'left-4 items-start' : 'right-4 items-end'} z-[45] flex flex-col gap-3 transition-transform duration-300`}
          style={{ transform: `translateX(${-panelShift}px)` }}
        >
          {!isAdmin && (
            <div className="flex flex-col w-12 items-center gap-1">
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
            <div className="flex flex-col w-12 items-center gap-1">
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
          <div className="flex flex-col w-12 items-center gap-1">
            <button
              onClick={() => setShowPins((v) => !v)}
              className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition ${showPins ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
              title={showPins ? 'Hide pins' : 'Show pins'}
            >
              {showPins ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <FabLabel>{showPins ? 'Hide' : 'Show'}</FabLabel>
          </div>
          <div className="flex flex-col w-12 items-center gap-1">
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

      {/* Restore tab — visible when the beta controls stack is hidden */}
      {canUse && stackHidden && !dropMode && !moving && (
        <button
          onClick={() => setStackHidden(false)}
          className={`fixed ${floatSide === 'left' ? 'left-0 rounded-r-lg border-l-0' : 'right-0 rounded-l-lg border-r-0'} bottom-16 z-[46] bg-slate-900/90 border border-slate-700 px-1 py-3 text-slate-400 hover:text-slate-200 shadow-xl`}
          title="Show beta controls"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      )}

      {/* Admin sidebar — thin desktop-only tool column on the right edge.
          Hidden on mobile/tablet (lg+): inspect, ghosts, viewer. */}
      {isAdmin && canUse && !dropMode && !moving && (
        <div className={`hidden lg:flex fixed ${floatSide === 'left' ? 'left-0 rounded-r-xl border-l-0' : 'right-0 rounded-l-xl border-r-0'} top-1/3 z-[46] flex-col items-center gap-1 bg-slate-900/90 border border-slate-700 py-2 px-1.5 shadow-xl`}>
          <button
            onClick={() => { setInspectMode((v) => !v); setInspectData(null); }}
            className={`p-2 rounded-lg transition ${inspectMode ? 'bg-cyan-600/30 text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Inspect elements — hover highlights, click for position info (no pin dropped)"
          ><Crosshair className="w-4 h-4" /></button>
          <button
            onClick={() => setShowGhosts((v) => !v)}
            className={`p-2 rounded-lg transition ${showGhosts ? 'bg-violet-600/30 text-violet-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Ghost pins — show where deleted pins were"
          ><Ghost className="w-4 h-4" /></button>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={`p-2 rounded-lg transition ${panelOpen ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Admin Viewer — pins, messages, polls & history"
          ><MessageSquare className="w-4 h-4" /></button>
          <div className="w-6 h-px bg-slate-700 my-0.5" />
          <button
            onClick={() => setStackHidden((v) => !v)}
            className={`p-2 rounded-lg transition ${stackHidden ? 'bg-amber-600/30 text-amber-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title={stackHidden ? 'Show beta controls (viewer / pins / pin button)' : 'Hide beta controls — apps buttons drop into place'}
          >{stackHidden ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}</button>
        </div>
      )}

      {/* Admin beta viewer panel */}
      {isAdmin && panelOpen && (
        <div className="fixed top-0 right-0 bottom-0 z-[9988] w-96 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mr-1">Admin Viewer</span>
              {['pins', 'messages', 'polls', 'ideas', 'history'].map((t) => (
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
              {/* Search + filter row — compact so the viewer stays clean;
                  sorting & filters live in the funnel popup */}
              <div className="sticky top-0 bg-slate-900 px-3 pt-2 pb-1.5 border-b border-slate-800 z-10">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    <input
                      value={pinSearch}
                      onChange={(e) => setPinSearch(e.target.value)}
                      placeholder="Search pins — note, user, page, element…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    {pinSearch && (
                      <button
                        onClick={() => setPinSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        title="Clear search"
                      ><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      setFiltersOpen(filtersOpen ? null : { x: r.right, y: r.bottom + 4 });
                    }}
                    className={`relative p-1.5 rounded-lg border transition shrink-0 ${
                      filtersOpen || activeFilterCount
                        ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Sort & filter pins"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={exportPins}
                    title="Download the ordered bug list (.md) — critical first, grouped by page"
                    className="text-[11px] px-2 py-1.5 rounded-lg bg-blue-700/60 text-blue-100 hover:bg-blue-600 flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                </div>
                {/* Result count + bulk actions */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[11px] text-slate-500 mr-auto">
                    {filteredPins.length} of {allPins.filter((p) => p.status !== 'removed').length}
                    {sel.size > 0 && <span className="text-blue-300"> · {sel.size} selected</span>}
                  </span>
                  {['fixed', 'in_progress', 'open', 'hide', 'remove'].map((a) => (
                    <button
                      key={a}
                      onClick={() => bulk(a)}
                      disabled={!sel.size}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 capitalize"
                    >
                      {a === 'in_progress' ? 'working' : a}
                    </button>
                  ))}
                </div>
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

              {/* Pin list — filtered + sorted */}
              {filteredPins.map((p) => (
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

          {tab === 'ideas' && (
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              {/* Private admin ideas board — only visible to admins */}
              <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/30">
                <input
                  value={ideaDraft.title}
                  onChange={(e) => setIdeaDraft((n) => ({ ...n, title: e.target.value }))}
                  placeholder="Private idea / task / note…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  value={ideaDraft.body}
                  onChange={(e) => setIdeaDraft((n) => ({ ...n, body: e.target.value }))}
                  placeholder="Details — **bold** *italic* supported"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 mt-1.5 resize-y scrollbar-3d focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <select
                    value={ideaDraft.tag}
                    onChange={(e) => setIdeaDraft((n) => ({ ...n, tag: e.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-slate-300"
                  >
                    {IDEA_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="color"
                    value={ideaDraft.color || '#f1f5f9'}
                    onChange={(e) => setIdeaDraft((n) => ({ ...n, color: e.target.value }))}
                    className="w-6 h-6 rounded bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                    title="Title color"
                  />
                  <button
                    onClick={createIdea}
                    disabled={!ideaDraft.title.trim()}
                    className="ml-auto text-[11px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
                  >Add</button>
                </div>
              </div>
              {ideas.map((i) => (
                <div key={i.id} className={`px-3 py-2 border-b border-slate-800/60 ${i.status === 'archived' ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {i.is_pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize shrink-0">{i.tag}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${STATUS_META[i.status]?.cls || 'bg-slate-800 text-slate-300'}`}>{i.status.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-600 ml-auto shrink-0">{relTime(i.created_at)}</span>
                  </div>
                  {ideaEdit?.id === i.id ? (
                    <div className="mt-1.5 space-y-1.5">
                      <input
                        value={ideaEdit.title}
                        onChange={(e) => setIdeaEdit((n) => ({ ...n, title: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        value={ideaEdit.body || ''}
                        onChange={(e) => setIdeaEdit((n) => ({ ...n, body: e.target.value }))}
                        rows={3}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 resize-y scrollbar-3d focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-1.5">
                        <select
                          value={ideaEdit.tag}
                          onChange={(e) => setIdeaEdit((n) => ({ ...n, tag: e.target.value }))}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-slate-300"
                        >
                          {IDEA_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                          type="color"
                          value={ideaEdit.color || '#f1f5f9'}
                          onChange={(e) => setIdeaEdit((n) => ({ ...n, color: e.target.value }))}
                          className="w-6 h-6 rounded bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                        />
                        <button onClick={saveIdeaEdit} disabled={!ideaEdit.title.trim()} className="ml-auto text-[11px] px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40">Save</button>
                        <button onClick={() => setIdeaEdit(null)} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`text-sm font-medium mt-0.5 ${i.status === 'done' ? 'line-through text-slate-500' : 'text-slate-100'}`} style={{ color: i.status === 'done' ? undefined : (i.color || undefined) }}>
                        {i.title}
                      </div>
                      {i.body && <div className="text-xs text-slate-400 mt-0.5 max-h-20 overflow-y-auto scrollbar-3d"><FormattedNote text={i.body} /></div>}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        <button onClick={() => updateIdea(i.id, { is_pinned: !i.is_pinned })} title={i.is_pinned ? 'Unpin' : 'Pin to top'}
                          className={`text-[11px] px-1.5 py-1 rounded ${i.is_pinned ? 'bg-amber-600/30 text-amber-300' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                          <Pin className="w-3 h-3" />
                        </button>
                        {IDEA_STATUSES.filter((s) => s !== i.status).map((s) => (
                          <button key={s} onClick={() => updateIdea(i.id, { status: s })}
                            className="text-[10px] px-1.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 capitalize">
                            {s === 'done' ? <Check className="w-3 h-3 inline" /> : s === 'archived' ? <Archive className="w-3 h-3 inline" /> : s.replace('_', ' ')}
                          </button>
                        ))}
                        <button onClick={() => setIdeaEdit({ id: i.id, title: i.title, body: i.body || '', tag: i.tag, color: i.color || '' })} title="Edit"
                          className="text-[11px] px-1.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteIdea(i.id)} title="Delete"
                          className="text-[11px] px-1.5 py-1 rounded bg-slate-800 text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!ideas.length && <p className="text-sm text-slate-500 text-center py-8">No ideas yet — keep private dev notes here.</p>}
            </div>
          )}

          {tab === 'history' && (
            <div className="flex-1 overflow-y-auto scrollbar-3d">
              <div className="px-3 py-2 border-b border-slate-800 text-[11px] text-slate-500">
                Deleted/restored pins — restore brings one back as open; the
                ghost toggle shows where deleted pins used to be.
              </div>
              {historyItems.map((h) => {
                const s = h.snapshot || {};
                const superseded = h.event === 'deleted' && historyItems.some(
                  (r) => r.event === 'restored' && r.pin_id === h.pin_id
                );
                return (
                  <div key={h.id} className="px-3 py-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sevOf(s.severity).color }} />
                      <span className={`text-[10px] px-1.5 rounded-full ${h.event === 'deleted' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{h.event}</span>
                      <span className="text-[10px] text-slate-500 truncate">{s.page_path}</span>
                      <span className="text-[10px] text-slate-600 ml-auto shrink-0">{relTime(h.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{s.note}</p>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {s.username || 'unknown'} → {h.actor_name || 'admin'}{superseded ? ' · already restored' : ''}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {h.event === 'deleted' && !superseded && (
                        <button onClick={() => restorePin(h)}
                          className="text-[11px] px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50 flex items-center gap-1"
                        ><RotateCcw className="w-3 h-3" /> Restore</button>
                      )}
                      {s.page_path && s.page_path !== page && (
                        <button onClick={() => { setPanelOpen(false); navigate(s.page_path); }}
                          className="text-[11px] px-2 py-1 rounded bg-slate-700/60 text-slate-200 hover:bg-slate-600 flex items-center gap-1"
                        ><ExternalLink className="w-3 h-3" /> Go to page</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!historyItems.length && (
                <p className="text-sm text-slate-500 text-center py-8">No pin history yet — deleted pins show up here.</p>
              )}
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
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={newPoll.color || '#f1f5f9'}
                    onChange={(e) => setNewPoll((n) => ({ ...n, color: e.target.value }))}
                    className="w-6 h-6 rounded bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                    title="Poll title text color"
                  />
                  <span className="text-[10px] text-slate-500">title color · **bold** *italic* supported</span>
                </div>
                {/* Poll icon picker — same lucide set as pins */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 mr-1">icon:</span>
                  {PIN_ICONS.map((ic) => {
                    const Ic = ic.Icon;
                    return (
                      <button key={ic.key} title={ic.label}
                        onClick={() => setNewPoll((n) => ({ ...n, icon: n.icon === ic.key ? '' : ic.key }))}
                        className={`p-1 rounded ${newPoll.icon === ic.key ? 'bg-blue-600/40 text-blue-200' : 'text-slate-500 hover:text-slate-300'}`}
                      ><Ic className="w-3.5 h-3.5" /></button>
                    );
                  })}
                </div>
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
                const PollIc = p.icon ? pinIconOf(p.icon) : null;
                const notes = pollNotes.filter((n) => n.poll_id === p.id);
                return (
                  <div key={p.id} className="px-3 py-2.5 border-b border-slate-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-100" style={{ color: p.text_color || undefined }}>
                          {PollIc && <PollIc className="w-4 h-4 inline-block mr-1.5" style={{ color: p.text_color || undefined }} />}
                          <FormattedNote text={p.title} />
                        </div>
                        {p.description && <div className="text-xs text-slate-400 mt-0.5 max-h-16 overflow-y-auto scrollbar-3d pr-1"><FormattedNote text={p.description} /></div>}
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
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {!['shipped', 'dropped'].includes(p.status) && <>
                        <button onClick={() => setPollStatus(p.id, 'thinking')} className="text-[11px] px-2 py-1 rounded bg-amber-600/30 text-amber-200 hover:bg-amber-600/50">Thinking</button>
                        <button onClick={() => setPollStatus(p.id, 'in_progress')} className="text-[11px] px-2 py-1 rounded bg-blue-600/30 text-blue-200 hover:bg-blue-600/50">In progress</button>
                        <button onClick={() => setPollStatus(p.id, 'working')} className="text-[11px] px-2 py-1 rounded bg-violet-600/30 text-violet-200 hover:bg-violet-600/50">Working on it</button>
                        <button onClick={() => setPollStatus(p.id, 'shipped')} className="text-[11px] px-2 py-1 rounded bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50">Shipped</button>
                        <button onClick={() => setPollStatus(p.id, 'dropped')} className="text-[11px] px-2 py-1 rounded bg-red-600/30 text-red-300 hover:bg-red-600/50">Drop</button>
                      </>}
                      {['shipped', 'dropped'].includes(p.status) && (
                        <button onClick={() => setPollStatus(p.id, 'open')} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Reopen</button>
                      )}
                      {editPoll?.id === p.id ? (
                        <button onClick={() => setEditPoll(null)} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 ml-auto">Cancel</button>
                      ) : (
                        <>
                          <button onClick={() => deletePoll(p.id)} title="Delete poll + votes"
                            className="text-[11px] px-1.5 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/40 ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => startEditPoll(p)} className="text-[11px] px-2 py-1 rounded bg-slate-700/60 text-slate-200 hover:bg-slate-600 flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        </>
                      )}
                    </div>
                    {/* Inline poll editor — title/description formatting, color, options */}
                    {editPoll?.id === p.id && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
                        <input
                          value={editPoll.title}
                          onChange={(e) => setEditPoll((n) => ({ ...n, title: e.target.value }))}
                          placeholder="Poll title"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <textarea
                          value={editPoll.description}
                          onChange={(e) => setEditPoll((n) => ({ ...n, description: e.target.value }))}
                          placeholder="Description"
                          rows={2}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 resize-y scrollbar-3d focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editPoll.color || '#f1f5f9'}
                            onChange={(e) => setEditPoll((n) => ({ ...n, color: e.target.value }))}
                            className="w-6 h-6 rounded bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                            title="Title text color"
                          />
                          <span className="text-[10px] text-slate-500">title color · **bold** *italic*</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-500 mr-1">icon:</span>
                          {PIN_ICONS.map((ic) => {
                            const Ic = ic.Icon;
                            return (
                              <button key={ic.key} title={ic.label}
                                onClick={() => setEditPoll((n) => ({ ...n, icon: n.icon === ic.key ? '' : ic.key }))}
                                className={`p-1 rounded ${editPoll.icon === ic.key ? 'bg-blue-600/40 text-blue-200' : 'text-slate-500 hover:text-slate-300'}`}
                              ><Ic className="w-3.5 h-3.5" /></button>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            value={editOptDraft}
                            onChange={(e) => setEditOptDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addEditOption()}
                            placeholder="Add choice… (empty list = yes/no poll)"
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={addEditOption}
                            disabled={!editOptDraft.trim() || editPoll.options.length >= 6}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40"
                          ><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        {editPoll.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {editPoll.options.map((o, i) => (
                              <span key={i} className="text-[11px] bg-slate-800 text-slate-300 rounded-full px-2 py-0.5 flex items-center gap-1">
                                {o}
                                <button onClick={() => setEditPoll((n) => ({ ...n, options: n.options.filter((_, x) => x !== i) }))} className="text-slate-500 hover:text-red-400">×</button>
                              </span>
                            ))}
                            {editPoll.options.length === 1 && <span className="text-[10px] text-amber-400">need 2+ for multi-choice</span>}
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <button onClick={savePollEdit} disabled={!editPoll.title.trim() || editPoll.options.length === 1} className="flex-1 text-[11px] px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40">Save</button>
                          <button onClick={() => setEditPoll(null)} className="flex-1 text-[11px] px-2 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Cancel</button>
                        </div>
                      </div>
                    )}
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
