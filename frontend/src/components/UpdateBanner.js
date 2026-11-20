import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

/**
 * UpdateBanner — "a new version is live" prompt.
 *
 * Why index.html instead of /api/version/check: the backend is DOWN during
 * most of a deploy, so an API-based check can't fire right when it matters.
 * index.html is a static file served by the frontend container (or the SW
 * cache), and CRA bakes a content hash into the bundle name
 * (main.<hash>.js) — the hash changing IS the version changing.
 *
 * Flow: poll the html every 60s → hash differs from what this tab loaded →
 * banner. "Update now" stamps the new hash and reloads; if the deploy is
 * still running the SW serves the cached old shell and the banner just
 * comes back on the next poll once the new build is actually live.
 */
const POLL_MS = 60 * 1000;
const SNOOZE_MS = 30 * 60 * 1000;
const HASH_KEY = 'listzy_build_hash';
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
// version.json; /api/version serves it. Best-effort: banner still shows
// the generic line if the backend is mid-restart or the field is absent.
const fetchUpdateNotes = async () => {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.changes) ? data.changes : [];
  } catch {
    return [];
  }
};

const UpdateBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [notes, setNotes] = useState([]);
  const snoozeRef = useRef(null);

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
        setShowBanner(true);
        fetchUpdateNotes().then((n) => { if (!cancelled && n.length) setNotes(n); });
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(snoozeRef.current);
    };
  }, []);

  const handleUpdate = async () => {
    const remote = await fetchBuildHash();
    if (remote) localStorage.setItem(HASH_KEY, remote);
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Re-show in 30 min if they still haven't updated
    clearTimeout(snoozeRef.current);
    snoozeRef.current = setTimeout(() => setShowBanner(true), SNOOZE_MS);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-24px)] max-w-lg"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white shadow-xl">
            <RefreshCw className="h-5 w-5 shrink-0 animate-[spin_3s_linear_infinite]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">New version available</p>
              {notes.length ? (
                <ul className="text-xs text-indigo-100 leading-snug">
                  {notes.slice(0, 3).map((n) => (
                    <li key={n} className="truncate">• {n}</li>
                  ))}
                </ul>
              ) : (
                <p className="truncate text-xs text-indigo-100">
                  Listzy was updated — press Update now to get the latest.
                </p>
              )}
            </div>
            <button
              onClick={handleUpdate}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              Update now
            </button>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/20"
              title="Remind me later"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateBanner;
