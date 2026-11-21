/**
 * useRipple — reusable tap-ripple affordance.
 *
 *   const ripple = useRipple();
 *   <button onPointerDown={ripple} className="tap-target ...">
 *
 * Injects a .ripple-ink span at the exact tap point (CSS in index.css:
 * .ripple-host / .ripple-ink / @keyframes tap-ripple). Works on any
 * element, respects prefers-reduced-motion, cleans up on animationend.
 */
export const rippleInk = (e) => {
  const host = e.currentTarget;
  if (!host || typeof host.getBoundingClientRect !== 'function') return;
  host.classList.add('ripple-host');
  const rect = host.getBoundingClientRect();
  const ink = document.createElement('span');
  const size = Math.max(rect.width, rect.height) * 1.1;
  ink.className = 'ripple-ink';
  ink.style.width = `${size}px`;
  ink.style.height = `${size}px`;
  ink.style.left = `${e.clientX - rect.left - size / 2}px`;
  ink.style.top = `${e.clientY - rect.top - size / 2}px`;
  host.appendChild(ink);
  ink.addEventListener('animationend', () => ink.remove());
};

// Stable reference — safe as a direct handler; the hook shape keeps the
// API familiar alongside other hooks.
export const useRipple = () => rippleInk;

/**
 * Indicator classes (index.css) — combine freely:
 *   .tap-target       faint persistent ring, clearer on hover, press shrink
 *   .tap-fill         filled pill + border — reads as a button at rest
 *   .tap-affordance   pulses a few times then settles into .tap-target look
 *   .tap-affordance-loop  keeps breathing until the user acts
 *   .input-field:hover  inputs pick up a border tint automatically
 */
