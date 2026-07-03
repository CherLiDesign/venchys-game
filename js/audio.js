/* ============================================================================
 * audio.js — Placeholder sound system
 * ----------------------------------------------------------------------------
 * All sounds are SYNTHESIZED with the Web Audio API so the prototype needs zero
 * asset files. To replace with real sounds later, keep the same public methods
 * (playClick/playAttack/playHit/playVictory/playDefeat/toggleMusic) and swap
 * their bodies to load & play files from /assets/sounds.
 * ==========================================================================*/

(function () {
  "use strict";

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.musicOn = true;
      this.sfxOn = true;
      this._musicNodes = null;
      this._musicTimer = null;
    }

    // Lazily create the AudioContext — browsers require a user gesture first.
    _ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }

    // Core tone generator used by every effect.
    _tone({ freq = 440, dur = 0.15, type = "sine", gain = 0.2, slideTo = null, delay = 0 }) {
      if (!this.sfxOn) return;
      const ctx = this._ensure();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    playClick() {
      this._tone({ freq: 660, dur: 0.08, type: "triangle", gain: 0.15, slideTo: 880 });
    }

    playAttack() {
      this._tone({ freq: 300, dur: 0.12, type: "sawtooth", gain: 0.16, slideTo: 520 });
    }

    playHit() {
      this._tone({ freq: 200, dur: 0.18, type: "square", gain: 0.18, slideTo: 90 });
    }

    playSpecial() {
      this._tone({ freq: 500, dur: 0.1, type: "triangle", gain: 0.18, slideTo: 900 });
      this._tone({ freq: 700, dur: 0.14, type: "sine", gain: 0.16, slideTo: 1200, delay: 0.08 });
    }

    playHeal() {
      this._tone({ freq: 520, dur: 0.16, type: "sine", gain: 0.16, slideTo: 880 });
    }

    playVictory() {
      [523, 659, 784, 1046].forEach((f, i) =>
        this._tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.18, delay: i * 0.16 })
      );
    }

    playDefeat() {
      [440, 370, 294, 220].forEach((f, i) =>
        this._tone({ freq: f, dur: 0.28, type: "sawtooth", gain: 0.16, delay: i * 0.2 })
      );
    }

    // A gentle looping arpeggio as placeholder background music.
    startMusic() {
      if (!this.musicOn || this._musicTimer) return;
      const ctx = this._ensure();
      const notes = [392, 523, 587, 659, 523, 587, 494, 440];
      let i = 0;
      const master = ctx.createGain();
      master.gain.value = 0.06;
      master.connect(ctx.destination);
      this._musicNodes = master;
      const step = () => {
        if (!this.musicOn) return;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = notes[i % notes.length];
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        osc.connect(g).connect(master);
        osc.start(t0);
        osc.stop(t0 + 0.5);
        i++;
      };
      this._musicTimer = setInterval(step, 420);
      step();
    }

    stopMusic() {
      if (this._musicTimer) {
        clearInterval(this._musicTimer);
        this._musicTimer = null;
      }
    }

    toggleMusic() {
      this.musicOn = !this.musicOn;
      if (this.musicOn) this.startMusic();
      else this.stopMusic();
      return this.musicOn;
    }

    toggleSfx() {
      this.sfxOn = !this.sfxOn;
      return this.sfxOn;
    }
  }

  // Namespaced as GameAudio to avoid clobbering the native window.Audio.
  window.GameAudio = new AudioManager();
})();
