// Sound Effects System for Listzy App

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('soundEnabled') === 'true'; // Disabled by default
    this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.3');
    this.sounds = {};
    this.initSounds();
  }

  initSounds() {
    // Create audio contexts for different sounds
    this.sounds = {
      check: this.createBeep(800, 0.1, 'sine'),
      uncheck: this.createBeep(400, 0.1, 'sine'),
      woosh: this.createWoosh(),
      shake: this.createShake(),
      button: this.createBeep(600, 0.05, 'square'),
      scroll: this.createScroll(),
      success: this.createSuccess(),
      error: this.createBeep(200, 0.2, 'sawtooth'),
      coin: this.createCoin()
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

  createWoosh() {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.3);

      gainNode.gain.setValueAtTime(this.volume * 0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };
  }

  createShake() {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 100;
      
      gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
      
      // Create shake effect with rapid volume changes
      for (let i = 0; i < 5; i++) {
        const time = audioContext.currentTime + (i * 0.02);
        gainNode.gain.setValueAtTime(this.volume * 0.3, time);
        gainNode.gain.setValueAtTime(0, time + 0.01);
      }

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };
  }

  createScroll() {
    let lastScrollTime = 0;
    return () => {
      if (!this.enabled) return;
      
      const now = Date.now();
      if (now - lastScrollTime < 100) return; // Throttle scroll sounds
      lastScrollTime = now;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 300;
      gainNode.gain.value = this.volume * 0.1;

      oscillator.start(audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.stop(audioContext.currentTime + 0.05);
    };
  }

  createSuccess() {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Play a pleasant chord
      const frequencies = [523.25, 659.25, 783.99]; // C, E, G
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.value = this.volume * 0.2;

        const startTime = audioContext.currentTime + (index * 0.05);
        oscillator.start(startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        oscillator.stop(startTime + 0.3);
      });
    };
  }

  createCoin() {
    return () => {
      if (!this.enabled) return;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(988, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1319, audioContext.currentTime + 0.05);
      
      gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
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
