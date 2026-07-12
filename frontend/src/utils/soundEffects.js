// Sound Effects System for Listzy App

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('soundEnabled') === 'true'; // Disabled by default
    this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.3');
    this.sounds = {};
    this.initSounds();
  }

  initSounds() {
    // Simple check/uncheck sounds only
    this.sounds = {
      check: this.createBeep(800, 0.08, 'sine'),
      uncheck: this.createBeep(400, 0.08, 'sine')
    };
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
    if (this.sounds[soundName]) {
      try {
        this.sounds[soundName]();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
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
