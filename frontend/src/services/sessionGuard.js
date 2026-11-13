/**
 * sessionGuard.js — global dead-session recovery.
 *
 * The backend returns 401 for a missing token and 403 "Invalid or expired
 * token" for a dead JWT (expired 7-day token, or a JWT_SECRET change after a
 * redeploy). Most API calls go through raw `fetch` (src/api/*.js and ad-hoc
 * fetches in components) which has no auth handling — so a dead token used to
 * leave the app mounted with an infinite wall of 403s until the user manually
 * cleared localStorage.
 *
 * This wraps window.fetch once: on a 401 (outside auth endpoints) or on a 403
 * whose body is the JWT rejection, it clears the session and bounces to /login.
 * Other 403s (admin gates, feature access, premium checks) are left untouched.
 */

const originalFetch = window.fetch.bind(window);

const AUTH_PATH = /^\/api\/(auth|beta)(\/|$)/;

export const expireSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const requestPath = (input) => {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    return new URL(url, window.location.origin).pathname;
  } catch {
    return '';
  }
};

export const installSessionGuard = () => {
  if (window.__sessionGuardInstalled) return;
  window.__sessionGuardInstalled = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      if (AUTH_PATH.test(requestPath(args[0]))) return response;

      if (response.status === 401) {
        // 401 = request sent no usable token. Only expire when there's nothing
        // stored — a 401 while a token IS stored means the caller forgot the
        // auth header (caller bug, e.g. an unauthenticated fetch), not a dead
        // session, so nuke nothing.
        if (!localStorage.getItem('token')) {
          expireSession();
        } else {
          console.warn('[sessionGuard] 401 despite stored token — auth header missing on:', requestPath(args[0]));
        }
      } else if (response.status === 403) {
        // Peek at the body without consuming the caller's response stream.
        const body = await response.clone().json().catch(() => null);
        if (body?.error === 'Invalid or expired token') {
          expireSession();
        }
      }
    } catch {
      // Guard must never break the caller's request handling.
    }
    return response;
  };
};
