import api from '../services/api';

// Captures uncaught client errors + unhandled rejections and reports them
// to the admin error log (/errors/report). The log feeds the BTCS
// diagnostics view — this is how we see "what broke" before a restore.
// Batched lightly: dedupe identical messages so a render-loop crash
// doesn't hammer the endpoint.

let installed = false;
const seen = new Map(); // message -> last reported ts
const DEDUPE_MS = 60 * 1000;
const MAX_STACK = 4000;

const report = (message, stack) => {
  try {
    const key = String(message || '').slice(0, 300);
    if (!key) return;
    const last = seen.get(key) || 0;
    if (Date.now() - last < DEDUPE_MS) return;
    seen.set(key, Date.now());
    if (seen.size > 200) seen.clear(); // bound memory

    const token = localStorage.getItem('token');
    if (!token) return; // endpoint requires auth

    api.post('/errors/report', {
      message: key,
      stack: String(stack || '').slice(0, MAX_STACK),
      path: window.location.pathname,
      meta: { ua: navigator.userAgent, ts: new Date().toISOString() },
    }).catch(() => {});
  } catch {
    /* never let the reporter crash the app */
  }
};

export const installErrorReporter = () => {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (e) => {
    report(e.message || 'window.onerror', e.error?.stack || `${e.filename}:${e.lineno}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report(
      `Unhandled promise rejection: ${r?.message || r || 'unknown'}`,
      r?.stack
    );
  });
};
