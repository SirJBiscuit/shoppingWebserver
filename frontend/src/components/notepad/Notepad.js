import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls, Reorder } from 'framer-motion';
import {
  StickyNote, X, Minimize2, Maximize2, Plus, Star,
  Undo2, Redo2, Search, Settings, Palette, Download, ClipboardCopy,
  Type, CheckSquare, List, ListOrdered, Minus as MinusIcon, Table, Pencil,
  ChevronUp, ChevronDown, Copy, Trash2, ArrowUpNarrowWide, Eraser, MoreVertical,
  FoldVertical, UnfoldVertical, Bold, Italic, ShoppingCart, FolderDown, RotateCcw,
  GripVertical, ZoomIn, ZoomOut, FileStack, FilePlus2, FileUp, Scissors, CalendarDays,
  CornerDownLeft
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
  },
};

const SCALE_TEXT = ['text-xs', 'text-sm', 'text-base'];
const DRAW_COLORS = ['#5FBCE8', '#7FE39A', '#FFD76A', '#E35F5F', '#B08FE8', '#FFFFFF'];

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
const DrawCanvas = ({ strokes, onCommit, height, theme }) => {
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
      ctx.lineWidth = 2;
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
            onCommit({ pts: [...cur.current], color: penColor });
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

const ToolBtn = ({ children, onClick, title, on, disabled, theme }) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${
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

  const dragControls = useDragControls();
  const historyRef = useRef(makeHistory());
  const saveTimer = useRef(null);
  const blockRefs = useRef({});
  const taRefs = useRef({});
  const toastTimer = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const fileRef = useRef(null);

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
      if (e.key === 'Escape') { setMenu(null); setPopup(null); setShowPalette(false); setDueEditId(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, mode, doc, userId, undo, redo, showToast]);

  /* ----- ctrl+wheel zoom (non-passive to preventDefault) ----- */
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !isOpen) return;
    const h = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setDoc((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          zoom: Math.min(2, Math.max(0.6, +(prev.settings.zoom + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))),
        },
      }));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [isOpen, mode]);

  /* ----- block ops ----- */
  const addBlock = (type) => {
    mutatePage((pg, nd) => pg.blocks.push(blockHelpers.newBlock(nd, type)));
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} block added`);
  };

  const setBlockText = (id, text) =>
    mutatePage((pg) => { const b = pg.blocks.find((x) => x.id === id); if (b) b.text = text; }, true);

  const patchBlock = (id, patch) =>
    mutatePage((pg) => { const b = pg.blocks.find((x) => x.id === id); if (b) Object.assign(b, patch); });

  /* word/line helpers (erase-word / duplicate-line via caret) */
  const wordAt = (text, idx) => {
    let a = idx, b = idx;
    const isWord = (c) => c && /\S/.test(c);
    while (a > 0 && isWord(text[a - 1])) a--;
    while (b < text.length && isWord(text[b])) b++;
    return a === b ? null : [a, b];
  };

  const eraseWord = (id) => {
    const el = taRefs.current[id];
    const b = page.blocks.find((x) => x.id === id);
    if (!el || !b || !b.text) { showToast('Place caret in the block first'); return; }
    const w = wordAt(b.text, el.selectionStart || 0);
    if (!w) { showToast('No word at caret'); return; }
    mutatePage((pg) => {
      const x = pg.blocks.find((y) => y.id === id);
      x.text = x.text.slice(0, w[0]) + x.text.slice(w[1]);
    });
    showToast('Word erased');
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

  const blockAction = (id, action) => {
    setMenu(null);
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
          break;
        }
        case 'del': pg.blocks.splice(i, 1); break;
        default: break;
      }
    });
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

  /* ----- find & replace ----- */
  const searchable = (b) => b.text && b.type !== BT.DRAW && b.type !== BT.DIVIDER && b.type !== BT.TABLE;
  const countIn = (text, q2) => {
    const t = text.toLowerCase(); let i = t.indexOf(q2), n = 0;
    while (i !== -1) { n++; i = t.indexOf(q2, i + 1); }
    return n;
  };
  const q = findQ.toLowerCase();
  const matches = q.trim()
    ? page.blocks.flatMap((b) => (searchable(b) ? Array(countIn(b.text, q)).fill(b.id) : []))
    : [];
  const pageHits = q.trim() && findAll
    ? doc.pages.map((p) => ({
        page: p,
        count: p.blocks.reduce((n, b) => n + (searchable(b) ? countIn(b.text, q) : 0), 0),
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
        b.text = before.split(findQ).join(replaceQ);
        if (before !== b.text) count += before.split(findQ).length - 1;
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

  const patchSettings = (patch) => setDoc((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  const setZoom = (z) => patchSettings({ zoom: Math.min(2, Math.max(0.6, +z.toFixed(2))) });
  const collapseAll = (to) => {
    const c = {};
    if (to) page.blocks.filter((b) => b.text).forEach((b) => { c[b.id] = true; });
    setCollapsed(c);
  };

  // Clamp ctx-menu inside panel bounds + viewport
  const openMenu = (e, kind, id) => {
    e.preventDefault();
    e.stopPropagation();
    let x = e.clientX, y = e.clientY;
    const r = panelRef.current?.getBoundingClientRect();
    if (r) { x = Math.min(x, r.right - 196); y = Math.min(y, r.bottom - 320); }
    setMenu({ kind, id, x: Math.max(8, x), y: Math.max(8, y) });
  };

  const floatingBlocks = page.blocks.filter((b) => b.floating);
  const inlineBlocks = page.blocks.filter((b) => !b.floating);

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

  if (!isOpen) {
    return <AnimatePresence>{launcher}</AnimatePresence>;
  }

  /* ----- compact pill ----- */
  if (mode === 'compact') {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        onDragEnd={(_, info) => setPos((p) => ({ x: p.x + info.offset.x, y: p.y + info.offset.y }))}
        style={{ x: pos.x, y: pos.y }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
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
  }

  const isFullscreen = mode === 'fullscreen';
  const shellCls = isFullscreen
    ? 'fixed inset-0 z-[70] p-3 sm:p-6'
    : 'fixed top-0 left-0 z-[65] w-[560px] max-w-[calc(100vw-16px)]';
  const panelH = isFullscreen ? 'h-full' : 'h-[520px] max-h-[calc(100vh-100px)]';

  const panel = (
    <motion.div
      drag={!isFullscreen}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={(_, info) => setPos((p) => ({ x: p.x + info.offset.x, y: p.y + info.offset.y }))}
      style={isFullscreen ? {} : { x: pos.x, y: pos.y }}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className={`${shellCls} ${panelH}`}
    >
      <div ref={panelRef} className={`flex flex-col h-full rounded-2xl border-2 shadow-2xl overflow-hidden ${theme.panel}`}>
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
        <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${theme.side} overflow-x-auto`}>
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
          <div className="relative">
            <ToolBtn theme={theme} onClick={() => { setShowPalette((v) => !v); }} on={showPalette} title="Page accent color">
              <Palette className="w-4 h-4" />
            </ToolBtn>
            {showPalette && (
              <div className="absolute top-full right-0 mt-1 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-xl grid grid-cols-4 gap-1.5">
                {PAGE_COLORS.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => { patchPage(page.id, { color: i }); setShowPalette(false); }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${page.color === i ? 'border-white ring-2 ring-primary-400' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
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
          {/* pages sidebar */}
          <div className={`w-32 sm:w-36 flex-shrink-0 flex flex-col border-r ${theme.side}`}>
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
                {!showTrash && doc.pages.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => (selMode ? toggleSelPage(p.id) : switchPage(p.id))}
                    onDoubleClick={() => setRenamingPage(p.id)}
                    onContextMenu={(e) => openMenu(e, 'page', p.id)}
                    className={`group relative px-2 py-1.5 rounded-lg cursor-pointer text-xs font-medium truncate flex items-center gap-1.5 ${
                      p.id === page.id ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.text} ${theme.hover}`
                    }`}
                    title={`${p.name} — right-click for options`}
                  >
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
                ))}
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
                              onContextMenu={(e) => openMenu(e, 'block', b.id)}
                              className={`group flex items-start gap-1.5 rounded-lg px-1.5 py-1 ${highlight ? 'ring-2 ring-amber-400' : ''} ${theme.hover}`}
                            >
                              {/* drag grip */}
                              <span
                                onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
                                className={`pt-1.5 w-4 flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 ${theme.muted}`}
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>

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
                                      onChange={(e) => setBlockText(b.id, e.target.value)}
                                      rows={Math.min(Math.max(lineCount, 1), 20)}
                                      placeholder={b.type === BT.CHECK ? 'Checkbox item…' : 'Type here…'}
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

                              {/* ⋮ menu */}
                              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
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

            {/* floating sticky blocks */}
            {floatingBlocks.map((b) => (
              <motion.div
                key={b.id}
                drag
                dragMomentum={false}
                dragConstraints={contentRef}
                onDragEnd={(_, info) => patchBlock(b.id, { fx: (b.fx || 40) + info.offset.x, fy: (b.fy || 60) + info.offset.y })}
                style={{ x: b.fx || 40, y: b.fy || 60 }}
                className="absolute top-0 left-0 z-30 w-48 rounded-xl shadow-2xl border-2 border-amber-400/60 bg-amber-100/95 dark:bg-amber-900/95 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between px-2 py-1 bg-amber-400/40 rounded-t-lg">
                  <StickyNote className="w-3 h-3 text-amber-700 dark:text-amber-200" />
                  <div className="flex gap-0.5">
                    <button onClick={() => blockAction(b.id, 'dock')} className="p-0.5 rounded hover:bg-amber-400/50" title="Dock back to page">
                      <CornerDownLeft className="w-3 h-3 text-amber-800 dark:text-amber-100" />
                    </button>
                    <button onClick={() => blockAction(b.id, 'del')} className="p-0.5 rounded hover:bg-amber-400/50" title="Delete">
                      <X className="w-3 h-3 text-amber-800 dark:text-amber-100" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={b.text}
                  onChange={(e) => setBlockText(b.id, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  rows={3}
                  className="w-full p-2 bg-transparent outline-none resize-y text-xs text-amber-900 dark:text-amber-100 placeholder:text-amber-600/60"
                  placeholder="Sticky note…"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className={`flex items-center justify-between px-3 py-1 border-t ${theme.side} text-[10px] ${theme.muted}`}>
          <span>{wordCount} words · {page?.blocks.length || 0} blocks{floatingBlocks.length ? ` · ${floatingBlocks.length} floating` : ''}</span>
          <span>autosaved · right-click for menus</span>
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

      {/* ===== context menus ===== */}
      {menu && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div
            className={`fixed z-[90] rounded-lg border shadow-2xl py-1 w-48 max-h-[320px] overflow-y-auto ${theme.panel}`}
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.kind === 'block' && (
              <>
                {[
                  { label: 'Move up', icon: ChevronUp, act: 'up' },
                  { label: 'Move down', icon: ChevronDown, act: 'down' },
                  { label: 'Duplicate block', icon: Copy, act: 'dup' },
                  { label: 'Sort lines A–Z', icon: ArrowUpNarrowWide, act: 'sort' },
                  { label: 'Float as sticky', icon: StickyNote, act: 'float' },
                  { label: 'Dock to page', icon: CornerDownLeft, act: 'dock' },
                ].map((it) => (
                  <button
                    key={it.act}
                    onClick={() => blockAction(menu.id, it.act)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
                  >
                    <it.icon className="w-3.5 h-3.5" /> {it.label}
                  </button>
                ))}
                <button onClick={() => { duplicateLine(menu.id); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <CornerDownLeft className="w-3.5 h-3.5" /> Duplicate line
                </button>
                <button onClick={() => { eraseWord(menu.id); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <Scissors className="w-3.5 h-3.5" /> Erase word at caret
                </button>
                {page.blocks.find((b) => b.id === menu.id)?.type === BT.CHECK && (
                  <button onClick={() => { setDueEditId(menu.id); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                    <CalendarDays className="w-3.5 h-3.5" /> Set due date
                  </button>
                )}
                <button
                  onClick={() => { setCollapsed((c) => ({ ...c, [menu.id]: !c[menu.id] })); setMenu(null); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
                >
                  {collapsed[menu.id] ? <UnfoldVertical className="w-3.5 h-3.5" /> : <FoldVertical className="w-3.5 h-3.5" />}
                  {collapsed[menu.id] ? 'Expand' : 'Collapse'}
                </button>
                <div className={`my-1 border-t ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
                <button onClick={() => blockAction(menu.id, 'del')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/15">
                  <Trash2 className="w-3.5 h-3.5" /> Delete block
                </button>
              </>
            )}

            {menu.kind === 'page' && (
              <>
                <button onClick={() => { setRenamingPage(menu.id); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button onClick={() => { patchPage(menu.id, { starred: !doc.pages.find((p) => p.id === menu.id)?.starred }); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <Star className="w-3.5 h-3.5" /> Toggle star
                </button>
                <button onClick={() => { duplicatePage(menu.id); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
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
                <button
                  onClick={() => {
                    if (doc.pages.length <= 1) { showToast("Can't delete last page"); setMenu(null); return; }
                    deletePage(menu.id); setMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/15"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Move to trash
                </button>
              </>
            )}

            {menu.kind === 'empty' && (
              <>
                {[
                  { label: 'Insert text', type: BT.TEXT, icon: Type },
                  { label: 'Insert checkbox', type: BT.CHECK, icon: CheckSquare },
                  { label: 'Insert bullet', type: BT.BULLET, icon: List },
                  { label: 'Insert numbered', type: BT.NUMBER, icon: ListOrdered },
                  { label: 'Insert divider', type: BT.DIVIDER, icon: MinusIcon },
                  { label: 'Insert table', type: BT.TABLE, icon: Table },
                  { label: 'Insert drawing', type: BT.DRAW, icon: Pencil },
                ].map((it) => (
                  <button
                    key={it.type}
                    onClick={() => { addBlock(it.type); setMenu(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
                  >
                    <it.icon className="w-3.5 h-3.5" /> {it.label}
                  </button>
                ))}
                <div className={`my-1 border-t ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
                <button
                  onClick={async () => {
                    setMenu(null);
                    try {
                      const t = await navigator.clipboard.readText();
                      if (t) mutatePage((pg, nd) => pg.blocks.push({ ...blockHelpers.newBlock(nd, BT.TEXT), text: t }));
                    } catch { showToast('Clipboard blocked'); }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
                >
                  <ClipboardCopy className="w-3.5 h-3.5" /> Paste as block
                </button>
                <button onClick={() => { collapseAll(true); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <FoldVertical className="w-3.5 h-3.5" /> Collapse all blocks
                </button>
                <button onClick={() => { collapseAll(false); setMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}>
                  <UnfoldVertical className="w-3.5 h-3.5" /> Expand all blocks
                </button>
              </>
            )}
          </div>
        </>
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

  return isFullscreen ? (
    <div className="fixed inset-0 z-[69] bg-black/40" onClick={handleClose}>
      <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
        {panel}
      </div>
    </div>
  ) : panel;
};

export default Notepad;
