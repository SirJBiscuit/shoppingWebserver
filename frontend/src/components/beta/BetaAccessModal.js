import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BetaAccessModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Code, 2: Account, 3: Location, 4: Policy
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Beta Code
  const [betaCode, setBetaCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  
  // Step 2: Account Details
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 3: Location
  const [country, setCountry] = useState('United States');
  const [state, setState] = useState('');
  
  // Step 4: Data Policy
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  
  const { login } = useAuth();

  // Verify beta code
  const handleVerifyCode = async () => {
    if (!betaCode.trim()) {
      setError('Please enter a beta code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/beta/verify-code', { code: betaCode.trim().toUpperCase() });
      
      if (response.data.valid) {
        setCodeVerified(true);
        setStep(2);
      } else {
        setError('Invalid or expired beta code');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Validate account details
  const handleAccountNext = () => {
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!nickname.trim()) {
      setError('Nickname is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setStep(3);
  };

  // Validate location
  const handleLocationNext = () => {
    setError('');

    if (!country.trim()) {
      setError('Country is required');
      return;
    }

    if (!state.trim()) {
      setError('State/Province is required');
      return;
    }

    setStep(4);
  };

  // Register beta tester
  const handleRegister = async () => {
    if (!acceptedPolicy) {
      setError('You must accept the data usage policy');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/beta/register', {
        code: betaCode.trim().toUpperCase(),
        username: username.trim(),
        password,
        betaUsername: username.trim(),
        displayName: nickname.trim(),
        country: country.trim(),
        state: state.trim(),
        acceptedDataPolicy: true
      });

      // Auto-login with the new account
      if (response.data.token) {
        const loginResult = await login(username.trim(), null, response.data.token);
        if (loginResult.success) {
          onSuccess();
        } else {
          setError('Account created but login failed. Please try logging in manually.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create beta account');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Beta Testing Access</h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-6">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      step >= s
                        ? 'bg-white text-purple-600'
                        : 'bg-purple-400/30 text-white/60'
                    }`}
                  >
                    {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-12 h-1 mx-1 transition-colors ${
                        step > s ? 'bg-white' : 'bg-purple-400/30'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 1: Beta Code */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Enter Your Beta Code
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter the beta code provided by the administrator
                  </p>

                  <input
                    type="text"
                    value={betaCode}
                    onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                    placeholder="BLUE-2024-XXXXX"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase tracking-wider text-center text-lg font-mono"
                    maxLength={17}
                    disabled={loading}
                  />

                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || !betaCode.trim()}
                    className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </button>
                </motion.div>
              )}

              {/* Step 2: Account Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Create Your Account
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username (for login)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="beta_john_123"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nickname (display name)
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="John"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This is how admins will see you in feedback
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAccountNext}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Location */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Location Information
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    This helps us improve store location data and pricing
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State/Province
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a state...</option>
                      {usStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleLocationNext}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Data Policy */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Data Usage Policy
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        How We Use Your Data
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your location data (country and state) will <strong>ONLY</strong> be used for training our store location database, improving aisle predictions, and providing accurate pricing information.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        What We Collect
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                        <li>Country and state/province</li>
                        <li>Shopping patterns and preferences</li>
                        <li>Feedback and suggestions</li>
                        <li>App usage statistics</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        What We Do NOT Do
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                        <li>Share your data with third parties</li>
                        <li>Use it for advertising purposes</li>
                        <li>Track your exact location</li>
                        <li>Sell your information</li>
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPolicy}
                      onChange={(e) => setAcceptedPolicy(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I understand and agree to the data usage policy
                    </span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleBack}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={loading || !acceptedPolicy}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BetaAccessModal;
