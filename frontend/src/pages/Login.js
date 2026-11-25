import { useState, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, FlaskConical, KeyRound, Eye, EyeOff, Loader2, AlertTriangle, Keyboard, ChevronDown, LogIn, UserPlus } from 'lucide-react';
import { Popup } from '../utils/autoPlacement';
import BetaAccessModal from '../components/beta/BetaAccessModal';
import QuickLoginModal from '../components/auth/QuickLoginModal';
import AnimatedKeyboard from '../components/auth/AnimatedKeyboard';

// Username is persisted only when the user opts in — the key stores no
// credentials, just the name to prefill.
const REMEMBER_KEY = 'listzyRememberedUser';
const readRemembered = () => {
  try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch { return ''; }
};

const Login = () => {
  const [username, setUsername] = useState(readRemembered);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(() => !!readRemembered());
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [betaMenuOpen, setBetaMenuOpen] = useState(false);
  const [betaAnchor, setBetaAnchor] = useState({ x: 0, y: 0 });
  const [betaMode, setBetaMode] = useState('register');
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);          // on-screen keyboard
  const [focusedField, setFocusedField] = useState('username');
  // Touch devices get our keyboard INSTEAD of the OS one — inputMode="none"
  // + readOnly means the OS keyboard can never open, and focusing a field
  // opens ours. Instant, no OS-kb delay, same shape on every device.
  const [isTouch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  );
  const [preferOS, setPreferOS] = useState(false); // user chose the device keyboard
  const usernameRef = useRef(null);
  const useCustomKb = isTouch && !preferOS;
  // Live deploy status — while update-server.sh runs, the maintenance
  // placeholder answers every route with X-Listzy-Maintenance and serves
  // progress.txt/changes.txt. If this tab was already open when a deploy
  // started, show that progress here instead of a dead login form.
  // { step, total, label, changes, failed } | 'back' | null
  const [updateStatus, setUpdateStatus] = useState(null);
  const updatingRef = useRef(false);
  const healthProbeRef = useRef(null);

  const focusWith = (field) => (e) => {
    setFocusedField(field);
    if (useCustomKb) {
      // Only scroll when the keyboard is first opening — re-scrolling on
      // every focus makes the page jump while switching fields.
      if (!kbOpen) {
        setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
      }
      setKbOpen(true);
    }
  };

  // The keyboard's OS-switch key — drop our sheet, make the field editable,
  // blur+refocus so the OS keyboard actually opens.
  const switchToOS = () => {
    setPreferOS(true);
    setKbOpen(false);
    const el = focusedField === 'password' ? passwordRef.current : usernameRef.current;
    if (el) {
      el.blur();
      setTimeout(() => el.focus(), 60);
    }
  };
  const passwordRef = useRef(null);
  const formRef = useRef(null);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const usernameId = useId();
  const passwordId = useId();

  // Custom keyboard targets whichever field was focused last — same
  // mental model as the OS keyboard.
  const typeChar = (k) =>
    (focusedField === 'password' ? setPassword : setUsername)((v) => v + k);
  const backspace = () =>
    (focusedField === 'password' ? setPassword : setUsername)((v) => v.slice(0, -1));
  const kbEnter = () => {
    if (focusedField === 'username' && !password) {
      setFocusedField('password');
      passwordRef.current?.focus();
    } else {
      formRef.current?.requestSubmit();
    }
  };

  // Tap outside the beta chooser / its button dismisses the dropdown.
  useEffect(() => {
    if (!betaMenuOpen) return undefined;
    const onDown = (e) => {
      if (e.target.closest?.('[data-ap-overlay]') || e.target.closest?.('[data-beta-btn]')) return;
      setBetaMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown, { capture: true });
    return () => document.removeEventListener('pointerdown', onDown, { capture: true });
  }, [betaMenuOpen]);

  const openBeta = (mode) => {
    setBetaMode(mode);
    setBetaMenuOpen(false);
    setShowBetaModal(true);
  };

  // Tap outside the fields/keyboard dismisses it — same as the OS kb.
  useEffect(() => {
    if (!kbOpen || !isTouch) return undefined;
    const onDown = (e) => {
      if (e.target.closest?.('input') || e.target.closest?.('label') || e.target.closest?.('[data-animated-kb]')) return;
      setKbOpen(false);
    };
    document.addEventListener('pointerdown', onDown, { capture: true });
    return () => document.removeEventListener('pointerdown', onDown, { capture: true });
  }, [kbOpen, isTouch]);

  // Probe the stack: /api/health answers JSON only from the real backend —
  // the maintenance placeholder returns its HTML page with
  // X-Listzy-Maintenance. While maintenance is detected, progress.txt and
  // changes.txt (bind-mounted into the placeholder) carry live deploy data.
  // When health comes back mid-session, reload for fresh assets.
  useEffect(() => {
    let alive = true;
    let progressTimer = null;
    let healthTimer = null;
    let reloadTimer = null;
    let progressPolling = false;

    const fetchText = (url) =>
      fetch(url, { cache: 'no-store' })
        .then((r) => {
          const ct = r.headers.get('content-type') || '';
          return r.ok && ct.includes('text/plain') ? r.text() : null;
        })
        .catch(() => null);

    const pollProgress = async () => {
      const [prog, changes] = await Promise.all([fetchText('/progress.txt'), fetchText('/changes.txt')]);
      if (!alive) return;
      if (prog) {
        const t = prog.trim();
        let st = null;
        let m = /^fail\|(\d+)\|(.+)$/.exec(t);
        if (m) st = { failed: true, step: 0, total: +m[1], label: m[2] };
        else {
          m = /^done\|(\d+)\|(.+)$/.exec(t);
          if (m) st = { step: +m[1], total: +m[1], label: m[2] };
          else {
            m = /^(\d+)\|(\d+)\|(.+)$/.exec(t);
            if (m) st = { step: +m[1], total: +m[2], label: m[3] };
          }
        }
        if (st) {
          setUpdateStatus({
            ...st,
            changes: changes
              ? changes.split('\n').map((l) => l.trim()).filter((l) => l && l[0] !== '<').slice(0, 6)
              : [],
          });
        }
      }
      if (alive) progressTimer = setTimeout(pollProgress, 2000);
    };

    const checkHealth = async () => {
      let up = false;
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const maint = r.headers.get('x-listzy-maintenance');
        const ct = r.headers.get('content-type') || '';
        up = r.ok && !maint && ct.includes('json');
      } catch { up = false; }
      if (!alive) return;
      if (!up) {
        updatingRef.current = true;
        setUpdateStatus((s) =>
          s && s !== 'back' ? s : { step: 0, total: 1, label: 'Connecting to the update…', changes: [] });
        if (!progressPolling) { progressPolling = true; pollProgress(); }
        healthTimer = setTimeout(checkHealth, 4000);
      } else if (updatingRef.current) {
        setUpdateStatus('back');
        reloadTimer = setTimeout(() => window.location.reload(), 1200);
      }
      // up && !updatingRef: app is healthy and was never seen mid-update —
      // schedule nothing; the probe costs a single request per page load.
    };
    healthProbeRef.current = checkHealth;

    checkHealth();
    return () => {
      alive = false;
      clearTimeout(progressTimer);
      clearTimeout(healthTimer);
      clearTimeout(reloadTimer);
    };
  }, []);

  const persistUsername = () => {
    try {
      if (remember && username.trim()) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* storage optional */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      persistUsername();
      // Navigate to dashboard - no reload needed since AuthContext updates immediately
      navigate('/');
    } else {
      setError(result.error);
      setLoading(false);
      // A dead request can mean a deploy just started — probe for the
      // maintenance placeholder so we can show live progress.
      healthProbeRef.current?.();
    }
  };

  const trackCapsLock = (e) =>
    setCapsLock(typeof e.getModifierState === 'function' && e.getModifierState('CapsLock'));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="card max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-8">
          <ShoppingCart className="w-12 h-12 text-primary-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Listzy</h1>
        </div>
        
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-gray-100">Welcome Back</h2>

        <AnimatePresence>
        {updateStatus && updateStatus !== 'back' && (
          <motion.div
            key="update-status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/70 dark:bg-primary-900/20 p-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-300">
              {updateStatus.failed ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {updateStatus.failed ? 'Update interrupted — restoring…' : 'Listzy is updating'}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-primary-100 dark:bg-primary-900/50 overflow-hidden">
              <motion.div
                className="h-full bg-primary-500 rounded-full"
                animate={{
                  width: `${Math.min(100, Math.round(
                    (updateStatus.step / Math.max(1, updateStatus.total)) * 100))}%`,
                }}
                transition={{ ease: 'easeOut', duration: 0.4 }}
              />
            </div>
            <p className="mt-1.5 text-xs text-primary-600 dark:text-primary-400">
              {updateStatus.failed
                ? `The update hit a problem${updateStatus.label ? ` during "${updateStatus.label}"` : ''} — the previous version is being restored.`
                : `${updateStatus.label}${updateStatus.step > 0 ? ` — step ${updateStatus.step} of ${updateStatus.total}` : ''}`}
            </p>
            {updateStatus.changes?.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                {updateStatus.changes.map((c) => (
                  <li key={c} className="truncate">• {c}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
              This page reloads automatically when the update finishes.
            </p>
          </motion.div>
        )}
        {updateStatus === 'back' && (
          <motion.div
            key="update-back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-3 text-sm font-medium"
          >
            Update complete — reloading…
          </motion.div>
        )}
        </AnimatePresence>

        {error && (
          <motion.div
            key={error}
            animate={{ x: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4"
          >
            {error}
          </motion.div>
        )}
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={usernameId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              ref={usernameRef}
              onFocus={focusWith('username')}
              onPointerDown={() => { if (useCustomKb) setKbOpen(true); }}
              className="input-field text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode={useCustomKb || kbOpen ? 'none' : 'text'}
              enterKeyHint="next"
              autoFocus={!username}
            />
          </div>
          
          <div>
            <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id={passwordId}
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={focusWith('password')}
                onPointerDown={() => { if (useCustomKb) setKbOpen(true); }}
                onKeyDown={trackCapsLock}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                className="input-field text-base pr-11"
                style={{ fontSize: '16px' }}
                required
                autoComplete="current-password"
                inputMode={useCustomKb || kbOpen ? 'none' : 'text'}
                enterKeyHint="go"
                autoFocus={!!username}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {capsLock && (
              <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Caps Lock is on
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              Remember my username
            </label>
            <button
              type="button"
              onClick={() => {
                if (preferOS) { setPreferOS(false); setKbOpen(true); }
                else setKbOpen((o) => !o);
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                kbOpen
                  ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'
              }`}
              title="On-screen keyboard — instant, no OS keyboard delay"
            >
              <Keyboard className="w-4 h-4" /> Keyboard
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Beta Testing Access */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or
              </span>
            </div>
          </div>
          
          <button
            type="button"
            data-beta-btn
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setBetaAnchor({ x: r.left + r.width / 2, y: r.bottom });
              setBetaMenuOpen((o) => !o);
            }}
            className="w-full mt-4 flex items-center justify-center px-4 py-2.5 border-2 border-purple-400 dark:border-purple-500 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors font-medium shadow-sm"
          >
            <FlaskConical className="w-5 h-5 mr-2" />
            Beta Testing Access
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${betaMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
            Beta testers — sign in here, or register with your beta code
          </p>

          {/* Beta chooser — anchored popup on desktop, bottom sheet on mobile */}
          {betaMenuOpen && (
            <Popup
              x={betaAnchor.x}
              y={betaAnchor.y + 4}
              width={252}
              height={148}
              className="z-[85] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => openBeta('login')}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              >
                <LogIn className="w-5 h-5 text-green-500 shrink-0" />
                <span>
                  <span className="block font-medium">Beta tester sign in</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">I already have a tester account</span>
                </span>
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <button
                type="button"
                onClick={() => openBeta('register')}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              >
                <UserPlus className="w-5 h-5 text-purple-500 shrink-0" />
                <span>
                  <span className="block font-medium">New beta tester</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Register with a beta code</span>
                </span>
              </button>
            </Popup>
          )}

          {/* Admin quick access — symbol challenge / one-time code */}
          <button
            type="button"
            onClick={() => setShowQuickLogin(true)}
            className="w-full mt-2 flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <KeyRound className="w-5 h-5 mr-2" />
            Quick Access
          </button>
          <p className="text-xs text-center mt-2 text-gray-400 dark:text-gray-500">
            Admin sign-in that's safe while someone's watching your screen
          </p>
        </div>
        
        {/* Signup temporarily disabled */}
        {/* <p className="text-center mt-6 text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </p> */}
      </div>

      {/* Beta Access Modal */}
      {showBetaModal && (
        <BetaAccessModal
          isOpen={showBetaModal}
          initialMode={betaMode}
          onClose={() => setShowBetaModal(false)}
          onSuccess={() => {
            setShowBetaModal(false);
            navigate('/');
          }}
        />
      )}

      {/* Quick Login Modal */}
      {showQuickLogin && (
        <QuickLoginModal
          isOpen={showQuickLogin}
          onClose={() => setShowQuickLogin(false)}
          initialUsername={username}
          onSuccess={(token, user) => {
            loginWithToken(token, user);
            setShowQuickLogin(false);
            navigate('/');
          }}
        />
      )}

      {/* On-screen keyboard — instant, never waits on the OS keyboard */}
      <AnimatePresence>
        {kbOpen && (
          <AnimatedKeyboard
            onKey={typeChar}
            onBackspace={backspace}
            onEnter={kbEnter}
            onClose={() => setKbOpen(false)}
            onSwitchToOS={isTouch ? switchToOS : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
