// Shared client-side update flow.
//
// The actual pull/rebuild happens on the host: POST /api/system/update/request
// writes the flag file the host watcher (trigger-update.sh → update-server.sh)
// consumes. The client just needs to ask for the update, then purge every
// layer of cache + storage, drop the session, and hard-reload so the next
// page load pulls fresh assets.

const AUTH_KEYS = ['token', 'user'];

/**
 * Ask the backend to pull latest code and rebuild.
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function requestServerUpdate() {
  try {
    const res = await fetch('/api/system/update/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.success !== false, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Best-effort direct git pull (dev / non-docker environments where the
 * backend runs inside the repo and can exec git). Tolerant of failure —
 * the flag-file watcher is the primary mechanism.
 */
export async function pullLatestCode() {
  try {
    const res = await fetch('/api/admin/git/pull', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Nuke every client-side cache, optionally end the session, then reload.
 * @param {{logout?: boolean, delayMs?: number}} opts
 *   logout   — also wipe auth (token/user) so the user lands on the login
 *              screen after reload. Default true.
 *   delayMs  — wait before reloading so a final toast/flag write lands.
 */
export async function purgeCachesAndReload({ logout = true, delayMs = 1200 } = {}) {
  // Service-worker cache storage
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch { /* non-fatal */ }

  // Unregister service workers so old bundles can't be re-served
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* non-fatal */ }

  // Storage — wipe everything, or everything except auth
  try {
    if (logout) {
      localStorage.clear();
    } else {
      const kept = {};
      for (const k of AUTH_KEYS) kept[k] = localStorage.getItem(k);
      localStorage.clear();
      for (const k of AUTH_KEYS) if (kept[k] != null) localStorage.setItem(k, kept[k]);
    }
    sessionStorage.clear();
  } catch { /* non-fatal */ }

  setTimeout(() => {
    if (logout) {
      // Send them to login with a cache-busting query
      window.location.href = `/login?updated=${Date.now()}`;
    } else {
      window.location.href = `${window.location.pathname}?v=${Date.now()}`;
    }
  }, delayMs);
}

/**
 * Full "Update Now" flow for the changelog + toolbar buttons:
 * flag the host update, attempt a direct pull (best-effort), then purge +
 * logout + reload.
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function runServerUpdateFlow() {
  const result = await requestServerUpdate();
  if (!result.ok) return result;

  // Direct pull is a bonus on dev setups; ignore its result — the host
  // watcher handles production.
  pullLatestCode().catch(() => {});

  return result;
}
