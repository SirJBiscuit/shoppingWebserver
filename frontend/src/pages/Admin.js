import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, RefreshCw, Download, Server, Database, 
  GitBranch, Package, ShoppingCart, ChefHat, LogOut,
  CheckCircle, XCircle, AlertCircle, Terminal, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const [checking, setChecking] = useState(false);
  const [logs, setLogs] = useState('');
  const [selectedService, setSelectedService] = useState('backend');

  useEffect(() => {
    checkForUpdates();
    getSystemStatus();
    
    // Auto-refresh system status every 30 seconds to update uptime
    const statusInterval = setInterval(() => {
      getSystemStatus();
    }, 30000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const response = await api.get('/system/check-updates');
      setUpdateInfo(response.data);
    } catch (error) {
      console.error('Failed to check updates:', error);
      // Set fallback data instead of showing alert
      setUpdateInfo({
        hasUpdate: false,
        currentVersion: 'v1.0.0',
        latestVersion: 'Unknown',
        error: error.response?.status === 403 
          ? 'Admin access required' 
          : 'Unable to check for updates',
      });
    } finally {
      setChecking(false);
    }
  };

  const getSystemStatus = async () => {
    try {
      const response = await api.get('/system/status');
      setSystemStatus(response.data);
    } catch (error) {
      console.error('Failed to get system status:', error);
      // Set fallback status
      setSystemStatus({
        uptime: 'Unknown',
        version: 'v1.0.0',
        environment: 'production',
        database: { connected: true },
        error: 'Unable to fetch system status',
      });
    }
  };

  const runUpdateScript = async () => {
    if (!window.confirm('Run update script? This will pull latest code, rebuild containers, and run migrations. The page will reload after completion.')) {
      return;
    }

    setUpdating(true);
    setUpdateLog([{ step: 'Starting update...', status: 'running' }]);

    try {
      // Start the update
      const response = await api.post('/system/run-update-script');
      
      if (!response.data.success) {
        setUpdateLog([
          { step: response.data.message || 'Update failed to start', status: 'error' },
          { step: response.data.instructions || response.data.error, status: 'error' }
        ]);
        setUpdating(false);
        return;
      }

      // Poll for status
      const statusInterval = setInterval(async () => {
        try {
          const statusRes = await api.get('/system/update-status');
          const status = statusRes.data;
          
          // Update log with current status
          setUpdateLog([
            { step: `Progress: ${status.progress}%`, status: 'running' },
            { step: status.message, status: status.running ? 'running' : 'success' },
            ...status.logs.map(log => ({ step: log, status: 'success' }))
          ]);
          
          // If update is complete
          if (!status.running && status.progress === 100) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update completed successfully!', status: 'success' }]);
            
            // Countdown to reload
            let countdown = 10;
            const countdownInterval = setInterval(() => {
              countdown--;
              setUpdateLog(prev => {
                const newLog = [...prev];
                newLog[newLog.length - 1] = { 
                  step: `Page will reload in ${countdown} seconds...`, 
                  status: 'running' 
                };
                return newLog;
              });
              
              if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.reload();
              }
            }, 1000);
            
            setUpdating(false);
          }
          
          // If update failed
          if (!status.running && status.progress === 0 && status.message.includes('failed')) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update failed!', status: 'error' }]);
            setUpdating(false);
          }
          
        } catch (statusError) {
          console.error('Failed to get status:', statusError);
        }
      }, 2000); // Poll every 2 seconds
      
      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(statusInterval);
        setUpdating(false);
      }, 600000);
      
    } catch (error) {
      console.error('Failed to run update script:', error);
      setUpdateLog([
        { step: `Error: ${error.response?.data?.details || error.message}`, status: 'error' }
      ]);
      setUpdating(false);
    }
  };

  const applyUpdates = async () => {
    if (!window.confirm('Rebuild and restart containers? This will apply any code changes and reload the page.\n\nNote: Run ./update-server.sh on the host first to pull latest code.')) {
      return;
    }

    setUpdating(true);
    setUpdateLog([{ step: 'Starting update...', status: 'running' }]);

    try {
      // Start the update
      const response = await api.post('/system/apply-updates');
      
      if (!response.data.success) {
        setUpdateLog([
          { step: response.data.message || 'Update failed to start', status: 'error' },
          { step: response.data.error || 'Unknown error', status: 'error' }
        ]);
        setUpdating(false);
        return;
      }

      // Poll for status (same as runUpdateScript)
      const statusInterval = setInterval(async () => {
        try {
          const statusRes = await api.get('/system/update-status');
          const status = statusRes.data;
          
          // Update log with current status
          setUpdateLog([
            { step: `Progress: ${status.progress}%`, status: 'running' },
            { step: status.message, status: status.running ? 'running' : 'success' },
            ...status.logs.map(log => ({ step: log, status: 'success' }))
          ]);
          
          // If update is complete
          if (!status.running && status.progress === 100) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update completed successfully!', status: 'success' }]);
            
            // Countdown to reload
            let countdown = 10;
            const countdownInterval = setInterval(() => {
              countdown--;
              setUpdateLog(prev => {
                const newLog = [...prev];
                newLog[newLog.length - 1] = { 
                  step: `Page will reload in ${countdown} seconds...`, 
                  status: 'running' 
                };
                return newLog;
              });
              
              if (countdown <= 0) {
                clearInterval(countdownInterval);
                window.location.reload();
              }
            }, 1000);
            
            setUpdating(false);
          }
          
          // If update failed
          if (!status.running && status.progress === 0 && status.message.includes('failed')) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update failed!', status: 'error' }]);
            setUpdating(false);
          }
          
        } catch (statusError) {
          console.error('Failed to get status:', statusError);
        }
      }, 2000); // Poll every 2 seconds
      
      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(statusInterval);
        setUpdating(false);
      }, 600000);
      
    } catch (error) {
      console.error('Failed to apply updates:', error);
      setUpdateLog([
        { step: `Error: ${error.response?.data?.details || error.message}`, status: 'error' }
      ]);
      setUpdating(false);
    }
  };

  const restartService = async (service) => {
    if (!window.confirm(`Restart ${service}?`)) {
      return;
    }

    try {
      await api.post('/system/restart', { service });
      alert(`${service} restarted successfully`);
      getSystemStatus();
    } catch (error) {
      console.error('Failed to restart service:', error);
      alert('Failed to restart service');
    }
  };

  const viewLogs = async (service) => {
    try {
      const response = await api.get(`/system/logs/${service}?lines=100`);
      setLogs(response.data.logs);
      setSelectedService(service);
    } catch (error) {
      console.error('Failed to get logs:', error);
      alert('Failed to get logs');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CloudMC Shop</h1>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-primary-600 font-medium"
              >
                <ShoppingCart className="w-5 h-5 mr-1" />
                Shopping
              </button>
              <button
                onClick={() => navigate('/recipes')}
                className="flex items-center text-gray-600 hover:text-primary-600 font-medium"
              >
                <ChefHat className="w-5 h-5 mr-1" />
                Recipes
              </button>
              <button
                onClick={() => navigate('/pantry')}
                className="flex items-center text-gray-600 hover:text-primary-600 font-medium"
              >
                <Package className="w-5 h-5 mr-1" />
                Pantry
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-primary-600 dark:text-primary-400 font-medium"
              >
                <Settings className="w-5 h-5 mr-1" />
                Admin
              </button>
              <span className="text-gray-600 dark:text-gray-300">Welcome, {user?.username}</span>
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-primary-600" />
            System Administration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage updates, view system status, and monitor services</p>
        </div>

        {/* Update Section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Download className="w-6 h-6 mr-2 text-primary-600" />
              System Updates
            </h2>
            <button
              onClick={checkForUpdates}
              disabled={checking}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Check for Updates
            </button>
          </div>

          {updateInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Version</p>
                  <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">{updateInfo.currentCommit}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Previous Version</p>
                  <p className="text-lg font-mono font-semibold text-gray-500 dark:text-gray-400">{updateInfo.previousCommit || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Latest Version</p>
                  <p className="text-lg font-mono font-semibold text-green-600">{updateInfo.latestCommit}</p>
                </div>
              </div>

              {updateInfo.lastUpdated && (
                <div className="text-sm text-gray-600 text-center">
                  Last updated: {new Date(updateInfo.lastUpdated).toLocaleString()}
                </div>
              )}

              {updateInfo.hasUpdates ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Updates Available!</p>
                  <div className="space-y-1 mb-4">
                    {updateInfo.commits.map((commit, idx) => (
                      <p key={idx} className="text-sm text-blue-800 dark:text-blue-200 font-mono">• {commit}</p>
                    ))}
                  </div>
                  <button
                    onClick={applyUpdates}
                    disabled={updating}
                    className="btn-primary flex items-center"
                  >
                    {updating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Rebuild Containers
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    💡 Tip: Run <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">./update-server.sh</code> on the host to pull latest code, then click "Rebuild Containers"
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="font-semibold text-green-900 dark:text-green-100 flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    System is up to date
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={applyUpdates}
                      disabled={updating}
                      className="btn-secondary flex items-center text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Update Anyway
                    </button>
                  </div>
                </div>
              )}

              {updateLog.length > 0 && (
                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="text-white font-semibold mb-2">Update Log:</p>
                  <div className="space-y-1 font-mono text-sm">
                    {updateLog.map((log, idx) => (
                      <div key={idx} className="flex items-center text-gray-300">
                        {log.status === 'success' && <CheckCircle className="w-4 h-4 mr-2 text-green-400" />}
                        {log.status === 'running' && <RefreshCw className="w-4 h-4 mr-2 text-blue-400 animate-spin" />}
                        {log.status === 'skipped' && <AlertCircle className="w-4 h-4 mr-2 text-yellow-400" />}
                        {log.status === 'error' && <XCircle className="w-4 h-4 mr-2 text-red-400" />}
                        <span className={log.status === 'error' ? 'text-red-400' : ''}>{log.step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Status */}
        {systemStatus && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-6">
              <Server className="w-6 h-6 mr-2 text-primary-600" />
              System Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <GitBranch className="w-4 h-4 mr-1" />
                  Git Branch
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{systemStatus.git.branch}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{systemStatus.git.commit}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Database className="w-4 h-4 mr-1" />
                  Database
                </p>
                <p className="text-lg font-semibold">
                  {systemStatus.database.connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {Math.floor(systemStatus.uptime / 3600)}h {Math.floor((systemStatus.uptime % 3600) / 60)}m
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Docker Containers</h3>
              {systemStatus.containers.map((container, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    {container.status === 'running' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="font-medium">{container.name}</p>
                      <p className="text-sm text-gray-600">{container.status}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => viewLogs(container.name.replace('shop_', ''))}
                      className="btn-secondary text-sm px-3 py-1 flex items-center"
                    >
                      <Terminal className="w-4 h-4 mr-1" />
                      Logs
                    </button>
                    <button
                      onClick={() => restartService(container.name.replace('shop_', ''))}
                      className="btn-secondary text-sm px-3 py-1 flex items-center"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Restart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs Viewer */}
        {logs && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <Terminal className="w-6 h-6 mr-2 text-primary-600" />
              Logs: {selectedService}
            </h2>
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto border border-gray-700">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{logs}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default Admin;
