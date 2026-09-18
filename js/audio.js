// Procedural Web Audio — precinct night desk
export class OfficeAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambGain = null;
    this._nodes = [];
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 6;
    comp.connect(this.master);
    this.comp = comp;

    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.08;
    this.ambGain.connect(comp);

    // Low HVAC hum
    const hum = this.ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 58;
    const humG = this.ctx.createGain();
    humG.gain.value = 0.04;
    hum.connect(humG);
    humG.connect(this.ambGain);
    hum.start();
    this._nodes.push(hum);

    // Room tone noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noise(3);
    noise.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 400;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.03;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this.ambGain);
    noise.start();
    this._nodes.push(noise);

    // Rain outside window
    const rain = this.ctx.createBufferSource();
    rain.buffer = this._noise(4);
    rain.loop = true;
    const rf = this.ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.frequency.value = 1800;
    rf.Q.value = 0.4;
    const rg = this.ctx.createGain();
    rg.gain.value = 0.018;
    rain.connect(rf);
    rf.connect(rg);
    rg.connect(this.ambGain);
    rain.start();
    this._rainGain = rg;
    this._nodes.push(rain);

    // Occasional distant siren / thunder
    this._scareTimer = null;
    this.scheduleAmbientEvent();
  }

  _noise(sec) {
    const len = Math.floor(this.ctx.sampleRate * sec);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  async resume() {
    this.ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  scheduleAmbientEvent() {
    const loop = () => {
      if (this.ctx && !this.muted) {
        const r = Math.random();
        if (r < 0.4) this.distantThunder();
        else if (r < 0.7) this.sirenFar();
        else this.phoneRingFar();
      }
      this._scareTimer = setTimeout(loop, (12 + Math.random() * 20) * 1000);
    };
    this._scareTimer = setTimeout(loop, 6000);
  }

  distantThunder() {
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(2.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 120;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    src.connect(f);
    f.connect(g);
    g.connect(this.comp);
    src.start(now);
    src.stop(now + 2.4);
  }

  sirenFar() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.7);
    osc.frequency.linearRampToValueAtTime(620, now + 1.4);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.025, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(f);
    f.connect(g);
    g.connect(this.comp);
    osc.start(now);
    osc.stop(now + 1.7);
  }

  phoneRingFar() {
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.35;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440 + i * 80;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g);
      g.connect(this.comp);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  uiClick() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(g);
    g.connect(this.comp);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  uiPaper() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    src.connect(f);
    f.connect(g);
    g.connect(this.comp);
    src.start(now);
    src.stop(now + 0.2);
  }

  uiType() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 900 + Math.random() * 400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.02, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(g);
    g.connect(this.comp);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  evidenceReveal() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [392, 523.25];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g);
      g.connect(this.comp);
      osc.start(t);
      osc.stop(t + 0.55);
    });
    this.uiPaper();
  }

  boardPin() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise(0.05);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    src.connect(g);
    g.connect(this.comp);
    src.start(now);
    // cork thud
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 90;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.1, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(og);
    og.connect(this.comp);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  verdict(rank) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const good = rank === 'S' || rank === 'A' || rank === 'B';
    const base = good ? 220 : 140;
    [0, 1, 2].forEach((i) => {
      const osc = this.ctx.createOscillator();
      osc.type = good ? 'sine' : 'sawtooth';
      osc.frequency.value = base * Math.pow(1.26, i);
      const g = this.ctx.createGain();
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(g);
      g.connect(this.comp);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  dispose() {
    if (this._scareTimer) clearTimeout(this._scareTimer);
    try {
      this._nodes.forEach((n) => n.stop && n.stop());
    } catch (_) {}
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }
}
