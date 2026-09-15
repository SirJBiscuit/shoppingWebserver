import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, GitCommit, User, Tag, TrendingUp, 
  Sparkles, Zap, Bug, Settings, FileText, Package,
  ChevronDown, ChevronUp, Filter, Search, Download
} from 'lucide-react';

const ChangelogViewer = ({ isOpen, onClose }) => {
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, feat, fix, perf, docs
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCommit, setExpandedCommit] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, grouped

  useEffect(() => {
    if (isOpen) {
      loadChangelog();
    }
  }, [isOpen]);

  const loadChangelog = async () => {
    try {
      const response = await fetch('/api/system/changelog', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChangelog(data.commits || []);
      }
    } catch (error) {
      console.error('Error loading changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeCommit = (message) => {
    const lower = message.toLowerCase();
    if (lower.startsWith('feat:') || lower.startsWith('feat(')) return 'feat';
    if (lower.startsWith('fix:') || lower.startsWith('fix(')) return 'fix';
    if (lower.startsWith('perf:') || lower.startsWith('perf(')) return 'perf';
    if (lower.startsWith('docs:') || lower.startsWith('docs(')) return 'docs';
    if (lower.startsWith('style:') || lower.startsWith('style(')) return 'style';
    if (lower.startsWith('refactor:')) return 'refactor';
    if (lower.startsWith('test:')) return 'test';
    if (lower.startsWith('chore:')) return 'chore';
    return 'other';
  };

  const getCommitIcon = (type) => {
    switch (type) {
      case 'feat': return <Sparkles className="w-5 h-5 text-green-500" />;
      case 'fix': return <Bug className="w-5 h-5 text-red-500" />;
      case 'perf': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'docs': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'style': return <Settings className="w-5 h-5 text-purple-500" />;
      default: return <GitCommit className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCommitColor = (type) => {
    switch (type) {
      case 'feat': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'fix': return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'perf': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'docs': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filteredChangelog = changelog
    .filter(commit => {
      const type = categorizeCommit(commit.message);
      if (filter !== 'all' && type !== filter) return false;
      if (searchQuery && !commit.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const groupedByDate = filteredChangelog.reduce((acc, commit) => {
    const date = new Date(commit.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(commit);
    return acc;
  }, {});

  const stats = {
    total: changelog.length,
    features: changelog.filter(c => categorizeCommit(c.message) === 'feat').length,
    fixes: changelog.filter(c => categorizeCommit(c.message) === 'fix').length,
    performance: changelog.filter(c => categorizeCommit(c.message) === 'perf').length,
  };

  const exportChangelog = () => {
    const text = filteredChangelog.map(commit => {
      const type = categorizeCommit(commit.message);
      return `[${type.toUpperCase()}] ${formatDate(commit.date)} - ${commit.message}\n  By: ${commit.author}\n  Hash: ${commit.hash.substring(0, 7)}\n`;
    }).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Changelog & Features</h2>
                <p className="text-primary-100 text-sm">Track every improvement and update</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-primary-100">Total Updates</div>
            </div>
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.features}</div>
              <div className="text-xs text-green-100">Features</div>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.fixes}</div>
              <div className="text-xs text-red-100">Bug Fixes</div>
            </div>
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.performance}</div>
              <div className="text-xs text-yellow-100">Performance</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              {['all', 'feat', 'fix', 'perf', 'docs'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === type
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search updates..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={exportChangelog}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Changelog Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : filteredChangelog.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No updates found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="space-y-4">
              {filteredChangelog.map((commit, index) => {
                const type = categorizeCommit(commit.message);
                const isExpanded = expandedCommit === commit.hash;
                
                return (
                  <motion.div
                    key={commit.hash}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`border-2 rounded-xl p-4 ${getCommitColor(type)} hover:shadow-lg transition-all cursor-pointer`}
                    onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getCommitIcon(type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                            {commit.message.split('\n')[0]}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(commit.date)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {commit.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3 h-3" />
                            {commit.hash.substring(0, 7)}
                          </span>
                        </div>

                        <AnimatePresence>
                          {isExpanded && commit.message.includes('\n') && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600"
                            >
                              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                {commit.message.split('\n').slice(1).join('\n').trim()}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {commit.message.includes('\n') && (
                        <button className="flex-shrink-0 p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([date, commits]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{date}</h3>
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{commits.length} updates</span>
                  </div>
                  
                  <div className="space-y-2 ml-8">
                    {commits.map(commit => {
                      const type = categorizeCommit(commit.message);
                      return (
                        <div key={commit.hash} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          {getCommitIcon(type)}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {commit.message.split('\n')[0]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {commit.author} • {commit.hash.substring(0, 7)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Showing {filteredChangelog.length} of {changelog.length} updates</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded ${viewMode === 'timeline' ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded ${viewMode === 'grouped' ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              >
                Grouped
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChangelogViewer;
