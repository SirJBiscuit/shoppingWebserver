import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, RefreshCw, Download, Server, Database, 
  GitBranch, Package, ShoppingCart, ChefHat, LogOut,
  CheckCircle, XCircle, AlertCircle, Terminal, Play, Flag,
  Crown, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import FeatureManagerEnhanced from '../components/FeatureManagerEnhanced';
import UserManagement from '../components/UserManagement';

const AdminNew = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState([]);
  const [checking, setChecking] = useState(false);
  const [logs, setLogs] = useState('');
  const [selectedService, setSelectedService] = useState('backend');

  useEffect(() => {
    if (activeTab === 'system') {
      checkForUpdates();
      getSystemStatus();
      
      const statusInterval = setInterval(() => {
        getSystemStatus();
      }, 30000);
      
      return () => clearInterval(statusInterval);
    }
  }, [activeTab]);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const response = await api.get('/system/check-updates');
      setUpdateInfo(response.data);
    } catch (error) {
      console.error('Failed to check updates:', error);
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
      setSystemStatus({
        uptime: 'Unknown',
        version: 'v1.0.0',
        environment: 'production',
        database: { connected: true },
        error: 'Unable to fetch system status',
      });
    }
  };

  const applyUpdates = async () => {
    if (!window.confirm('This will update the system and may cause brief downtime. Continue?')) {
      return;
    }

    setUpdating(true);
    setUpdateLog([{ step: 'Starting update...', status: 'running' }]);

    try {
      await api.post('/admin/git/update');
      
      const statusInterval = setInterval(async () => {
        try {
          const statusRes = await api.get('/system/update-status');
          const status = statusRes.data;
          
          setUpdateLog([
            { step: `Progress: ${status.progress}%`, status: 'running' },
            { step: status.message, status: status.running ? 'running' : 'success' },
            ...status.logs.map(log => ({ step: log, status: 'success' }))
          ]);
          
          if (!status.running && status.progress === 100) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update completed successfully!', status: 'success' }]);
            
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
          
          if (!status.running && status.progress === 0 && status.message.includes('failed')) {
            clearInterval(statusInterval);
            setUpdateLog(prev => [...prev, { step: 'Update failed!', status: 'error' }]);
            setUpdating(false);
          }
          
        } catch (statusError) {
          console.error('Failed to get status:', statusError);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Failed to apply updates:', error);
      setUpdateLog([
        { step: 'Failed to start update', status: 'error' },
        { step: error.response?.data?.error || error.message, status: 'error' }
      ]);
      setUpdating(false);
    }
  };

  const getLogs = async (service) => {
    setSelectedService(service);
    try {
      const response = await api.get(`/system/logs/${service}`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to get logs:', error);
      setLogs('Failed to fetch logs');
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const tabs = [
    { id: 'system', name: 'System & Updates', icon: Server },
    { id: 'features', name: 'Feature Management', icon: Flag },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'logs', name: 'System Logs', icon: Terminal },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-primary-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Listzy Admin</h1>
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
                >
                  <ShoppingCart className="w-5 h-5 mr-1" />
                  Shopping
                </button>
                <button
                  onClick={() => navigate('/premium')}
                  className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
                >
                  <Crown className="w-5 h-5 mr-1" />
                  Premium
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
          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* System & Updates Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                {/* System Status */}
                <div className="card">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-6">
                    <Server className="w-6 h-6 mr-2 text-primary-600" />
                    System Status
                  </h2>
                  {systemStatus && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatUptime(systemStatus.uptime)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                        <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {systemStatus.version}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Environment</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {systemStatus.environment}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Database className="w-4 h-4 mr-1" />
                          Database
                        </p>
                        <p className="text-lg font-semibold">
                          {systemStatus.database.connected ? (
                            <span className="text-green-600">Connected</span>
                          ) : (
                            <span className="text-red-600">Disconnected</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Updates */}
                <div className="card">
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
                          <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">
                            {updateInfo.currentCommit}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Previous Version</p>
                          <p className="text-lg font-mono font-semibold text-gray-500 dark:text-gray-400">
                            {updateInfo.previousCommit || 'N/A'}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Latest Version</p>
                          <p className="text-lg font-mono font-semibold text-green-600">
                            {updateInfo.latestCommit}
                          </p>
                        </div>
                      </div>

                      {updateInfo.hasUpdate && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                Update Available
                              </h3>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                                A new version is available. Click below to update the system.
                              </p>
                              <button
                                onClick={applyUpdates}
                                disabled={updating}
                                className="btn-primary flex items-center"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                {updating ? 'Updating...' : 'Apply Update'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {updateLog.length > 0 && (
                        <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 border border-gray-700">
                          <h3 className="text-white font-semibold mb-3">Update Log:</h3>
                          <div className="space-y-2">
                            {updateLog.map((log, index) => (
                              <div key={index} className="flex items-start text-sm">
                                {log.status === 'success' && (
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                )}
                                {log.status === 'running' && (
                                  <RefreshCw className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0 animate-spin" />
                                )}
                                {log.status === 'error' && (
                                  <XCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                                )}
                                <span className="text-gray-300">{log.step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Feature Management Tab */}
            {activeTab === 'features' && (
              <div className="card">
                <FeatureManagerEnhanced />
              </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div className="card">
                <UserManagement />
              </div>
            )}

            {/* System Logs Tab */}
            {activeTab === 'logs' && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
                  <Terminal className="w-6 h-6 mr-2 text-primary-600" />
                  System Logs
                </h2>
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => getLogs('backend')}
                    className={`px-4 py-2 rounded-lg ${
                      selectedService === 'backend'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Backend
                  </button>
                  <button
                    onClick={() => getLogs('frontend')}
                    className={`px-4 py-2 rounded-lg ${
                      selectedService === 'frontend'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Frontend
                  </button>
                  <button
                    onClick={() => getLogs('postgres')}
                    className={`px-4 py-2 rounded-lg ${
                      selectedService === 'postgres'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Database
                  </button>
                </div>
                <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto border border-gray-700 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{logs || 'Click a service to view logs...'}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminNew;
