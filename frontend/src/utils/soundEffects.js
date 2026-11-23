// Sound Effects System for Listzy App — rebuilt.
//
// Design:
//  • Every category has a synthesized WebAudio fallback, so sounds work
//    even with no files uploaded and no network. Files are an upgrade,
//    not a requirement.
//  • One shared AudioContext, created lazily on first play and resumed
//    on demand — creating a context per beep used to hit the browser's
//    ~6-context cap and kill all audio.
//  • Dead file URLs are remembered so a 404'd sound falls back to synth
//    instantly instead of silently failing on every press.
//  • localStorage is guarded — storage-blocked browsers just don't
//    persist prefs.

const store = {
  get(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* optional */ }
  },
};

// Synthesized fallback per category — short distinctive envelopes.
// { f: freq Hz, t: sec, w: wave, seq?: [{f, t}] } — seq chains notes.
const SYNTH = {
  check:        { seq: [{ f: 880, t: 0.07 }, { f: 1320, t: 0.1 }] },
  uncheck:      { seq: [{ f: 660, t: 0.08 }, { f: 440, t: 0.1 }] },
  pop:          { f: 520, t: 0.09, w: 'triangle' },
  shake:        { seq: [{ f: 300, t: 0.04 }, { f: 260, t: 0.04 }, { f: 300, t: 0.04 }] },
  notification: { seq: [{ f: 988, t: 0.09 }, { f: 1319, t: 0.14 }] },
  success:      { seq: [{ f: 523, t: 0.09 }, { f: 659, t: 0.09 }, { f: 784, t: 0.16 }] },
  error:        { seq: [{ f: 330, t: 0.12, w: 'sawtooth' }, { f: 220, t: 0.18, w: 'sawtooth' }] },
  warning:      { seq: [{ f: 587, t: 0.1 }, { f: 587, t: 0.1 }] },
  delete:       { seq: [{ f: 392, t: 0.08 }, { f: 262, t: 0.14 }] },
  add:          { seq: [{ f: 659, t: 0.07 }, { f: 880, t: 0.11 }] },
  scan:         { f: 1175, t: 0.08, w: 'square' },
  voice:        { f: 740, t: 0.12 },
  scroll:       { f: 180, t: 0.03 },
  key:          { f: 640, t: 0.025, w: 'triangle' },
};

class SoundManager {
  constructor() {
    this.enabled = store.get('soundEnabled', 'false') === 'true'; // Disabled by default
    this.volume = parseFloat(store.get('soundVolume', '0.3'));
    this.sounds = {};        // category -> file url (from prefs/config)
    this.categoryEnabled = {}; // category -> bool (global admin switches)
    this.globallyEnabled = true;
    this.audioCache = {};    // url -> HTMLAudioElement
    this.deadUrls = new Set(); // urls that failed to load — synth instead
    this.ctx = null;         // shared AudioContext (lazily created)
  }

  initSounds() {
    // Deprecated - sounds are lazy + synthesized. Kept for compatibility.
  }

  _audioCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    // Autoplay policy: a context created before user interaction starts
    // suspended — resume on every use; it's a no-op when already running.
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Synthesize a category's fallback notes on the shared context.
  _synth(name) {
    const def = SYNTH[name];
    const ctx = this._audioCtx();
    if (!def || !ctx) return;
    const notes = def.seq || [{ f: def.f, t: def.t, w: def.w }];
    let at = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = n.f;
      osc.type = n.w || def.w || 'sine';
      gain.gain.setValueAtTime(this.volume * 0.6, at);
      gain.gain.exponentialRampToValueAtTime(0.01, at + n.t);
      osc.start(at);
      osc.stop(at + n.t);
      at += n.t * 0.8; // slight overlap keeps chains smooth
    }
  }

  // Play a file-backed sound; returns true if it started. Files that
  // error out (missing/404) are marked dead so the next press goes
  // straight to the synth fallback.
  _playFile(url) {
    if (this.deadUrls.has(url)) return false;
    let el = this.audioCache[url];
    if (!el) {
      el = new Audio(url);
      el.addEventListener('error', () => {
        this.deadUrls.add(url);
        delete this.audioCache[url];
      }, { once: true });
      this.audioCache[url] = el;
    }
    const inst = el.cloneNode();
    inst.volume = this.volume;
    inst.addEventListener('error', () => this.deadUrls.add(url), { once: true });
    inst.play().catch(() => {});
    return true;
  }

  loadSound(url) {
    // Compat shim — old API returned a thunk that played the file.
    return () => {
      if (!this.enabled) return;
      this._playFile(url);
    };
  }

  // Update category -> file mappings from preferences.
  updateSounds(checkSoundPath, uncheckSoundPath, popSoundPath) {
    if (checkSoundPath) this.sounds.check = checkSoundPath;
    if (uncheckSoundPath) this.sounds.uncheck = uncheckSoundPath;
    if (popSoundPath) this.sounds.pop = popSoundPath;
  }

  // Apply a resolved config — /api/sounds/play-config payload:
  // { globallyEnabled, userEnabled, userVolume, categories: {name: {enabled, file}} }
  applyConfig(cfg) {
    if (!cfg) return;
    this.globallyEnabled = cfg.globallyEnabled !== false;
    this.setEnabled(!!cfg.userEnabled);
    if (typeof cfg.userVolume === 'number') this.setVolume(cfg.userVolume);
    Object.entries(cfg.categories || {}).forEach(([name, c]) => {
      this.categoryEnabled[name] = c.enabled !== false;
      if (c.file) this.sounds[name] = c.file;
    });
  }

  // Load preferences — accepts the new play-config payload, or a
  // soundsAPI service (legacy callers).
  async loadPreferences(soundsAPI) {
    try {
      if (soundsAPI?.getPlayConfig) {
        const cfg = await soundsAPI.getPlayConfig();
        this.applyConfig(cfg);
        return;
      }
      const prefs = await soundsAPI.getPreferences();
      this.setEnabled(prefs.sound_enabled);
      this.setVolume(prefs.sound_volume);
      const sounds = await soundsAPI.getAllSounds();
      const byId = Object.fromEntries(sounds.map((s) => [s.id, s]));
      const pick = (id, name) => {
        if (id && byId[id]?.file_path) this.sounds[name] = byId[id].file_path;
      };
      pick(prefs.check_sound_id, 'check');
      pick(prefs.uncheck_sound_id, 'uncheck');
      pick(prefs.pop_sound_id, 'pop');
      pick(prefs.shake_sound_id, 'shake');
      pick(prefs.notification_sound_id, 'notification');
      pick(prefs.success_sound_id, 'success');
      pick(prefs.error_sound_id, 'error');
    } catch (error) {
      console.warn('Could not load sound preferences:', error);
    }
  }

  createBeep(frequency, duration, type = 'sine') {
    return () => {
      if (!this.enabled) return;
      const ctx = this._audioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.value = this.volume;
      osc.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    };
  }

  play(soundName) {
    if (!this.enabled || !this.globallyEnabled) return;
    if (this.categoryEnabled[soundName] === false) return;

    // Skip sounds in optimization mode
    if (document.body.classList.contains('optimization-mode')) return;

    try {
      const url = this.sounds[soundName];
      if (url && !this.deadUrls.has(url)) {
        this._playFile(url);
        return;
      }
      this._synth(soundName);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    store.set('soundEnabled', enabled);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    store.set('soundVolume', this.volume);
  }

  isEnabled() {
    return this.enabled;
  }
}

// Create singleton instance
const soundManager = new SoundManager();

export default soundManager;

// Convenience exports
export const playSound = (soundName) => soundManager.play(soundName);
export const toggleSound = () => soundManager.setEnabled(!soundManager.isEnabled());
export const setSoundVolume = (volume) => soundManager.setVolume(volume);
export const isSoundEnabled = () => soundManager.isEnabled();
