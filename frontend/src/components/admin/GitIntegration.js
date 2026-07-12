import React, { useState, useEffect } from 'react';
import { 
  GitBranch, GitCommit, GitPullRequest, GitMerge, 
  History, Upload, Download, RefreshCw, Check, X,
  Clock, User, FileText, AlertCircle, CheckCircle
} from 'lucide-react';

const GitIntegration = () => {
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [pendingChanges, setPendingChanges] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [autoCommit, setAutoCommit] = useState(true);
  const [autoPush, setAutoPush] = useState(false);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [showDiff, setShowDiff] = useState(null);

  useEffect(() => {
    loadGitStatus();
    loadCommitHistory();
    loadBranches();
    
    // Poll for changes every 30 seconds
    const interval = setInterval(() => {
      checkForRemoteChanges();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadGitStatus = async () => {
    try {
      const response = await fetch('/api/admin/git/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setPendingChanges(data.changes || []);
      setCurrentBranch(data.branch || 'main');
    } catch (error) {
      console.error('Error loading git status:', error);
    }
  };

  const loadCommitHistory = async () => {
    try {
      const response = await fetch('/api/admin/git/commits?limit=20', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCommits(data.commits || []);
    } catch (error) {
      console.error('Error loading commits:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await fetch('/api/admin/git/branches', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const checkForRemoteChanges = async () => {
    try {
      const response = await fetch('/api/admin/git/check-remote', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      
      if (data.hasChanges) {
        setSyncStatus('behind');
        if (window.confirm('New changes detected on GitHub. Pull now?')) {
          pullChanges();
        }
      } else {
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error('Error checking remote:', error);
    }
  };

  const commitChanges = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      const response = await fetch('/api/admin/git/commit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage,
          files: pendingChanges.map(c => c.path)
        })
      });

      if (response.ok) {
        setCommitMessage('');
        loadGitStatus();
        loadCommitHistory();
        
        if (autoPush) {
          pushChanges();
        }
        
        alert('Changes committed successfully!');
      }
    } catch (error) {
      console.error('Error committing:', error);
      alert('Failed to commit changes');
    }
  };

  const pushChanges = async () => {
    try {
      setSyncStatus('pushing');
      const response = await fetch('/api/admin/git/push', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setSyncStatus('synced');
        alert('Changes pushed to GitHub!');
      } else {
        setSyncStatus('error');
        alert('Failed to push changes');
      }
    } catch (error) {
      console.error('Error pushing:', error);
      setSyncStatus('error');
    }
  };

  const pullChanges = async () => {
    try {
      setSyncStatus('pulling');
      const response = await fetch('/api/admin/git/pull', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setSyncStatus('synced');
        loadGitStatus();
        loadCommitHistory();
        alert('Changes pulled from GitHub!');
      } else {
        setSyncStatus('error');
        alert('Failed to pull changes');
      }
    } catch (error) {
      console.error('Error pulling:', error);
      setSyncStatus('error');
    }
  };

  const createBranch = async () => {
    const branchName = prompt('Enter new branch name:');
    if (!branchName) return;

    try {
      const response = await fetch('/api/admin/git/branch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: branchName })
      });

      if (response.ok) {
        loadBranches();
        alert('Branch created!');
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const switchBranch = async (branchName) => {
    try {
      const response = await fetch('/api/admin/git/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ branch: branchName })
      });

      if (response.ok) {
        setCurrentBranch(branchName);
        loadGitStatus();
        loadCommitHistory();
      }
    } catch (error) {
      console.error('Error switching branch:', error);
    }
  };

  const viewDiff = async (filePath) => {
    try {
      const response = await fetch(`/api/admin/git/diff?file=${encodeURIComponent(filePath)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setShowDiff(data);
    } catch (error) {
      console.error('Error viewing diff:', error);
    }
  };

  const rollbackToCommit = async (commitHash) => {
    if (!window.confirm('Rollback to this commit? This will reset your working directory.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/git/rollback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commit: commitHash })
      });

      if (response.ok) {
        loadGitStatus();
        loadCommitHistory();
        alert('Rolled back successfully!');
      }
    } catch (error) {
      console.error('Error rolling back:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <GitBranch className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Git Integration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version control for all your customizations
            </p>
          </div>
        </div>
        
        {/* Sync Status */}
        <div className="flex items-center space-x-2">
          {syncStatus === 'synced' && (
            <span className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-1" />
              Synced
            </span>
          )}
          {syncStatus === 'behind' && (
            <span className="flex items-center text-yellow-600">
              <AlertCircle className="w-5 h-5 mr-1" />
              Behind
            </span>
          )}
          {syncStatus === 'pushing' && (
            <span className="flex items-center text-blue-600">
              <Upload className="w-5 h-5 mr-1 animate-pulse" />
              Pushing...
            </span>
          )}
          {syncStatus === 'pulling' && (
            <span className="flex items-center text-blue-600">
              <Download className="w-5 h-5 mr-1 animate-pulse" />
              Pulling...
            </span>
          )}
          <button
            onClick={checkForRemoteChanges}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Check for updates"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Changes & Commit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Changes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Pending Changes ({pendingChanges.length})
            </h3>
            
            {pendingChanges.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No pending changes
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        change.status === 'modified' ? 'bg-yellow-100 text-yellow-800' :
                        change.status === 'added' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {change.status}
                      </span>
                      <span className="text-sm font-mono">{change.path}</span>
                    </div>
                    <button
                      onClick={() => viewDiff(change.path)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Diff
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Commit Form */}
            {pendingChanges.length > 0 && (
              <div className="mt-6 space-y-3">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message (e.g., 'Update dashboard layout')"
                  className="input-field h-24"
                />
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCommit}
                      onChange={(e) => setAutoCommit(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Auto-commit on save</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPush}
                      onChange={(e) => setAutoPush(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Auto-push to GitHub</span>
                  </label>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={commitChanges}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    <GitCommit className="w-4 h-4 mr-2" />
                    Commit Changes
                  </button>
                  <button
                    onClick={pushChanges}
                    className="btn-secondary flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Push
                  </button>
                  <button
                    onClick={pullChanges}
                    className="btn-secondary flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Pull
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Commit History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Commit History
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {commits.map((commit) => (
                <div
                  key={commit.hash}
                  className="border-l-4 border-purple-600 pl-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-r-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {commit.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {commit.author}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(commit.date).toLocaleString()}
                        </span>
                        <span className="font-mono">{commit.hash.substring(0, 7)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => rollbackToCommit(commit.hash)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Rollback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Branches */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <GitBranch className="w-5 h-5 mr-2" />
                Branches
              </h3>
              <button
                onClick={createBranch}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                + New
              </button>
            </div>
            
            <div className="space-y-2">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => switchBranch(branch.name)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    branch.name === currentBranch
                      ? 'bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-600'
                      : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{branch.name}</span>
                    {branch.name === currentBranch && (
                      <Check className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  {branch.ahead > 0 && (
                    <span className="text-xs text-green-600">
                      {branch.ahead} ahead
                    </span>
                  )}
                  {branch.behind > 0 && (
                    <span className="text-xs text-red-600 ml-2">
                      {branch.behind} behind
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold">Diff: {showDiff.file}</h3>
              <button onClick={() => setShowDiff(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {showDiff.diff}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitIntegration;
