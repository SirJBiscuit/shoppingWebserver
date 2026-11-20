import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, RotateCcw, Copy, Check, Trash2, Grid3X3, Loader2 } from 'lucide-react';
import { quickLoginAPI } from '../../services/api';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

// Must match SYMBOL_SET in backend/src/routes/quickLogin.js
const SYMBOL_SET = ['🍎','🚀','🌵','🎧','🐙','🍕','⚡','🎲','🌙','🔥','🍇','🎯','🐸','🌈','🍩','⭐'];
const SEQ_MIN = 8;
const SEQ_MAX = 12;

/**
 * QuickLoginSetup — admin-only (Admin › Security tab).
 * Build a secret symbol sequence for the shuffled-grid challenge and manage
 * burn-after-use backup codes.
 */
const QuickLoginSetup = () => {
  const [status, setStatus] = useState(null);
  const [seq, setSeq] = useState([]); // symbols in order
  const [codes, setCodes] = useState(null); // freshly generated, shown once
  const [copied, setCopied] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await quickLoginAPI.status();
      setStatus(res.data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const saveSequence = async () => {
    setSaving(true);
    try {
      await quickLoginAPI.setup(seq);
      setSeq([]);
      flash('Quick login enabled');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const generateCodes = async () => {
    setConfirmRegen(false);
    setSaving(true);
    try {
      const res = await quickLoginAPI.generateCodes();
      setCodes(res.data.codes);
      setCopied(false);
      load();
    } catch {
      flash('Failed to generate codes');
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    setConfirmDisable(false);
    setSaving(true);
    try {
      await quickLoginAPI.disable();
      setCodes(null);
      flash('Quick login disabled');
      load();
    } catch {
      flash('Failed to disable');
    } finally {
      setSaving(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Login</h2>
        </div>
        {status && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            status.lockedUntil
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : status.enabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {status.lockedUntil ? 'Locked' : status.enabled ? 'Enabled' : 'Disabled'}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        A sign-in you can use while someone watches your screen — the login grid shuffles
        every attempt and only asks for a few positions of your secret sequence.
        Backup codes each work exactly once.
      </p>

      {notice && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300">
          {notice}
        </div>
      )}

      {status?.enabled && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Sequence length: <b className="text-gray-900 dark:text-white">{status.seqLength}</b></span>
          <span>Backup codes left: <b className="text-gray-900 dark:text-white">{status.codesLeft}</b></span>
        </div>
      )}

      {/* Sequence builder */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" />
          {status?.enabled ? 'Replace sequence' : 'Create your sequence'} — tap {SEQ_MIN}–{SEQ_MAX} symbols in order
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Memorize the ORDER — at login you'll be asked for a few positions (e.g. the 2nd, 5th, 7th). Set this up privately.
        </p>
        <div className="grid grid-cols-8 gap-1.5 max-w-md mb-3">
          {SYMBOL_SET.map((s) => {
            const count = seq.filter((x) => x === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => seq.length < SEQ_MAX && setSeq([...seq, s])}
                className={`relative aspect-square text-xl rounded-lg border-2 flex items-center justify-center transition-colors ${
                  count > 0
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                {s}
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1 min-h-[24px]">
            {seq.map((s, i) => (
              <motion.span
                key={`${s}-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 border border-primary-300 dark:border-primary-700 rounded-md flex items-center justify-center text-sm"
                title={`Position ${i + 1}`}
              >
                {s}
              </motion.span>
            ))}
          </div>
          <span className={`text-xs ${seq.length >= SEQ_MIN ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {seq.length}/{SEQ_MIN}+
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSeq([])}
            disabled={seq.length === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
          <button
            type="button"
            onClick={saveSequence}
            disabled={saving || seq.length < SEQ_MIN}
            className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {status?.enabled ? 'Replace sequence' : 'Save & enable'}
          </button>
        </div>
      </div>

      {/* Backup codes */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Backup codes
        </h3>
        {codes ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Shown once — copy these somewhere safe. Each works exactly once.
            </p>
            <div className="grid grid-cols-2 gap-1 font-mono text-sm text-gray-800 dark:text-gray-200 mb-3">
              {codes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <button type="button" onClick={copyCodes} className="btn-secondary text-sm flex items-center gap-1.5">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy all'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            disabled={saving}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {status?.codesLeft ? 'Regenerate backup codes (burns old)' : 'Generate 10 backup codes'}
          </button>
        )}
      </div>

      {status?.enabled && (
        <button
          type="button"
          onClick={() => setConfirmDisable(true)}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" /> Disable quick login
        </button>
      )}

      <ConfirmModal
        isOpen={confirmRegen}
        title="Regenerate backup codes?"
        message="This burns all existing backup codes and creates 10 new ones. Old codes stop working immediately."
        confirmText="Regenerate"
        type="warning"
        onConfirm={generateCodes}
        onCancel={() => setConfirmRegen(false)}
      />
      <ConfirmModal
        isOpen={confirmDisable}
        title="Disable quick login?"
        message="Your symbol sequence and all backup codes will be deleted. You can set it up again anytime."
        confirmText="Disable"
        type="danger"
        onConfirm={disable}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  );
};

export default QuickLoginSetup;
