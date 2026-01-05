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
}
