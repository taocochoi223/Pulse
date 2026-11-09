// Studio-grade Web Audio API Synthesizer for Discord-style UI Sound Effects
// Zero external MP3 assets, <1ms latency, ultra-lightweight RAM footprint.

class SoundEffectService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    startTimeOffsetSec = 0,
    type: OscillatorType = 'sine',
    volume = 0.14
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + startTimeOffsetSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Smooth attack and exponential decay to prevent clicking
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }

  /** Âm thanh khi Vào Phòng Họp (Ascending warm chord) */
  public playJoinRoom() {
    this.playTone(523.25, 0.12, 0.0, 'sine', 0.15); // C5
    this.playTone(659.25, 0.18, 0.09, 'sine', 0.16); // E5
    this.playTone(783.99, 0.22, 0.18, 'sine', 0.14); // G5
  }

  /** Âm thanh khi Rời Phòng Họp (Descending clean chord) */
  public playLeaveRoom() {
    this.playTone(659.25, 0.11, 0.0, 'sine', 0.15); // E5
    this.playTone(523.25, 0.14, 0.08, 'sine', 0.15); // C5
    this.playTone(392.0, 0.22, 0.16, 'sine', 0.14); // G4
  }

  /** Âm thanh khi Tắt Micro (Mute - High to Low double pop) */
  public playMute() {
    this.playTone(480, 0.07, 0.0, 'triangle', 0.14);
    this.playTone(340, 0.09, 0.06, 'triangle', 0.14);
  }

  /** Âm thanh khi Bật Micro (Unmute - Low to High double pop) */
  public playUnmute() {
    this.playTone(360, 0.07, 0.0, 'triangle', 0.14);
    this.playTone(540, 0.09, 0.06, 'triangle', 0.15);
  }

  /** Âm thanh khi Tắt Loa/Tai nghe (Deafen) */
  public playDeafen() {
    this.playTone(420, 0.08, 0.0, 'sine', 0.15);
    this.playTone(280, 0.12, 0.07, 'sine', 0.15);
  }

  /** Âm thanh khi Bật Loa/Tai nghe (Undeafen) */
  public playUndeafen() {
    this.playTone(300, 0.08, 0.0, 'sine', 0.15);
    this.playTone(460, 0.12, 0.07, 'sine', 0.15);
  }

  /** Âm thanh khi Bật Camera hoặc Bắt đầu Chia sẻ màn hình */
  public playStreamOn() {
    this.playTone(587.33, 0.08, 0.0, 'sine', 0.13); // D5
    this.playTone(880.0, 0.14, 0.07, 'sine', 0.13); // A5
  }

  /** Âm thanh khi Tắt Camera hoặc Dừng Chia sẻ màn hình */
  public playStreamOff() {
    this.playTone(783.99, 0.08, 0.0, 'sine', 0.12); // G5
    this.playTone(523.25, 0.13, 0.07, 'sine', 0.12); // C5
  }

  /** Âm thanh khi có tin nhắn mới từ người khác */
  public playMessagePing() {
    this.playTone(880, 0.06, 0.0, 'sine', 0.08);
    this.playTone(1174.66, 0.1, 0.05, 'sine', 0.08);
  }
}

export const soundEffects = new SoundEffectService();

