import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bug, Copy, Info, EyeOff, LayoutDashboard, Activity, RefreshCw,
  X, Send, Check, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEditor } from '../contexts/EditorContext';
import api from '../services/api';
import { Portal } from '../utils/autoPlacement';

/**
 * AdminContextPanel — right-click anywhere as an admin → a context
 * panel with admin actions for that exact element.
 *
 * Coexistence rules (so it never fights existing right-click UX):
 *  - opens only for admins
 *  - skips when an inner handler already preventDefault()'d the event
 *    (item CustomContextMenu, beta-pin menus, the AVE editor menu, ...)
 *  - skips inside inputs/textareas/contentEditable so native paste
 *    still works there
 *  - skips clicks inside the panel itself
 *
 * Actions: pin a bug anchored to the element, element info, copy
 * selector/text, session-hide the element, open the layout editor on
 * the containing widget, jump to admin pages, reload.
 */

const MENU_W = 264;
const MENU_H = 400;

const buildSelector = (el) => {
  const parts = [];
  let cur = el;
  for (let depth = 0; cur && cur !== document.body && depth < 5; depth += 1) {
    const tagName = cur.tagName;
    const tag = tagName.toLowerCase();
    if (cur.id) { parts.unshift(`${tag}#${cur.id}`); break; }
    const parent = cur.parentElement;
    let sel = tag;
    if (parent) {
      const sameTag = [...parent.children].filter((c) => c.tagName === tagName);
      if (sameTag.length > 1) sel += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
    }
    parts.unshift(sel);
    cur = parent;
  }
  return parts.join(' > ');
};

const elementLabel = (el) =>
  el.getAttribute('aria-label') ||
  el.getAttribute('title') ||
  el.dataset?.tutorial ||
  el.closest('[data-widget-id]')?.dataset.widgetId ||
  (el.textContent || '').trim().slice(0, 40) ||
  el.tagName.toLowerCase();

const CtxItem = ({ icon: Icon, label, hint, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors rounded-lg ${
      danger ? 'text-red-300 hover:bg-red-900/30' : 'text-slate-200 hover:bg-slate-700/70'
    }`}
  >
    <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
    <span className="flex-1 truncate">{label}</span>
    {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
  </button>
);

const AdminContextPanel = () => {
  const { user } = useAuth();
  const isAdmin = !!(user?.is_admin || user?.isAdmin);
  const { isEditorActive, toggleEditor, selectWidget } = useEditor();
  const navigate = useNavigate();
  const location = useLocation();

  const [menu, setMenu] = useState(null);        // { x, y, el, selector, label }
  const [view, setView] = useState('menu');      // 'menu' | 'pin' | 'info'
  const [pinNote, setPinNote] = useState('');
  const [pinSev, setPinSev] = useState('minor');
  const [pinSending, setPinSending] = useState(false);
  const [pinSent, setPinSent] = useState(false);
  const [copied, setCopied] = useState('');
  const [hideCount, setHideCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const onCtx = (e) => {
      // Another right-click handler already claimed this event — leave it.
      if (e.defaultPrevented) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('[data-admin-ctx]')) return;                       // inside our own panel
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (t.closest('.ctx-menu, [data-context-menu]')) return;         // open custom menus

      e.preventDefault();
      setView('menu');
      setPinNote(''); setPinSev('minor'); setPinSent(false); setCopied('');
      setMenu({
        x: Math.min(e.clientX, window.innerWidth - MENU_W - 8),
        y: Math.min(e.clientY, window.innerHeight - MENU_H - 8),
        px: e.clientX,
        py: e.clientY,
        el: t,
        selector: buildSelector(t),
        label: elementLabel(t),
      });
    };
    document.addEventListener('contextmenu', onCtx);
    return () => document.removeEventListener('contextmenu', onCtx);
  }, [isAdmin]);

  useEffect(() => {
    if (!menu) return undefined;
    const off = (e) => {
      if (!e.target.closest?.('[data-admin-ctx]')) setMenu(null);
    };
    const esc = (e) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('pointerdown', off);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', off);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);

  if (!isAdmin || !menu) return null;

  const widgetEl = menu.el.closest('[data-widget-id]');
  const offsetInEl = () => {
    const r = menu.el.getBoundingClientRect();
    return r.width > 0 && r.height > 0
      ? { offX: (menu.px - r.left) / r.width, offY: (menu.py - r.top) / r.height }
      : { offX: 0.5, offY: 0.5 };
  };

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1200);
    } catch { /* clipboard denied */ }
  };

  const submitPin = async () => {
    if (!pinNote.trim() || pinSending) return;
    setPinSending(true);
    try {
      const { offX, offY } = offsetInEl();
      await api.post('/beta/pins', {
        pagePath: location.pathname,
        x: (menu.px / window.innerWidth) * 100,
        y: ((menu.py + window.scrollY) / document.documentElement.scrollHeight) * 100,
        severity: pinSev,
        note: pinNote.trim(),
        selector: menu.selector,
        offX, offY,
        elementLabel: menu.label,
      });
      setPinSent(true);
      setTimeout(() => setMenu(null), 900);
    } catch {
      setPinSending(false);
    }
  };

  const hideElement = () => {
    menu.el.style.setProperty('visibility', 'hidden', 'important');
    setHideCount((c) => c + 1);
    setMenu(null);
  };

  return (
    <Portal>
      <div data-admin-ctx className="fixed z-[95]" style={{ left: menu.x, top: menu.y }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.14 }}
          className="w-[264px] rounded-xl bg-slate-900/95 backdrop-blur border border-slate-700 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border-b border-slate-700">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Admin</span>
            <span className="flex-1 text-[11px] text-slate-500 truncate" title={menu.selector}>
              {menu.label}
            </span>
            <button type="button" onClick={() => setMenu(null)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {view === 'menu' && (
            <div className="p-1.5">
              <CtxItem icon={Bug} label="Pin a bug here" hint="beta" onClick={() => setView('pin')} />
              <CtxItem icon={Info} label="Element info" onClick={() => setView('info')} />
              <CtxItem
                icon={copied === 'sel' ? Check : Copy}
                label={copied === 'sel' ? 'Selector copied' : 'Copy CSS selector'}
                onClick={() => copy(menu.selector, 'sel')}
              />
              <CtxItem
                icon={copied === 'txt' ? Check : Copy}
                label={copied === 'txt' ? 'Text copied' : 'Copy element text'}
                onClick={() => copy((menu.el.textContent || '').trim(), 'txt')}
              />
              <div className="my-1 border-t border-slate-700/60" />
              {widgetEl && (
                <CtxItem
                  icon={LayoutDashboard}
                  label={isEditorActive ? 'Select in layout editor' : 'Edit layout (select widget)'}
                  hint={widgetEl.dataset.widgetId}
                  onClick={() => {
                    if (!isEditorActive) toggleEditor();
                    selectWidget(widgetEl.dataset.widgetId, widgetEl.dataset.widgetSection || 'dashboard');
                    setMenu(null);
                  }}
                />
              )}
              <CtxItem
                icon={EyeOff}
                label={`Hide element${hideCount ? ` (${hideCount} hidden)` : ''}`}
                hint="session"
                onClick={hideElement}
              />
              <div className="my-1 border-t border-slate-700/60" />
              <CtxItem icon={Activity} label="Admin panel" onClick={() => { navigate('/admin'); setMenu(null); }} />
              <CtxItem icon={RefreshCw} label="Reload page" onClick={() => window.location.reload()} />
            </div>
          )}

          {view === 'pin' && (
            <div className="p-3 space-y-2">
              {pinSent ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm py-4 justify-center">
                  <Check className="w-4 h-4" /> Pin dropped
                </div>
              ) : (
                <>
                  <textarea
                    autoFocus
                    value={pinNote}
                    onChange={(e) => setPinNote(e.target.value)}
                    placeholder="Describe the issue on this element…"
                    rows={3}
                    className="w-full text-xs rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-1">
                    {['minor', 'major', 'critical'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPinSev(s)}
                        className={`flex-1 text-[11px] py-1 rounded-lg border capitalize transition ${
                          pinSev === s ? 'border-blue-400 text-blue-300 bg-blue-900/30' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setView('menu')}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={submitPin}
                      disabled={!pinNote.trim() || pinSending}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" /> {pinSending ? 'Pinning…' : 'Drop pin'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'info' && (
            <div className="p-3 space-y-1.5 text-[11px]">
              {[
                ['Tag', menu.el.tagName.toLowerCase()],
                ['Label', menu.label],
                ['Classes', (menu.el.className && typeof menu.el.className === 'string' ? menu.el.className : '').split(' ').filter(Boolean).slice(0, 8).join(' ') || '—'],
                ['Widget', widgetEl?.dataset.widgetId || '—'],
                ['Tutorial', menu.el.closest('[data-tutorial]')?.dataset.tutorial || '—'],
                ['Size', `${Math.round(menu.el.getBoundingClientRect().width)}×${Math.round(menu.el.getBoundingClientRect().height)}`],
                ['Page', location.pathname],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="w-14 flex-shrink-0 text-slate-500 font-semibold">{k}</span>
                  <span className="text-slate-300 break-all">{v}</span>
                </div>
              ))}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setView('menu')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  {view === 'info' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Back
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </Portal>
  );
};

export default AdminContextPanel;
