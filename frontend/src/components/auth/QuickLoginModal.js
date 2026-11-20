import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, KeyRound, Grid3X3, RotateCcw, Loader2, ShieldCheck } from 'lucide-react';
import { quickLoginAPI } from '../../services/api';

/**
 * QuickLoginModal — admin quick login, safe to use while watched.
 *
 * Symbol tab: server sends a freshly shuffled grid + which POSITIONS of your
 * secret sequence to tap (e.g. 2nd, 5th, 7th). An observer sees only a few
 * taps on a layout that won't exist next time.
 *
 * Code tab: one-time backup codes generated in Admin → Security; each burns
 * on use.
 */
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const QuickLoginModal = ({ isOpen, onClose, onSuccess, initialUsername = '' }) => {
  const [tab, setTab] = useState('symbols'); // 'symbols' | 'code'
  const [username, setUsername] = useState(initialUsername);
  const [challenge, setChallenge] = useState(null); // { challengeToken, grid, positions }
  const [taps, setTaps] = useState([]); // grid indices, in tap order
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setChallenge(null);
    setTaps([]);
    setError('');
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
      setTaps([]);
    } catch (err) {
      fail(err, 'Quick login unavailable');
    } finally {
      setLoading(false);
    }
  };

  const tap = (idx) => {
    if (taps.length >= (challenge?.positions.length || 0)) return;
    setTaps((t) => [...t, idx]);
    setError('');
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

  const needed = challenge?.positions.length || 0;
  const tappedOrder = new Map(taps.map((gridIdx, i) => [gridIdx, i + 1]));

  return (
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
                  />
                  <button type="submit" disabled={loading || !username.trim()} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Get challenge
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                    Tap the{' '}
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {challenge.positions.map(ordinal).join(', ')}
                    </span>{' '}
                    symbols of your sequence
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {challenge.grid.map((symbol, idx) => {
                      const order = tappedOrder.get(idx);
                      return (
                        <motion.button
                          key={symbol}
                          type="button"
                          onClick={() => tap(idx)}
                          whileTap={{ scale: 0.9 }}
                          className={`relative aspect-square text-2xl rounded-xl border-2 flex items-center justify-center transition-colors ${
                            order
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                              : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          {symbol}
                          {order && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {order}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTaps([])}
                      disabled={taps.length === 0}
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
              />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Backup code (e.g. a1b2-c3d4)"
                className="input-field font-mono tracking-wider"
                required
                autoComplete="off"
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
  );
};

export default QuickLoginModal;
