/**
 * Audio Synthesizer for summer sound effects and watermelon tapping simulation
 */

export class GameAudio {
  private ctx: AudioContext | null = null;

  constructor() {
    // Lazy initialize to bypass browser autoplay policies
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a cute success ding-dong sound
   */
  playSuccess() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio play block or not supported', e);
    }
  }

  /**
   * Play a cute bubbly failure/unripe boing sound
   */
  playFailure() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now); // E4
      osc.frequency.linearRampToValueAtTime(150, now + 0.4);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Play a beautiful sparkling pop effect
   */
  playPop() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Synthesize watermelon tap sounds depending on status
   */
  playWatermelonTap(type: 'unripe' | 'ripe' | 'overripe') {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      // We make a custom noise-like sound combined with sine wave representing a natural physical tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Simple bandpass list
      filter.type = 'bandpass';

      // Distinguish frequencies and damping based on watermelon ripeness
      if (type === 'unripe') {
        // High frequency, resonance (铛铛 sound)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

        filter.frequency.setValueAtTime(250, now);
        filter.Q.setValueAtTime(8, now); // Higher Q = clearer ringing

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Longer decay
      } else if (type === 'ripe') {
        // Low and deep frequency, dampened (咚咚 sound)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); // Damped decay
      } else {
        // Overripe: very low frequency, loose, dull (噗噗 sound)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(110, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Quickest decay, dull
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);

      // Add a subtle click noise at the start representing the fingernail impact
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(type === 'unripe' ? 800 : 500, now);
      clickGain.gain.setValueAtTime(0.05, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.02);

    } catch (e) {
      console.warn('Tap sound failed to synthesize', e);
    }
  }
}

export const gameAudio = new GameAudio();
