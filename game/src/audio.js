// audio.js — tiny WebAudio synth for Ember Run.
// All sounds are generated oscillators; no audio files are loaded.

export function createSoundEngine() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return true;
  }

  function tone({ freq, freqEnd, duration, type, volume, delay = 0 }) {
    if (muted || !ensureContext()) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd && freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function noiseBurst({ duration, volume, delay = 0 }) {
    if (muted || !ensureContext()) return;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    // Call from a user gesture so the browser unlocks audio.
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    // Bright two-note chime when an ember is collected.
    playPickup(combo) {
      const step = Math.min(combo, 8);
      const base = 660 * Math.pow(1.059, step);
      tone({ freq: base, duration: 0.12, type: 'sine', volume: 0.5 });
      tone({ freq: base * 1.5, duration: 0.18, type: 'sine', volume: 0.4, delay: 0.06 });
    },
    // Low thud plus noise when the firefly is hit.
    playHit() {
      tone({ freq: 160, freqEnd: 55, duration: 0.28, type: 'square', volume: 0.5 });
      noiseBurst({ duration: 0.2, volume: 0.5 });
    },
    // Rising arpeggio when a new wave begins.
    playWave() {
      [523, 659, 784].forEach((freq, i) => {
        tone({ freq, duration: 0.16, type: 'triangle', volume: 0.4, delay: i * 0.09 });
      });
    },
    // Soft click for buttons and menu actions.
    playClick() {
      tone({ freq: 880, duration: 0.06, type: 'sine', volume: 0.35 });
    },
    // Gentle descending notes for game over.
    playGameOver() {
      [392, 330, 262, 196].forEach((freq, i) => {
        tone({ freq, duration: 0.3, type: 'triangle', volume: 0.4, delay: i * 0.16 });
      });
    },
  };
}
