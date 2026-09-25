/**
 * Fully synthesized audio: SFX + generative music, no assets.
 */

type MusicMode = 'menu' | 'combat' | 'boss' | null;
type SpeakerKey = 'nebu' | 'soft' | 'king' | 'narr' | 'core' | 'sage';

/** Per-character voice design (waveform / register / texture), Undertale-style. */
const VOICES: Record<
  SpeakerKey,
  { wave: OscillatorType; base: number; dur: number; vol: number; jitter: number; harm?: number; growl?: boolean; air?: boolean; detune?: boolean }
> = {
  nebu: { wave: 'square', base: 560, dur: 0.05, vol: 0.045, jitter: 0.13, harm: 2 }, // چاپلوژ و پرانرژی — بوقِ دوتاییِ روشن
  soft: { wave: 'triangle', base: 430, dur: 0.06, vol: 0.05, jitter: 0.1, detune: true }, // نیبوی خسته و مهربان — گرم و دوتایی
  king: { wave: 'sawtooth', base: 115, dur: 0.075, vol: 0.06, jitter: 0.08, growl: true }, // غرشِ کم‌بسامد + خش‌خش
  narr: { wave: 'sine', base: 330, dur: 0.035, vol: 0.035, jitter: 0.06, air: true }, // راوی — نجوا با هوای توی‌گوش
  core: { wave: 'sine', base: 740, dur: 0.05, vol: 0.045, jitter: 0.09, harm: 1.5 }, // قلبِ کریستالی — زنگِ نقره‌ای
  sage: { wave: 'triangle', base: 380, dur: 0.065, vol: 0.05, jitter: 0.07, detune: true, air: true }, // سالگرد — گرم، کهنه، نفس‌دار
};

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextT = 0;
  private step = 0;
  private mode: MusicMode = null;
  private lastTick = 0;
  private lastBlip = 0;
  muted = typeof localStorage !== 'undefined' && localStorage.getItem('et_muted') === '1';

  ensure() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.42;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('et_muted', this.muted ? '1' : '0');
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime + 0.08);
    }
    return this.muted;
  }

  private tone(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    when = 0,
    dest?: GainNode,
  ) {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest ?? this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(
    dur: number,
    vol: number,
    freq: number,
    type: BiquadFilterType = 'lowpass',
    when = 0,
    dest?: GainNode,
    rate = 1,
  ) {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.playbackRate.value = rate;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest ?? this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /* ── UI & battle SFX ─────────────────────────────────────── */

  ui() {
    this.ensure();
    this.tone(660, 880, 0.07, 'triangle', 0.12);
  }

  /**
   * Undertale-style dialogue voice: every character speaks with its own
   * hand-tuned timbre — waveform, register, texture layers and articulation —
   * so each dialogue reads as "heard", not merely read.
   */
  blip(who: SpeakerKey) {
    this.ensure();
    const now = performance.now();
    if (now - this.lastBlip < 26) return;
    this.lastBlip = now;
    const v = VOICES[who];
    const f = v.base * (1 - v.jitter + Math.random() * v.jitter * 2);
    const bend = f * (who === 'nebu' ? 1.04 : 0.9); // nebu chirps UP, others settle down
    this.tone(f, bend, v.dur, v.wave, v.vol);
    if (v.harm) this.tone(f * v.harm, bend * v.harm, v.dur * 0.8, v.wave, v.vol * 0.35);
    if (v.growl) this.noise(v.dur * 1.6, v.vol * 0.9, 320, 'lowpass');
    if (v.air) this.noise(v.dur * 0.8, 0.012, 5200, 'highpass');
    if (v.detune) {
      this.tone(f * 1.008, bend * 1.008, v.dur, 'triangle', v.vol * 0.5);
    }
  }

  shoot(kind: 'dart' | 'cannon' | 'frost' | 'tesla' | 'sniper' | 'burn') {
    this.ensure();
    switch (kind) {
      case 'dart':
        this.tone(950, 380, 0.07, 'triangle', 0.1);
        break;
      case 'cannon':
        this.tone(120, 55, 0.22, 'sine', 0.4);
        this.noise(0.18, 0.22, 500, 'lowpass');
        break;
      case 'frost':
        this.tone(1750, 2500, 0.12, 'sine', 0.08);
        this.tone(2600, 3100, 0.09, 'sine', 0.05, 0.03);
        break;
      case 'tesla':
        this.noise(0.14, 0.2, 3200, 'bandpass', 0, undefined, 1.8);
        this.tone(1350, 700, 0.08, 'square', 0.06);
        break;
      case 'sniper':
        this.tone(2100, 300, 0.16, 'sawtooth', 0.12);
        this.noise(0.1, 0.1, 4500, 'highpass');
        break;
      case 'burn':
        this.noise(0.24, 0.14, 900, 'bandpass', 0, undefined, 1.4);
        this.tone(300, 180, 0.18, 'sawtooth', 0.06);
        break;
    }
  }

  tick() {
    this.ensure();
    const now = performance.now();
    if (now - this.lastTick < 40) return;
    this.lastTick = now;
    this.tone(220, 190, 0.03, 'triangle', 0.05);
  }

  boom(big = false) {
    this.ensure();
    this.noise(big ? 0.6 : 0.3, big ? 0.5 : 0.3, big ? 300 : 420, 'lowpass');
    this.tone(big ? 90 : 120, 40, big ? 0.5 : 0.28, 'sine', big ? 0.55 : 0.35);
  }

  kill() {
    this.ensure();
    this.tone(320, 90, 0.12, 'sine', 0.14);
    this.tone(880, 1400, 0.1, 'triangle', 0.07, 0.02);
  }

  coin() {
    this.ensure();
    this.tone(1320, 1320, 0.06, 'sine', 0.1);
    this.tone(1760, 1760, 0.1, 'sine', 0.1, 0.055);
  }

  shard() {
    this.ensure();
    [1140, 1430, 1800].forEach((f, i) => this.tone(f, f, 0.12, 'sine', 0.09, i * 0.06));
  }

  build() {
    this.ensure();
    this.tone(240, 180, 0.1, 'triangle', 0.22);
    this.noise(0.08, 0.12, 1400, 'highpass');
  }

  upgrade() {
    this.ensure();
    const notes = [523, 659, 784];
    notes.forEach((f, i) => this.tone(f, f, 0.14, 'triangle', 0.14, i * 0.07));
  }

  apex() {
    this.ensure();
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.14, i * 0.08));
    this.noise(0.5, 0.08, 3000, 'highpass', 0.1);
  }

  error() {
    this.ensure();
    this.tone(110, 95, 0.12, 'square', 0.12);
  }

  leak() {
    this.ensure();
    this.tone(160, 60, 0.35, 'sawtooth', 0.22);
    this.noise(0.3, 0.16, 260, 'lowpass');
  }

  wave() {
    this.ensure();
    this.tone(220, 440, 0.4, 'sawtooth', 0.1);
    this.noise(0.4, 0.08, 800, 'bandpass', 0, undefined, 0.6);
  }

  bossSting() {
    this.ensure();
    this.tone(65, 52, 1.1, 'sawtooth', 0.22);
    this.tone(98, 82, 1.1, 'sawtooth', 0.16);
    for (let i = 0; i < 3; i++) this.noise(0.22, 0.28, 180, 'lowpass', i * 0.3);
  }

  chapter() {
    this.ensure();
    [293, 440, 587, 880].forEach((f, i) => {
      this.tone(f, f, 1.4, 'sine', 0.06, i * 0.18);
      this.tone(f * 1.005, f * 1.005, 1.4, 'sine', 0.04, i * 0.18);
    });
  }

  critDing() {
    this.ensure();
    this.tone(2200, 2200, 0.05, 'sine', 0.08);
    this.tone(2940, 2940, 0.08, 'sine', 0.05, 0.04);
  }

  spellPulse() {
    this.ensure();
    this.tone(80, 180, 0.5, 'sine', 0.5);
    this.tone(120, 240, 0.4, 'triangle', 0.25);
    this.noise(0.5, 0.2, 500, 'lowpass');
  }

  spellFreeze() {
    this.ensure();
    this.tone(1400, 300, 0.7, 'sine', 0.16);
    [1900, 2400, 3000].forEach((f, i) => this.tone(f, f * 0.5, 0.4, 'sine', 0.06, 0.1 + i * 0.12));
  }

  spellTear() {
    this.ensure();
    this.noise(0.5, 0.3, 2500, 'bandpass', 0, undefined, 2);
    this.tone(220, 60, 0.6, 'sawtooth', 0.3);
    for (let i = 0; i < 4; i++) this.noise(0.12, 0.2, 3000, 'highpass', i * 0.09);
  }

  gameover() {
    this.ensure();
    const seq = [440, 349, 293, 220];
    seq.forEach((f, i) => this.tone(f, f * 0.99, 0.55, 'triangle', 0.16, i * 0.4));
    this.tone(55, 40, 2.2, 'sine', 0.2, 0.2);
  }

  /* ── generative music ────────────────────────────────────── */

  music(m: MusicMode) {
    this.ensure();
    if (m === this.mode) return;
    this.mode = m;
    if (m === null) {
      if (this.timer !== null) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      return;
    }
    if (!this.ctx) return;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 80);
  }

  private stepDur(): number {
    return this.mode === 'menu' ? 0.26 : this.mode === 'boss' ? 0.14 : 0.155;
  }

  private schedule() {
    if (!this.ctx || !this.musicBus || !this.mode || this.ctx.state === 'suspended') return;
    const dur = this.stepDur();
    if (this.nextT < this.ctx.currentTime - dur * 2) {
      // Mobile browsers throttle timers in background tabs. Skip missed beats instead of
      // creating hundreds of oscillators at once when the player returns.
      this.step += Math.max(0, Math.floor((this.ctx.currentTime - this.nextT) / dur));
      this.nextT = this.ctx.currentTime + 0.04;
    }
    const ahead = this.ctx.currentTime + 0.28;
    let scheduled = 0;
    while (this.nextT < ahead && scheduled < 4) {
      this.playStep(this.step, this.nextT);
      this.step++;
      this.nextT += dur;
      scheduled++;
    }
  }

  private playStep(s: number, t: number) {
    if (!this.musicBus) return;
    const when = t - (this.ctx?.currentTime ?? 0);
    const A = 45; // A2
    if (this.mode === 'menu') {
      if (s % 16 === 0) {
        [0, 7, 12].forEach((iv) => {
          this.tone(midi(A + iv), midi(A + iv), 3.6, 'sine', 0.05, when, this.musicBus!);
          this.tone(midi(A + iv) * 1.003, midi(A + iv) * 1.003, 3.6, 'sine', 0.04, when, this.musicBus!);
        });
      }
      if (s % 4 === 2 && Math.random() < 0.6) {
        const pent = [0, 3, 5, 7, 10, 12, 15];
        const n = pent[Math.floor(Math.random() * pent.length)];
        this.tone(midi(A + 24 + n), midi(A + 24 + n) * 0.99, 0.5, 'triangle', 0.05, when, this.musicBus!);
        this.tone(midi(A + 24 + n), midi(A + 24 + n) * 0.99, 0.5, 'triangle', 0.02, when + 0.32, this.musicBus!);
      }
      return;
    }
    const bassPat = [0, 0, 12, 0, 3, 3, 15, 3, -2, -2, 10, -2, 3, 3, 15, 12];
    if (s % 2 === 0) {
      const iv = bassPat[(s / 2) % 16 | 0];
      this.tone(midi(A + iv), midi(A + iv), this.stepDur() * 1.8, 'square', 0.06, when, this.musicBus);
      this.tone(midi(A - 12 + iv), midi(A - 12 + iv), this.stepDur() * 1.8, 'sawtooth', 0.05, when, this.musicBus);
    }
    const arpPat = [12, 15, 19, 24, 19, 15];
    if (this.mode === 'boss' ? true : s % 2 === 1) {
      const n = arpPat[s % arpPat.length];
      const vol = this.mode === 'boss' ? 0.045 : 0.035;
      this.tone(midi(A + 12 + n), midi(A + 12 + n), 0.12, 'triangle', vol, when, this.musicBus);
      this.tone(midi(A + 12 + n), midi(A + 12 + n), 0.12, 'triangle', vol * 0.4, when + this.stepDur() * 3, this.musicBus);
    }
    if (s % 2 === 1) this.noise(0.03, 0.02, 6000, 'highpass', when, this.musicBus);
    if (s % 8 === 4) this.noise(0.12, 0.09, 900, 'bandpass', when, this.musicBus, 0.8);
    if (this.mode === 'boss' && s % 32 === 0) {
      this.tone(midi(A - 24), midi(A - 24), 4.2, 'sawtooth', 0.07, when, this.musicBus);
      this.tone(midi(A - 24 + 1), midi(A - 24 + 1), 4.2, 'sawtooth', 0.05, when, this.musicBus);
    }
  }
}

export const audio = new AudioEngine();
