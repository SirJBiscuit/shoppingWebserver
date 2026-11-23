import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, FlaskConical, KeyRound, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import BetaAccessModal from '../components/beta/BetaAccessModal';
import QuickLoginModal from '../components/auth/QuickLoginModal';

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
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const usernameId = useId();
  const passwordId = useId();

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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={usernameId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={trackCapsLock}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                className="input-field text-base pr-11"
                style={{ fontSize: '16px' }}
                required
                autoComplete="current-password"
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
            onClick={() => setShowBetaModal(true)}
            className="w-full mt-4 flex items-center justify-center px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <FlaskConical className="w-5 h-5 mr-2" />
            Beta Testing Access
          </button>
          <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
            Have a beta code? Click here to register or sign in!
          </p>

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
    </div>
  );
};

export default Login;
