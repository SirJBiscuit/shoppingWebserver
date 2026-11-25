import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, HardDrive, RotateCcw, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import ConfirmModal from '../limbo/modals/ConfirmModal';

// Self-service backup — the third recovery system. Any user can download
// their own data, keep save points on the server, and roll their account
// back. Privileged fields (role, password, admin flags) are never
// restored through this path — the backend enforces it.
const MyBackupCard = () => {
  const [saves, setSaves] = useState(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    api.get('/backup/me/list')
      .then((r) => setSaves(r.data))
      .catch(() => setSaves([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (label, fn) => {
    setBusy(label);
    setNote('');
    try {
      const r = await fn();
      return r;
    } catch (e) {
      setNote(e.response?.data?.error || 'Something went wrong');
      return null;
    } finally {
      setBusy('');
    }
  };

  const download = () => run('download', async () => {
    const r = await api.get('/backup/me/download', { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `listzy-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const savePoint = () => run('save', async () => {
    await api.post('/backup/me/save');
    load();
    setNote('Save point created — you can restore to it anytime');
  });

  const doRestore = (payload) => run('restore', async () => {
    await api.post('/backup/me/restore', payload);
    setNote('Restored — like nothing ever changed');
  });

  const uploadRestore = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        setConfirmRestore({ label: `the uploaded file "${file.name}"`, payload: { backup } });
      } catch {
        setNote('That file is not a valid backup');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card"
    >
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Backup &amp; Restore
        </h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Your whole account — lists, items, and settings — in one neat package.
        Download it to your computer, or keep save points here and roll back
        to any of them.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={download}
          disabled={!!busy}
          className="btn-secondary flex items-center justify-center disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-2" />
          {busy === 'download' ? 'Preparing…' : 'Download my data'}
        </button>
        <button
          type="button"
          onClick={savePoint}
          disabled={!!busy}
          className="btn-secondary flex items-center justify-center disabled:opacity-50"
        >
          <HardDrive className="w-4 h-4 mr-2" />
          {busy === 'save' ? 'Saving…' : 'Save point to server'}
        </button>
        <label className={`btn-secondary flex items-center justify-center cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore from file
          <input ref={fileRef} type="file" accept=".json" onChange={uploadRestore} className="hidden" />
        </label>
        <button
          type="button"
          disabled={!!busy || !saves?.length}
          onClick={() => setConfirmRestore({
            label: `your latest save point (${new Date(saves[0].created_at).toLocaleString()})`,
            payload: {},
          })}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore last save point
        </button>
      </div>

      {note && (
        <p className="text-sm mt-3 text-primary-600 dark:text-primary-400">{note}</p>
      )}

      {saves && saves.length > 0 && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
            My save points
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {saves.map((s) => (
              <div
                key={s.filename}
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(s.created_at).toLocaleString()}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {(s.size_bytes / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => setConfirmRestore({
                    label: `the save point from ${new Date(s.created_at).toLocaleString()}`,
                    payload: { filename: s.filename },
                  })}
                  className="text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400 font-medium disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {saves && saves.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          No save points yet — press &quot;Save point to server&quot; to create your first one.
        </p>
      )}

      <ConfirmModal
        isOpen={!!confirmRestore}
        title="Restore your account?"
        message={`Your account will be rolled back to ${confirmRestore?.label || ''}. Everything after that point will be replaced — like it never happened. A safety copy is saved first.`}
        confirmText={busy === 'restore' ? 'Restoring…' : 'Restore'}
        type="warning"
        onConfirm={async () => {
          const c = confirmRestore;
          setConfirmRestore(null);
          await doRestore(c.payload);
        }}
        onCancel={() => setConfirmRestore(null)}
      />
    </motion.div>
  );
};

export default MyBackupCard;
