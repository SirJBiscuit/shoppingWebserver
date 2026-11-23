import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Volume2, VolumeX, Play, Upload, Trash2, Loader2,
  Music, ToggleLeft, ToggleRight, FolderOpen, Crosshair,
} from 'lucide-react';
import soundsAPI from '../../services/soundsAPI';
import soundManager from '../../utils/soundEffects';
import ConfirmModal from '../../limbo/modals/ConfirmModal';

/**
 * SoundPanel — admin sound management.
 *
 * Three jobs in one place:
 *  1. Global switches — master on/off, default volume, user-override.
 *  2. Categories — enable each sound category, pick its default file.
 *  3. Library — upload/preview/delete sound files. Uploads land in
 *     managed storage (storage/sounds/) so Storage Management tracks
 *     them like every other asset.
 */

const Toggle = ({ on, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 text-sm"
    aria-pressed={on}
  >
    {on
      ? <ToggleRight className="w-6 h-6 text-green-500" />
      : <ToggleLeft className="w-6 h-6 text-gray-400" />}
    <span className="text-gray-700 dark:text-gray-300">{label}</span>
  </button>
);

const fmtBytes = (n) => {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const SoundPanel = () => {
  const [sounds, setSounds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('pop');
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [bindings, setBindings] = useState([]);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(null); // {selector, label} awaiting assignment
  const [pendingEvent, setPendingEvent] = useState('click');
  const [pendingSound, setPendingSound] = useState('pop'); // 'cat:pop' or 'file:3'
  const [bindDelete, setBindDelete] = useState(null);
  const fileInput = useRef(null);
  const preview = useRef(null);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [lib, cats, global, binds] = await Promise.all([
        soundsAPI.getAllSounds(),
        soundsAPI.getCategories(),
        soundsAPI.getGlobalSettings(),
        soundsAPI.getBindings(),
      ]);
      setSounds(lib);
      setCategories(cats);
      setSettings(global.settings);
      setBindings(binds || []);
      if (!uploadCategory && cats.length) setUploadCategory(cats[0].name);
    } catch {
      flash('Failed to load sound data');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pick-mode plumbing — SoundBindings emits the picked element and
  // echoes mode toggles back so the button state stays in sync.
  useEffect(() => {
    const onPicked = (e) => {
      setPending(e.detail);
      setPicking(false);
      setPendingSound('pop');
      setPendingEvent('click');
    };
    const onMode = (e) => setPicking(!!e.detail?.on);
    window.addEventListener('listzy:element-picked', onPicked);
    window.addEventListener('listzy:sound-bind-mode', onMode);
    return () => {
      window.removeEventListener('listzy:element-picked', onPicked);
      window.removeEventListener('listzy:sound-bind-mode', onMode);
    };
  }, []);

  const togglePick = () => {
    const next = !picking;
    window.dispatchEvent(new CustomEvent('listzy:sound-bind-mode', { detail: { on: next } }));
    setPicking(next);
  };

  const saveBinding = async () => {
    if (!pending) return;
    const [kind, val] = pendingSound.split(':');
    try {
      await soundsAPI.createBinding({
        selector: pending.selector,
        element_label: pending.label,
        event: pendingEvent,
        sound_name: kind === 'cat' ? val : null,
        sound_id: kind === 'file' ? Number(val) : null,
      });
      setPending(null);
      flash('Element sound saved');
      window.dispatchEvent(new CustomEvent('listzy:sound-bindings-changed'));
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to save binding');
    }
  };

  const toggleBinding = async (b) => {
    try {
      await soundsAPI.updateBinding(b.id, { enabled: !b.enabled });
      setBindings((bs) => bs.map((x) => (x.id === b.id ? { ...x, enabled: !x.enabled } : x)));
      window.dispatchEvent(new CustomEvent('listzy:sound-bindings-changed'));
    } catch {
      flash('Failed to update binding');
    }
  };

  const doDeleteBinding = async () => {
    const target = bindDelete;
    setBindDelete(null);
    try {
      await soundsAPI.deleteBinding(target.id);
      setBindings((bs) => bs.filter((x) => x.id !== target.id));
      window.dispatchEvent(new CustomEvent('listzy:sound-bindings-changed'));
      flash('Binding deleted');
    } catch (err) {
      flash(err.response?.data?.error || 'Delete failed');
    }
  };

  const previewPending = () => {
    const [kind, val] = pendingSound.split(':');
    if (kind === 'cat') soundManager.play(val);
    else {
      const s = sounds.find((x) => x.id === Number(val));
      if (s) previewFile(s.file_path, s.id);
    }
  };

  const saveGlobal = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      await soundsAPI.updateGlobalSettings(patch);
      flash('Global settings saved');
    } catch {
      flash('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (name, patch) => {
    setCategories((cs) => cs.map((c) => (c.name === name ? { ...c, ...patch } : c)));
    try {
      await soundsAPI.updateCategory(name, patch);
    } catch {
      flash('Failed to update category');
      load();
    }
  };

  const previewFile = (filePath, id) => {
    try {
      preview.current?.pause();
      preview.current = new Audio(filePath);
      preview.current.volume = 0.6;
      preview.current.onended = () => setPlayingId(null);
      preview.current.onerror = () => {
        setPlayingId(null);
        soundManager.play('error'); // the synth fallback still previews
      };
      preview.current.play().catch(() => setPlayingId(null));
      setPlayingId(id);
    } catch { setPlayingId(null); }
  };

  const doUpload = async (file) => {
    if (!file || !uploadName.trim()) {
      flash('Name the sound first');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('sound', file);
      fd.append('name', uploadName.trim());
      fd.append('category', uploadCategory);
      await soundsAPI.uploadSound(fd);
      setUploadName('');
      if (fileInput.current) fileInput.current.value = '';
      flash('Sound uploaded');
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const doDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await soundsAPI.deleteSound(target.id);
      setSounds((s) => s.filter((x) => x.id !== target.id));
      flash('Sound deleted');
    } catch (err) {
      flash(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sound settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">{notice}</div>
      )}

      {/* Global controls */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          {settings?.sounds_enabled_globally
            ? <Volume2 className="w-4 h-4 text-green-500" />
            : <VolumeX className="w-4 h-4 text-gray-400" />}
          App-wide sound
        </h3>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Toggle
            on={!!settings?.sounds_enabled_globally}
            onClick={() => saveGlobal({ sounds_enabled_globally: !settings?.sounds_enabled_globally })}
            label={settings?.sounds_enabled_globally ? 'Sounds enabled' : 'All sounds muted app-wide'}
          />
          <Toggle
            on={!!settings?.allow_user_override}
            onClick={() => saveGlobal({ allow_user_override: !settings?.allow_user_override })}
            label="Users can pick their own sounds"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            Default volume
            <input
              type="range" min="0" max="1" step="0.05"
              value={settings?.default_volume ?? 0.5}
              onChange={(e) => setSettings((s) => ({ ...s, default_volume: parseFloat(e.target.value) }))}
              onMouseUp={(e) => saveGlobal({ default_volume: parseFloat(e.target.value) })}
              onTouchEnd={(e) => saveGlobal({ default_volume: parseFloat(e.target.value) })}
              className="w-28 accent-primary-600"
            />
            <span className="text-xs text-gray-500 w-8">{Math.round((settings?.default_volume ?? 0.5) * 100)}%</span>
          </label>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Categories */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Music className="w-4 h-4" /> Sound categories
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {categories.map((c) => {
            const lib = sounds.filter((s) => s.category === c.name);
            return (
              <div key={c.name} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Toggle
                  on={!!c.is_enabled}
                  onClick={() => saveCategory(c.name, { is_enabled: !c.is_enabled })}
                  label=""
                />
                <div className="min-w-[9rem]">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {c.display_name || c.name}
                  </div>
                  <div className="text-xs text-gray-400">{lib.length} file{lib.length === 1 ? '' : 's'}</div>
                </div>
                <select
                  value={c.default_sound_id || ''}
                  onChange={(e) => saveCategory(c.name, { default_sound_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className="text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 border"
                >
                  <option value="">Synthesized default</option>
                  {lib.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const file = lib.find((s) => s.id === c.default_sound_id);
                    file ? previewFile(file.file_path, `cat-${c.name}`) : soundManager.play(c.name);
                  }}
                  className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Preview"
                >
                  <Play className={`w-4 h-4 ${playingId === `cat-${c.name}` ? 'text-primary-600' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          "Synthesized default" plays a built-in tone — no file needed. Uploads
          land in managed storage (storage/sounds) and are tracked by Storage
          Management like every other asset.
        </p>
      </div>

      {/* Upload */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload a sound
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="Sound name"
            className="input-field text-sm flex-1 min-w-[10rem]"
          />
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 px-2 py-2 border"
          >
            {categories.map((c) => (
              <option key={c.name} value={c.name}>{c.display_name || c.name}</option>
            ))}
          </select>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a"
            onChange={(e) => doUpload(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Choose file
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">mp3 / wav / ogg / m4a, up to 5 MB.</p>
      </div>

      {/* Element sounds — pick any element, give it a sound */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Crosshair className="w-4 h-4" /> Element sounds ({bindings.length})
          </h3>
          <button
            type="button"
            onClick={togglePick}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              picking
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
            }`}
          >
            {picking ? 'Picking… (Esc to cancel)' : 'Pick element'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Pick element → hover any button/control and click it, choose a sound, save. The
          binding applies app-wide for every user.
        </p>

        {pending && (
          <div className="mb-3 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 p-3 space-y-2">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 truncate" title={pending.selector}>
              {pending.label || pending.selector}
            </div>
            <div className="text-[11px] text-gray-400 font-mono truncate" title={pending.selector}>
              {pending.selector}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pendingEvent}
                onChange={(e) => setPendingEvent(e.target.value)}
                className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5"
                aria-label="Trigger event"
              >
                <option value="click">on click</option>
                <option value="hover">on hover</option>
              </select>
              <select
                value={pendingSound}
                onChange={(e) => setPendingSound(e.target.value)}
                className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 max-w-[12rem]"
                aria-label="Sound"
              >
                <optgroup label="Synthesized">
                  {categories.map((c) => (
                    <option key={c.name} value={`cat:${c.name}`}>
                      {c.display_name || c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Library">
                  {sounds.map((s) => (
                    <option key={s.id} value={`file:${s.id}`}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                onClick={previewPending}
                className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Preview"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={saveBinding}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {bindings.length === 0 && !pending ? (
          <p className="text-sm text-gray-400">No element sounds yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {bindings.map((b) => (
              <div key={b.id} className="py-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleBinding(b)}
                  aria-pressed={b.enabled}
                  className="shrink-0"
                  title={b.enabled ? 'Disable' : 'Enable'}
                >
                  {b.enabled
                    ? <ToggleRight className="w-5 h-5 text-green-500" />
                    : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {b.element_label || b.selector}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {b.event} · {b.file_path ? (sounds.find((s) => s.id === b.sound_id)?.name || 'library file') : (b.sound_name || 'pop')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBindDelete(b)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4" /> Library ({sounds.length})
        </h3>
        {sounds.length === 0 ? (
          <p className="text-sm text-gray-400">No sounds uploaded yet — categories play their synthesized defaults.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {sounds.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-2.5 flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => previewFile(s.file_path, s.id)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Play"
                >
                  <Play className={`w-4 h-4 ${playingId === s.id ? 'text-primary-600' : ''}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {s.name}
                    {s.is_default && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">default</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {s.category_display || s.category} · {fmtBytes(s.file_size)}
                    {s.uploaded_by_username ? ` · ${s.uploaded_by_username}` : ''}
                  </div>
                </div>
                {!s.is_default && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete sound"
        message={`Delete "${deleteTarget?.name}"? Users with it selected fall back to the synthesized default.`}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        isOpen={!!bindDelete}
        title="Remove element sound"
        message={`Remove the ${bindDelete?.event} sound from "${bindDelete?.element_label || bindDelete?.selector}"?`}
        onConfirm={doDeleteBinding}
        onCancel={() => setBindDelete(null)}
      />
    </div>
  );
};

export default SoundPanel;
