import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  StickyNote, X, Minimize2, Maximize2, Plus, Star,
  Undo2, Redo2, Search, Settings, Palette, Download, ClipboardCopy,
  Type, CheckSquare, List, ListOrdered, Minus as MinusIcon, Table, Pencil,
  ChevronUp, ChevronDown, Copy, Trash2, ArrowUpNarrowWide, Eraser, MoreVertical,
  FoldVertical, UnfoldVertical, Bold, Italic
} from 'lucide-react';
import AnimatedScrollbar3D from '../3DAnimatedScrollbar';
import ConfirmModal from '../../limbo/modals/ConfirmModal';
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

/* ---------- Main Notepad ---------- */
const Notepad = ({ isOpen, onClose, userId }) => {
  const [mode, setMode] = useState('window');           // window | fullscreen | compact
  const [doc, setDoc] = useState(() => loadDoc(userId));
  const [menu, setMenu] = useState(null);               // { kind:'block'|'page', id, idx, x, y }
  const [showFind, setShowFind] = useState(false);
  const [findQ, setFindQ] = useState('');
  const [replaceQ, setReplaceQ] = useState('');
  const [findPos, setFindPos] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState('');
  const [renamingPage, setRenamingPage] = useState(null);
  const [pos, setPos] = useState({ x: -1, y: 80 });
  const [collapsed, setCollapsed] = useState({});       // blockId -> bool

  const dragControls = useDragControls();
  const historyRef = useRef(makeHistory());
  const saveTimer = useRef(null);
  const blockRefs = useRef({});
  const taRefs = useRef({});
  const toastTimer = useRef(null);

  const page = doc.pages.find((p) => p.id === doc.lastPage) || doc.pages[0];
  const theme = THEMES[doc.settings.theme] || THEMES.dark;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  /* ----- persistence: load on open, debounced save, save on close ----- */
  useEffect(() => {
    if (isOpen) {
      setDoc(loadDoc(userId));
      historyRef.current.clear();
      setMenu(null); setShowFind(false); setShowSettings(false); setShowPalette(false);
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
      const pg = nd.pages.find((p) => p.id === (nd.lastPage)) || nd.pages[0];
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

  /* ----- keyboard shortcuts ----- */
  useEffect(() => {
    if (!isOpen || mode === 'compact') return;
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveDoc(userId, doc); showToast('Saved'); }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); setShowFind(true); }
      if (e.key === 'Escape') { setMenu(null); setShowSettings(false); setShowPalette(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, mode, doc, userId, undo, redo, showToast]);

  /* ----- block ops ----- */
  const addBlock = (type) => {
    mutatePage((pg) => pg.blocks.push(blockHelpers.newBlock(doc, type)));
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} block added`);
  };

  const setBlockText = (id, text) =>
    mutatePage((pg) => { const b = pg.blocks.find((x) => x.id === id); if (b) b.text = text; }, true);

  const blockAction = (id, action) => {
    setMenu(null);
    mutatePage((pg) => {
      const i = pg.blocks.findIndex((b) => b.id === id);
      if (i < 0) return;
      switch (action) {
        case 'up': if (i > 0) [pg.blocks[i - 1], pg.blocks[i]] = [pg.blocks[i], pg.blocks[i - 1]]; break;
        case 'down': if (i < pg.blocks.length - 1) [pg.blocks[i + 1], pg.blocks[i]] = [pg.blocks[i], pg.blocks[i + 1]]; break;
        case 'dup': {
          const src = pg.blocks[i];
          pg.blocks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(src)), id: doc.nextId++ });
          break;
        }
        case 'sort': {
          const b = pg.blocks[i];
          if (b.text) b.text = b.text.split('\n').sort((a, z) => a.localeCompare(z)).join('\n');
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
  };

  const switchPage = (id) => {
    setDoc((prev) => ({ ...prev, lastPage: id }));
    historyRef.current.clear();
    setMenu(null);
  };

  const patchPage = (id, patch) => {
    setDoc((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  };

  const deletePage = (id) => {
    setDoc((prev) => {
      if (prev.pages.length <= 1) return prev;
      const nd = { ...prev, pages: prev.pages.filter((p) => p.id !== id) };
      if (nd.lastPage === id) nd.lastPage = nd.pages[0].id;
      return nd;
    });
    historyRef.current.clear();
  };

  /* ----- find & replace ----- */
  const matches = findQ.trim()
    ? page.blocks.flatMap((b) => {
        if (!b.text || b.type === BT.DRAW || b.type === BT.DIVIDER || b.type === BT.TABLE) return [];
        const hits = [];
        const t = b.text.toLowerCase();
        const q = findQ.toLowerCase();
        let i = t.indexOf(q);
        while (i !== -1) { hits.push(b.id); i = t.indexOf(q, i + 1); }
        return hits;
      })
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
        if (!b.text || b.type === BT.DRAW || b.type === BT.DIVIDER || b.type === BT.TABLE) return;
        const before = b.text;
        b.text = before.split(findQ).join(replaceQ);
        if (before !== b.text) count += (before.length - b.text.length + replaceQ.length) ? (before.split(findQ).length - 1) : 0;
      });
    });
    showToast(`Replaced ${count} match${count === 1 ? '' : 'es'}`);
    setFindPos(0);
  };

  /* ----- formatting (RichNoteEditor-compatible markers) ----- */
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

  /* ----- export ----- */
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

  const settings = doc.settings;
  const patchSettings = (patch) => setDoc((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  /* ================= render ================= */
  if (!isOpen) return null;

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
      <div className={`flex flex-col h-full rounded-2xl border-2 shadow-2xl overflow-hidden ${theme.panel}`}>
        {/* ===== header (drag handle) ===== */}
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
              title="Compact mode (drag-anywhere pill)"
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
              title="Close"
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
          <ToolBtn theme={theme} onClick={() => wrapSel('**')} title="Bold selection (**text**)"><Bold className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => wrapSel('*')} title="Italic selection (*text*)"><Italic className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={undo} disabled={!historyRef.current.canUndo()} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={redo} disabled={!historyRef.current.canRedo()} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={() => setShowFind((v) => !v)} on={showFind} title="Find & replace (Ctrl+F)"><Search className="w-4 h-4" /></ToolBtn>
          <Sep />
          <ToolBtn theme={theme} onClick={copyPage} title="Copy page as text"><ClipboardCopy className="w-4 h-4" /></ToolBtn>
          <ToolBtn theme={theme} onClick={downloadPage} title="Download page as .txt"><Download className="w-4 h-4" /></ToolBtn>
          <Sep />
          <div className="relative">
            <ToolBtn theme={theme} onClick={() => { setShowPalette((v) => !v); setShowSettings(false); }} on={showPalette} title="Page accent color">
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
          <div className="relative">
            <ToolBtn theme={theme} onClick={() => { setShowSettings((v) => !v); setShowPalette(false); }} on={showSettings} title="Settings">
              <Settings className="w-4 h-4" />
            </ToolBtn>
            {showSettings && (
              <div className={`absolute top-full right-0 mt-1 z-50 p-3 rounded-lg shadow-xl border w-56 ${theme.panel} ${theme.text}`}>
                <p className={`text-xs font-semibold mb-1.5 ${theme.muted}`}>Theme</p>
                <div className="flex gap-1 mb-3">
                  {Object.entries(THEMES).map(([k, t]) => (
                    <button
                      key={k}
                      onClick={() => patchSettings({ theme: k })}
                      className={`flex-1 px-1.5 py-1 rounded text-[11px] font-medium ${settings.theme === k ? `bg-gradient-to-r ${theme.accent} text-white` : theme.chip}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                <p className={`text-xs font-semibold mb-1.5 ${theme.muted}`}>Text size</p>
                <div className="flex gap-1 mb-3">
                  {['Small', 'Normal', 'Large'].map((s, i) => (
                    <button
                      key={s}
                      onClick={() => patchSettings({ scale: i })}
                      className={`flex-1 px-1.5 py-1 rounded text-[11px] font-medium ${settings.scale === i ? `bg-gradient-to-r ${theme.accent} text-white` : theme.chip}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                  <input type="checkbox" checked={settings.mono} onChange={(e) => patchSettings({ mono: e.target.checked })} className="rounded" />
                  Monospace font
                </label>
                <label className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                  <input type="checkbox" checked={settings.lines} onChange={(e) => patchSettings({ lines: e.target.checked })} className="rounded" />
                  Line numbers
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ===== find & replace bar ===== */}
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
            <button onClick={() => setShowFind(false)} className={`p-1 ${theme.muted}`}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ===== body: page sidebar + block stack ===== */}
        <div className="flex flex-1 min-h-0">
          {/* pages sidebar */}
          <div className={`w-32 sm:w-36 flex-shrink-0 flex flex-col border-r ${theme.side}`}>
            <div className="flex items-center justify-between px-2 pt-2">
              <span className={`text-[10px] uppercase font-bold ${theme.muted}`}>Pages</span>
              <button onClick={addPage} className={`p-1 rounded ${theme.hover}`} title="New page">
                <Plus className={`w-3.5 h-3.5 ${theme.muted}`} />
              </button>
            </div>
            <AnimatedScrollbar3D maxHeight="100%" autoHide={false} className="flex-1">
              <div className="p-1.5 space-y-1">
                {doc.pages.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => switchPage(p.id)}
                    onDoubleClick={() => setRenamingPage(p.id)}
                    className={`group relative px-2 py-1.5 rounded-lg cursor-pointer text-xs font-medium truncate flex items-center gap-1.5 ${
                      p.id === page.id ? `bg-gradient-to-r ${theme.accent} text-white` : `${theme.text} ${theme.hover}`
                    }`}
                    title={p.name}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PAGE_COLORS[p.color % PAGE_COLORS.length] }}
                    />
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
                    <button
                      onClick={(e) => { e.stopPropagation(); patchPage(p.id, { starred: !p.starred }); }}
                      className={`flex-shrink-0 ${p.starred ? 'text-yellow-300' : 'opacity-0 group-hover:opacity-60'}`}
                      title="Star page"
                    >
                      <Star className="w-3 h-3" fill={p.starred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (doc.pages.length <= 1) { showToast("Can't delete last page"); return; }
                        setConfirmState({
                          title: 'Delete Page',
                          message: `Delete "${p.name}" and all its blocks?`,
                          onYes: () => { deletePage(p.id); setConfirmState(null); },
                        });
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100"
                      title="Delete page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </AnimatedScrollbar3D>
          </div>

          {/* block stack */}
          <div className="flex-1 min-w-0 flex flex-col">
            <AnimatedScrollbar3D maxHeight="100%" autoHide={false} className="flex-1">
              <div className={`p-3 space-y-1 ${SCALE_TEXT[settings.scale] || 'text-sm'} ${settings.mono ? 'font-mono' : ''} ${theme.text}`}>
                {page.blocks.length === 0 && (
                  <p className={`${theme.muted} text-center py-8`}>
                    Empty page — use the toolbar to add blocks
                  </p>
                )}
                {page.blocks.map((b, i) => {
                  const lineCount = b.text ? b.text.split('\n').length : 1;
                  const isCollapsed = collapsed[b.id];
                  const numPrefix = b.type === BT.NUMBER
                    ? `${page.blocks.slice(0, i).filter((x) => x.type === BT.NUMBER).length + 1}.`
                    : null;
                  const highlight = findQ.trim() && matches.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      ref={(el) => { blockRefs.current[b.id] = el; }}
                      className={`group flex items-start gap-1.5 rounded-lg px-1.5 py-1 ${highlight ? 'ring-2 ring-amber-400' : ''} ${theme.hover}`}
                    >
                      {/* marker */}
                      <div className={`pt-1.5 w-6 flex-shrink-0 flex items-center justify-center ${theme.muted}`}>
                        {b.type === BT.CHECK && (
                          <input
                            type="checkbox"
                            checked={!!b.checked}
                            onChange={(e) => mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === b.id); if (x) x.checked = e.target.checked; })}
                            className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
                          />
                        )}
                        {b.type === BT.BULLET && <span>•</span>}
                        {b.type === BT.NUMBER && <span className="text-xs font-semibold">{numPrefix}</span>}
                        {settings.lines && (b.type === BT.TEXT || b.type === BT.BULLET || b.type === BT.NUMBER) && (
                          <span className="text-[9px] opacity-40 absolute left-0" />
                        )}
                      </div>

                      {/* content */}
                      <div className="flex-1 min-w-0">
                        {b.type === BT.DIVIDER && (
                          <div className={`my-3 border-t-2 ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
                        )}
                        {b.type === BT.TABLE && (
                          <TableBlock b={b} theme={theme} onPatch={(cells) => mutatePage((pg) => { const x = pg.blocks.find((y) => y.id === b.id); if (x) x.cells = cells; })} />
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
                      </div>

                      {/* per-block menu */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5 relative">
                        <button
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setMenu(menu?.id === b.id ? null : { kind: 'block', id: b.id, x: r.left, y: r.bottom + 4 });
                          }}
                          className={`p-1 rounded ${theme.hover} ${theme.muted}`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedScrollbar3D>
          </div>
        </div>

        {/* toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${theme.accent} shadow-lg pointer-events-none`}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== floating block menu ===== */}
      {menu?.kind === 'block' && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setMenu(null)} />
          <div
            className={`fixed z-[90] rounded-lg border shadow-2xl py-1 w-44 ${theme.panel}`}
            style={{ left: Math.min(menu.x, window.innerWidth - 190), top: Math.min(menu.y, window.innerHeight - 260) }}
          >
            {[
              { label: 'Move up', icon: ChevronUp, act: 'up' },
              { label: 'Move down', icon: ChevronDown, act: 'down' },
              { label: 'Duplicate', icon: Copy, act: 'dup' },
              { label: 'Sort lines A–Z', icon: ArrowUpNarrowWide, act: 'sort' },
            ].map((it) => (
              <button
                key={it.act}
                onClick={() => blockAction(menu.id, it.act)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
              >
                <it.icon className="w-3.5 h-3.5" /> {it.label}
              </button>
            ))}
            <button
              onClick={() => { setCollapsed((c) => ({ ...c, [menu.id]: !c[menu.id] })); setMenu(null); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme.text} ${theme.hover}`}
            >
              {collapsed[menu.id] ? <UnfoldVertical className="w-3.5 h-3.5" /> : <FoldVertical className="w-3.5 h-3.5" />}
              {collapsed[menu.id] ? 'Expand' : 'Collapse'}
            </button>
            <div className={`my-1 border-t ${theme === THEMES.parchment ? 'border-amber-300' : 'border-gray-600'}`} />
            <button
              onClick={() => blockAction(menu.id, 'del')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/15"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete block
            </button>
          </div>
        </>
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

export default Notepad;
