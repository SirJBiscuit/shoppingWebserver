import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, RefreshCw, Download, Server, Database, 
  GitBranch, Package, ShoppingCart, ChefHat, LogOut,
  CheckCircle, XCircle, AlertCircle, Terminal, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const response = await api.get('/system/check-updates');
      setUpdateInfo(response.data);
    } catch (error) {
      console.error('Failed to check updates:', error);
      alert('Failed to check for updates. Make sure you have admin access.');
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
    }
  };

  const applyUpdates = async () => {
    if (!window.confirm('Apply updates? This will restart the application and reload the page.')) {
      return;
    }

    setUpdating(true);
    setUpdateLog([{ step: 'Starting update process...', status: 'running' }]);

    try {
      const response = await api.post('/system/apply-updates');
      setUpdateLog(response.data.log || []);
      
      if (response.data.success) {
        setUpdateLog(prev => [...prev, { step: 'Update completed successfully!', status: 'success' }]);
        
        // Show countdown
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
      } else {
        setUpdateLog(prev => [...prev, { 
          step: 'Update failed - check logs for details', 
          status: 'error' 
        }]);
        alert('Update failed. Please check the update log for details.');
      }
    } catch (error) {
      console.error('Failed to apply updates:', error);
      setUpdateLog(prev => [...prev, { 
        step: `Error: ${error.response?.data?.details || error.message}`, 
        status: 'error' 
      }]);
      alert('Failed to apply updates: ' + (error.response?.data?.details || error.message));
    } finally {
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">CloudMC Shop</h1>
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
                className="flex items-center text-primary-600 font-medium"
              >
                <Settings className="w-5 h-5 mr-1" />
                Admin
              </button>
              <span className="text-gray-600">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="flex items-center text-gray-600 hover:text-gray-900"
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-primary-600" />
            System Administration
          </h1>
          <p className="text-gray-600 mt-2">Manage updates, view system status, and monitor services</p>
        </div>

        {/* Update Section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Version</p>
                  <p className="text-lg font-mono font-semibold">{updateInfo.currentCommit}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Latest Version</p>
                  <p className="text-lg font-mono font-semibold">{updateInfo.latestCommit}</p>
                </div>
              </div>

              {updateInfo.hasUpdates ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-semibold text-blue-900 mb-2">Updates Available!</p>
                  <div className="space-y-1 mb-4">
                    {updateInfo.commits.map((commit, idx) => (
                      <p key={idx} className="text-sm text-blue-800 font-mono">• {commit}</p>
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
                        Apply Updates
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-900 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    System is up to date
                  </p>
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
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center">
                  <GitBranch className="w-4 h-4 mr-1" />
                  Git Branch
                </p>
                <p className="text-lg font-semibold">{systemStatus.git.branch}</p>
                <p className="text-sm text-gray-500 font-mono">{systemStatus.git.commit}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center">
                  <Database className="w-4 h-4 mr-1" />
                  Database
                </p>
                <p className="text-lg font-semibold">
                  {systemStatus.database.connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-lg font-semibold">
                  {Math.floor(systemStatus.uptime / 3600)}h {Math.floor((systemStatus.uptime % 3600) / 60)}m
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Docker Containers</h3>
              {systemStatus.containers.map((container, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{logs}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
