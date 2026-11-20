import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavDrawerOpen } from '../utils/autoPlacement';

/**
 * UpdateBanner — "a new version is live" prompt.
 *
 * Why index.html instead of /api/version/check: the backend is DOWN during
 * most of a deploy, so an API-based check can't fire right when it matters.
 * index.html is a static file served by the frontend container (or the SW
 * cache), and CRA bakes a content hash into the bundle name
 * (main.<hash>.js) — the hash changing IS the version changing.
 *
 * UX: a bottom-center card that never covers the toolbar or the corner
 * button stacks (bottom-20 on mobile clears MobileBottomNav). Dismissing
 * collapses it to a small pill — a persistent but unobtrusive reminder
 * pinned at the same spot until the update is taken. "Read update"
 * opens the changelog viewer (custom event; navigates home first if
 * the dashboard isn't mounted).
 */
const POLL_MS = 60 * 1000;
const HASH_KEY = 'listzy_build_hash';
const DISMISS_KEY = 'listzy_update_dismissed';
const HASH_RE = /main\.([a-z0-9]+)\.js/;

const fetchBuildHash = async () => {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res.ok) return null; // mid-deploy 502 → try again next poll
    const html = await res.text();
    const match = html.match(HASH_RE);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// "What it adds" — update-server.sh writes the deployed commit range into
// version.json; /api/version serves it. If that's absent (deploy ran with
// an older script, or a plain docker-compose rebuild), fall back to the
// newest commit subjects from /api/changelog so the popup always names a
// real change instead of the generic line.
const fetchUpdateNotes = async () => {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.changes) && data.changes.length) return data.changes;
    }
  } catch { /* backend mid-restart — try the changelog source */ }

  try {
    const res = await fetch('/api/changelog', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) {
      const data = await res.json();
      const msgs = (data.commits || [])
        .map((c) => (c.hash ? `${c.hash.slice(0, 7)} ` : '') + c.message)
        .filter(Boolean)
        .slice(0, 3);
      if (msgs.length) return msgs;
    }
  } catch { /* nothing available */ }
  return [];
};

const UpdateBanner = () => {
  const [mode, setMode] = useState('hidden'); // hidden | card | pill
  const [notes, setNotes] = useState([]);
  const remoteHash = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navDrawerOpen = useNavDrawerOpen();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const remote = await fetchBuildHash();
      if (cancelled || !remote) return;

      const seen = localStorage.getItem(HASH_KEY);
      if (!seen) {
        // First visit after this ships — adopt current build silently
        localStorage.setItem(HASH_KEY, remote);
        return;
      }
      if (remote !== seen) {
        remoteHash.current = remote;
        // A dismissed pill stays dismissed for THAT build; a new build
        // (another deploy) earns the card again.
        const dismissed = localStorage.getItem(DISMISS_KEY);
        setMode(dismissed === remote ? 'pill' : 'card');
        fetchUpdateNotes().then((n) => { if (!cancelled && n.length) setNotes(n); });
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = async () => {
    const remote = remoteHash.current || await fetchBuildHash();
    if (remote) localStorage.setItem(HASH_KEY, remote);
    localStorage.removeItem(DISMISS_KEY);
    window.location.reload();
  };

  // Collapse to the pill — it stays as the reminder until they update
  const handleDismiss = () => {
    if (remoteHash.current) localStorage.setItem(DISMISS_KEY, remoteHash.current);
    setMode('pill');
  };

  // Open the changelog viewer — it lives on Dashboard, so go home first
  const handleReadUpdate = () => {
    const open = () => window.dispatchEvent(new CustomEvent('listzy:open-changelog'));
    if (pathname === '/') open();
    else { navigate('/'); setTimeout(open, 350); }
  };

  if (navDrawerOpen) return null;

  return (
    <AnimatePresence>
      {mode === 'card' && (
        <motion.div
          key="card"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-24px)] max-w-md"
        >
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white shadow-2xl">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 animate-[spin_3s_linear_infinite]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">New version available</p>
                {notes.length ? (
                  <ul className="mt-0.5 text-xs text-indigo-100 leading-snug">
                    {notes.slice(0, 3).map((n) => (
                      <li key={n} className="truncate">• {n}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-0.5 text-xs text-indigo-100">
                    Tap Read update to see what changed.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/20"
                title="Minimize — keeps a small reminder button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleReadUpdate}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/25"
              >
                <BookOpen className="h-4 w-4" />
                Read update
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                Update now
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {mode === 'pill' && (
        <motion.button
          key="pill"
          type="button"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={() => setMode('card')}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-white shadow-xl"
          title="A new version of Listzy is available — tap to view"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">Update</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default UpdateBanner;
