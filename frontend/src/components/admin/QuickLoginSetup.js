import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck, RotateCcw, Copy, Check, Trash2, Grid3X3, Loader2, Undo2, Hash, Delete, Shuffle, Move, Circle, Atom, Plus, Minus } from 'lucide-react';
import { quickLoginAPI } from '../../services/api';
import ConfirmModal from '../../limbo/modals/ConfirmModal';
import PinPad, { defaultLayout } from '../auth/PinPad';

// Must match SYMBOL_SET in backend/src/routes/quickLogin.js
const SYMBOL_SET = ['🍎','🚀','🌵','🎧','🐙','🍕','⚡','🎲','🌙','🔥','🍇','🎯','🐸','🌈','🍩','⭐'];
const SEQ_MIN = 8;
const SEQ_MAX = 12;
// Must match PIN_MIN/PIN_MAX in backend/src/routes/quickLogin.js
const PIN_MIN = 8;
const PIN_MAX = 64; // multi-pass swipes stack into long chains

// The builder grid reshuffles after every tap — a watcher can't map taps to
// sequence symbols from fixed tile positions while you build it.
const shuffledIdx = () => {
  const a = Array.from({ length: SYMBOL_SET.length }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * QuickLoginSetup — admins (Admin › Security) + beta testers (Settings).
 * Quick login is opt-in; username+password stays the default.
 * Build a secret symbol sequence for the shuffled-grid challenge and manage
 * burn-after-use backup codes.
 */
const QuickLoginSetup = () => {
  const [status, setStatus] = useState(null);
  const [seq, setSeq] = useState([]); // symbols in order
  const [symOrder] = useState(shuffledIdx); // builder layout — stable while entering
  const [codes, setCodes] = useState(null); // freshly generated, shown once
  const [copied, setCopied] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [pinDraft, setPinDraft] = useState(''); // swipe-collected PIN digits
  const [firstDraft, setFirstDraft] = useState(null); // stage-1 entry awaiting confirm
  const [entryStyle, setEntryStyle] = useState('swipe'); // swipe | tap | trace
  const [ghost, setGhost] = useState(null); // suggested shape guide path
  const [padLayout, setPadLayout] = useState(null); // [{d,x,y}] bubble positions
  const [arranging, setArranging] = useState(false);
  const [padDirty, setPadDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await quickLoginAPI.status();
      setStatus(res.data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the pad preview in sync with the server — but never clobber
  // a layout the user is mid-edit on.
  useEffect(() => {
    if (!padDirty && status?.pinPad) setPadLayout(status.pinPad);
  }, [status?.pinPad, padDirty]);

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

  const saveMode = async (mode) => {
    try {
      await quickLoginAPI.setMode({ mode });
      setStatus((s) => (s ? { ...s, mode } : s));
      flash(
        mode === 'full'
          ? 'Full-sequence login enabled'
          : mode === 'pin'
            ? 'Swipe-PIN login enabled'
            : 'Partial-positions login enabled'
      );
    } catch {
      flash('Failed to save login mode');
    }
  };

  const saveReshuffle = async (reshuffle) => {
    try {
      await quickLoginAPI.setMode({ reshuffle });
      setStatus((s) => (s ? { ...s, reshuffle } : s));
      flash(reshuffle ? 'Per-tap shuffle enabled' : 'Per-tap shuffle disabled');
    } catch {
      flash('Failed to save shuffle setting');
    }
  };

  const savePin = async () => {
    setSaving(true);
    try {
      // A glyph entered on an unsaved layout would fail the server's
      // node-set check — persist the pad first if it changed.
      if (padDirty && padLayout) {
        await quickLoginAPI.setPad(padLayout);
        setPadDirty(false);
      }
      await quickLoginAPI.setPin(pinDraft);
      setPinDraft('');
      setFirstDraft(null);
      flash('Swipe pattern saved');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save PIN');
    } finally {
      setSaving(false);
    }
  };

  const shufflePad = () => {
    if (!padLayout) return;
    const pos = padLayout.map((c) => ({ x: c.x, y: c.y }));
    for (let i = pos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pos[i], pos[j]] = [pos[j], pos[i]];
    }
    setPadLayout(padLayout.map((c, i) => ({ ...c, ...pos[i] })));
    setPadDirty(true);
  };

  // One-click layout presets — same nodes, new shape. 'grid' is the classic
  // pattern-lock lattice; the rest keep the freeform bubble feel.
  const presetPad = (kind) => {
    if (!padLayout) return;
    const n = padLayout.length;
    const GOLDEN = (137.508 * Math.PI) / 180;
    if (kind === 'grid') {
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      setPadLayout(padLayout.map((c, i) => ({
        ...c,
        x: cols === 1 ? 50 : 14 + (72 * (i % cols)) / (cols - 1),
        y: rows === 1 ? 50 : 14 + (72 * Math.floor(i / cols)) / (rows - 1),
      })));
    } else {
      setPadLayout(padLayout.map((c, i) => {
        if (kind === 'ring') {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return { ...c, x: 50 + 34 * Math.cos(a), y: 50 + 34 * Math.sin(a) };
        }
        const a = i * GOLDEN;
        const r = 7 + 29 * Math.sqrt((i + 0.5) / n);
        return { ...c, x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
      }));
    }
    setPadDirty(true);
  };

  // Node count — grow keeps every existing bubble and lands new nodes on
  // the golden-angle scatter; shrink drops the last ones. 6-25 nodes.
  const NODE_MIN = 6;
  const NODE_MAX = 25;
  const resizePad = (n) => {
    if (!padLayout || n < NODE_MIN || n > NODE_MAX) return;
    if (n <= padLayout.length) {
      setPadLayout(padLayout.slice(0, n));
    } else {
      const fresh = defaultLayout(n);
      setPadLayout(fresh.map((c, i) => padLayout[i] || c));
    }
    setPadDirty(true);
  };

  const savePad = async () => {
    setSaving(true);
    try {
      await quickLoginAPI.setPad(padLayout);
      setPadDirty(false);
      setArranging(false);
      flash('Pad layout saved');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const resetPad = async () => {
    setSaving(true);
    try {
      const res = await quickLoginAPI.setPad(null);
      setPadLayout(res.data.pad);
      setPadDirty(false);
      flash('Layout reset to your default scatter');
      load();
    } catch {
      flash('Failed to reset layout');
    } finally {
      setSaving(false);
    }
  };

  // Warn when bubbles overlap — a stroke through the overlap zone can't
  // tell them apart. 20% ≈ the 56px bubble diameter on a 280px pad.
  const padCrowded = padLayout?.some((a, i) =>
    padLayout.slice(i + 1).some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 20));

  // Suggest a shape — greedy nearest-neighbour walk through the bubbles
  // makes a connected, tracable path instead of random jumps.
  const suggestShape = () => {
    const cells = padLayout || status?.pinPad;
    if (!cells?.length) return;
    const pool = [...cells];
    const path = [pool.splice(Math.floor(Math.random() * pool.length), 1)[0]];
    while (path.length < Math.min(6, cells.length) && pool.length) {
      const cur = path[path.length - 1];
      pool.sort(
        (a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y)
      );
      path.push(pool.shift());
    }
    setGhost(path.map((c) => ({ x: c.x, y: c.y })));
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
        every attempt and only asks for a few positions of your secret sequence, or swipe
        chained passes on a numpad for a long muscle-memory PIN.
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

      {/* Challenge mode */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Login challenge mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-3xl">
          {[
            {
              id: 'partial',
              title: 'Partial positions',
              desc: 'Tap a few requested positions (e.g. 2nd, 5th, 7th). Safest when someone is watching.',
            },
            {
              id: 'full',
              title: 'Full sequence',
              desc: 'Type your whole sequence from memory, in order. Faster — an observer could see all of it.',
            },
            {
              id: 'pin',
              title: 'Swipe PIN',
              desc: 'Drag across the numpad — multiple passes stack into one long muscle-memory password.',
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => saveMode(m.id)}
              className={`text-left p-3 rounded-xl border-2 transition-colors ${
                (status?.mode || 'partial') === m.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <span className={`block text-sm font-semibold ${(status?.mode || 'partial') === m.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {m.title}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</span>
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2.5 max-w-md cursor-pointer select-none">
          <input
            type="checkbox"
            checked={status?.reshuffle !== false}
            onChange={(e) => saveReshuffle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Re-shuffle the login grid after every tap
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              On: an observer can't predict where your next tap lands. Off: the login layout stays put during a challenge.
            </span>
          </span>
        </label>
      </div>

      {status?.needsReset && (
        <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">
          Your saved sequence can't be read (it may predate a security update).
          Tap {SEQ_MIN}–{SEQ_MAX} symbols below and save a new one.
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
          {symOrder.map((si) => {
            const s = SYMBOL_SET[si];
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
          <div className="flex gap-1 min-h-[24px] flex-wrap">
            {seq.map((s, i) => (
              <motion.button
                key={`${s}-${i}`}
                type="button"
                onClick={() => setSeq(seq.filter((_, j) => j !== i))}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 border border-primary-300 dark:border-primary-700 rounded-md flex items-center justify-center text-sm hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                title={`Position ${i + 1} — click to remove`}
              >
                {s}
              </motion.button>
            ))}
          </div>
          <span className={`text-xs ${seq.length >= SEQ_MIN ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            {seq.length}/{SEQ_MIN}+
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSeq(seq.slice(0, -1))}
            disabled={seq.length === 0}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </button>
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

      {/* Swipe PIN chain */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Hash className="w-4 h-4" /> Swipe PIN chain
            {status?.pinSet && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                PIN set
              </span>
            )}
            {status?.pinPadCustom && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                Custom layout
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setArranging((a) => !a)}
            className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
              arranging
                ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-300'
            }`}
          >
            <Move className="w-3.5 h-3.5" /> {arranging ? 'Done arranging' : 'Arrange bubbles'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {arranging
            ? 'Drag nodes anywhere to shape your own layout, set how many nodes you want, or snap them into a Grid / Ring / Spiral — it saves to your account and nobody else sees this layout.'
            : `Hold and drag across the nodes — lift and swipe again to chain passes into one long glyph (${PIN_MIN}+ nodes, up to ${PIN_MAX}). The dots only show how many entered, never which.`}
        </p>
        {status?.mode === 'pin' && !status?.pinSet && !arranging && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
            Swipe PIN mode is selected but no PIN is saved — set one below first.
          </p>
        )}
        {arranging && padCrowded && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
            Some bubbles overlap — a swipe through the shared edge can't tell them apart. Space them out.
          </p>
        )}
        {!arranging && (
          <div className="flex justify-center gap-1 mb-2">
            {[['Swipe', 'swipe'], ['Tap', 'tap'], ['Trace a shape', 'trace']].map(([label, style]) => (
              <button
                key={style}
                type="button"
                onClick={() => { setEntryStyle(style); if (style === 'trace' && !ghost) suggestShape(); }}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  entryStyle === style
                    ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {entryStyle === 'trace' && !arranging && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
            Follow the dotted path — it loops forever until you swipe your own.
            <button type="button" onClick={suggestShape} className="ml-1 underline text-primary-600 dark:text-primary-400">
              New shape
            </button>
          </p>
        )}
        <PinPad
          layout={padLayout || status?.pinPad}
          arrange={arranging}
          onLayoutChange={(l) => { setPadLayout(l); setPadDirty(true); }}
          onDigit={(d) => setPinDraft((p) => (p.length < PIN_MAX ? p + d : p))}
          disabled={saving}
          tapMode={entryStyle === 'tap'}
          ghost={entryStyle === 'trace' && !arranging ? ghost : null}
        />
        {arranging ? (
          <div className="mt-3 flex gap-2 justify-center flex-wrap items-center">
            <div className="flex items-center gap-1 mr-1" title="How many nodes your glyph pad has">
              <button
                type="button"
                onClick={() => resizePad((padLayout?.length || 10) - 1)}
                disabled={saving || !padLayout || padLayout.length <= NODE_MIN}
                className="btn-secondary text-sm px-2 disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-10 text-center text-gray-700 dark:text-gray-300">
                {padLayout?.length || 10} nodes
              </span>
              <button
                type="button"
                onClick={() => resizePad((padLayout?.length || 10) + 1)}
                disabled={saving || !padLayout || padLayout.length >= NODE_MAX}
                className="btn-secondary text-sm px-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => presetPad('grid')}
              disabled={saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Grid3X3 className="w-4 h-4" /> Grid
            </button>
            <button
              type="button"
              onClick={() => presetPad('ring')}
              disabled={saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Circle className="w-4 h-4" /> Ring
            </button>
            <button
              type="button"
              onClick={() => presetPad('spiral')}
              disabled={saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Atom className="w-4 h-4" /> Spiral
            </button>
            <button
              type="button"
              onClick={shufflePad}
              disabled={saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" /> Shuffle spots
            </button>
            <button
              type="button"
              onClick={resetPad}
              disabled={saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="button"
              onClick={savePad}
              disabled={saving || !padDirty}
              className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save layout
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-lg tracking-[0.35em] text-primary-600 dark:text-primary-400 leading-none min-h-[1rem]">
                {'•'.repeat(Math.min(pinDraft.length, 40))}
              </span>
              <span className={`text-xs ${pinDraft.length >= PIN_MIN ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                {pinDraft.length}/{PIN_MIN}+
              </span>
            </div>
            {firstDraft !== null && (
              <p className={`text-xs text-center font-medium ${
                pinDraft === firstDraft
                  ? 'text-green-600 dark:text-green-400'
                  : pinDraft.length >= firstDraft.length
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {pinDraft === firstDraft
                  ? 'Matches — save it'
                  : pinDraft.length >= firstDraft.length
                    ? 'Different pattern'
                    : `Repeat the same pattern to confirm (${firstDraft.length} digits)`}
              </p>
            )}
            <div className="mt-3 flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setPinDraft((p) => p.slice(0, -1))}
                disabled={pinDraft.length === 0}
                className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Delete className="w-4 h-4" /> Undo
              </button>
              <button
                type="button"
                onClick={() => { setPinDraft(''); setFirstDraft(null); }}
                disabled={pinDraft.length === 0 && firstDraft === null}
                className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Start over
              </button>
              {firstDraft === null ? (
                <button
                  type="button"
                  onClick={() => { setFirstDraft(pinDraft); setPinDraft(''); }}
                  disabled={pinDraft.length < PIN_MIN}
                  className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  Use this pattern
                </button>
              ) : (
                <button
                  type="button"
                  onClick={savePin}
                  disabled={saving || pinDraft !== firstDraft}
                  className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {status?.pinSet ? 'Confirm & replace' : 'Confirm & save'}
                </button>
              )}
            </div>
          </>
        )}
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
        message="Your symbol sequence, swipe PIN, and all backup codes will be deleted. You can set it up again anytime."
        confirmText="Disable"
        type="danger"
        onConfirm={disable}
        onCancel={() => setConfirmDisable(false)}
      />
    </div>
  );
};

export default QuickLoginSetup;
