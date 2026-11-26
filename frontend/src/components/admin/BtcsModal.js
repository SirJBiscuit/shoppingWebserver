import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import api from '../../services/api';
import { Portal } from '../../utils/autoPlacement';

// BTCS — score breakdown, tier progress, per-tester pin limit / bonus /
// feature overrides. Shared by the tester cards and the BTCS panel.
const BtcsModal = ({ tester, onClose, compact = false }) => {
  const [btcs, setBtcs] = useState(null);
  const [features, setFeatures] = useState(null);
  const [pinLimit, setPinLimit] = useState('');
  const [scoreBonus, setScoreBonus] = useState('0');
  const [canChat, setCanChat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api.get(`/beta/admin/testers/${tester.id}/btcs`)
      .then(res => {
        setBtcs(res.data);
        setScoreBonus(String(res.data.bonus || 0));
        setPinLimit(res.data.pinLimitOverride != null ? String(res.data.pinLimitOverride) : '');
        setCanChat(res.data.can_chat !== false);
      })
      .catch(() => setNotice('Could not load BTCS data'));
    api.get(`/beta/admin/testers/${tester.id}/features`)
      .then(res => setFeatures(res.data))
      .catch(() => setFeatures([]));
  }, [tester.id]);

  const saveSettings = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await api.patch(`/beta/admin/testers/${tester.id}/btcs`, {
        pin_limit: pinLimit === '' ? null : parseInt(pinLimit, 10),
        score_bonus: parseInt(scoreBonus, 10) || 0
      });
      if (canChat !== null) {
        await api.patch(`/beta/admin/testers/${tester.id}`, { canChat });
      }
      const res = await api.get(`/beta/admin/testers/${tester.id}/btcs`);
      setBtcs(res.data);
      setNotice('Saved');
    } catch {
      setNotice('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const cycleFeature = async (key, current) => {
    // tri-state: follow tier (null) → granted (true) → revoked (false) → follow
    const next = current === null ? true : current === true ? false : null;
    const updated = { ...Object.fromEntries((features || []).map(f => [f.feature_key, f.override])), [key]: next };
    try {
      await api.put(`/beta/admin/testers/${tester.id}/features`, { overrides: updated });
      setFeatures(prev => prev.map(f => f.feature_key === key ? { ...f, override: next } : f));
    } catch {
      setNotice('Feature update failed');
    }
  };

  const tierColor = { Rookie: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', Contributor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', Veteran: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', Elite: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };

  return (
    <Portal>
      <div className={`fixed inset-0 ${compact ? 'z-[95]' : 'z-50'} flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm`} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> BTCS — {tester.name}
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
          </div>

          {!btcs ? (
            <div className="py-8 text-center text-gray-500">{notice || 'Loading…'}</div>
          ) : (
            (() => {
              const nextTier = (btcs.tiers || []).find(t => t.min > btcs.score);
              const pinCap = btcs.pinLimitOverride ?? btcs.tier.perks?.pinLimit ?? 30;
              return (
            <>
              {/* Score + tier + progress */}
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{btcs.score}<span className="text-sm font-medium text-gray-400 ml-1">pts</span></div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tierColor[btcs.tier.label] || tierColor.Rookie}`}>{btcs.tier.label}</span>
              </div>
              {nextTier ? (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Progress to {nextTier.label}</span>
                    <span>{btcs.score - btcs.tier.min} / {nextTier.min - btcs.tier.min}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (100 * (btcs.score - btcs.tier.min)) / (nextTier.min - btcs.tier.min))}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">Top tier reached.</p>
              )}

              {/* Perks unlocked */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Unlocked perks</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">{pinCap} pins/page{btcs.pinLimitOverride != null ? ' (custom)' : ''}</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Contribution breakdown</div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {Object.entries(btcs.breakdown).map(([label, pts]) => (
                    <div key={label} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{label}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin settings */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 mb-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Tester settings</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="text-sm">
                    <span className="block text-gray-600 dark:text-gray-300 mb-1">Pin limit (blank = tier default)</span>
                    <input type="number" min="0" value={pinLimit} onChange={e => setPinLimit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
                  </label>
                  <label className="text-sm">
                    <span className="block text-gray-600 dark:text-gray-300 mb-1">Score bonus</span>
                    <input type="number" value={scoreBonus} onChange={e => setScoreBonus(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
                  </label>
                </div>
                {canChat !== null && (
                  <label className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={canChat} onChange={(e) => setCanChat(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600" />
                    Chatroom access — tester can post in the beta chatroom
                  </label>
                )}
                <button type="button" onClick={saveSettings} disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>

              {/* Feature overrides */}
              {features && features.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Feature access (click to cycle: global → allow → deny)</div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                    {features.map(f => {
                      const state = f.override;
                      const base = f.is_enabled && !f.hide_from_beta && !f.admin_only;
                      const effective = state === null ? base : state;
                      return (
                        <button type="button" key={f.feature_key} onClick={() => cycleFeature(f.feature_key, state)}
                          className="w-full flex items-center justify-between py-1.5 text-sm text-left">
                          <span className="text-gray-600 dark:text-gray-300">{f.feature_name || f.feature_key}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${effective ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                            {state === null ? (base ? 'Global ✓' : 'Global ✗') : state ? 'Allowed' : 'Denied'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {notice && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{notice}</p>}
            </>
              );
            })()
          )}
        </motion.div>
      </div>
    </Portal>
  );
};

export default BtcsModal;
