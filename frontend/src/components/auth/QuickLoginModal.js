import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, KeyRound, Grid3X3, RotateCcw, Loader2, ShieldCheck, Undo2, Delete, Eye, EyeOff } from 'lucide-react';
import { quickLoginAPI } from '../../services/api';
import { Portal } from '../../utils/autoPlacement';
import PinPad, { gridLayout } from './PinPad';

/**
 * QuickLoginModal — admin quick login, safe to use while watched.
 *
 * Symbol tab: server sends a freshly shuffled grid + which POSITIONS of your
 * secret sequence to tap (e.g. 2nd, 5th, 7th). An observer sees only a few
 * taps on a layout that won't exist next time.
 *
 * Code tab: one-time backup codes generated in Settings → Quick Login; each burns
 * on use.
 */
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Display permutation: which server-grid index sits in each visual cell.
// Re-shuffled after every tap so an observer can't predict where the next
// tap will land — taps are still submitted as server-grid indices.
const shuffledIdx = (n) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const QuickLoginModal = ({ isOpen, onClose, onSuccess, initialUsername = '' }) => {
  const [tab, setTab] = useState('symbols'); // 'symbols' | 'code'
  const [username, setUsername] = useState(initialUsername);
  const [challenge, setChallenge] = useState(null); // { challengeToken, grid, positions }
  const [taps, setTaps] = useState([]); // grid indices, in tap order
  const [display, setDisplay] = useState([]); // visual cell -> server grid index
  const [pinInput, setPinInput] = useState(''); // swipe-collected digits
  const [hideDigits, setHideDigits] = useState(
    // Pattern-first: bubbles are anonymous unless you ask for digits.
    // localStorage can throw (storage-blocked browsers/WebViews) — a crash
    // here unmounts the whole login screen via the error boundary.
    () => {
      try { return localStorage.getItem('quickLoginPadHide') !== '0'; }
      catch { return true; }
    }
  );
  const [entryTap, setEntryTap] = useState(false); // tap bubbles instead of swiping
  const [needsSetup, setNeedsSetup] = useState(false); // no pattern on account
  const [padStyle, setPadStyle] = useState('bubble'); // 'bubble' labeled | 'glyph' anonymous grid

  const toggleHideDigits = () => {
    const next = !hideDigits;
    setHideDigits(next);
    try { localStorage.setItem('quickLoginPadHide', next ? '1' : '0'); }
    catch { /* storage unavailable — preference just won't persist */ }
  };

  const isPinMode = challenge?.mode === 'pin';
  // Each pad has its own secret — the expected length follows the style,
  // falling back to the other credential's when this pad has none yet.
  const pinLen = padStyle === 'glyph'
    ? (challenge?.glyphLen || challenge?.pinLen || 0)
    : (challenge?.pinLen || challenge?.glyphLen || 0);

  // Physical keys: node chars append, Backspace undoes, Enter submits.
  useEffect(() => {
    if (!isPinMode) return undefined;
    const nodeSet = new Set(
      [...(challenge.pad || []), ...(challenge.glyphPad || [])].map((c) => c.d)
    );
    const onKey = (e) => {
      if (nodeSet.has(e.key)) setPinInput((p) => p + e.key);
      else if (e.key === 'Backspace') setPinInput((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPinMode, challenge]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setChallenge(null);
    setTaps([]);
    setDisplay([]);
    setPinInput('');
    setError('');
    setNeedsSetup(false);
  };

  const close = () => {
    reset();
    setCode('');
    onClose?.();
  };

  const fail = (err, fallback) => {
    const msg = err.response?.data?.error || fallback;
    setError(msg);
    if (err.response?.status === 400 && challenge) setChallenge(null);
    setLoading(false);
  };

  const startChallenge = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await quickLoginAPI.challenge(username.trim());
      setChallenge(res.data);
      setDisplay(shuffledIdx(res.data.grid?.length || 0));
      setTaps([]);
      // Open on the account's preferred pad when its secret exists;
      // otherwise whichever pad actually has a credential saved.
      setPadStyle(
        res.data.padMode === 'glyph' && res.data.hasGlyph !== false ? 'glyph'
          : res.data.padMode !== 'glyph' && res.data.hasPin !== false ? 'bubble'
          : res.data.hasGlyph ? 'glyph' : 'bubble'
      );
    } catch (err) {
      if (err.response?.data?.needsSetup) setNeedsSetup(true);
      fail(err, 'Quick login unavailable');
    } finally {
      setLoading(false);
    }
  };

  const tap = (visualIdx) => {
    if (loading || taps.length >= (challenge?.positions?.length || 0)) return;
    const serverIdx = display[visualIdx];
    if (serverIdx === undefined) return;
    setTaps((t) => [...t, serverIdx]);
    // Re-scatter the grid so the next tap lands somewhere unpredictable —
    // unless the admin turned per-tap shuffle off in Security settings.
    if (challenge?.reshuffle !== false) {
      setDisplay((d) => shuffledIdx(d.length).map((i) => d[i]));
    }
    setError('');
  };

  const undoTap = () => setTaps((t) => t.slice(0, -1));

  const submitPin = async () => {
    setLoading(true);
    try {
      const res = await quickLoginAPI.verify({
        challengeToken: challenge.challengeToken,
        pin: pinInput,
      });
      onSuccess?.(res.data.token, res.data.user);
    } catch (err) {
      setPinInput('');
      fail(err, 'Incorrect pattern');
      setLoading(false);
    }
  };

  const submitSymbols = async () => {
    setLoading(true);
    try {
      const res = await quickLoginAPI.verify({
        challengeToken: challenge.challengeToken,
        taps,
      });
      onSuccess?.(res.data.token, res.data.user);
    } catch (err) {
      setTaps([]);
      fail(err, 'Incorrect sequence');
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await quickLoginAPI.code({ username: username.trim(), code: code.trim() });
      onSuccess?.(res.data.token, res.data.user);
    } catch (err) {
      fail(err, 'Invalid code');
      setLoading(false);
    }
  };

  const needed = challenge?.positions?.length || 0;

  return (
    <Portal>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
      onClick={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick Access</h3>
          </div>
          <button type="button" onClick={close} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'symbols', label: 'Symbol Grid', icon: Grid3X3 },
            { id: 'code', label: 'Backup Code', icon: ShieldCheck },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); reset(); }}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === t.id
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {tab === 'symbols' && (
              !challenge ? (
                <form onSubmit={startChallenge} className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter your admin username to get a symbol challenge.
                  </p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="input-field"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="text"
                    enterKeyHint="go"
                    autoFocus
                  />
                  <button type="submit" disabled={loading || !username.trim()} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Get challenge
                  </button>
                  {needsSetup && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-sm text-indigo-800 dark:text-indigo-300">
                      No swipe pattern is set on this account. Sign in with your
                      password first, then create one in <b>Settings → Quick Login</b>.
                      <button
                        type="button"
                        onClick={close}
                        className="mt-2 w-full btn-secondary text-sm"
                      >
                        Sign in with password
                      </button>
                    </div>
                  )}
                </form>
              ) : isPinMode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                    {pinInput.length < pinLen ? (
                      <>
                        {entryTap ? 'Tap your' : padStyle === 'glyph' ? 'Draw your' : 'Swipe your'}{' '}
                        <span className="font-bold text-primary-600 dark:text-primary-400">{pinLen}-node</span>{' '}
                        {padStyle === 'glyph' ? 'glyph' : 'pattern'}
                        <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {pinInput.length} of {pinLen} · chain as many passes as your pattern uses
                        </span>
                      </>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        PIN entered — sign in below
                      </span>
                    )}
                  </p>
                  <p className="text-center text-xl tracking-[0.4em] text-primary-600 dark:text-primary-400 leading-none min-h-[1.5rem]">
                    {'•'.repeat(Math.min(pinInput.length, 40))}
                  </p>
                  <div className="flex justify-center gap-1">
                    {[['Swipe', false], ['Tap', true]].map(([label, isTap]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setEntryTap(isTap)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          entryTap === isTap
                            ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Pad style — same glyph works on either pad; glyph keeps
                      nodes anonymous (the shape is the secret). */}
                  <div className="flex justify-center gap-1">
                    {[['Bubbles', 'bubble'], ['Glyph', 'glyph']].map(([label, style]) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => {
                          setPadStyle(style);
                          try { localStorage.setItem('quickLoginPadStyle', style); } catch { /* storage optional */ }
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          padStyle === style
                            ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <PinPad
                    onDigit={(d) => setPinInput((p) => (p.length < 64 ? p + d : p))}
                    path={pinInput.split('')}
                    disabled={loading}
                    hideDigits={padStyle === 'glyph' ? true : hideDigits}
                    layout={
                      padStyle === 'glyph'
                        // Fall back to a local node grid if the challenge
                        // didn't include one (older backend / stale bundle).
                        ? (challenge.glyphPad || gridLayout(challenge.pad?.length || 9))
                        : challenge.pad
                    }
                    tapMode={entryTap}
                  />
                  {padStyle === 'bubble' && (
                    <button
                      type="button"
                      onClick={toggleHideDigits}
                      className="mx-auto flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Hide pad digits — swipe the shape from muscle memory"
                    >
                      {hideDigits ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {hideDigits ? 'Show pad digits' : 'Hide pad digits'}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPinInput((p) => p.slice(0, -1))}
                      disabled={pinInput.length === 0 || loading}
                      className="btn-secondary text-sm flex items-center justify-center gap-1 disabled:opacity-50 px-3"
                      title="Delete last digit"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinInput('')}
                      disabled={pinInput.length === 0 || loading}
                      className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" /> Clear
                    </button>
                    <button
                      type="button"
                      onClick={submitPin}
                      disabled={loading || (pinLen ? pinInput.length !== pinLen : pinInput.length < 8)}
                      className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Sign in
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
                  >
                    Different account / new challenge
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                    {taps.length < needed ? (
                      <>
                        Tap your{' '}
                        <span className="font-bold text-primary-600 dark:text-primary-400">
                          {ordinal(challenge.positions[taps.length])}
                        </span>{' '}
                        symbol
                        <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {taps.length + 1} of {needed} · in this order
                        </span>
                      </>
                    ) : (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        All {needed} entered — sign in below
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {challenge.positions.map((pos, i) => (
                      <span
                        key={pos}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          i < taps.length
                            ? 'bg-primary-500'
                            : i === taps.length
                              ? 'bg-primary-300 dark:bg-primary-600 animate-pulse'
                              : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {/* No per-cell selected state — an observer can't tell which
                        tiles were tapped. Progress dots carry the feedback. */}
                    {display.map((gridIdx, vi) => (
                      <motion.button
                        key={challenge.grid[gridIdx]}
                        type="button"
                        onClick={() => tap(vi)}
                        whileTap={{ scale: 0.9 }}
                        className="relative aspect-square text-2xl rounded-xl border-2 flex items-center justify-center transition-colors border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 bg-gray-50 dark:bg-gray-700/50"
                      >
                        {challenge.grid[gridIdx]}
                      </motion.button>
                    ))}
                  </div>
                  {challenge.mode !== 'full' && (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                      Positions needed: {challenge.positions.map(ordinal).join(', ')}
                    </p>
                  )}
                  {challenge.mode === 'full' && (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                      Full-sequence mode — tap all {needed} of your symbols in order
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={undoTap}
                      disabled={taps.length === 0 || loading}
                      className="btn-secondary text-sm flex items-center justify-center gap-1 disabled:opacity-50 px-3"
                      title="Undo last tap"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaps([])}
                      disabled={taps.length === 0 || loading}
                      className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" /> Clear
                    </button>
                    <button
                      type="button"
                      onClick={submitSymbols}
                      disabled={loading || taps.length !== needed}
                      className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Sign in
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
                  >
                    Different account / new challenge
                  </button>
                </div>
              )
          )}

          {tab === 'code' && (
            <form onSubmit={submitCode} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Each backup code works once — safe to type anywhere.
              </p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input-field"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="next"
                autoFocus
              />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Backup code (e.g. a1b2-c3d4)"
                className="input-field font-mono tracking-wider"
                required
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="go"
              />
              <button type="submit" disabled={loading || !username.trim() || !code.trim()} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign in with code
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
    </Portal>
  );
};

export default QuickLoginModal;
