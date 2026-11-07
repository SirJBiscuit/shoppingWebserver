import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls, Reorder, MotionConfig } from 'framer-motion';
import {
  StickyNote, X, Minimize2, Maximize2, Plus, Star,
  Undo2, Redo2, Search, Settings, Palette, Download, ClipboardCopy,
  Type, CheckSquare, List, ListOrdered, Minus as MinusIcon, Table, Pencil,
  ChevronUp, ChevronDown, Copy, Trash2, ArrowUpNarrowWide, Eraser, MoreVertical,
  FoldVertical, UnfoldVertical, Bold, Italic, ShoppingCart, FolderDown, RotateCcw,
  GripVertical, ZoomIn, ZoomOut, FileStack, FilePlus2, FileUp, Scissors, CalendarDays,
  CornerDownLeft, FolderPlus, Folder, FolderOpen, ListChecks, TextCursorInput,
  Clock3, Pin, ChevronRight, SearchX, Smile
} from 'lucide-react';
import AnimatedScrollbar3D from '../3DAnimatedScrollbar';
import MenuPanel from '../MenuPanel';
import ConfirmModal from '../../limbo/modals/ConfirmModal';
import { Slider3D, Toggle3D, Check3D, Typewriter } from './ui';
import { BT, PAGE_COLORS, loadDoc, saveDoc, exportPageText, makeHistory, blockHelpers } from './notepadStore';

const THEMES = {
  dark: {
    name: 'Dark',
    panel: 'bg-gray-800 border-gray-700',
    side: 'bg-gray-900/70 border-gray-700',
    text: 'text-gray-100',
    muted: 'text-gray-400',
    input: 'bg-transparent',
    hover: 'hover:bg-gray-700',
    chip: 'bg-gray-700 text-gray-200',
    accent: 'from-primary-500 to-purple-600',
    scroll: 'rgba(139,92,246,.8)',
  },
  parchment: {
    name: 'Parchment',
    panel: 'bg-amber-50 border-amber-300',
    side: 'bg-amber-100/80 border-amber-200',
    text: 'text-amber-950',
    muted: 'text-amber-700',
    input: 'bg-transparent',
    hover: 'hover:bg-amber-200',
    chip: 'bg-amber-200 text-amber-900',
    accent: 'from-amber-500 to-orange-500',
    scroll: 'rgba(245,158,11,.9)',
  },
  night: {
    name: 'Night Blue',
    panel: 'bg-slate-900 border-slate-700',
    side: 'bg-slate-950/80 border-slate-800',
    text: 'text-slate-100',
    muted: 'text-slate-400',
    input: 'bg-transparent',
    hover: 'hover:bg-slate-800',
    chip: 'bg-slate-800 text-slate-200',
    accent: 'from-sky-500 to-indigo-600',
    scroll: 'rgba(56,189,248,.85)',
  },
};

const SCALE_TEXT = ['text-xs', 'text-sm', 'text-base'];
const DRAW_COLORS = ['#5FBCE8', '#7FE39A', '#FFD76A', '#E35F5F', '#B08FE8', '#FFFFFF'];

/** Slash commands — "/cmd " at the start of a block converts it (Kotlin port). */
const SLASH_CMDS = {
  check: BT.CHECK, todo: BT.CHECK, cb: BT.CHECK, task: BT.CHECK,
  bullet: BT.BULLET, list: BT.BULLET, ul: BT.BULLET,
  number: BT.NUMBER, num: BT.NUMBER, ol: BT.NUMBER,
  text: BT.TEXT, txt: BT.TEXT, plain: BT.TEXT,
  divider: BT.DIVIDER, hr: BT.DIVIDER,
  table: BT.TABLE, draw: BT.DRAW, canvas: BT.DRAW,
};
const TEXTISH = [BT.TEXT, BT.CHECK, BT.BULLET, BT.NUMBER];

/** Slash menu — hit "/" at block start, pick with Enter/Tab/Space. */
const SLASH_MENU = [
  { keys: ['check', 'todo', 'cb', 'task'], type: BT.CHECK, label: 'Checkbox', icon: CheckSquare },
  { keys: ['bullet', 'list', 'ul'], type: BT.BULLET, label: 'Bullet list', icon: List },
  { keys: ['number', 'num', 'ol'], type: BT.NUMBER, label: 'Numbered list', icon: ListOrdered },
  { keys: ['text', 'txt', 'plain'], type: BT.TEXT, label: 'Text', icon: Type },
  { keys: ['divider', 'hr'], type: BT.DIVIDER, label: 'Divider', icon: MinusIcon },
  { keys: ['table'], type: BT.TABLE, label: 'Table', icon: Table },
  { keys: ['draw', 'canvas'], type: BT.DRAW, label: 'Drawing', icon: Pencil },
];

/** Sticky-note palette for floating blocks (b.fc index). */
const STICKY_COLORS = [
  { n: 'amber', edge: '#f59e0b', head: 'rgba(245,158,11,.45)', body: 'rgba(253,230,138,.96)', ink: '#713f12' },
  { n: 'mint',  edge: '#34d399', head: 'rgba(52,211,153,.40)', body: 'rgba(209,250,229,.96)', ink: '#064e3b' },
  { n: 'sky',   edge: '#38bdf8', head: 'rgba(56,189,248,.40)', body: 'rgba(224,242,254,.96)', ink: '#0c4a6e' },
  { n: 'pink',  edge: '#f472b6', head: 'rgba(244,114,182,.40)', body: 'rgba(252,231,243,.96)', ink: '#831843' },
  { n: 'lilac', edge: '#a78bfa', head: 'rgba(167,139,250,.40)', body: 'rgba(237,233,254,.96)', ink: '#4c1d95' },
];

/** Hybrid glyph/icon insert — ":name" trigger or ☺ toolbar picker (emoji glyphs). */
const GLYPHS = [
  ['milk', '🥛'], ['bread', '🍞'], ['egg', '🥚'], ['cheese', '🧀'], ['butter', '🧈'],
  ['apple', '🍎'], ['banana', '🍌'], ['orange', '🍊'], ['grape', '🍇'], ['berry', '🍓'],
  ['tomato', '🍅'], ['lettuce', '🥬'], ['carrot', '🥕'], ['broccoli', '🥦'], ['onion', '🧅'],
  ['garlic', '🧄'], ['potato', '🥔'], ['avocado', '🥑'], ['pepper', '🫑'], ['corn', '🌽'],
  ['mushroom', '🍄'], ['water', '💧'], ['coffee', '☕'], ['juice', '🧃'], ['soda', '🥤'],
  ['beer', '🍺'], ['wine', '🍷'], ['meat', '🥩'], ['chicken', '🍗'], ['fish', '🐟'],
  ['shrimp', '🦐'], ['pizza', '🍕'], ['pasta', '🍝'], ['rice', '🍚'], ['cereal', '🥣'],
  ['snack', '🍿'], ['cookie', '🍪'], ['candy', '🍬'], ['choc', '🍫'], ['honey', '🍯'],
  ['salt', '🧂'], ['soap', '🧼'], ['shampoo', '🧴'], ['paper', '🧻'], ['tooth', '🦷'],
  ['meds', '💊'], ['cart', '🛒'], ['bag', '🛍️'], ['star', '⭐'], ['fire', '🔥'],
  ['check', '✅'], ['cross', '❌'], ['warn', '⚠️'], ['idea', '💡'], ['pin', '📌'],
  ['cal', '📅'], ['clock', '⏰'], ['gift', '🎁'], ['cake', '🎂'], ['heart', '❤️'],
  ['thumbs', '👍'], ['note', '📝'], ['money', '💰'], ['card', '💳'], ['store', '🏪'],
  ['home', '🏠'], ['car', '🚗'], ['phone', '📱'], ['sparkle', '✨'], ['important', '‼️'],
  ['bolt', '⚡'], ['flag', '🚩'], ['book', '📖'], ['key', '🔑'], ['lock', '🔒'],
];

const PAGE_TEMPLATES = [
  {
    name: 'Checklist', emoji: '✅',
    blocks: [
      { type: BT.TEXT, text: '**Checklist**' },
      { type: BT.CHECK, text: 'First task' },
      { type: BT.CHECK, text: 'Second task' },
      { type: BT.CHECK, text: 'Third task' },
    ],
  },
  {
    name: 'Meeting Notes', emoji: '📋',
    blocks: [
      { type: BT.TEXT, text: '**Meeting — ' + new Date().toLocaleDateString() + '**' },
      { type: BT.BULLET, text: 'Attendees' },
      { type: BT.DIVIDER },
      { type: BT.BULLET, text: 'Discussion points' },
      { type: BT.DIVIDER },
      { type: BT.CHECK, text: 'Action items' },
    ],
  },
  {
    name: 'Recipe', emoji: '🍳',
    blocks: [
      { type: BT.TEXT, text: '**Recipe name**' },
      { type: BT.TEXT, text: '*Ingredients*' },
      { type: BT.CHECK, text: 'Ingredient 1' },
      { type: BT.CHECK, text: 'Ingredient 2' },
      { type: BT.TEXT, text: '*Steps*' },
      { type: BT.NUMBER, text: 'Step one' },
      { type: BT.NUMBER, text: 'Step two' },
    ],
  },
  {
    name: 'Meal Plan', emoji: '🍽️',
    blocks: [
      { type: BT.TEXT, text: '**Weekly Meal Plan**' },
      { type: BT.TABLE, cells: [['', 'Lunch', 'Dinner'], ['Mon', '', ''], ['Tue', '', ''], ['Wed', '', '']] },
    ],
  },
  {
    name: 'Shopping Prep', emoji: '🛒',
    blocks: [
      { type: BT.TEXT, text: '**Before you shop** — send items to your list with the 🛒 toolbar button' },
      { type: BT.CHECK, text: 'Milk' },
      { type: BT.CHECK, text: 'Bread' },
      { type: BT.CHECK, text: 'Eggs' },
    ],
  },
];

/* ---------- Drawing canvas ---------- */
const DrawCanvas = ({ strokes, onCommit, height, theme, penSize, setPenSize }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const cur = useRef([]);
  const [penColor, setPenColor] = useState(DRAW_COLORS[0]);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const paint = (s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.w || 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < s.pts.length; i += 2) {
        if (i === 0) ctx.moveTo(s.pts[0], s.pts[1]);
        else ctx.lineTo(s.pts[i], s.pts[i + 1]);
      }
      ctx.stroke();
    };
    (strokes || []).forEach(paint);
    if (cur.current.length >= 4) paint({ pts: cur.current, color: penColor });
  }, [strokes, penColor]);

  useEffect(() => { redraw(); }, [redraw]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / r.width;
    const sy = canvasRef.current.height / r.height;
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
  };

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className={`w-full rounded-lg border ${theme === 'parchment' ? 'border-amber-300 bg-white/60' : 'border-gray-600 dark:border-slate-600 bg-black/20'} cursor-crosshair touch-none`}
        style={{ height }}
        onPointerDown={(e) => {
          e.preventDefault();
          canvasRef.current.setPointerCapture(e.pointerId);
          drawing.current = true;
          cur.current = pos(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          cur.current.push(...pos(e));
          redraw();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          if (cur.current.length >= 4) {
            onCommit({ pts: [...cur.current], color: penColor, w: penSize });
          }
          cur.current = [];
          redraw();
        }}
      />
      <div className="flex items-center gap-1.5 mt-1.5">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setPenColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${penColor === c ? 'scale-110 border-white' : 'border-gray-500'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        {[1.5, 2.5, 4].map((w, wi) => (
          <button
            key={w}
            onClick={() => setPenSize(w)}
            className={`w-5 h-5 rounded flex items-center justify-center ${penSize === w ? 'ring-1 ring-white' : 'opacity-60'}`}
            title={`Pen ${['fine', 'normal', 'thick'][wi]}`}
          >
            <span className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
        <button
          onClick={() => onCommit(null)}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-600/60 hover:bg-gray-500 text-white"
          title="Clear drawing"
        >
          <Eraser className="w-3 h-3" /> Clear
        </button>
      </div>
    </div>
  );
};

/* ---------- Sortable block wrapper (drag-reorder via grip) ---------- */
const SortableBlock = ({ block, children }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={controls}
      className="list-none"
    >
      {children(controls)}
    </Reorder.Item>
  );
};

/* ---------- table block ---------- */
const TableBlock = ({ b, theme, onPatch }) => {
  const cells = b.cells || [['', '']];
  const setCell = (r, c, v) => {
    const nc = cells.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? v : cell)));
    onPatch(nc);
  };
  const cols = Math.max(...cells.map((r) => r.length));
  return (
    <div>
      <div className="grid gap-px rounded-md overflow-hidden border border-gray-500/30" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {cells.map((row, r) =>
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              value={cell}
              onChange={(e) => setCell(r, c, e.target.value)}
              className={`px-2 py-1 text-xs bg-white/5 ${theme.text} outline-none focus:bg-white/10`}
            />
          ))
        )}
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={() => onPatch([...cells, Array(cols).fill('')])} className={`text-[10px] ${theme.muted} hover:underline`}>+ row</button>
        <button onClick={() => onPatch(cells.map((r) => [...r, '']))} className={`text-[10px] ${theme.muted} hover:underline`}>+ col</button>
      </div>
    </div>
  );
};

/** Sortable page row — same drag-grip pattern as blocks (Kotlin sideDrag). */
const SortablePage = ({ page: p, children }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={p}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, zIndex: 30 }}
      className="select-none relative"
    >
      {children(controls)}
    </Reorder.Item>
  );
};

/** Context-menu row — Kotlin CtxItem (icon + optional tint bar + danger). */
const MenuRow = ({ icon: Icon, label, onClick, danger, tint, theme }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 sm:py-1.5 text-xs ${
      danger ? 'text-red-400 hover:bg-red-500/15' : `${theme.text} ${theme.hover}`
    }`}
  >
    {tint && <span className="w-1 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: tint }} />}
    {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
    <span className="truncate">{label}</span>
  </button>
);

const MenuHeader = ({ label, tint }) => (
  <div className="px-3 pt-2 pb-0.5 flex items-center gap-2">
    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tint || '#6E8296' }}>{label}</span>
    <div className="flex-1 h-px bg-gray-500/30" />
  </div>
);

const ToolBtn = ({ children, onClick, title, on, disabled, theme, btnRef }) => (
  <button
    ref={btnRef}
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-2 sm:p-1.5 rounded-md transition-colors disabled:opacity-30 ${
      on ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.muted} ${theme.hover}`
    }`}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-gray-500/30 mx-0.5 flex-shrink-0" />;

const daysUntil = (iso) => {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
};

/* ---------- Main Notepad ---------- */
const Notepad = ({ isOpen, onClose, userId, onSendToList, onOpenRequest }) => {
  const [mode, setMode] = useState('window');           // window | fullscreen | compact
  const [doc, setDoc] = useState(() => loadDoc(userId));
  const [menu, setMenu] = useState(null);               // { kind:'block'|'page'|'empty', id, x, y }
  const [showFind, setShowFind] = useState(false);
  const [findQ, setFindQ] = useState('');
  const [replaceQ, setReplaceQ] = useState('');
  const [findPos, setFindPos] = useState(0);
  const [findAll, setFindAll] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState('');
  const [renamingPage, setRenamingPage] = useState(null);
  const [pos, setPos] = useState({ x: -1, y: 80 });
  const [launcherPos, setLauncherPos] = useState({ x: window.innerWidth - 72, y: window.innerHeight - 200 });
  const [collapsed, setCollapsed] = useState({});
  const [selMode, setSelMode] = useState(false);
  const [selPages, setSelPages] = useState(new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [popup, setPopup] = useState(null);             // 'settings' | 'nav' | 'templates'
  const [typedDone, setTypedDone] = useState(new Set());
  const [dueEditId, setDueEditId] = useState(null);
  const [launcherDragging, setLauncherDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [selBar, setSelBar] = useState(null);          // floating text-selection toolbar {x,y,blockId}
  const [blockSel, setBlockSel] = useState(new Set()); // multi-block selection ids
  const [pageSel, setPageSel] = useState(false);       // whole-page selection
  const [blockSelMode, setBlockSelMode] = useState(false);
  const [wordEraseMode, setWordEraseMode] = useState(false);
  const [sideFilter, setSideFilter] = useState(-1);    // -1 all · 8 starred · 0-7 color
  const [folderEdit, setFolderEdit] = useState(null);  // 'new' | folderId
  const [folderMenuPage, setFolderMenuPage] = useState(null); // page being folder-assigned
  const [palettePos, setPalettePos] = useState(null);
  const [findCase, setFindCase] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [glyphState, setGlyphState] = useState(null); // { id, q, at } — at:-1 = caret insert
  const [slashState, setSlashState] = useState(null); // { id, q, at } — "/" command picker

  const dragControls = useDragControls();
  const historyRef = useRef(makeHistory());
  const saveTimer = useRef(null);
  const blockRefs = useRef({});
  const taRefs = useRef({});
  const toastTimer = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const fileRef = useRef(null);
  const paletteBtnRef = useRef(null);
  const miniRef = useRef(null);
  const pageSelRef = useRef(false);
  const copyPageRef = useRef(() => {});
  const activeTa = useRef(null); // last-focused textarea block id (glyph toolbar target)
  const menuDrag = useDragControls();
  const shellRef = useRef(null); // outer panel shell — wheel scoping

  const page = doc.pages.find((p) => p.id === doc.lastPage) || doc.pages[0];
  const theme = THEMES[doc.settings.theme] || THEMES.dark;
  const settings = doc.settings;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  /* ----- persistence ----- */
  useEffect(() => {
    if (isOpen) {
      setDoc(loadDoc(userId));
      historyRef.current.clear();
      setMenu(null); setShowFind(false); setPopup(null); setShowPalette(false);
      if (pos.x === -1) setPos({ x: Math.max(20, window.innerWidth - 620), y: 80 });
    }
  }, [isOpen, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDoc(userId, doc), 800);
    return () => clearTimeout(saveTimer.current);
  }, [doc, isOpen, userId]);

  const handleClose = useCallback(() => {
    saveDoc(userId, doc);
    onClose();
  }, [doc, userId, onClose]);

  /* ----- history-aware mutation ----- */
  const mutatePage = useCallback((fn, coalesce = false) => {
    setDoc((prev) => {
      const nd = { ...prev, pages: prev.pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => ({ ...b })) })) };
      const pg = nd.pages.find((p) => p.id === nd.lastPage) || nd.pages[0];
      historyRef.current.checkpoint(pg, coalesce);
      fn(pg, nd);
      return nd;
    });
  }, []);

  const undo = useCallback(() => {
    setDoc((prev) => {
      const nd = { ...prev, pages: [...prev.pages] };
      const pg = nd.pages.find((p) => p.id === nd.lastPage) || nd.pages[0];
      const idx = nd.pages.indexOf(pg);
      const restored = historyRef.current.undo(pg);
      if (restored) nd.pages[idx] = { ...pg, ...restored };
      return nd;
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((prev) => {
      const nd = { ...prev, pages: [...prev.pages] };
      const pg = nd.pages.find((p) => p.id === nd.lastPage) || nd.pages[0];
      const idx = nd.pages.indexOf(pg);
      const restored = historyRef.current.redo(pg);
      if (restored) nd.pages[idx] = { ...pg, ...restored };
      return nd;
    });
  }, []);

  /* ----- keyboard ----- */
  useEffect(() => {
    if (!isOpen || mode === 'compact') return;
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveDoc(userId, doc); showToast('Saved'); }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); setShowFind(true); }
      if (mod && e.key.toLowerCase() === 'c' && pageSelRef.current) { e.preventDefault(); copyPageRef.current(); }
      if (e.key === 'Escape') { setMenu(null); setPopup(null); setShowPalette(false); setDueEditId(null); setSelBar(null); setBlockSel(new Set()); setPageSel(false); setWordEraseMode(false); setFolderMenuPage(null); setSlashState(null); setGlyphState(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, mode, doc, userId, undo, redo, showToast]);

  /* ----- wheel hotkeys — window-level CAPTURE listener kills browser page-zoom (Opera/Chrome)
     while open. Only fires when the pointer is over the notepad shell.
       Ctrl/⌘ + wheel   → notepad zoom
       Ctrl + Shift + wheel → block text scale
       Ctrl + Alt + wheel   → UI scale (chrome)                                    */
  useEffect(() => {
    if (!isOpen || mode === 'compact') return;
    const h = (e) => {
      if (!(e.ctrlKey || e.metaKey) || !e.deltaY) return;
      const shell = shellRef.current;
      if (!shell || !(e.target instanceof Node) || !shell.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const step = -e.deltaY * 0.0016; // proportional — smooth trackpads, ~0.12/tick wheels
      setDoc((prev) => {
        const s = { ...prev.settings };
        if (e.altKey) s.uiScale = Math.min(1.3, Math.max(0.85, +((s.uiScale || 1) + step).toFixed(3)));
        else if (e.shiftKey) s.textScale = Math.min(1.6, Math.max(0.8, +((s.textScale || 1) + step).toFixed(3)));
        else s.zoom = Math.min(2, Math.max(0.6, +(s.zoom + step).toFixed(3)));
        return { ...prev, settings: s };
      });
    };
    window.addEventListener('wheel', h, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', h, { capture: true });
  }, [isOpen, mode]);

  /* ----- mobile breakpoint ----- */
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  /* ----- custom selection: floating toolbar on textarea selection -----
   * selectionchange covers mouse drag, shift-click, double/triple-click
   * and mobile long-press handles. The bar anchors above the textarea. */
  useEffect(() => {
    if (!isOpen) return;
    const onSel = () => {
      const el = document.activeElement;
      if (el && el.tagName === 'TEXTAREA' && el.dataset.blockId != null && el.selectionEnd > el.selectionStart) {
        const r = el.getBoundingClientRect();
        setSelBar({
          blockId: +el.dataset.blockId,
          x: Math.min(Math.max(90, r.left + r.width / 2), window.innerWidth - 130),
          y: Math.max(52, r.top - 44),
        });
      } else {
        setSelBar(null);
      }
    };
    document.addEventListener('selectionchange', onSel);
    document.addEventListener('select', onSel, true);
    return () => {
      document.removeEventListener('selectionchange', onSel);
      document.removeEventListener('select', onSel, true);
    };
  }, [isOpen]);

  /* ----- block ops ----- */
  const addBlock = (type) => {
    mutatePage((pg, nd) => pg.blocks.push(blockHelpers.newBlock(nd, type)));
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} block added`);
  };

  /** Kotlin insertBlock — new block right after [afterId] (or appended), same slide-in feel. */
  const insertBlockBelow = (type, afterId) => {
    let nbId = null;
    mutatePage((pg, nd) => {
      const nb = blockHelpers.newBlock(nd, type);
      nbId = nb.id;
      const i = afterId == null ? pg.blocks.length : pg.blocks.findIndex((b) => b.id === afterId) + 1;
      pg.blocks.splice(Math.max(0, Math.min(i, pg.blocks.length)), 0, nb);
    });
    if (TEXTISH.includes(type)) setTimeout(() => taRefs.current[nbId]?.focus(), 40);
  };

  /** Kotlin checkAll — tick/untick the contiguous run of CHECK blocks around [id]. */
  const checkAll = (id, v) => {
    let n = 0;
    mutatePage((pg) => {
      const i = pg.blocks.findIndex((b) => b.id === id);
      if (i < 0) return;
      let lo = i, hi = i;
      while (lo > 0 && pg.blocks[lo - 1].type === BT.CHECK) lo--;
      while (hi < pg.blocks.length - 1 && pg.blocks[hi + 1].type === BT.CHECK) hi++;
      for (let j = lo; j <= hi; j++) if (pg.blocks[j].type === BT.CHECK) { pg.blocks[j].checked = v; n++; }
    });
    showToast(v ? `${n} ticked` : `${n} unticked`);
  };

  const setBlockText = (id, text) =>
    mutatePage((pg) => { const b = pg.blocks.find((x) => x.id === id); if (b) b.text = text; }, true);

  const patchBlock = (id, patch) =>
    mutatePage((pg) => { const b = pg.blocks.find((x) => x.id === id); if (b) Object.assign(b, patch); });

  const glyphMatches = () => {
    if (!glyphState) return [];
    if (!glyphState.q) return GLYPHS.slice(0, 24);
    return GLYPHS.filter((g) => g[0].includes(glyphState.q)).slice(0, 12);
  };

  /** Glyph insert — swaps the ":query" token or splices at the caret. */
  const insertGlyph = (emoji) => {
    const st = glyphState;
    if (!st) return;
    const b = page.blocks.find((x) => x.id === st.id);
    if (!b) { setGlyphState(null); return; }
    if (st.at >= 0) {
      const head = b.text.slice(0, st.at).replace(/:([a-z0-9_+]{1,14})$/i, emoji);
      const tail = b.text.slice(st.at);
      mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === st.id); x.text = head + tail; });
      setTimeout(() => { const el = taRefs.current[st.id]; if (el) { el.focus(); el.selectionStart = el.selectionEnd = head.length; } }, 0);
    } else {
      const el = taRefs.current[st.id];
      const c = el ? el.selectionStart : b.text.length;
      const nt = b.text.slice(0, c) + emoji + b.text.slice(c);
      mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === st.id); x.text = nt; });
      setTimeout(() => { const e2 = taRefs.current[st.id]; if (e2) { e2.focus(); e2.selectionStart = e2.selectionEnd = c + emoji.length; } }, 0);
    }
    setGlyphState(null);
  };

  const slashMatches = () => {
    if (!slashState) return [];
    const q = slashState.q;
    return SLASH_MENU.filter((it) => !q || it.keys.some((k) => k.startsWith(q)) || it.label.toLowerCase().startsWith(q));
  };

  /** Apply the picked slash command — clears the "/query" text and converts the block. */
  const slashPick = (type) => {
    const st = slashState;
    setSlashState(null);
    if (!st) return;
    mutatePage((pg) => {
      const x = pg.blocks.find((y) => y.id === st.id);
      if (!x) return;
      x.text = ''; x.type = type;
      if (type === BT.TABLE) x.cells = [['', ''], ['', '']];
      if (type === BT.DRAW) { x.strokes = []; x.drawH = 120; }
      if (type !== BT.CHECK) x.checked = false;
    });
    setTimeout(() => taRefs.current[st.id]?.focus(), 30);
  };

  /** Kotlin slashCmd — "/" at block start opens the picker; "/cmd " instant-converts. */
  const handleTaChange = (b, e) => {
    const v = e.target.value;
    const caret = e.target.selectionStart;
    // bounce-on-type — text pops upward briefly with each keystroke
    if (settings.typeBounce !== false && settings.uiAnim !== false) {
      e.target._bounce?.cancel();
      e.target._bounce = e.target.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }],
        { duration: 150, easing: 'cubic-bezier(.25,1.4,.4,1)' }
      );
    }
    // slash menu — "/query" at the very start of a text-ish block
    const sm = v.slice(0, caret).match(/^\/([a-z]*)$/i);
    if (sm && TEXTISH.includes(b.type)) setSlashState({ id: b.id, q: sm[1].toLowerCase(), at: caret });
    else if (slashState?.id === b.id) setSlashState(null);
    // glyph trigger — ":query" immediately before the caret opens the picker
    const gm = v.slice(0, caret).match(/:([a-z0-9_+]{1,14})$/i);
    if (gm && TEXTISH.includes(b.type)) setGlyphState({ id: b.id, q: gm[1].toLowerCase(), at: caret });
    else if (glyphState?.id === b.id) setGlyphState(null);
    const m = v.match(/^\/([a-z]+) $/);
    if (m && SLASH_CMDS[m[1]] && TEXTISH.includes(b.type)) {
      const t = SLASH_CMDS[m[1]];
      mutatePage((pg) => {
        const x = pg.blocks.find((y) => y.id === b.id);
        if (!x) return;
        x.text = ''; x.type = t;
        if (t === BT.TABLE) x.cells = [['', ''], ['', '']];
        if (t === BT.DRAW) { x.strokes = []; x.drawH = 120; }
        if (t !== BT.CHECK) x.checked = false;
      });
      showToast(`/${m[1]} → ${t}`);
      setSlashState(null);
      return;
    }
    setBlockText(b.id, v);
  };

  /** Kotlin keyPressed for text blocks — Enter splits/demotes, Backspace merges. */
  const handleTaKeyDown = (b, e) => {
    // slash picker steals Enter/Tab/Space/Escape while open
    if (slashState) {
      const list = slashMatches();
      if (e.key === 'Escape') { setSlashState(null); e.preventDefault(); return; }
      if ((e.key === 'Enter' || e.key === 'Tab' || (e.key === ' ' && list.length === 1)) && list.length) {
        e.preventDefault();
        slashPick(list[0].type);
        return;
      }
    }
    // glyph picker steals Enter/Tab/Escape while open
    if (glyphState) {
      const list = glyphMatches();
      if ((e.key === 'Enter' || e.key === 'Tab') && list.length) {
        e.preventDefault();
        insertGlyph(list[0][1]);
        return;
      }
      if (e.key === 'Escape') { setGlyphState(null); e.preventDefault(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if ((e.ctrlKey || e.metaKey) && b.type === BT.CHECK) {
        e.preventDefault();
        mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === b.id); if (x) x.checked = !x.checked; });
        return;
      }
      e.preventDefault();
      if ([BT.CHECK, BT.BULLET, BT.NUMBER].includes(b.type) && !b.text.trim()) {
        // empty list row demotes to plain text — the "leave the list" gesture
        mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === b.id); if (x) x.type = BT.TEXT; });
        return;
      }
      const s = e.target.selectionStart ?? b.text.length;
      let nbId = null;
      mutatePage((pg, nd) => {
        const i = pg.blocks.findIndex((y) => y.id === b.id);
        if (i < 0) return;
        const x = pg.blocks[i];
        const tail = x.text.slice(s);
        x.text = x.text.slice(0, s);
        const nb = blockHelpers.newBlock(nd, x.type);
        nbId = nb.id;
        nb.text = tail;
        pg.blocks.splice(i + 1, 0, nb);
      });
      if (nbId) setTimeout(() => taRefs.current[nbId]?.focus(), 30);
      return;
    }
    if (e.key === 'Backspace' && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      const i = page.blocks.findIndex((y) => y.id === b.id);
      if (i > 0) {
        e.preventDefault();
        let focusId = null, focusAt = 0;
        mutatePage((pg) => {
          const bi = pg.blocks.findIndex((y) => y.id === b.id);
          if (bi <= 0) return;
          const cur = pg.blocks[bi];
          const prev = pg.blocks[bi - 1];
          if (TEXTISH.includes(prev.type)) {
            focusId = prev.id;
            focusAt = prev.text.length;
            prev.text += cur.text;
          }
          pg.blocks.splice(bi, 1);
        });
        if (focusId) setTimeout(() => {
          const el = taRefs.current[focusId];
          el?.focus();
          if (el) el.selectionStart = el.selectionEnd = focusAt;
        }, 30);
      }
      return;
    }
    // Ctrl+A — first press selects the block (native); a second press selects the page
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      if (e.target.selectionStart === 0 && e.target.selectionEnd === e.target.value.length && e.target.value.length > 0) {
        e.preventDefault();
        setPageSel(true);
        setBlockSel(new Set(inlineBlocks.map((x) => x.id)));
        showToast('Page selected — Ctrl+C copies all');
      }
    }
  };

  /** Word-erase mode click — poof the word at the caret (Kotlin eraseWordAt). */
  const handleTaClick = (b, e) => {
    if (blockSelMode) { toggleBlockSel(b.id); return; }
    if (!wordEraseMode) {
      // triple-click selects the whole block (Kotlin click streak)
      if (e.detail >= 3) { e.target.selectionStart = 0; e.target.selectionEnd = e.target.value.length; }
      return;
    }
    const idx = e.target.selectionStart ?? 0;
    const w = wordAt(b.text, idx);
    if (!w) { showToast('No word at caret'); return; }
    mutatePage((pg) => {
      const x = pg.blocks.find((y) => y.id === b.id);
      if (!x) return;
      let ds = w[0], de = w[1];
      if (de < x.text.length && x.text[de] === ' ') de++;
      else if (ds > 0 && x.text[ds - 1] === ' ') ds--;
      x.text = x.text.slice(0, ds) + x.text.slice(de);
    });
    showToast('Word erased');
  };

  /** Floating selection-toolbar actions — operates on the live textarea selection. */
  const selDo = (act) => {
    if (!selBar) return;
    const el = taRefs.current[selBar.blockId];
    if (!el) { setSelBar(null); return; }
    const s = el.selectionStart, en = el.selectionEnd, v = el.value;
    const id = selBar.blockId;
    switch (act) {
      case 'copy': navigator.clipboard?.writeText(v.slice(s, en)); showToast('Copied'); break;
      case 'cut': navigator.clipboard?.writeText(v.slice(s, en)); setBlockText(id, v.slice(0, s) + v.slice(en)); showToast('Cut'); break;
      case 'del': setBlockText(id, v.slice(0, s) + v.slice(en)); break;
      case 'bold': setBlockText(id, v.slice(0, s) + '**' + v.slice(s, en) + '**' + v.slice(en)); break;
      case 'italic': setBlockText(id, v.slice(0, s) + '*' + v.slice(s, en) + '*' + v.slice(en)); break;
      case 'block': el.selectionStart = 0; el.selectionEnd = v.length; el.focus(); return;
      default: break;
    }
    setSelBar(null);
  };

  /* ----- multi-block selection (Kotlin pageSel analog) ----- */
  const toggleBlockSel = (id) => {
    setBlockSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      if (!s.size) setPageSel(false);
      return s;
    });
  };
  const lastBlockClick = useRef(null);
  const handleBlockRowClick = (b, e) => {
    // clicks inside the textarea are normal editing; row-level clicks manage block selection
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'CANVAS' || e.target.closest('button')) return;
    if (blockSelMode || e.ctrlKey || e.metaKey) { toggleBlockSel(b.id); lastBlockClick.current = b.id; return; }
    if (e.shiftKey && lastBlockClick.current != null) {
      const ids = inlineBlocks.map((x) => x.id);
      const a = ids.indexOf(lastBlockClick.current), z = ids.indexOf(b.id);
      if (a >= 0 && z >= 0) {
        const lo = Math.min(a, z), hi = Math.max(a, z);
        setBlockSel(new Set(ids.slice(lo, hi + 1)));
      }
    }
    lastBlockClick.current = b.id;
  };
  const selText = () => page.blocks
    .filter((b) => blockSel.has(b.id))
    .map((b) => {
      switch (b.type) {
        case BT.CHECK: return `[${b.checked ? 'x' : ' '}] ${b.text}`;
        case BT.BULLET: return `• ${b.text}`;
        case BT.NUMBER: return `# ${b.text}`;
        case BT.DIVIDER: return '──────────';
        case BT.TABLE: return (b.cells || []).map((r) => r.join(' | ')).join('\n');
        case BT.DRAW: return '[drawing]';
        default: return b.text;
      }
    }).join('\n');
  const blockSelOps = (act) => {
    if (!blockSel.size) return;
    switch (act) {
      case 'copy':
        navigator.clipboard?.writeText(pageSel ? `${page.name}\n\n${exportPageText(page)}` : selText());
        showToast(`Copied ${blockSel.size} block${blockSel.size === 1 ? '' : 's'}`);
        break;
      case 'float':
        mutatePage((pg) => pg.blocks.forEach((b, i) => {
          if (blockSel.has(b.id)) { b.floating = true; b.fx = 30 + (i * 20) % 140; b.fy = 50 + (i * 16) % 110; }
        }));
        break;
      case 'del':
        mutatePage((pg) => { pg.blocks = pg.blocks.filter((b) => !blockSel.has(b.id)); });
        showToast(`Deleted ${blockSel.size} block${blockSel.size === 1 ? '' : 's'}`);
        break;
      default: break;
    }
    setBlockSel(new Set()); setPageSel(false);
  };

  /* ----- page folders ----- */
  const moveToFolder = (pageId, folder) => {
    patchPage(pageId, { folder: folder || '' });
    setFolderMenuPage(null);
  };
  const newFolderFromPage = (pageId, name) => {
    const f = name.trim();
    if (f) patchPage(pageId, { folder: f });
    setFolderMenuPage(null);
    setFolderEdit(null);
  };
  const renameFolder = (oldName, newName) => {
    const f = newName.trim();
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.folder === oldName ? { ...p, folder: f || oldName } : p)),
    }));
    setFolderEdit(null);
  };
  const ungroupFolder = (name) => {
    setDoc((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.folder === name ? { ...p, folder: '' } : p)),
    }));
  };

  /* word/line helpers (erase-word / duplicate-line via caret) */
  const wordAt = (text, idx) => {
    let a = idx, b = idx;
    const isWord = (c) => c && /\S/.test(c);
    while (a > 0 && isWord(text[a - 1])) a--;
    while (b < text.length && isWord(text[b])) b++;
    return a === b ? null : [a, b];
  };

  const duplicateLine = (id) => {
    const el = taRefs.current[id];
    const b = page.blocks.find((x) => x.id === id);
    if (!b || !b.text) { showToast('Nothing to duplicate'); return; }
    const caret = el ? el.selectionStart : b.text.length;
    const ls = b.text.lastIndexOf('\n', caret - 1) + 1;
    let le = b.text.indexOf('\n', caret);
    if (le === -1) le = b.text.length;
    const line = b.text.slice(ls, le);
    mutatePage((pg) => {
      const x = pg.blocks.find((y) => y.id === id);
      x.text = x.text.slice(0, le) + '\n' + line + x.text.slice(le);
    });
    showToast('Line duplicated');
  };

  const blockAction = (id, action, payload) => {
    setMenu(null);
    // checklist-run ops live outside mutatePage — checkAll does its own update
    if (action === 'checkrun') { checkAll(id, true); return; }
    if (action === 'uncheckrun') { checkAll(id, false); return; }
    mutatePage((pg, nd) => {
      const i = pg.blocks.findIndex((b) => b.id === id);
      if (i < 0) return;
      switch (action) {
        case 'up': if (i > 0) [pg.blocks[i - 1], pg.blocks[i]] = [pg.blocks[i], pg.blocks[i - 1]]; break;
        case 'down': if (i < pg.blocks.length - 1) [pg.blocks[i + 1], pg.blocks[i]] = [pg.blocks[i], pg.blocks[i + 1]]; break;
        case 'dup': {
          const src = pg.blocks[i];
          pg.blocks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(src)), id: nd.nextId++ });
          break;
        }
        case 'sort': {
          const b = pg.blocks[i];
          if (b.text) b.text = b.text.split('\n').sort((a, z) => a.localeCompare(z)).join('\n');
          break;
        }
        case 'float': {
          pg.blocks[i].floating = true;
          pg.blocks[i].fx = 40 + (i * 24) % 160;
          pg.blocks[i].fy = 60 + (i * 20) % 120;
          break;
        }
        case 'dock': {
          pg.blocks[i].floating = false;
          pg.blocks[i].pinned = false;
          break;
        }
        case 'pin': pg.blocks[i].pinned = true; break;
        case 'unpin': pg.blocks[i].pinned = false; break;
        case 'timestamp': {
          const b = pg.blocks[i];
          const ts = new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
          b.text = (b.text ? b.text + (b.text.endsWith('\n') ? '' : '\n') : '') + ts;
          break;
        }
        case 'turninto': {
          const b = pg.blocks[i];
          b.type = payload;
          if (payload === BT.TABLE) b.cells = [['', ''], ['', '']];
          if (payload === BT.DRAW) { b.strokes = []; b.drawH = 120; }
          if (payload !== BT.CHECK) b.checked = false;
          break;
        }
        case 'trow+': {
          const b = pg.blocks[i];
          b.cells = [...(b.cells || []), Array(Math.max(...(b.cells || [['']]).map((r) => r.length))).fill('')];
          break;
        }
        case 'trow-': {
          const b = pg.blocks[i];
          if ((b.cells || []).length > 1) b.cells = b.cells.slice(0, -1);
          break;
        }
        case 'tcol+': {
          const b = pg.blocks[i];
          b.cells = (b.cells || []).map((r) => [...r, '']);
          break;
        }
        case 'tcol-': {
          const b = pg.blocks[i];
          b.cells = (b.cells || []).map((r) => (r.length > 1 ? r.slice(0, -1) : r));
          break;
        }
        case 'taller': pg.blocks[i].drawH = Math.min(220, (pg.blocks[i].drawH || 120) + 30); break;
        case 'shorter': pg.blocks[i].drawH = Math.max(60, (pg.blocks[i].drawH || 120) - 30); break;
        case 'del': pg.blocks.splice(i, 1); break;
        default: break;
      }
    });
  };

  /* ----- clipboard for menus — operates on the focused textarea or whole block ----- */
  const cutSel = (id) => {
    const el = taRefs.current[id];
    const b = page.blocks.find((x) => x.id === id);
    if (!b) return;
    const s = el ? el.selectionStart : 0;
    const en = el ? el.selectionEnd : b.text.length;
    const v = el ? el.value : b.text;
    navigator.clipboard?.writeText(v.slice(s, en));
    if (en > s) setBlockText(id, v.slice(0, s) + v.slice(en));
    showToast('Cut');
  };
  const copySel = (id) => {
    const el = taRefs.current[id];
    const b = page.blocks.find((x) => x.id === id);
    if (!b) return;
    const s = el ? el.selectionStart : 0;
    const en = el ? el.selectionEnd : b.text.length;
    const v = el ? el.value : b.text;
    navigator.clipboard?.writeText(en > s ? v.slice(s, en) : b.text);
    showToast('Copied');
  };
  const pasteAt = async (id) => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) return;
      const el = taRefs.current[id];
      const b = page.blocks.find((x) => x.id === id);
      if (el && b) {
        const s = el.selectionStart, en = el.selectionEnd;
        setBlockText(id, el.value.slice(0, s) + t + el.value.slice(en));
      } else if (b) {
        setBlockText(id, b.text + t);
      }
      showToast('Pasted');
    } catch { showToast('Clipboard blocked'); }
  };

  /* ----- page ops ----- */
  const addPage = () => {
    setDoc((prev) => {
      const nd = { ...prev, pages: [...prev.pages] };
      const p = { id: nd.nextId++, name: `Page ${nd.pages.length + 1}`, color: nd.pages.length % PAGE_COLORS.length, starred: false, blocks: [] };
      nd.pages.push(p);
      nd.lastPage = p.id;
      return nd;
    });
    historyRef.current.clear();
    setTypedDone(new Set());
  };

  const addPageFromTemplate = (tpl) => {
    setDoc((prev) => {
      const nd = { ...prev, pages: [...prev.pages] };
      const p = { id: nd.nextId++, name: tpl.name, color: nd.pages.length % PAGE_COLORS.length, starred: false, blocks: [] };
      p.blocks = tpl.blocks.map((b) => {
        const nb = blockHelpers.newBlock(nd, b.type);
        if (b.text) nb.text = b.text;
        if (b.cells) nb.cells = b.cells.map((r) => [...r]);
        return nb;
      });
      nd.pages.push(p);
      nd.lastPage = p.id;
      return nd;
    });
    historyRef.current.clear();
    setTypedDone(new Set());
    setPopup(null);
    showToast(`Page from "${tpl.name}" template`);
  };

  const switchPage = (id) => {
    setDoc((prev) => ({ ...prev, lastPage: id }));
    historyRef.current.clear();
    setTypedDone(new Set());
    setMenu(null);
    setBlockSel(new Set());
    setPageSel(false);
    setGlyphState(null);
    setSlashState(null);
  };

  const patchPage = (id, patch) => {
    setDoc((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  };

  const deletePages = (ids) => {
    const idSet = new Set(ids);
    setDoc((prev) => {
      const doomed = prev.pages.filter((p) => idSet.has(p.id));
      const keep = prev.pages.filter((p) => !idSet.has(p.id));
      if (!keep.length) return prev;
      const trash = [...(prev.trash || []), ...doomed.map((p) => ({ ...p, deletedAt: Date.now() }))].slice(-10);
      const nd = { ...prev, pages: keep, trash };
      if (idSet.has(nd.lastPage)) nd.lastPage = keep[0].id;
      return nd;
    });
    setSelPages(new Set());
    historyRef.current.clear();
    showToast(`${idSet.size} page${idSet.size === 1 ? '' : 's'} moved to trash`);
  };

  const deletePage = (id) => deletePages([id]);

  const restorePage = (id) => {
    setDoc((prev) => {
      const entry = (prev.trash || []).find((p) => p.id === id);
      if (!entry) return prev;
      const { deletedAt, ...restored } = entry;
      return { ...prev, pages: [...prev.pages, restored], trash: prev.trash.filter((p) => p.id !== id), lastPage: restored.id };
    });
    historyRef.current.clear();
    showToast('Page restored');
  };

  const deleteForever = (id) =>
    setDoc((prev) => ({ ...prev, trash: (prev.trash || []).filter((p) => p.id !== id) }));

  const duplicatePage = (id) => {
    setDoc((prev) => {
      const src = prev.pages.find((p) => p.id === id);
      if (!src) return prev;
      const nd = { ...prev, pages: [...prev.pages] };
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = nd.nextId++;
      copy.name = `${src.name} (copy)`;
      copy.blocks = copy.blocks.map((b) => ({ ...b, id: nd.nextId++ }));
      copy.starred = false;
      nd.pages.push(copy);
      nd.lastPage = copy.id;
      return nd;
    });
    historyRef.current.clear();
    showToast('Page duplicated');
  };

  const toggleSelPage = (id) => {
    setSelPages((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  /** Kotlin pageCtx ops — open / pin to top / move to folder. */
  const pageAction = (id, action) => {
    setMenu(null);
    switch (action) {
      case 'open': switchPage(id); break;
      case 'totop':
        setDoc((prev) => {
          const p = prev.pages.find((x) => x.id === id);
          if (!p) return prev;
          return { ...prev, pages: [p, ...prev.pages.filter((x) => x.id !== id)] };
        });
        break;
      case 'folder': setFolderMenuPage(id); break;
      default: break;
    }
  };

  /* ----- find & replace ----- */
  const searchable = (b) => b.text && b.type !== BT.DRAW && b.type !== BT.DIVIDER && b.type !== BT.TABLE;
  const countIn = (text, q2, cs) => {
    const t = cs ? text : text.toLowerCase();
    const needle = cs ? q2 : q2.toLowerCase();
    let i = t.indexOf(needle), n = 0;
    while (i !== -1) { n++; i = t.indexOf(needle, i + 1); }
    return n;
  };
  const q = findQ;
  const matches = q.trim()
    ? page.blocks.flatMap((b) => (searchable(b) ? Array(countIn(b.text, q, findCase)).fill(b.id) : []))
    : [];
  const pageHits = q.trim() && findAll
    ? doc.pages.map((p) => ({
        page: p,
        count: p.blocks.reduce((n, b) => n + (searchable(b) ? countIn(b.text, q, findCase) : 0), 0),
      })).filter((r) => r.count > 0)
    : [];

  const findNext = () => {
    if (!matches.length) return;
    const next = matches[findPos % matches.length];
    setFindPos((v) => v + 1);
    blockRefs.current[next]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    taRefs.current[next]?.focus();
  };

  const replaceAll = () => {
    if (!findQ.trim()) return;
    let count = 0;
    mutatePage((pg) => {
      pg.blocks.forEach((b) => {
        if (!searchable(b)) return;
        const before = b.text;
        if (findCase) {
          count += before.split(findQ).length - 1;
          b.text = before.split(findQ).join(replaceQ);
        } else {
          // case-insensitive replace preserving surrounding text
          const re = new RegExp(findQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const m = before.match(re);
          count += m ? m.length : 0;
          b.text = before.replace(re, replaceQ);
        }
      });
    });
    showToast(`Replaced ${count} match${count === 1 ? '' : 'es'}`);
    setFindPos(0);
  };

  /* ----- formatting ----- */
  const wrapSel = (prefix, suffix = prefix) => {
    const el = document.activeElement;
    if (!el || el.tagName !== 'TEXTAREA') { showToast('Select text in a block first'); return; }
    const id = parseInt(el.dataset.blockId, 10);
    const b = page.blocks.find((x) => x.id === id);
    if (!b) return;
    const { selectionStart: s, selectionEnd: e2, value } = el;
    const sel = value.substring(s, e2);
    const nv = value.substring(0, s) + prefix + sel + suffix + value.substring(e2);
    setBlockText(id, nv);
    setTimeout(() => { el.focus(); el.selectionStart = s + prefix.length; el.selectionEnd = e2 + prefix.length; }, 0);
  };

  /* ----- export / import ----- */
  const copyPage = async () => {
    try {
      await navigator.clipboard.writeText(`${page.name}\n\n${exportPageText(page)}`);
      showToast('Page copied');
    } catch { showToast('Copy failed'); }
  };
  copyPageRef.current = copyPage;
  pageSelRef.current = pageSel;

  const downloadPage = () => {
    const blob = new Blob([`${page.name}\n\n${exportPageText(page)}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const text = doc.pages.map((p) => `${'='.repeat(24)}\n${p.name}\n${'='.repeat(24)}\n${exportPageText(p)}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notepad-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toMarkdown = (p) => p.blocks.map((b) => {
    switch (b.type) {
      case BT.CHECK: return `- [${b.checked ? 'x' : ' '}] ${b.text}`;
      case BT.BULLET: return `- ${b.text}`;
      case BT.NUMBER: return `1. ${b.text}`;
      case BT.DIVIDER: return '---';
      case BT.TABLE:
        return (b.cells || []).map((r, ri) => `| ${r.join(' | ')} |${ri === 0 ? '\n| ' + r.map(() => '---').join(' | ') + ' |' : ''}`).join('\n');
      case BT.DRAW: return '*[drawing]*';
      default: return b.text;
    }
  }).join('\n\n');

  const downloadMd = () => {
    const text = doc.pages.map((p) => `# ${p.name}\n\n${toMarkdown(p)}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notepad-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as Markdown');
  };

  const importMd = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '').split('\n');
      const blocks = [];
      lines.forEach((raw) => {
        const ln = raw.trimEnd();
        if (!ln.trim()) return;
        let m;
        if ((m = ln.match(/^- \[( |x|X)\] (.*)$/))) blocks.push({ type: BT.CHECK, text: m[2], checked: m[1] !== ' ' });
        else if ((m = ln.match(/^- (.*)$/))) blocks.push({ type: BT.BULLET, text: m[1] });
        else if ((m = ln.match(/^\d+\. (.*)$/))) blocks.push({ type: BT.NUMBER, text: m[1] });
        else if (ln === '---') blocks.push({ type: BT.DIVIDER });
        else if ((m = ln.match(/^# (.*)$/))) blocks.push({ type: BT.TEXT, text: `**${m[1]}**` });
        else blocks.push({ type: BT.TEXT, text: ln });
      });
      setDoc((prev) => {
        const nd = { ...prev, pages: [...prev.pages] };
        const p = { id: nd.nextId++, name: file.name.replace(/\.(md|markdown|txt)$/i, ''), color: nd.pages.length % PAGE_COLORS.length, starred: false, blocks: [] };
        p.blocks = blocks.map((b) => {
          const nb = blockHelpers.newBlock(nd, b.type);
          if (b.text) nb.text = b.text;
          if (b.checked) nb.checked = true;
          return nb;
        });
        nd.pages.push(p);
        nd.lastPage = p.id;
        return nd;
      });
      setTypedDone(new Set());
      showToast(`Imported ${file.name}`);
    };
    reader.readAsText(file);
    setPopup(null);
  };

  const sendToList = () => {
    if (!onSendToList) { showToast('No shopping list connected'); return; }
    const names = page.blocks
      .filter((b) => [BT.CHECK, BT.BULLET, BT.NUMBER].includes(b.type) && !b.checked && b.text.trim())
      .map((b) => b.text.split('\n').filter((l) => l.trim()))
      .flat();
    if (!names.length) { showToast('No unchecked items on this page'); return; }
    onSendToList(names);
    showToast(`Sent ${names.length} item${names.length === 1 ? '' : 's'} to list`);
  };

  const wordCount = useMemo(
    () => page.blocks.reduce((n, b) => n + (b.text ? b.text.trim().split(/\s+/).filter(Boolean).length : 0), 0),
    [page.blocks]
  );
  const checks = useMemo(() => {
    const cb = page.blocks.filter((b) => b.type === BT.CHECK);
    return { n: cb.length, d: cb.filter((b) => b.checked).length };
  }, [page.blocks]);

  const patchSettings = (patch) => setDoc((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  const setZoom = (z) => patchSettings({ zoom: Math.min(2, Math.max(0.6, +z.toFixed(2))) });
  const collapseAll = (to) => {
    const c = {};
    if (to) page.blocks.filter((b) => b.text).forEach((b) => { c[b.id] = true; });
    setCollapsed(c);
  };

  // Open ctx-menu AT the click point — flips left/up when the edge would clip it
  const MENU_W = 208, MENU_H = 380;
  const openMenu = (e, kind, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) { setMenu({ kind, id, x: 0, y: 0 }); return; } // bottom sheet, position irrelevant
    let x = e.clientX, y = e.clientY;
    const r = panelRef.current?.getBoundingClientRect();
    if (r) {
      if (x + MENU_W > r.right - 4) x = Math.max(r.left + 4, x - MENU_W + 10);   // flip left of cursor
      if (y + MENU_H > r.bottom - 4) y = Math.max(r.top + 4, y - MENU_H + 10); // flip above cursor
    }
    x = Math.max(4, Math.min(x, window.innerWidth - MENU_W - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - 100));
    setMenu({ kind, id, x, y });
  };

  const floatingBlocks = page.blocks.filter((b) => b.floating);
  const inlineBlocks = page.blocks.filter((b) => !b.floating);

  /* ----- sidebar: filtered pages grouped into folders (Kotlin sideFilter) ----- */
  const visiblePages = doc.pages.filter((p) =>
    sideFilter === 8 ? p.starred : sideFilter < 0 || p.color === sideFilter);
  const folderNames = [...new Set(visiblePages.filter((p) => p.folder).map((p) => p.folder))];
  const unfiledPages = visiblePages.filter((p) => !p.folder);
  /** Write a reordered group back, preserving order of every other group. */
  const reorderGroup = (folder, newOrder) => {
    setDoc((prev) => {
      const queue = [...newOrder];
      let i = 0;
      return { ...prev, pages: prev.pages.map((p) => ((p.folder || '') === folder ? queue[i++] || p : p)) };
    });
  };

  /** Page sidebar row (shared by folder groups + unfiled list). */
  const pageRow = (p, controls) => (
    <div
      onClick={() => (selMode ? toggleSelPage(p.id) : switchPage(p.id))}
      onDoubleClick={() => setRenamingPage(p.id)}
      onContextMenu={(e) => openMenu(e, 'page', p.id)}
      className={`group relative px-2 py-1.5 rounded-lg cursor-pointer text-xs font-medium truncate flex items-center gap-1.5 ${
        p.id === page.id ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.text} ${theme.hover}`
      }`}
      title={`${p.name} — right-click for options`}
    >
      <span
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); controls.start(e); }}
        className={`flex-shrink-0 cursor-grab active:cursor-grabbing ${isMobile ? 'opacity-40' : 'opacity-0 group-hover:opacity-50'} ${theme.muted}`}
        title="Drag to reorder"
      >
        <GripVertical className="w-3 h-3" />
      </span>
      {selMode && (
        <Check3D checked={selPages.has(p.id)} onChange={() => toggleSelPage(p.id)} size={15} />
      )}
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PAGE_COLORS[p.color % PAGE_COLORS.length] }} />
      {renamingPage === p.id ? (
        <input
          defaultValue={p.name}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => { patchPage(p.id, { name: e.target.value.trim() || p.name }); setRenamingPage(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          className={`w-full bg-white/20 rounded px-1 text-xs ${p.id === page.id ? 'text-white' : theme.text} outline-none`}
        />
      ) : (
        <span className="truncate flex-1">{p.name}</span>
      )}
      {!selMode && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); patchPage(p.id, { starred: !p.starred }); }}
            className={`flex-shrink-0 ${p.starred ? 'text-yellow-300' : 'opacity-0 group-hover:opacity-60'}`}
            title="Star page"
          >
            <Star className="w-3 h-3" fill={p.starred ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); duplicatePage(p.id); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100"
            title="Duplicate page"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (doc.pages.length <= 1) { showToast("Can't delete last page"); return; }
              deletePage(p.id);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100"
            title="Move to trash"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );

  const dueChip = (b) => {
    const d = daysUntil(b.due);
    if (d === null) return null;
    const cls = d < 0 ? 'bg-red-500/20 text-red-400' : d === 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500';
    const label = d < 0 ? `${-d}d overdue` : d === 0 ? 'Due today' : `Due in ${d}d`;
    return { cls, label };
  };

  /* ================= render ================= */

  /* ----- 3-dot launcher (closed notepad orb) ----- */
  const launcher = (
    <motion.button
      key="launcher"
      drag
      dragMomentum={false}
      dragElastic={0.05}
      onDragStart={() => setLauncherDragging(true)}
      onDragEnd={(_, info) => {
        setLauncherPos((p) => ({
          x: Math.max(8, Math.min(window.innerWidth - 52, p.x + info.offset.x)),
          y: Math.max(8, Math.min(window.innerHeight - 52, p.y + info.offset.y)),
        }));
        setTimeout(() => setLauncherDragging(false), 120);
      }}
      onClick={() => { if (!launcherDragging) onOpenRequest?.(); }}
      style={{ x: launcherPos.x, y: launcherPos.y }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className="fixed top-0 left-0 z-[64] w-11 h-11 rounded-full shadow-2xl cursor-grab active:cursor-grabbing bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center border-2 border-white/30"
      title="Notepad — drag to move, click to open"
    >
      <MoreVertical className="w-5 h-5" />
    </motion.button>
  );

  /* ----- compact pill ----- */
  const compactPill = (
    <motion.div
      key="compact"
      drag
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={(_, info) => setPos((p) => ({ x: p.x + info.offset.x, y: p.y + info.offset.y }))}
      style={{ x: pos.x, y: pos.y }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed top-0 left-0 z-[75] flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full shadow-2xl cursor-grab active:cursor-grabbing bg-gradient-to-r from-amber-500 to-orange-500 text-white select-none"
    >
      <StickyNote className="w-4 h-4" />
      <span className="text-xs font-semibold max-w-[140px] truncate">{page?.name || 'Notepad'}</span>
      <span className="text-[10px] opacity-80">{page?.blocks.length || 0} blocks</span>
      <button
        onClick={() => setMode('window')}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-7 h-7 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center"
        title="Expand notepad"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );

  const isFullscreen = mode === 'fullscreen';
  const shellCls = isFullscreen
    ? 'fixed inset-0 z-[70] p-3 sm:p-6 bg-black/40'
    : 'fixed top-0 left-0 z-[65] w-[560px] max-w-[calc(100vw-16px)]';
  const panelH = isFullscreen ? 'h-full' : 'h-[520px] max-h-[calc(100vh-100px)]';

  const panel = (
    <motion.div
      key="panel"
      ref={shellRef}
      drag={!isFullscreen}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={(_, info) => setPos((p) => ({ x: p.x + info.offset.x, y: p.y + info.offset.y }))}
      onClick={isFullscreen ? handleClose : undefined}
      style={isFullscreen ? {} : { x: pos.x, y: pos.y }}
      initial={{ scale: 0.9, opacity: 0, y: 24 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className={`${shellCls} ${panelH}`}
    >
      <div
        ref={panelRef}
        onClick={(e) => isFullscreen && e.stopPropagation()}
        className={`np-root ${settings.uiAnim === false ? 'np-noanim' : ''} flex flex-col h-full rounded-2xl border-2 shadow-2xl overflow-hidden ${theme.panel}`}
        style={{ '--np-thumb': theme.scroll }}
      >
        <style>{`
          .np-root ::selection { background: rgba(95,188,232,.38); }
          .np-root textarea::selection { background: rgba(127,227,154,.4); }
          /* custom scrollbars — every scroller except AnimatedScrollbar3D's .scrollbar-hide */
          .np-root *:not(.scrollbar-hide) { scrollbar-width: thin; scrollbar-color: var(--np-thumb) transparent; }
          .np-root *:not(.scrollbar-hide)::-webkit-scrollbar { width: 9px; height: 9px; }
          .np-root *:not(.scrollbar-hide)::-webkit-scrollbar-track { background: rgba(120,140,160,.10); border-radius: 999px; }
          .np-root *:not(.scrollbar-hide)::-webkit-scrollbar-thumb {
            background: var(--np-thumb);
            border-radius: 999px;
            border: 2px solid transparent;
            background-clip: padding-box;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.22);
          }
          .np-root *:not(.scrollbar-hide)::-webkit-scrollbar-thumb:hover {
            box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.22), 0 0 7px var(--np-thumb);
          }
          .np-root *:not(.scrollbar-hide)::-webkit-scrollbar-corner { background: transparent; }
          .np-noanim * { transition: none !important; animation: none !important; }
        `}</style>
        {/* ===== header ===== */}
        <div
          onPointerDown={!isFullscreen ? (e) => dragControls.start(e) : undefined}
          className={`flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r ${theme.accent} text-white ${isFullscreen ? '' : 'cursor-grab active:cursor-grabbing'} select-none`}
        >
          <StickyNote className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-sm truncate flex-1">{page?.name || 'Notepad'}</span>
          <span className="text-[11px] opacity-80 hidden sm:block">{page?.blocks.length || 0} blocks · {doc.pages.length} pages</span>
          <div className="flex items-center gap-1">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMode('compact')}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
              title="Compact mode"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMode(isFullscreen ? 'window' : 'fullscreen')}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
              title={isFullscreen ? 'Back to window' : 'Fullscreen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
              title="Close (shows 3-dot launcher)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===== toolbar ===== */}
        <div
          className={`flex items-center gap-1 px-2 py-1.5 border-b ${theme.side} overflow-x-auto`}
          style={{ zoom: settings.uiScale || 1 }}
        >
          <ToolBtn theme={theme} onClick={() => addBlock(BT.TEXT)} title="Add text block"><Type className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.CHECK)} title="Add checkbox"><CheckSquare className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.BULLET)} title="Add bullet"><List className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.NUMBER)} title="Add numbered item"><ListOrdered className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.DIVIDER)} title="Add divider"><MinusIcon className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.TABLE)} title="Add table"><Table className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => addBlock(BT.DRAW)} title="Add drawing"><Pencil className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={() => wrapSel('**')} title="Bold selection"><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => wrapSel('*')} title="Italic selection"><Italic className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={undo} disabled={!historyRef.current.canUndo()} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={redo} disabled={!historyRef.current.canRedo()} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => setShowFind((v) => !v)} on={showFind} title="Find & replace (Ctrl+F)"><Search className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => setPopup('nav')} title="Jump to page"><FileStack className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={sendToList} title="Send unchecked items to shopping list"><ShoppingCart className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={copyPage} title="Copy page as text"><ClipboardCopy className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={downloadPage} title="Download page .txt"><Download className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={downloadAll} title="Export ALL pages .txt"><FolderDown className="w-4 h-4" /></ToolBtn>
          <Sep />
          {/* zoom controls */}
          <ToolBtn theme={theme} onClick={() => setZoom(settings.zoom - 0.1)} title="Zoom out"><ZoomOut className="w-4 h-4" /></ToolBtn>
          <button
            onClick={() => setZoom(1)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${theme.chip}`}
            title="Reset zoom (Ctrl+scroll also works)"
          >
            {Math.round(settings.zoom * 100)}%
          </button>
          <ToolBtn theme={theme} onClick={() => setZoom(settings.zoom + 0.1)} title="Zoom in"><ZoomIn className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn
            theme={theme}
            btnRef={paletteBtnRef}
            onClick={() => {
              const r = paletteBtnRef.current?.getBoundingClientRect();
              if (r) setPalettePos({ x: Math.min(r.left, window.innerWidth - 148), y: r.bottom + 6 });
              setShowPalette((v) => !v);
            }}
            on={showPalette}
            title="Page accent color"
          >
            <Palette className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn
            theme={theme}
            onClick={() => { setWordEraseMode((v) => !v); showToast(wordEraseMode ? 'Word erase off' : 'Click a word to erase it'); }}
            on={wordEraseMode}
            title="Word erase mode — click a word to delete it"
          >
            <SearchX className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn
            theme={theme}
            onClick={() => { setBlockSelMode((v) => !v); setBlockSel(new Set()); setPageSel(false); }}
            on={blockSelMode}
            title="Select blocks — click rows, Ctrl+C copies"
          >
            <TextCursorInput className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn
            theme={theme}
            onClick={() => {
              const id = activeTa.current || inlineBlocks.find((x) => TEXTISH.includes(x.type))?.id;
              if (id == null) { showToast('Add a text block first'); return; }
              setGlyphState(glyphState ? null : { id, q: '', at: -1 });
            }}
            on={!!glyphState}
            title="Insert glyph — or type :name in any block"
          >
            <Smile className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn theme={theme} onClick={() => setPopup('templates')} title="New page from template"><FilePlus2 className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => setPopup('settings')} title="Settings"><Settings className="w-4 h-4" /></ToolBtn>
        </div>

        {/* ===== find & replace ===== */}
        {showFind && (
          <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b ${theme.side}`}>
            <Search className={`w-4 h-4 ${theme.muted}`} />
            <input
              value={findQ}
              onChange={(e) => { setFindQ(e.target.value); setFindPos(0); }}
              onKeyDown={(e) => e.key === 'Enter' && findNext()}
              placeholder="Find…"
              className={`px-2 py-1 rounded text-xs w-32 bg-white/10 border border-gray-500/40 ${theme.text} outline-none`}
              autoFocus
            />
            <span className={`text-[10px] w-10 ${theme.muted}`}>{matches.length ? `${Math.min(findPos, matches.length)}/${matches.length}` : '0'}</span>
            <ToolBtn theme={theme} onClick={findNext} title="Next match"><ChevronDown className="w-4 h-4" /></ToolBtn>
            <button
              onClick={() => { setFindCase((v) => !v); setFindPos(0); }}
              className={`px-1.5 py-1 rounded text-[10px] font-bold ${findCase ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.muted} ${theme.hover}`}`}
              title={`Match case — ${findCase ? 'on' : 'off'}`}
            >
              aA
            </button>
            <input
              value={replaceQ}
              onChange={(e) => setReplaceQ(e.target.value)}
              placeholder="Replace…"
              className={`px-2 py-1 rounded text-xs w-32 bg-white/10 border border-gray-500/40 ${theme.text} outline-none`}
            />
            <button
              onClick={replaceAll}
              disabled={!matches.length}
              className={`px-2 py-1 rounded text-xs font-medium disabled:opacity-40 bg-gradient-to-r ${theme.accent} text-white`}
            >
              All
            </button>
            <label className={`flex items-center gap-1 text-[10px] ${theme.muted} cursor-pointer whitespace-nowrap`}>
              <input type="checkbox" checked={findAll} onChange={(e) => { setFindAll(e.target.checked); setFindPos(0); }} className="rounded" />
              All pages
            </label>
            <button onClick={() => setShowFind(false)} className={`p-1 ${theme.muted}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showFind && findAll && q.trim() && (
          <div className={`px-2 py-1.5 border-b ${theme.side}`}>
            {pageHits.length === 0 ? (
              <span className={`text-[10px] ${theme.muted}`}>No matches on any page</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {pageHits.map(({ page: hp, count }) => (
                  <button
                    key={hp.id}
                    onClick={() => { setFindAll(false); switchPage(hp.id); }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${theme.chip} hover:opacity-80`}
                    title={`Jump to ${hp.name}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PAGE_COLORS[hp.color % PAGE_COLORS.length] }} />
                    {hp.name} <span className="opacity-70">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== body ===== */}
        <div className="flex flex-1 min-h-0">
          {/* pages sidebar — hidden on mobile (use Jump-to-page instead) */}
          <div
            className={`${isMobile ? 'hidden' : 'flex'} w-36 flex-shrink-0 flex-col border-r ${theme.side}`}
            style={{ zoom: settings.uiScale || 1 }}
          >
            <div className="flex items-center justify-between px-2 pt-2">
              <span className={`text-[10px] uppercase font-bold ${theme.muted}`}>{showTrash ? 'Trash' : 'Pages'}</span>
              <div className="flex items-center">
                {!showTrash && (
                  <button
                    onClick={() => { setSelMode((v) => !v); setSelPages(new Set()); }}
                    className={`p-1 rounded ${selMode ? `bg-gradient-to-r ${theme.accent} text-white` : theme.hover}`}
                    title={selMode ? 'Done selecting' : 'Select pages'}
                  >
                    <CheckSquare className={`w-3.5 h-3.5 ${selMode ? '' : theme.muted}`} />
                  </button>
                )}
                {!showTrash && (
                  <button
                    onClick={() => setFolderMenuPage(page.id)}
                    className={`p-1 rounded ${theme.hover}`}
                    title="Organize into folders"
                  >
                    <FolderPlus className={`w-3.5 h-3.5 ${theme.muted}`} />
                  </button>
                )}
                <button
                  onClick={() => setShowTrash((v) => !v)}
                  className={`p-1 rounded relative ${showTrash ? `bg-gradient-to-r ${theme.accent} text-white` : theme.hover}`}
                  title="Trash bin"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${showTrash ? '' : theme.muted}`} />
                  {(doc.trash || []).length > 0 && !showTrash && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">
                      {doc.trash.length}
                    </span>
                  )}
                </button>
                {!showTrash && (
                  <button onClick={addPage} className={`p-1 rounded ${theme.hover}`} title="New page">
                    <Plus className={`w-3.5 h-3.5 ${theme.muted}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Kotlin pfilter — All / starred / per-color page filters */}
            {!showTrash && (
              <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${theme.side}`}>
                <button
                  onClick={() => setSideFilter(-1)}
                  className={`px-1 rounded text-[9px] font-bold ${sideFilter === -1 ? `bg-gradient-to-r ${theme.accent} text-white` : theme.muted}`}
                  title="All pages"
                >
                  All
                </button>
                <button
                  onClick={() => setSideFilter(sideFilter === 8 ? -1 : 8)}
                  className={`rounded ${sideFilter === 8 ? 'text-yellow-300' : theme.muted}`}
                  title="Starred only"
                >
                  <Star className="w-3 h-3" fill={sideFilter === 8 ? 'currentColor' : 'none'} />
                </button>
                {PAGE_COLORS.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => setSideFilter(sideFilter === i ? -1 : i)}
                    className={`w-3 h-3 rounded-full transition-transform ${sideFilter === i ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                    title={`Filter ${c}`}
                  />
                ))}
              </div>
            )}
            <AnimatedScrollbar3D maxHeight="100%" autoHide={false} className="flex-1">
              <div className="p-1.5 space-y-1">
                {showTrash && (doc.trash || []).length === 0 && (
                  <p className={`text-[10px] ${theme.muted} text-center py-4`}>Trash is empty</p>
                )}
                {showTrash && (doc.trash || []).slice().reverse().map((p) => (
                  <div key={p.id} className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${theme.text}`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0 opacity-50" style={{ backgroundColor: PAGE_COLORS[p.color % PAGE_COLORS.length] }} />
                    <span className="truncate flex-1 opacity-70">{p.name}</span>
                    <button onClick={() => restorePage(p.id)} className={`p-0.5 rounded ${theme.hover}`} title="Restore page">
                      <RotateCcw className="w-3 h-3 text-green-500" />
                    </button>
                    <button
                      onClick={() => setConfirmState({
                        title: 'Delete Forever',
                        message: `Permanently delete "${p.name}"? This cannot be undone.`,
                        onYes: () => { deleteForever(p.id); setConfirmState(null); },
                      })}
                      className={`p-0.5 rounded ${theme.hover}`}
                      title="Delete forever"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
                {!showTrash && folderNames.map((fname) => {
                  const fp = visiblePages.filter((p) => p.folder === fname);
                  const fCollapsed = collapsedFolders.has(fname);
                  return (
                    <div key={`folder-${fname}`} className="space-y-1">
                      {/* folder header — collapse / rename / ungroup */}
                      <div className={`group flex items-center gap-1 px-1.5 py-1 rounded-md ${theme.hover}`}>
                        <button
                          onClick={() => setCollapsedFolders((s) => { const n = new Set(s); if (n.has(fname)) n.delete(fname); else n.add(fname); return n; })}
                          className={`${theme.muted}`}
                          title={fCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          {fCollapsed ? <Folder className="w-3.5 h-3.5" /> : <FolderOpen className="w-3.5 h-3.5" />}
                        </button>
                        {folderEdit === fname ? (
                          <input
                            defaultValue={fname}
                            autoFocus
                            onBlur={(e) => renameFolder(fname, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                            className={`w-full bg-white/20 rounded px-1 text-[11px] ${theme.text} outline-none`}
                          />
                        ) : (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide truncate flex-1 cursor-pointer ${theme.muted}`}
                            onDoubleClick={() => setFolderEdit(fname)}
                            title="Double-click to rename"
                          >
                            {fname}
                          </span>
                        )}
                        <span className={`text-[9px] ${theme.muted}`}>{fp.length}</span>
                        <button
                          onClick={() => setConfirmState({
                            title: 'Remove Folder',
                            message: `Remove folder "${fname}"? Its ${fp.length} page${fp.length === 1 ? '' : 's'} stay and become unfiled.`,
                            onYes: () => { ungroupFolder(fname); setConfirmState(null); },
                          })}
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 flex-shrink-0"
                          title="Ungroup (pages stay)"
                        >
                          <X className={`w-3 h-3 ${theme.muted}`} />
                        </button>
                        <ChevronRight className={`w-3 h-3 transition-transform ${theme.muted} ${fCollapsed ? '' : 'rotate-90'}`} />
                      </div>
                      {!fCollapsed && (
                        <Reorder.Group axis="y" values={fp} onReorder={(o) => reorderGroup(fname, o)} className="space-y-1 pl-2">
                          {fp.map((p) => (
                            <SortablePage key={p.id} page={p}>
                              {(controls) => pageRow(p, controls)}
                            </SortablePage>
                          ))}
                        </Reorder.Group>
                      )}
                    </div>
                  );
                })}
                {!showTrash && (
                  <Reorder.Group axis="y" values={unfiledPages} onReorder={(o) => reorderGroup('', o)} className="space-y-1">
                    {unfiledPages.map((p) => (
                      <SortablePage key={p.id} page={p}>
                        {(controls) => pageRow(p, controls)}
                      </SortablePage>
                    ))}
                  </Reorder.Group>
                )}
              </div>
            </AnimatedScrollbar3D>

            {selMode && !showTrash && (
              <div className={`px-2 py-1.5 border-t ${theme.side} space-y-1`}>
                <button
                  onClick={() => setSelPages(selPages.size === doc.pages.length ? new Set() : new Set(doc.pages.map((p) => p.id)))}
                  className={`text-[10px] ${theme.muted} hover:underline`}
                >
                  {selPages.size === doc.pages.length ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  disabled={!selPages.size || selPages.size === doc.pages.length}
                  onClick={() => setConfirmState({
                    title: `Delete ${selPages.size} Pages`,
                    message: `Move ${selPages.size} selected page${selPages.size === 1 ? '' : 's'} to the trash?`,
                    onYes: () => { deletePages([...selPages]); setConfirmState(null); },
                  })}
                  className="w-full px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete {selPages.size || ''}
                </button>
                {selPages.size === doc.pages.length && doc.pages.length > 0 && (
                  <p className={`text-[9px] ${theme.muted}`}>One page must remain</p>
                )}
              </div>
            )}
          </div>

          {/* ===== block stack + floaters ===== */}
          <div
            ref={contentRef}
            className="flex-1 min-w-0 flex flex-col relative"
            onContextMenu={(e) => { if (e.target.dataset.npEmpty) openMenu(e, 'empty', null); }}
          >
            <AnimatedScrollbar3D maxHeight="100%" autoHide={false} className="flex-1">
              <div
                data-np-empty
                onContextMenu={(e) => openMenu(e, 'empty', null)}
                className={`p-3 space-y-1 min-h-full ${SCALE_TEXT[settings.scale] || 'text-sm'} ${settings.mono ? 'font-mono' : ''} ${theme.text}`}
              >
                <div data-np-empty style={{ transform: `scale(${settings.zoom})`, transformOrigin: 'top left', width: `${100 / settings.zoom}%` }}>
                  {inlineBlocks.length === 0 && floatingBlocks.length === 0 && (
                    <p className={`${theme.muted} text-center py-8`} data-np-empty>
                      Empty page — use the toolbar or right-click to add blocks
                    </p>
                  )}
                  <Reorder.Group
                    axis="y"
                    values={inlineBlocks}
                    onReorder={(newOrder) => mutatePage((pg) => {
                      const floaters = pg.blocks.filter((b) => b.floating);
                      pg.blocks = [...newOrder, ...floaters];
                    })}
                    className="space-y-1"
                  >
                    {inlineBlocks.map((b, i) => {
                      const lineCount = b.text ? b.text.split('\n').length : 1;
                      const isCollapsed = collapsed[b.id];
                      const numPrefix = b.type === BT.NUMBER
                        ? `${inlineBlocks.slice(0, i).filter((x) => x.type === BT.NUMBER).length + 1}.`
                        : null;
                      const highlight = findQ.trim() && matches.includes(b.id);
                      const showTyped = settings.anim && !typedDone.has(b.id) && b.type === BT.TEXT && b.text;
                      const chip = b.type === BT.CHECK ? dueChip(b) : null;
                      return (
                        <SortableBlock key={b.id} block={b}>
                          {(controls) => (
                            <div
                              ref={(el) => { blockRefs.current[b.id] = el; }}
                              onClick={(e) => handleBlockRowClick(b, e)}
                              onContextMenu={(e) => openMenu(e, 'block', b.id)}
                              className={`group relative flex items-start gap-1.5 rounded-lg px-1.5 py-1 transition-colors ${
                                blockSel.has(b.id)
                                  ? 'ring-2 ring-sky-400 bg-sky-500/10'
                                  : highlight ? 'ring-2 ring-amber-400' : ''
                              } ${theme.hover} ${wordEraseMode ? 'cursor-crosshair' : ''}`}
                            >
                              {/* drag grip */}
                              <span
                                onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
                                className={`pt-1.5 w-4 flex-shrink-0 cursor-grab active:cursor-grabbing ${isMobile ? 'opacity-30' : 'opacity-0 group-hover:opacity-50'} ${theme.muted}`}
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              {(blockSelMode || blockSel.has(b.id)) && (
                                <span className="pt-1.5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleBlockSel(b.id); }}>
                                  <Check3D checked={blockSel.has(b.id)} onChange={() => toggleBlockSel(b.id)} size={15} />
                                </span>
                              )}

                              {/* marker */}
                              <div className={`pt-1.5 w-6 flex-shrink-0 flex flex-col items-center ${theme.muted}`}>
                                {settings.lines && (
                                  <span className="text-[9px] opacity-50 tabular-nums leading-none mb-0.5">{i + 1}</span>
                                )}
                                {b.type === BT.CHECK && (
                                  <Check3D
                                    checked={!!b.checked}
                                    onChange={() => mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === b.id); if (x) x.checked = !x.checked; })}
                                    size={17}
                                  />
                                )}
                                {b.type === BT.BULLET && <span>•</span>}
                                {b.type === BT.NUMBER && <span className="text-xs font-semibold">{numPrefix}</span>}
                              </div>

                              {/* content */}
                              <div className="flex-1 min-w-0">
                                {b.type === BT.DIVIDER && (
                                  <div className={`my-3 border-t-2 ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
                                )}
                                {b.type === BT.TABLE && (
                                  <TableBlock b={b} theme={theme} onPatch={(cells) => patchBlock(b.id, { cells })} />
                                )}
                                {b.type === BT.DRAW && (
                                  <DrawCanvas
                                    strokes={b.strokes}
                                    height={b.drawH}
                                    theme={doc.settings.theme}
                                    penSize={settings.penW || 2.5}
                                    setPenSize={(w) => patchSettings({ penW: w })}
                                    onCommit={(stroke) => mutatePage((pg) => {
                                      const x = pg.blocks.find((y) => y.id === b.id);
                                      if (!x) return;
                                      x.strokes = stroke === null ? [] : [...(x.strokes || []), stroke];
                                    })}
                                  />
                                )}
                                {b.type !== BT.DIVIDER && b.type !== BT.TABLE && b.type !== BT.DRAW && (
                                  isCollapsed ? (
                                    <button
                                      onClick={() => setCollapsed((c) => ({ ...c, [b.id]: false }))}
                                      className={`w-full text-left italic ${theme.muted} truncate`}
                                    >
                                      {(b.text || '(empty)').split('\n')[0]} …
                                    </button>
                                  ) : showTyped ? (
                                    <Typewriter
                                      text={b.text}
                                      speed={settings.animSpeed || 1}
                                      className={`${b.checked ? 'line-through opacity-60' : ''}`}
                                      onDone={() => setTypedDone((s) => new Set(s).add(b.id))}
                                      onClick={() => {
                                        setTypedDone((s) => new Set(s).add(b.id));
                                        setTimeout(() => taRefs.current[b.id]?.focus(), 30);
                                      }}
                                    />
                                  ) : (
                                    <textarea
                                      ref={(el) => { taRefs.current[b.id] = el; }}
                                      data-block-id={b.id}
                                      value={b.text}
                                      onChange={(e) => handleTaChange(b, e)}
                                      onKeyDown={(e) => handleTaKeyDown(b, e)}
                                      onClick={(e) => handleTaClick(b, e)}
                                      onFocus={() => { activeTa.current = b.id; }}
                                      rows={Math.min(Math.max(lineCount, 1), 20)}
                                      placeholder={b.type === BT.CHECK ? 'Checkbox item…' : b.type === BT.TEXT ? 'Type here — try /check, /table…' : 'Type here…'}
                                      style={{ fontSize: `${settings.textScale || 1}em` }}
                                      className={`w-full resize-y bg-transparent outline-none placeholder:opacity-40 ${b.checked ? 'line-through opacity-60' : ''} ${theme.text}`}
                                    />
                                  )
                                )}
                                {/* due date chip / picker */}
                                {b.type === BT.CHECK && (chip || dueEditId === b.id) && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {dueEditId === b.id ? (
                                      <input
                                        type="date"
                                        autoFocus
                                        defaultValue={b.due || ''}
                                        onChange={(e) => { patchBlock(b.id, { due: e.target.value }); setDueEditId(null); }}
                                        onBlur={() => setDueEditId(null)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-gray-500/40 ${theme.text}`}
                                      />
                                    ) : (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${chip.cls}`}>
                                        <CalendarDays className="w-3 h-3" /> {chip.label}
                                        <button onClick={() => patchBlock(b.id, { due: null })} className="opacity-60 hover:opacity-100">×</button>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Kotlin hover "+" — one-click continue of a list row */}
                              {[BT.CHECK, BT.BULLET, BT.NUMBER].includes(b.type) && !isCollapsed && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); insertBlockBelow(b.type, b.id); }}
                                  className={`absolute right-7 top-1 w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-green-400 border border-gray-500/40 ${theme.hover}`}
                                  title={`New ${b.type} below`}
                                >
                                  +
                                </button>
                              )}
                              {/* ⋮ menu */}
                              <div className={`flex-shrink-0 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity pt-0.5`}>
                                <button
                                  onClick={(e) => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    openMenu({ preventDefault: () => {}, stopPropagation: () => {}, clientX: r.right - 190, clientY: r.bottom + 4 }, 'block', b.id);
                                  }}
                                  className={`p-1 rounded ${theme.hover} ${theme.muted}`}
                                  title="Block options (or right-click)"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </SortableBlock>
                      );
                    })}
                  </Reorder.Group>
                </div>
              </div>
            </AnimatedScrollbar3D>

            {/* Kotlin pin rail — pinned floaters dock as tabs on the right edge */}
            {floatingBlocks.some((b) => b.pinned) && (
              <div className="absolute right-0 top-2 bottom-2 w-6 z-20 flex flex-col items-center gap-1.5">
                {floatingBlocks.filter((b) => b.pinned).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => blockAction(b.id, 'unpin')}
                    className="w-5 min-h-[52px] py-1 rounded-l-lg text-amber-900 text-[9px] font-bold flex items-center justify-center shadow border"
                    style={{ writingMode: 'vertical-rl', backgroundColor: STICKY_COLORS[b.fc || 0].head, borderColor: STICKY_COLORS[b.fc || 0].edge }}
                    title={`${(b.text || 'sticky').split('\n')[0].slice(0, 24)} — click to unpin`}
                  >
                    {(b.text || 'sticky').split('\n')[0].slice(0, 8) || '•'}
                  </button>
                ))}
              </div>
            )}

            {/* Kotlin minimap — block slivers, click to jump (desktop only) */}
            {!isMobile && inlineBlocks.length > 6 && (
              <div ref={miniRef} className="absolute right-1 top-2 bottom-2 w-4 z-20 flex flex-col gap-px opacity-50 hover:opacity-100 transition-opacity">
                {(() => {
                  const total = inlineBlocks.reduce((n, b) => n + Math.max(1, b.text ? b.text.split('\n').length : 1), 0);
                  let acc = 0;
                  return inlineBlocks.map((b) => {
                    const h = Math.max(1, b.text ? b.text.split('\n').length : 1);
                    const top = (acc / total) * 100; acc += h;
                    const col = b.type === BT.CHECK ? '#7FE39A' : b.type === BT.BULLET ? '#5FBCE8' : b.type === BT.NUMBER ? '#FFD76A' : b.type === BT.DRAW ? '#B08FE8' : b.type === BT.DIVIDER ? '#666' : '#3A5570';
                    return (
                      <button
                        key={b.id}
                        onClick={() => blockRefs.current[b.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                        className="w-full rounded-sm hover:scale-x-150 origin-right transition-transform"
                        style={{ position: 'absolute', top: `${top}%`, height: `${Math.max(2, (h / total) * 100)}%`, backgroundColor: col }}
                        title={(b.text || b.type).split('\n')[0].slice(0, 30)}
                      />
                    );
                  });
                })()}
              </div>
            )}

            {/* floating sticky blocks (pinned ones live on the rail) */}
            {floatingBlocks.filter((b) => !b.pinned).map((b) => {
              const sc = STICKY_COLORS[b.fc || 0];
              return (
                <motion.div
                  key={b.id}
                  drag
                  dragMomentum={false}
                  dragConstraints={contentRef}
                  onDragEnd={(_, info) => patchBlock(b.id, { fx: (b.fx || 40) + info.offset.x, fy: (b.fy || 60) + info.offset.y })}
                  className="absolute top-0 left-0 z-30 w-40 sm:w-48 rounded-xl shadow-2xl border-2 cursor-grab active:cursor-grabbing"
                  style={{ x: b.fx || 40, y: b.fy || 60, borderColor: sc.edge + 'aa', backgroundColor: sc.body }}
                >
                  <div className="flex items-center justify-between px-2 py-1 rounded-t-lg" style={{ backgroundColor: sc.head, color: sc.ink }}>
                    <StickyNote className="w-3 h-3" />
                    <div className="flex gap-0.5">
                      <button onClick={() => patchBlock(b.id, { fc: ((b.fc || 0) + 1) % STICKY_COLORS.length })} className="p-0.5 rounded hover:bg-black/10" title="Sticky color">
                        <Palette className="w-3 h-3" style={{ color: sc.ink }} />
                      </button>
                      <button onClick={() => blockAction(b.id, 'pin')} className="p-0.5 rounded hover:bg-black/10" title="Pin to side rail">
                        <Pin className="w-3 h-3" style={{ color: sc.ink }} />
                      </button>
                      <button onClick={() => blockAction(b.id, 'dock')} className="p-0.5 rounded hover:bg-black/10" title="Dock back to page">
                        <CornerDownLeft className="w-3 h-3" style={{ color: sc.ink }} />
                      </button>
                      <button onClick={() => blockAction(b.id, 'del')} className="p-0.5 rounded hover:bg-black/10" title="Delete">
                        <X className="w-3 h-3" style={{ color: sc.ink }} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    ref={(el) => { taRefs.current[b.id] = el; }}
                    data-block-id={b.id}
                    value={b.text}
                    onChange={(e) => setBlockText(b.id, e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full p-2 bg-transparent outline-none resize-none text-xs placeholder:text-black/40"
                    style={{ height: b.fh || 96, color: sc.ink }}
                    placeholder="Sticky note…"
                  />
                  {/* corner resize grip — pointer capture keeps the note from dragging */}
                  <div
                    onPointerDown={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      const grip = e.currentTarget;
                      grip.setPointerCapture(e.pointerId);
                      const startY = e.clientY, startH = b.fh || 96;
                      const move = (ev) => mutatePage((pg) => {
                        const x = pg.blocks.find((y) => y.id === b.id);
                        if (x) x.fh = Math.max(56, Math.min(420, startH + ev.clientY - startY));
                      }, true);
                      const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
                      grip.addEventListener('pointermove', move);
                      grip.addEventListener('pointerup', up);
                    }}
                    className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 cursor-nwse-resize opacity-50 hover:opacity-100"
                    style={{ background: `linear-gradient(135deg, transparent 55%, ${sc.ink}88 55%)`, clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                    title="Drag to resize"
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div
          className={`flex items-center justify-between px-3 py-1 border-t ${theme.side} text-[10px] ${theme.muted}`}
          style={{ zoom: settings.uiScale || 1 }}
        >
          <span>
            {wordCount} words · {page?.blocks.length || 0} blocks
            {checks.n > 0 && ` · ${checks.d}/${checks.n} done`}
            {floatingBlocks.length ? ` · ${floatingBlocks.length} floating` : ''}
            {blockSel.size > 0 && ` · ${blockSel.size} selected`}
          </span>
          <span className="hidden sm:block">autosaved · ctrl+scroll zoom · +shift text · +alt UI</span>
          <span className="sm:hidden">autosaved</span>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${theme.accent} shadow-lg pointer-events-none z-40`}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== context menus — scrollable (Kotlin CtxMenu), bottom-sheet on mobile ===== */}
      {menu && <div className="fixed inset-0 z-[80]" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />}
      <AnimatePresence>
      {menu && (() => {
        const b = page.blocks.find((x) => x.id === menu.id);
        const isTextish = b && TEXTISH.includes(b.type);
        const TINS = '#7FE39A', TTEXT = '#5FBCE8', TSTYLE = '#FFD76A', TARR = '#B08FE8';
        return (
          <motion.div
              key="ctxmenu"
              drag={!isMobile}
              dragControls={menuDrag}
              dragListener={false}
              dragMomentum={false}
              onDragEnd={(_, info) => setMenu((m) => (m ? { ...m, x: m.x + info.offset.x, y: m.y + info.offset.y } : m))}
              initial={isMobile ? { y: 80, opacity: 0 } : { scale: 0.9, opacity: 0 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: 80, opacity: 0 } : { scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className={isMobile
                ? `fixed inset-x-0 bottom-0 z-[90] rounded-t-2xl border-t-2 shadow-2xl ${theme.panel}`
                : `fixed top-0 left-0 z-[90] rounded-lg border shadow-2xl w-52 ${theme.panel}`}
              style={isMobile ? { maxHeight: '62vh' } : { left: 0, top: 0, x: menu.x, y: menu.y }}
            >
              {/* Kotlin fancy title strip — drag handle on desktop */}
              <div
                onPointerDown={!isMobile ? (e) => { e.stopPropagation(); menuDrag.start(e); } : undefined}
                className={`flex items-center justify-between px-3 py-1.5 border-b ${theme.side} ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
                title={isMobile ? undefined : 'Drag to move menu'}
              >
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-sky-400 via-amber-300 to-fuchsia-400 bg-clip-text text-transparent">
                  Context Menu
                </span>
                <button onClick={() => setMenu(null)} className={`${theme.muted} ${theme.hover} rounded p-0.5`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <AnimatedScrollbar3D maxHeight={isMobile ? '52vh' : '300px'} autoHide={false}>
                <div className="py-1 pb-3">
                  {menu.kind === 'block' && b && (
                    <>
                      {isTextish && (
                        <>
                          <MenuRow theme={theme} icon={Scissors} tint={TINS} label="Cut" onClick={() => { cutSel(menu.id); setMenu(null); }} />
                          <MenuRow theme={theme} icon={Copy} tint={TINS} label="Copy" onClick={() => { copySel(menu.id); setMenu(null); }} />
                          <MenuRow theme={theme} icon={ClipboardCopy} tint={TINS} label="Paste" onClick={() => { pasteAt(menu.id); setMenu(null); }} />
                          <MenuRow theme={theme} icon={TextCursorInput} tint={TINS} label={pageSel ? 'Deselect page' : 'Select all'} onClick={() => {
                            if (pageSel) { setPageSel(false); setBlockSel(new Set()); }
                            else { setPageSel(true); setBlockSel(new Set(inlineBlocks.map((x) => x.id))); }
                            setMenu(null);
                          }} />
                          {b.type === BT.CHECK && (
                            <>
                              <MenuRow theme={theme} icon={CheckSquare} tint={TINS} label={b.checked ? 'Uncheck' : 'Check'} onClick={() => { mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === menu.id); if (x) x.checked = !x.checked; }); setMenu(null); }} />
                              <MenuRow theme={theme} icon={ListChecks} tint={TINS} label="Check list" onClick={() => blockAction(menu.id, 'checkrun')} />
                              <MenuRow theme={theme} icon={ListChecks} tint={TINS} label="Uncheck list" onClick={() => blockAction(menu.id, 'uncheckrun')} />
                              <MenuRow theme={theme} icon={CalendarDays} tint={TINS} label="Set due date" onClick={() => { setDueEditId(menu.id); setMenu(null); }} />
                            </>
                          )}
                          <MenuHeader label="Text" tint={TTEXT} />
                          <MenuRow theme={theme} icon={Copy} tint={TTEXT} label="Copy block" onClick={() => { navigator.clipboard?.writeText(b.text); showToast('Block copied'); setMenu(null); }} />
                          <MenuRow theme={theme} icon={CornerDownLeft} tint={TTEXT} label="Duplicate line" onClick={() => { duplicateLine(menu.id); setMenu(null); }} />
                          <MenuRow theme={theme} icon={ArrowUpNarrowWide} tint={TTEXT} label="Sort lines A–Z" onClick={() => blockAction(menu.id, 'sort')} />
                          <MenuRow theme={theme} icon={Clock3} tint={TTEXT} label="Insert timestamp" onClick={() => blockAction(menu.id, 'timestamp')} />
                          <MenuRow theme={theme} icon={SearchX} tint={TTEXT} label="Word erase mode" onClick={() => { setWordEraseMode(true); showToast('Click a word to erase it'); setMenu(null); }} />
                          <MenuHeader label="Turn into" tint={TSTYLE} />
                          {[BT.TEXT, BT.CHECK, BT.BULLET, BT.NUMBER].filter((t) => t !== b.type).map((t) => (
                            <MenuRow key={t} theme={theme} tint={TSTYLE} label={`▸ ${t}`} onClick={() => blockAction(menu.id, 'turninto', t)} />
                          ))}
                        </>
                      )}
                      {b.type === BT.TABLE && (
                        <>
                          <MenuHeader label="Table" tint={TTEXT} />
                          <MenuRow theme={theme} tint={TTEXT} label="+ Row" onClick={() => blockAction(menu.id, 'trow+')} />
                          <MenuRow theme={theme} tint={TTEXT} label="+ Column" onClick={() => blockAction(menu.id, 'tcol+')} />
                          <MenuRow theme={theme} tint={TTEXT} label="− Row" onClick={() => blockAction(menu.id, 'trow-')} />
                          <MenuRow theme={theme} tint={TTEXT} label="− Column" onClick={() => blockAction(menu.id, 'tcol-')} />
                        </>
                      )}
                      {b.type === BT.DRAW && (
                        <>
                          <MenuHeader label="Canvas" tint={TSTYLE} />
                          <MenuRow theme={theme} tint={TSTYLE} label="Clear canvas" onClick={() => { mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === menu.id); if (x) x.strokes = []; }); setMenu(null); }} />
                          <MenuRow theme={theme} tint={TSTYLE} label="Taller" onClick={() => blockAction(menu.id, 'taller')} />
                          <MenuRow theme={theme} tint={TSTYLE} label="Shorter" onClick={() => blockAction(menu.id, 'shorter')} />
                        </>
                      )}
                      <MenuHeader label="Insert" tint={TINS} />
                      {[BT.TEXT, BT.CHECK, BT.BULLET, BT.NUMBER, BT.DIVIDER, BT.TABLE, BT.DRAW].map((t) => (
                        <MenuRow key={t} theme={theme} tint={TINS} label={t.charAt(0).toUpperCase() + t.slice(1)} onClick={() => { insertBlockBelow(t, menu.id); setMenu(null); }} />
                      ))}
                      <MenuHeader label="Block" tint={TARR} />
                      {!b.floating ? (
                        <MenuRow theme={theme} icon={StickyNote} tint={TARR} label="Float as sticky" onClick={() => blockAction(menu.id, 'float')} />
                      ) : (
                        <>
                          <MenuRow theme={theme} icon={Pin} tint={TARR} label={b.pinned ? 'Unpin' : 'Pin to side rail'} onClick={() => blockAction(menu.id, b.pinned ? 'unpin' : 'pin')} />
                          <MenuRow theme={theme} icon={CornerDownLeft} tint={TARR} label="Dock into page" onClick={() => blockAction(menu.id, 'dock')} />
                          <div className="px-3 py-1.5 flex items-center gap-1">
                            <span className={`text-[9px] ${theme.muted} mr-1`}>Sticky</span>
                            {STICKY_COLORS.map((c, i) => (
                              <button
                                key={c.n}
                                onClick={() => { patchBlock(menu.id, { fc: i }); setMenu(null); }}
                                className={`w-4 h-4 rounded-full border-2 ${(b.fc || 0) === i ? 'border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: c.edge }}
                                title={c.n}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      <MenuRow theme={theme} icon={collapsed[menu.id] ? UnfoldVertical : FoldVertical} tint={TARR} label={collapsed[menu.id] ? 'Expand' : 'Collapse'} onClick={() => { setCollapsed((c) => ({ ...c, [menu.id]: !c[menu.id] })); setMenu(null); }} />
                      <MenuRow theme={theme} icon={ChevronUp} tint={TARR} label="Move up" onClick={() => blockAction(menu.id, 'up')} />
                      <MenuRow theme={theme} icon={ChevronDown} tint={TARR} label="Move down" onClick={() => blockAction(menu.id, 'down')} />
                      <MenuRow theme={theme} icon={Copy} tint={TARR} label="Duplicate" onClick={() => blockAction(menu.id, 'dup')} />
                      <MenuRow theme={theme} icon={Trash2} danger label="Delete" onClick={() => blockAction(menu.id, 'del')} />
                    </>
                  )}

                  {menu.kind === 'page' && (
                    <>
                      <MenuRow theme={theme} icon={StickyNote} tint={TARR} label="Open" onClick={() => pageAction(menu.id, 'open')} />
                      <MenuRow theme={theme} icon={Pencil} tint={TARR} label="Rename" onClick={() => { setRenamingPage(menu.id); setMenu(null); }} />
                      <MenuRow theme={theme} icon={ChevronUp} tint={TARR} label="Pin to top" onClick={() => pageAction(menu.id, 'totop')} />
                      <MenuRow theme={theme} icon={Star} tint={TSTYLE} label={doc.pages.find((p) => p.id === menu.id)?.starred ? 'Unstar' : 'Star'} onClick={() => { patchPage(menu.id, { starred: !doc.pages.find((p) => p.id === menu.id)?.starred }); setMenu(null); }} />
                      <MenuRow theme={theme} icon={Copy} tint={TARR} label="Duplicate" onClick={() => { duplicatePage(menu.id); setMenu(null); }} />
                      <MenuRow theme={theme} icon={FolderPlus} tint={TINS} label="Move to folder…" onClick={() => pageAction(menu.id, 'folder')} />
                      <MenuRow theme={theme} icon={FileStack} tint={TARR} label="Jump to page…" onClick={() => { setPopup('nav'); setMenu(null); }} />
                      <MenuRow theme={theme} icon={Plus} tint={TINS} label="New page" onClick={() => { addPage(); setMenu(null); }} />
                      <div className="px-3 py-1.5">
                        <span className={`text-[10px] ${theme.muted}`}>Color</span>
                        <div className="flex gap-1 mt-1">
                          {PAGE_COLORS.map((c, i) => (
                            <button
                              key={c}
                              onClick={() => { patchPage(menu.id, { color: i }); setMenu(null); }}
                              className="w-4 h-4 rounded-full border border-white/30"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={`my-1 border-t ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
                      <MenuRow theme={theme} icon={Trash2} danger label="Move to trash" onClick={() => {
                        if (doc.pages.length <= 1) { showToast("Can't delete last page"); setMenu(null); return; }
                        deletePage(menu.id); setMenu(null);
                      }} />
                    </>
                  )}

                  {menu.kind === 'empty' && (
                    <>
                      <MenuHeader label="Insert" tint={TINS} />
                      {[BT.TEXT, BT.CHECK, BT.BULLET, BT.NUMBER, BT.DIVIDER, BT.TABLE, BT.DRAW].map((t) => (
                        <MenuRow key={t} theme={theme} tint={TINS} label={t.charAt(0).toUpperCase() + t.slice(1)} onClick={() => { addBlock(t); setMenu(null); }} />
                      ))}
                      <MenuRow theme={theme} icon={ListChecks} tint={TINS} label="Checklist 3×" onClick={() => {
                        mutatePage((pg, nd) => { for (let k = 0; k < 3; k++) pg.blocks.push(blockHelpers.newBlock(nd, BT.CHECK)); });
                        setMenu(null);
                      }} />
                      <MenuRow theme={theme} icon={ClipboardCopy} tint={TTEXT} label="Copy page as text" onClick={() => { copyPage(); setMenu(null); }} />
                      <MenuHeader label="Page" tint={TARR} />
                      <MenuRow theme={theme} icon={Plus} tint={TINS} label="New page" onClick={() => { addPage(); setMenu(null); }} />
                      <MenuRow theme={theme} icon={FileStack} tint={TARR} label="Jump to page…" onClick={() => { setPopup('nav'); setMenu(null); }} />
                      <MenuRow theme={theme} icon={ClipboardCopy} tint={TINS} label="Paste" onClick={async () => {
                        setMenu(null);
                        try {
                          const t = await navigator.clipboard.readText();
                          if (t) mutatePage((pg, nd) => pg.blocks.push({ ...blockHelpers.newBlock(nd, BT.TEXT), text: t }));
                        } catch { showToast('Clipboard blocked'); }
                      }} />
                      <MenuRow theme={theme} icon={FoldVertical} tint={TARR} label="Collapse all" onClick={() => { collapseAll(true); setMenu(null); }} />
                      <MenuRow theme={theme} icon={UnfoldVertical} tint={TARR} label="Expand all" onClick={() => { collapseAll(false); setMenu(null); }} />
                    </>
                  )}
                </div>
              </AnimatedScrollbar3D>
            </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* ===== slash-command picker ===== */}
      <AnimatePresence>
        {slashState && slashMatches().length > 0 && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setSlashState(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`fixed z-[86] rounded-xl border shadow-2xl py-1 w-48 ${theme.panel}`}
              style={(() => {
                const r = blockRefs.current[slashState.id]?.getBoundingClientRect();
                const y = r ? Math.min(r.bottom + 4, window.innerHeight - 240) : 120;
                const x = r ? Math.min(Math.max(8, r.left + 30), window.innerWidth - 200) : 20;
                return { left: x, top: y };
              })()}
            >
              <div className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${theme.muted}`}>Insert block</div>
              {slashMatches().map((it) => (
                <button
                  key={it.type}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => slashPick(it.type)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs ${theme.text} ${theme.hover}`}
                >
                  <it.icon className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">{it.label}</span>
                  <span className={`text-[9px] ${theme.muted}`}>/{it.keys[0]}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== floating text-selection toolbar (Kotlin sel UI) ===== */}
      <AnimatePresence>
        {selBar && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onMouseDown={(e) => e.preventDefault()}
            className={`fixed z-[94] flex items-center gap-0.5 px-1.5 py-1 rounded-xl border shadow-2xl ${theme.panel}`}
            style={{ left: Math.max(8, Math.min(selBar.x - 104, window.innerWidth - 220)), top: selBar.y }}
          >
            {[
              { k: 'bold', I: Bold, t: 'Bold' },
              { k: 'italic', I: Italic, t: 'Italic' },
              { k: 'copy', I: Copy, t: 'Copy' },
              { k: 'cut', I: Scissors, t: 'Cut' },
              { k: 'del', I: Trash2, t: 'Delete' },
              { k: 'block', I: TextCursorInput, t: 'Select block' },
            ].map(({ k, I, t }) => (
              <button
                key={k}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selDo(k)}
                className={`p-1.5 rounded-md ${theme.muted} ${theme.hover} ${k === 'del' ? 'hover:text-red-400' : ''}`}
                title={t}
              >
                <I className="w-3.5 h-3.5" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== multi-block selection action bar (Kotlin pageSel banner) ===== */}
      <AnimatePresence>
        {blockSel.size > 0 && !menu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-2xl ${theme.panel}`}
          >
            <span className={`text-[10px] font-bold px-1 ${theme.text}`}>{pageSel ? 'Page' : blockSel.size} selected</span>
            <button onClick={() => blockSelOps('copy')} className={`p-1.5 rounded-md ${theme.hover} ${theme.muted}`} title="Copy"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={() => blockSelOps('float')} className={`p-1.5 rounded-md ${theme.hover} ${theme.muted}`} title="Float"><StickyNote className="w-3.5 h-3.5" /></button>
            <button onClick={() => blockSelOps('del')} className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setBlockSel(new Set()); setPageSel(false); }} className={`p-1.5 rounded-md ${theme.hover} ${theme.muted}`} title="Clear"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== glyph picker dropdown ===== */}
      <AnimatePresence>
        {glyphState && glyphMatches().length > 0 && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setGlyphState(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`fixed z-[86] rounded-xl border shadow-2xl p-1.5 ${theme.panel}`}
              style={(() => {
                const r = blockRefs.current[glyphState.id]?.getBoundingClientRect();
                const y = r ? Math.min(r.bottom + 4, window.innerHeight - 140) : window.innerHeight - 180;
                const x = r ? Math.min(Math.max(8, r.left + 30), window.innerWidth - 190) : 20;
                return { left: x, top: y };
              })()}
            >
              <div className="grid grid-cols-6 gap-0.5">
                {glyphMatches().slice(0, 24).map(([n, e]) => (
                  <button
                    key={n}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => insertGlyph(e)}
                    className={`w-7 h-7 rounded-lg text-base flex items-center justify-center ${theme.hover}`}
                    title={`:${n}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {glyphState.q === '' && (
                <p className={`text-[9px] px-1 pt-1 ${theme.muted}`}>type :name to filter — Enter picks first</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== fixed-position color palette (avoids toolbar overflow clipping) ===== */}
      <AnimatePresence>
        {showPalette && palettePos && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setShowPalette(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed z-[86] p-2 rounded-xl border shadow-2xl bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 grid grid-cols-4 gap-1.5"
              style={{ left: palettePos.x, top: palettePos.y }}
            >
              {PAGE_COLORS.map((c, i) => (
                <button
                  key={c}
                  onClick={() => { patchPage(page.id, { color: i }); setShowPalette(false); }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${page.color === i ? 'border-white ring-2 ring-primary-400' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== move-to-folder popup ===== */}
      {folderMenuPage != null && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/40" onClick={() => { setFolderMenuPage(null); setFolderEdit(null); }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-xl border shadow-2xl p-4 space-y-2 w-60 ${theme.panel}`}
          >
            <p className={`text-sm font-semibold ${theme.text}`}>Move to folder</p>
            <p className={`text-[10px] ${theme.muted} truncate`}>"{doc.pages.find((p) => p.id === folderMenuPage)?.name}"</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {folderNames.map((f) => (
                <button
                  key={f}
                  onClick={() => moveToFolder(folderMenuPage, f)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${theme.hover} ${theme.text}`}
                >
                  <Folder className="w-3.5 h-3.5" /> <span className="truncate">{f}</span>
                </button>
              ))}
              {folderEdit === 'new-page' ? (
                <input
                  autoFocus
                  placeholder="Folder name…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') newFolderFromPage(folderMenuPage, e.target.value);
                    if (e.key === 'Escape') setFolderEdit(null);
                  }}
                  onBlur={(e) => newFolderFromPage(folderMenuPage, e.target.value)}
                  className={`w-full bg-white/10 border border-gray-500/40 rounded-lg px-2 py-1.5 text-xs ${theme.text} outline-none`}
                />
              ) : (
                <button
                  onClick={() => setFolderEdit('new-page')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${theme.hover} ${theme.muted}`}
                >
                  <FolderPlus className="w-3.5 h-3.5" /> New folder…
                </button>
              )}
            </div>
            <div className={`pt-1 border-t ${theme.side} flex gap-2`}>
              <button
                onClick={() => moveToFolder(folderMenuPage, '')}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${theme.hover} ${theme.muted}`}
              >
                No folder
              </button>
              <button
                onClick={() => { setFolderMenuPage(null); setFolderEdit(null); }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs text-white bg-gradient-to-r ${theme.accent}`}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== popups (MenuPanel) ===== */}
      {popup === 'settings' && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          <MenuPanel isOpen onClose={() => setPopup(null)} title="Notepad Settings" subtitle="Look, feel, and behavior" icon={Settings} maxWidth="max-w-sm" scrollMaxH="60vh">
            <div className={`space-y-4 ${theme.text}`}>
              <div>
                <p className={`text-xs font-semibold mb-2 ${theme.muted}`}>Theme</p>
                <div className="flex gap-1.5">
                  {Object.entries(THEMES).map(([k, t]) => (
                    <button
                      key={k}
                      onClick={() => patchSettings({ theme: k })}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${settings.theme === k ? `bg-gradient-to-r ${theme.accent} text-white shadow` : theme.chip}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={`text-xs font-semibold mb-2 ${theme.muted}`}>Text size</p>
                <div className="flex gap-1.5">
                  {['Small', 'Normal', 'Large'].map((s, i) => (
                    <button
                      key={s}
                      onClick={() => patchSettings({ scale: i })}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${settings.scale === i ? `bg-gradient-to-r ${theme.accent} text-white shadow` : theme.chip}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Toggle3D on={settings.mono} onChange={(v) => patchSettings({ mono: v })} label="Monospace font" />
                <Toggle3D on={settings.lines} onChange={(v) => patchSettings({ lines: v })} label="Line numbers" />
                <Toggle3D on={settings.anim} onChange={(v) => patchSettings({ anim: v })} label="Typing animation" />
                <Toggle3D on={settings.typeBounce !== false} onChange={(v) => patchSettings({ typeBounce: v })} label="Bounce text while typing" />
                <Toggle3D on={settings.uiAnim !== false} onChange={(v) => patchSettings({ uiAnim: v })} label="UI animations (panels, menus)" />
              </div>
              {settings.anim && (
                <div>
                  <p className={`text-xs font-semibold mb-1 ${theme.muted}`}>Typing animation speed</p>
                  <Slider3D
                    value={settings.animSpeed || 1}
                    min={0.25}
                    max={4}
                    step={0.25}
                    onChange={(v) => patchSettings({ animSpeed: +v.toFixed(2) })}
                    format={(v) => `${v}×`}
                  />
                </div>
              )}
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme.muted}`}>Block text scale</p>
                <Slider3D
                  value={settings.textScale || 1}
                  min={0.8}
                  max={1.6}
                  step={0.05}
                  onChange={(v) => patchSettings({ textScale: +v.toFixed(2) })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme.muted}`}>UI scale (toolbar & sidebar)</p>
                <Slider3D
                  value={settings.uiScale || 1}
                  min={0.85}
                  max={1.3}
                  step={0.05}
                  onChange={(v) => patchSettings({ uiScale: +v.toFixed(2) })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <div>
                <p className={`text-xs font-semibold mb-1 ${theme.muted}`}>Zoom (Ctrl+scroll works too)</p>
                <Slider3D
                  value={settings.zoom}
                  min={0.6}
                  max={2}
                  step={0.05}
                  onChange={(v) => setZoom(v)}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <div className={`pt-2 border-t ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'} space-y-1.5`}>
                <button onClick={downloadMd} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${theme.chip} hover:opacity-80`}>
                  <FileUp className="w-4 h-4" /> Export all pages as Markdown
                </button>
                <button onClick={() => { setPopup(null); fileRef.current?.click(); }} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${theme.chip} hover:opacity-80`}>
                  <FileUp className="w-4 h-4 rotate-180" /> Import .md as new page
                </button>
              </div>
            </div>
          </MenuPanel>
        </div>
      )}

      {popup === 'nav' && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          <MenuPanel isOpen onClose={() => setPopup(null)} title="Jump to Page" subtitle="Quick navigation" icon={FileStack} maxWidth="max-w-sm" scrollMaxH="60vh">
            <div className="space-y-1.5">
              {doc.pages.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => { switchPage(p.id); setPopup(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    p.id === page.id ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.chip} hover:opacity-80`
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PAGE_COLORS[p.color % PAGE_COLORS.length] }} />
                  <span className="truncate flex-1 font-medium">{p.name}</span>
                  {p.starred && <Star className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" />}
                  <span className="text-[10px] opacity-70">{p.blocks.length} blocks</span>
                  <kbd className="text-[9px] opacity-50">#{i + 1}</kbd>
                </button>
              ))}
            </div>
          </MenuPanel>
        </div>
      )}

      {popup === 'templates' && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          <MenuPanel isOpen onClose={() => setPopup(null)} title="New Page from Template" subtitle="Start with a structure" icon={FilePlus2} maxWidth="max-w-sm" scrollMaxH="60vh">
            <div className="grid grid-cols-2 gap-2">
              {PAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => addPageFromTemplate(tpl)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] ${theme.chip}`}
                >
                  <span className="text-2xl">{tpl.emoji}</span>
                  {tpl.name}
                  <span className="text-[9px] opacity-60">{tpl.blocks.length} blocks</span>
                </button>
              ))}
            </div>
          </MenuPanel>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) importMd(e.target.files[0]); e.target.value = ''; }}
      />

      {/* ===== due date editor ===== */}
      {dueEditId && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/40" onClick={() => setDueEditId(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-xl border shadow-2xl p-4 space-y-3 w-64 ${theme.panel}`}
          >
            <p className={`text-sm font-semibold ${theme.text}`}>Due date</p>
            <input
              type="date"
              value={page.blocks.find((b) => b.id === dueEditId)?.due || ''}
              onChange={(e) => patchBlock(dueEditId, { due: e.target.value || null })}
              className={`w-full rounded-lg border px-2 py-1.5 text-sm bg-transparent border-gray-500/40 ${theme.text}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { patchBlock(dueEditId, { due: null }); setDueEditId(null); }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${theme.hover} ${theme.muted}`}
              >
                Clear
              </button>
              <button
                onClick={() => setDueEditId(null)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs text-white bg-gradient-to-r ${theme.accent}`}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmText="Delete"
        type="danger"
        onConfirm={confirmState?.onYes}
        onCancel={() => setConfirmState(null)}
      />
    </motion.div>
  );

  /* ----- one AnimatePresence: launcher <-> pill <-> panel exit/enter ----- */
  return (
    <MotionConfig reducedMotion={settings.uiAnim === false ? 'always' : 'never'}>
      <AnimatePresence mode="wait">
        {!isOpen && launcher}
        {isOpen && mode === 'compact' && compactPill}
        {isOpen && mode !== 'compact' && panel}
      </AnimatePresence>
    </MotionConfig>
  );
};

export default Notepad;
