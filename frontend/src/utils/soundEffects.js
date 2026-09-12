// Sound Effects System for Listzy App

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('soundEnabled') === 'true'; // Disabled by default
    this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.3');
    this.sounds = {};
    this.audioCache = {}; // Cache for lazy-loaded audio objects
    this.soundPaths = {
      check: '/sounds/check.mp3',
      uncheck: '/sounds/uncheck.mp3',
      pop: '/sounds/pop.mp3'
    };
  }

  initSounds() {
    // Deprecated - sounds are now lazy-loaded on first play
    // Kept for backwards compatibility
  }

  loadSound(url) {
    // Lazy load: create Audio object only when first played
    return () => {
      if (!this.enabled) return;
      
      // Check cache first
      if (!this.audioCache[url]) {
        this.audioCache[url] = new Audio(url);
        this.audioCache[url].volume = this.volume;
      }
      
      // Clone the audio to allow multiple simultaneous plays
      const sound = this.audioCache[url].cloneNode();
      sound.volume = this.volume;
      sound.play().catch(err => {
        console.warn('Sound play failed:', err);
      });
    };
  }

  // Update sounds based on user preferences
  updateSounds(checkSoundPath, uncheckSoundPath, popSoundPath) {
    if (checkSoundPath) {
      this.sounds.check = this.loadSound(checkSoundPath);
    }
    if (uncheckSoundPath) {
      this.sounds.uncheck = this.loadSound(uncheckSoundPath);
    }
    if (popSoundPath) {
      this.sounds.pop = this.loadSound(popSoundPath);
    }
  }

  // Load preferences from API
  async loadPreferences(soundsAPI) {
    try {
      const prefs = await soundsAPI.getPreferences();
      this.setEnabled(prefs.sound_enabled);
      this.setVolume(prefs.sound_volume);
      
      // Load selected sounds
      const sounds = await soundsAPI.getAllSounds();
      const checkSound = sounds.find(s => s.id === prefs.check_sound_id);
      const uncheckSound = sounds.find(s => s.id === prefs.uncheck_sound_id);
      const popSound = sounds.find(s => s.id === prefs.pop_sound_id);
      
      this.updateSounds(
        checkSound?.file_path,
        uncheckSound?.file_path,
        popSound?.file_path
      );
    } catch (error) {
      console.warn('Could not load sound preferences:', error);
    }
  }

  createBeep(frequency, duration, type = 'sine') {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.value = this.volume;

      oscillator.start(audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration
      );
      oscillator.stop(audioContext.currentTime + duration);
    };
  }

  play(soundName) {
    if (!this.enabled) return;
    
    // Skip sounds in optimization mode
    if (document.body.classList.contains('optimization-mode')) return;
    
    try {
      // Lazy-load sound on first play
      if (!this.sounds[soundName]) {
        const soundPath = this.soundPaths[soundName];
        if (soundPath) {
          this.sounds[soundName] = this.loadSound(soundPath);
        }
      }
      
      if (this.sounds[soundName]) {
        this.sounds[soundName]();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', enabled);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume);
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
