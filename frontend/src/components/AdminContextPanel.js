import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bug, Copy, Info, EyeOff, LayoutDashboard, Activity, RefreshCw,
  X, Check, ChevronUp, Shield, Crosshair, Award, Code, LocateFixed
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEditor } from '../contexts/EditorContext';
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
  const [view, setView] = useState('menu');      // 'menu' | 'info'
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
      setCopied('');
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

  const copy = async (text, tag) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(''), 1200);
    } catch { /* clipboard denied */ }
  };

  // Hand pinning off to the REAL pin layer — BetaPinLayer listens for
  // this event and opens its own draft composer with full anchor picking,
  // icon/kind/severity controls, quota and list refresh. The old inline
  // form bypassed all of that, which is why its pins landed broken.
  const dropPinHere = () => {
    window.dispatchEvent(new CustomEvent('beta:dropPinAt', {
      detail: { clientX: menu.px, clientY: menu.py }
    }));
    setMenu(null);
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
              <CtxItem icon={Bug} label="Pin a bug here" hint="pin layer" onClick={dropPinHere} />
              <CtxItem icon={Crosshair} label="Inspect elements" hint="toggle"
                onClick={() => { window.dispatchEvent(new CustomEvent('beta:toggleInspect')); setMenu(null); }} />
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
              <CtxItem
                icon={copied === 'html' ? Check : Code}
                label={copied === 'html' ? 'HTML copied' : 'Copy element HTML'}
                onClick={() => copy((menu.el.outerHTML || '').slice(0, 20000), 'html')}
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
              <CtxItem icon={LocateFixed} label="Scroll element into view"
                onClick={() => { menu.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setMenu(null); }} />
              <div className="my-1 border-t border-slate-700/60" />
              <CtxItem icon={Award} label="BTCS panel"
                onClick={() => { window.dispatchEvent(new CustomEvent('beta:openBtcs')); setMenu(null); }} />
              <CtxItem icon={Activity} label="Beta viewer"
                onClick={() => { window.dispatchEvent(new CustomEvent('beta:openViewer')); setMenu(null); }} />
              <CtxItem icon={Activity} label="Admin panel" onClick={() => { navigate('/admin'); setMenu(null); }} />
              <CtxItem icon={RefreshCw} label="Reload page" onClick={() => window.location.reload()} />
            </div>
          )}

          {view === 'info' && (() => {
            const cs = getComputedStyle(menu.el);
            const r = menu.el.getBoundingClientRect();
            const dataAttrs = Object.keys(menu.el.dataset || {});
            return (
              <div className="p-3 space-y-1.5 text-[11px] max-h-80 overflow-y-auto">
                {[
                  ['Tag', menu.el.tagName.toLowerCase()],
                  ['ID', menu.el.id || '—'],
                  ['Label', menu.label],
                  ['Role', menu.el.getAttribute('role') || '—'],
                  ['Classes', (typeof menu.el.className === 'string' ? menu.el.className : '').split(' ').filter(Boolean).slice(0, 10).join(' ') || '—'],
                  ['data-*', dataAttrs.length ? dataAttrs.map((k) => `${k}="${menu.el.dataset[k]}"`).join(' ') : '—'],
                  ['Widget', widgetEl?.dataset.widgetId || '—'],
                  ['Tutorial', menu.el.closest('[data-tutorial]')?.dataset.tutorial || '—'],
                  ['Link/src', menu.el.getAttribute('href') || menu.el.getAttribute('src') || '—'],
                  ['Size', `${Math.round(r.width)}×${Math.round(r.height)}`],
                  ['Position', `${Math.round(r.x)}, ${Math.round(r.y)} viewport`],
                  ['z-index', cs.zIndex],
                  ['Display', `${cs.display} / ${cs.visibility} / opacity ${cs.opacity}`],
                  ['Pointer', `${cs.pointerEvents} · cursor ${cs.cursor}`],
                  ['Page', location.pathname],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="w-14 flex-shrink-0 text-slate-500 font-semibold">{k}</span>
                    <span className="text-slate-300 break-all">{v}</span>
                  </div>
                ))}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView('menu')}
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <ChevronUp className="w-3 h-3" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(JSON.stringify({ selector: menu.selector, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, computed: { zIndex: cs.zIndex, display: cs.display } }, null, 2), 'info')}
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> {copied === 'info' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      </div>
    </Portal>
  );
};

export default AdminContextPanel;
