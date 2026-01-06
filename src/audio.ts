// Simple retro sound effects using the Web Audio API
// All sounds are synthesized, no external files needed

export class AudioManager {
  private ctx: AudioContext | null = null;
  private initialized = false;

  // Lazy init because browsers require user interaction first
  private ensureContext(): AudioContext | null {
    if (!this.initialized) {
      try {
        this.ctx = new AudioContext();
        this.initialized = true;
      } catch {
        // Audio not supported, just silently fail
        this.initialized = true;
      }
    }
    return this.ctx;
  }

  playShoot(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  playExplosion(size: 'small' | 'medium' | 'large'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Different explosion sounds based on asteroid size
    const duration = size === 'large' ? 0.4 : size === 'medium' ? 0.25 : 0.15;
    const startFreq = size === 'large' ? 100 : size === 'medium' ? 150 : 200;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  playThrust(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // White noise burst for thrust
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    noise.start(ctx.currentTime);
  }

  playDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Descending tone for player death
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  }

  playLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Ascending arpeggio for level complete
    const notes = [262, 330, 392, 523]; // C major arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  playHyperspace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Sci-fi warp sound: rising sweep, brief silence, then descending sweep
    const duration = 0.8; // Total duration matches hyperspace animation

    // Rising sweep (shrinking phase)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);

    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Descending sweep (expanding phase) - starts after warp
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2000, ctx.currentTime + 0.5);
    osc2.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    gain2.gain.setValueAtTime(0.01, ctx.currentTime + 0.5);
    gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.55);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc2.start(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + duration);

    // Add some noise during the warp for texture
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    noise.start(ctx.currentTime + 0.3);
  }

  // UFO warning sound - oscillating tone that plays while UFO is on screen
  private ufoOscillator: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;

  startUFOSound(isSmall: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Stop any existing UFO sound
    this.stopUFOSound();

    // Create oscillating UFO sound
    this.ufoOscillator = ctx.createOscillator();
    this.ufoGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // LFO modulates the main oscillator frequency
    lfo.frequency.value = isSmall ? 8 : 4; // Small UFO has faster warble
    lfoGain.gain.value = isSmall ? 30 : 20;

    lfo.connect(lfoGain);
    lfoGain.connect(this.ufoOscillator.frequency);

    this.ufoOscillator.type = 'square';
    this.ufoOscillator.frequency.value = isSmall ? 600 : 400;

    this.ufoOscillator.connect(this.ufoGain);
    this.ufoGain.connect(ctx.destination);
    this.ufoGain.gain.value = 0.15;

    lfo.start();
    this.ufoOscillator.start();
  }

  stopUFOSound(): void {
    if (this.ufoOscillator) {
      this.ufoOscillator.stop();
      this.ufoOscillator.disconnect();
      this.ufoOscillator = null;
    }
    if (this.ufoGain) {
      this.ufoGain.disconnect();
      this.ufoGain = null;
    }
  }

  playUFOExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Stop the UFO warning sound
    this.stopUFOSound();

    // Special explosion sound for UFO
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  }
}
