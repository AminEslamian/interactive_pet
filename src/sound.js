// Web Audio API procedural sound engine - no external audio files required!
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ttsEnabled = false;
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    return this.ttsEnabled;
  }

  // Cute animal-crossing / celeste style vocal babble for talking text
  playBabble(pitchModifier = 1.0) {
    if (this.muted) return;
    this.ensureRunning();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Soft triangle/sine wave for a warm, cute voice
      osc.type = 'triangle';
      const baseFreq = 540 * pitchModifier;
      const variation = (Math.random() - 0.5) * 80;
      osc.frequency.setValueAtTime(baseFreq + variation, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + variation + 60, t + 0.05);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.07);
    } catch {
      // Audio playback non-blocking
    }
  }

  // Elastic rubber boing when Miko stretches & snaps back
  playStretchBoing(tension = 1.0) {
    if (this.muted) return;
    this.ensureRunning();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const startFreq = 220 + Math.min(tension * 150, 400);
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, t + 0.18);
      osc.frequency.exponentialRampToValueAtTime(startFreq, t + 0.28);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch {}
  }

  // Soft purring flutter when petted
  playPetPurr() {
    if (this.muted) return;
    this.ensureRunning();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      // vibrato
      osc.frequency.linearRampToValueAtTime(180, t + 0.06);
      osc.frequency.linearRampToValueAtTime(130, t + 0.12);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Meditative shrine bell chime for 25-minute eye rest reminder
  playRestChime() {
    if (this.muted) return;
    this.ensureRunning();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chime chord
      const t = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gain.gain.setValueAtTime(0, t + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 1.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 1.9);
      });
    } catch {}
  }

  // Completion chime when user finishes eye break
  playCompletionChime() {
    if (this.muted) return;
    this.ensureRunning();
    if (!this.ctx) return;

    try {
      const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
      const t = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.1);

        gain.gain.setValueAtTime(0.08, t + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + idx * 0.1);
        osc.stop(t + idx * 0.1 + 1.0);
      });
    } catch {}
  }

  // Web Speech API text-to-speech option
  speakText(text) {
    if (!this.ttsEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.35; // Cute, higher voice
    utterance.rate = 1.05;

    // Try finding a gentle feminine voice if available
    const voices = window.speechSynthesis.getVoices();
    const sweetVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira'))
    );
    if (sweetVoice) {
      utterance.voice = sweetVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const soundManager = new SoundManager();
