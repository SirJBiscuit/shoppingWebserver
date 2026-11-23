import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import soundsAPI from '../services/soundsAPI';
import soundManager from '../utils/soundEffects';
import { selectorFor, describeElement } from '../utils/pinLayer';

/**
 * SoundBindings — element-level sound layer.
 *
 * Runtime: ONE delegated capture-phase listener plays each binding's
 * sound when a matching element is interacted with. Bindings are
 * {selector, event, sound_name, file_path} — file plays directly,
 * sound_name goes through the manager's pref→file→synth chain.
 *
 * Pick mode (admin): toggle 'listzy:sound-bind-mode' — hovered elements
 * get a highlight ring and a click captures the selector, swallowed so
 * the element's own action never fires. The picked element is emitted
 * as 'listzy:element-picked' for SoundPanel to finish assigning.
 */

const HL_STYLE = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 99998,
  border: '2px solid rgba(99,102,241,0.9)',
  borderRadius: 8,
  boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
  background: 'rgba(99,102,241,0.08)',
};

const SoundBindings = () => {
  const { user } = useAuth();
  const isAdmin = !!(user?.is_admin || user?.isAdmin);
  const bindingsRef = useRef([]);
  const hoverRef = useRef(null);
  const [picking, setPicking] = useState(false);
  const [hoverDesc, setHoverDesc] = useState('');

  // Load bindings once per session; refresh on panel saves.
  useEffect(() => {
    if (!user) return undefined;
    let dead = false;
    const load = () => soundsAPI.getBindings()
      .then((rows) => { if (!dead) bindingsRef.current = rows || []; })
      .catch(() => {});
    load();
    const refresh = () => load();
    window.addEventListener('listzy:sound-bindings-changed', refresh);
    return () => {
      dead = true;
      window.removeEventListener('listzy:sound-bindings-changed', refresh);
    };
  }, [user]);

  // Delegated playback — one listener per event regardless of binding
  // count. Hover gets a per-binding cooldown so it can't machine-gun.
  useEffect(() => {
    if (!user) return undefined;
    const hoverCooldown = new Map();
    const playFor = (e, event) => {
      for (const b of bindingsRef.current) {
        if (!b.enabled || b.event !== event || !b.selector) continue;
        try {
          if (!e.target.closest?.(b.selector)) continue;
          if (event === 'hover') {
            const now = Date.now();
            if (now - (hoverCooldown.get(b.id) || 0) < 800) return;
            hoverCooldown.set(b.id, now);
          }
          if (b.file_path) {
            const a = new Audio(b.file_path);
            a.volume = 0.5;
            a.play().catch(() => soundManager.play(b.sound_name || 'pop'));
          } else {
            soundManager.play(b.sound_name || 'pop');
          }
          return; // first match wins
        } catch { /* stale selector — skip */ }
      }
    };
    const onClick = (e) => playFor(e, 'click');
    const onOver = (e) => playFor(e, 'hover');
    document.addEventListener('click', onClick, { capture: true, passive: true });
    document.addEventListener('mouseover', onOver, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('mouseover', onOver, { capture: true });
    };
  }, [user]);

  // Pick-mode toggle (admin only) — 'listzy:sound-bind-mode' {detail:{on}}
  useEffect(() => {
    if (!isAdmin) return undefined;
    const onToggle = (e) => setPicking(!!e.detail?.on);
    window.addEventListener('listzy:sound-bind-mode', onToggle);
    return () => window.removeEventListener('listzy:sound-bind-mode', onToggle);
  }, [isAdmin]);

  // Pick-mode handlers — hover highlight + selector capture.
  useEffect(() => {
    if (!picking) return undefined;
    const overlay = hoverRef.current;

    const move = (e) => {
      const el = e.target;
      if (!el || el.closest?.('[data-sound-picker]')) return;
      const r = el.getBoundingClientRect();
      if (overlay) {
        overlay.style.display = 'block';
        overlay.style.left = `${r.left - 3}px`;
        overlay.style.top = `${r.top - 3}px`;
        overlay.style.width = `${r.width + 6}px`;
        overlay.style.height = `${r.height + 6}px`;
      }
      setHoverDesc(describeElement(el));
    };
    const click = (e) => {
      const el = e.target;
      if (el.closest?.('[data-sound-picker]')) return;
      e.preventDefault();
      e.stopPropagation();
      const selector = selectorFor(el);
      if (selector) {
        window.dispatchEvent(new CustomEvent('listzy:element-picked', {
          detail: { selector, label: describeElement(el) },
        }));
      }
      setPicking(false);
      window.dispatchEvent(new CustomEvent('listzy:sound-bind-mode', { detail: { on: false } }));
    };
    const esc = (e) => {
      if (e.key === 'Escape') {
        setPicking(false);
        window.dispatchEvent(new CustomEvent('listzy:sound-bind-mode', { detail: { on: false } }));
      }
    };
    document.addEventListener('mousemove', move, { capture: true, passive: true });
    document.addEventListener('click', click, { capture: true });
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousemove', move, { capture: true });
      document.removeEventListener('click', click, { capture: true });
      window.removeEventListener('keydown', esc);
      if (overlay) overlay.style.display = 'none';
    };
  }, [picking]);

  if (!picking) {
    return <div ref={hoverRef} style={{ ...HL_STYLE, display: 'none' }} data-sound-picker />;
  }

  return (
    <>
      <div ref={hoverRef} style={{ ...HL_STYLE, display: 'none' }} data-sound-picker />
      <div
        data-sound-picker
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2 rounded-full
          bg-indigo-600 text-white text-sm font-medium shadow-xl flex items-center gap-3"
      >
        <span className="max-w-[16rem] truncate">
          {hoverDesc || 'Hover an element, click to pick it'}
        </span>
        <button
          type="button"
          onClick={() => {
            setPicking(false);
            window.dispatchEvent(new CustomEvent('listzy:sound-bind-mode', { detail: { on: false } }));
          }}
          className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-2.5 py-1"
        >
          Cancel (Esc)
        </button>
      </div>
    </>
  );
};

export default SoundBindings;
