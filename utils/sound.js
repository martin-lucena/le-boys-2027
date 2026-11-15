// LJUD.
// Vad: alla ljud i appen. De skapas direkt i webbläsaren med toner och brus, det finns inga ljudfiler.
// Var: hörs vid tryck, röstning, mål, vinst och i beat-maskinen. Ljudknappen i sidhuvudet sätter Sound.muted.
// Används av: components/ui.jsx och de flesta komponenterna (inte Bötesrummet, som ska vara tyst).

/* ---------- Ljud (Web Audio API, inga ljudfiler) ---------- */
// Ett objekt med alla ljudfunktioner. Anropas till exempel som Sound.tap() eller Sound.fanfare().
export const Sound = {
  ctx: null, master: null, noise: null, muted: false,
  // Startar webbläsarens ljudmotor första gången den behövs och ger tillbaka den. Skapar också en
  // halv sekund brus som används till trummor och klick. Webbläsare kräver att användaren har tryckt
  // på något innan ljud får spelas, därför görs det här först vid första ljudet.
  ac() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try {
        this.ctx = new C();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.5;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i += 1) ch[i] = Math.random() * 2 - 1;
        this.noise = buf;
      } catch (e) { this.ctx = null; return null; }
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume().catch(() => {}); } catch (e) { /* ignoreras */ } }
    return this.ctx;
  },
  // Spelar en ton. freq = tonhöjd, at = när, dur = längd, type = klangfärg, vol = volym,
  // slideTo = glid till en annan tonhöjd. Byggsten för de andra ljuden.
  tone(freq, at, dur, type, vol, slideTo) {
    const c = this.ac();
    if (!c || this.muted) return;
    const t = at || c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  // Spelar en kort stöt av brus genom ett filter. Används till virvel, hi-hat, klick och jubel.
  burst(at, dur, vol, filterType, freq) {
    const c = this.ac();
    if (!c || this.muted) return;
    const t = at || c.currentTime;
    const s = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    s.buffer = this.noise;
    f.type = filterType; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.02);
  },
  // Färdiga ljud: click = hjulets tickande, tap = knapptryck, pop = stigande pling (högre ju större n).
  click() { this.burst(0, 0.022, 0.35, 'bandpass', 2600); this.tone(1150, 0, 0.018, 'square', 0.06); },
  tap() { this.tone(520, 0, 0.05, 'triangle', 0.08, 780); },
  pop(n) { const f = 380 + Math.min(n || 0, 25) * 28; this.tone(f, 0, 0.11, 'triangle', 0.16, f * 1.6); },
  // Två mörka toner: fel lösenord, miss eller något som nollställs.
  error() {
    const c = this.ac();
    if (!c) return;
    this.tone(170, c.currentTime, 0.16, 'sawtooth', 0.14);
    this.tone(120, c.currentTime + 0.15, 0.26, 'sawtooth', 0.14);
  },
  // Segerfanfar: fyra stigande toner och lite brus på slutet.
  fanfare() {
    const c = this.ac();
    if (!c) return;
    const t = c.currentTime + 0.02;
    [[523.25, 0, 0.14], [659.25, 0.13, 0.14], [783.99, 0.26, 0.14], [1046.5, 0.4, 0.7]].forEach(([f, d, len]) => {
      this.tone(f, t + d, len, 'sawtooth', 0.09);
      this.tone(f, t + d, len, 'triangle', 0.16);
    });
    [659.25, 783.99].forEach((f) => this.tone(f, t + 0.4, 0.7, 'triangle', 0.08));
    this.burst(t + 0.4, 0.5, 0.07, 'highpass', 6000);
  },
  // Trummorna i beat-maskinen. t = exakt tidpunkt då ljudet ska spelas.
  kick(t) { this.tone(150, t, 0.26, 'sine', 0.9, 42); },
  snare(t) { this.burst(t, 0.16, 0.42, 'highpass', 1400); this.tone(190, t, 0.09, 'triangle', 0.22, 140); },
  hat(t) { this.burst(t, 0.045, 0.16, 'highpass', 7500); },
};
