import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, FlaskConical } from 'lucide-react';
import api from '../services/api';
import BetaAccessModal from '../components/beta/BetaAccessModal';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      // Navigate to dashboard - no reload needed since AuthContext updates immediately
      navigate('/');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="card max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-8">
          <ShoppingCart className="w-12 h-12 text-primary-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Listzy</h1>
        </div>
        
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-gray-100">Welcome Back</h2>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="username"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
            onClick={() => setShowBetaModal(true)}
            className="w-full mt-4 flex items-center justify-center px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <FlaskConical className="w-5 h-5 mr-2" />
            Beta Testing Access
          </button>
          <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
            Have a beta code? Click here to register!
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
    </div>
  );
};

export default Login;
