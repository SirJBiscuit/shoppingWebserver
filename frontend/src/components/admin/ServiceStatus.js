import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '';
const POLL_MS = 30000;

const BADGE = {
  up:       { label: 'Online',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  degraded: { label: 'Degraded', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',       dot: 'bg-amber-500 animate-pulse' },
  standby:  { label: 'Standby', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',            dot: 'bg-blue-500 animate-pulse' },
  down:     { label: 'Offline', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',                dot: 'bg-red-500 animate-pulse' },
  unknown:  { label: 'Unknown', cls: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',               dot: 'bg-gray-400' },
};

/**
 * ServiceStatus — admin-only live health board.
 * Polls GET /api/system/services and renders one row per service with an
 * inline Online/Offline/Degraded/Standby badge, latency, and detail text.
 */
const ServiceStatus = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const res = await fetch(`${API_URL}/api/system/services`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const services = data?.services || [];
  const downCount = services.filter((s) => s.status === 'down').length;
  const checkedAt = data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-primary-600" />
          Services
        </h2>
        <div className="flex items-center gap-3">
          {checkedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">checked {checkedAt}</span>
          )}
          <button
            type="button"
            onClick={() => load(true)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          Status check failed: {error}
        </div>
      )}

      {/* Overall banner */}
      {services.length > 0 && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
          downCount === 0
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {downCount === 0
            ? 'All systems nominal'
            : `${downCount} service${downCount > 1 ? 's' : ''} offline`}
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {services.map((s) => {
          const b = BADGE[s.status] || BADGE.unknown;
          return (
            <div key={s.key} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.label}</p>
                {s.detail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md" title={s.detail}>
                    {s.detail}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {s.ms != null && s.ms > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{s.ms}ms</span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${b.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                  {b.label}
                </span>
              </div>
            </div>
          );
        })}
        {services.length === 0 && !error && (
          <p className="py-6 text-sm text-gray-500 dark:text-gray-400 text-center">Checking services…</p>
        )}
      </div>
    </div>
  );
};

export default ServiceStatus;
