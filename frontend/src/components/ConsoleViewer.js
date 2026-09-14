import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConsoleViewer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type, args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      setLogs(prev => [...prev.slice(-99), { type, message, timestamp }]);
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized]);

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    // Create text content from logs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const content = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n\n');
    
    // Add header with device info
    const header = `Console Logs Export
Generated: ${new Date().toLocaleString()}
User Agent: ${navigator.userAgent}
Screen Size: ${window.innerWidth}x${window.innerHeight}
Total Logs: ${logs.length}

${'='.repeat(80)}

`;
    
    const fullContent = header + content;
    
    // Create blob and download
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        title="Open Console Viewer (for debugging on tablets)"
      >
        <Terminal className="w-4 h-4" />
        <span>Console</span>
        {logs.length > 0 && (
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-[200] w-[90vw] max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl border-2 border-gray-300 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-800 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5" />
            <span className="font-semibold">Console Viewer</span>
            <span className="px-2 py-0.5 bg-gray-700 text-xs rounded">
              {logs.length} logs
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={downloadLogs}
              disabled={logs.length === 0}
              className="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download logs as text file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={clearLogs}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs */}
        {!isMinimized && (
          <div className="h-96 overflow-y-auto p-3 space-y-1 font-mono text-xs bg-gray-50 dark:bg-gray-950">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No console logs yet. Start using the app to see logs here.
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${getLogColor(log.type)} border border-gray-200 dark:border-gray-700`}
                >
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {log.timestamp}
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-xs">
                        {log.message}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ConsoleViewer;
