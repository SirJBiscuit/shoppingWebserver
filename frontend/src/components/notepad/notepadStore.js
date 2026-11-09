/**
 * notepadStore.js — document model + persistence for the Notepad widget.
 *
 * Port of the Kotlin NotepadStore: a doc holds pages, each page holds a
 * stack of typed blocks (text / check / bullet / number / divider /
 * table / draw). Per-user JSON lives in localStorage; undo/redo are
 * JSON page snapshots with typing coalescing (900ms window).
 */

export const BT = {
  TEXT: 'text',
  CHECK: 'check',
  BULLET: 'bullet',
  NUMBER: 'number',
  DIVIDER: 'divider',
  TABLE: 'table',
  DRAW: 'draw',
};

/** 8-entry page accent palette (mirrors the Kotlin PAGE_COLORS set). */
export const PAGE_COLORS = [
  '#5FBCE8', '#7FE39A', '#FFD76A', '#E35F5F',
  '#B08FE8', '#FF8A4F', '#66CCFF', '#9FB3C7',
];

const newBlock = (doc, type) => {
  const b = { id: doc.nextId++, type, text: '', checked: false };
  if (type === BT.TABLE) b.cells = [['', ''], ['', '']];
  if (type === BT.DRAW) { b.strokes = []; b.drawH = 120; }
  return b;
};

const newDoc = () => {
  const doc = {
    pages: [],
    trash: [],
    lastPage: 1,
    nextId: 1,
    settings: { scale: 1, theme: 'dark', mono: false, lines: false, zoom: 1, anim: true, animSpeed: 1, uiAnim: true, textScale: 1, uiScale: 1, typeBounce: true, launcher: false },
  };
  const welcome = { id: doc.nextId++, name: 'Welcome', color: 0, starred: false, blocks: [] };
  welcome.blocks.push(
    { ...newBlock(doc, BT.TEXT), text: '**Notepad**' },
    { ...newBlock(doc, BT.TEXT), text: 'Drag the header to move. Use + buttons for blocks, ⋮ for per-block actions.' },
    { ...newBlock(doc, BT.CHECK), text: 'Try the elements' },
    { ...newBlock(doc, BT.BULLET), text: 'Bullets, numbers, tables, drawing' },
  );
  doc.pages.push(welcome);
  return doc;
};

const storageKey = (userId) => `notepadDoc_${userId || 'anon'}`;

export function loadDoc(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return newDoc();
    const doc = JSON.parse(raw);
    if (!doc.pages || doc.pages.length === 0) return newDoc();
    if (typeof doc.nextId !== 'number' || doc.nextId < 1) {
      doc.nextId = doc.pages.reduce((m, p) => Math.max(m, p.id, ...p.blocks.map(b => b.id)), 0) + 1;
    }
    doc.trash = doc.trash || [];
    doc.settings = { scale: 1, theme: 'dark', mono: false, lines: false, zoom: 1, anim: true, animSpeed: 1, uiAnim: true, textScale: 1, uiScale: 1, typeBounce: true, launcher: false, ...doc.settings };
    return doc;
  } catch {
    return newDoc();
  }
}

export function saveDoc(userId, doc) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

export function exportPageText(page) {
  return page.blocks.map((b) => {
    switch (b.type) {
      case BT.CHECK: return `[${b.checked ? 'x' : ' '}] ${b.text}`;
      case BT.BULLET: return `• ${b.text}`;
      case BT.NUMBER: return `# ${b.text}`;
      case BT.DIVIDER: return '──────────';
      case BT.TABLE: return (b.cells || []).map(r => r.join(' | ')).join('\n');
      case BT.DRAW: return '[drawing]';
      default: return b.text;
    }
  }).join('\n');
}

/**
 * Undo/redo manager — JSON snapshots of a page, coalesced typing.
 * Mirrors the Kotlin checkpoint()/swap() design.
 */
export const makeHistory = () => {
  const undoStack = [];
  const redoStack = [];
  let lastPush = 0;

  const snapshot = (page) => JSON.stringify({ name: page.name, color: page.color, blocks: page.blocks });

  return {
    /** Call before mutating. coalesce=true merges rapid typing into one step. */
    checkpoint(page, coalesce = false) {
      const now = Date.now();
      if (coalesce && now - lastPush < 900 && undoStack.length) { lastPush = now; return; }
      lastPush = now;
      undoStack.push(snapshot(page));
      if (undoStack.length > 40) undoStack.shift();
      redoStack.length = 0;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undo(page) {
      const top = undoStack.pop();
      if (top == null) return null;
      redoStack.push(snapshot(page));
      return JSON.parse(top);
    },
    redo(page) {
      const top = redoStack.pop();
      if (top == null) return null;
      undoStack.push(snapshot(page));
      return JSON.parse(top);
    },
    clear() { undoStack.length = 0; redoStack.length = 0; },
  };
};

export const blockHelpers = { newBlock, newDoc };
