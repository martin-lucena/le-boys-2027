'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, ShieldCheck, Music, Dices, Lock, LogOut, Volume2, VolumeX, Heart, Check, Play, Square,
  ChevronDown, X, Copy, MapPin, Shirt, RotateCcw, Triangle, Trash2,
} from 'lucide-react';

/* =====================================================================
   INSTÄLLNINGAR
   false = bara Martin och Malte ser appen, övriga ser den hemliga nedräkningen.
   true  = alla åtta får Agenda, Lagkapten, Låtstudion och Lag-Roulette.
           Admin-panelen längst ner visas alltid bara för Martin och Malte.
   ===================================================================== */
const RELEASE_MODE = false;

// Avresa: datum (torsdagen) och klockslag för samling.
const TRIP_DATE = '2027-05-06';
const TRIP_TIME = '15:00';

// Personliga lösenord (skiftlägeskänsliga).
const ACCOUNTS = {
  Martin: { pw: 'K8xP4v', admin: true },
  Malte: { pw: 'M3nR9q', admin: true },
  Max: { pw: 'W7bT2z' },
  Dylan: { pw: 'J5cL8y' },
  Victor: { pw: 'H9fD4s' },
  Petter: { pw: 'R2gN6w' },
  William: { pw: 'P4kV9m' },
  Axel: { pw: 'T6qB3x' },
};

const BOYS = ['Martin', 'Malte', 'Max', 'Dylan', 'Victor', 'Petter', 'William', 'Axel'];
const isAdmin = (name) => !!(ACCOUNTS[name] && ACCOUNTS[name].admin);
const hasFullAccess = (name) => RELEASE_MODE || isAdmin(name);

// Spelarfärger: Tailwind-klasser för gränssnittet, hex för canvas-hjulet.
const PLAYER = {
  Martin: { bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400', hex: '#fbbf24', tag: 'Mr' },
  Malte: { bg: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400', hex: '#34d399', tag: 'Ma' },
  Max: { bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400', hex: '#38bdf8', tag: 'Mx' },
  Dylan: { bg: 'bg-orange-400', text: 'text-orange-400', border: 'border-orange-400', hex: '#fb923c', tag: 'D' },
  Victor: { bg: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400', hex: '#c084fc', tag: 'V' },
  Petter: { bg: 'bg-lime-400', text: 'text-lime-400', border: 'border-lime-400', hex: '#a3e635', tag: 'P' },
  William: { bg: 'bg-pink-400', text: 'text-pink-400', border: 'border-pink-400', hex: '#f472b6', tag: 'W' },
  Axel: { bg: 'bg-indigo-400', text: 'text-indigo-400', border: 'border-indigo-400', hex: '#818cf8', tag: 'A' },
};

const NIGHTS = [
  { id: 'tors', label: 'Torsdag' },
  { id: 'fre', label: 'Fredag' },
  { id: 'lor', label: 'Lördag' },
];
const BLOCKS = [
  { id: 'intro', label: 'Intro' },
  { id: 'vers1', label: 'Vers 1' },
  { id: 'ref', label: 'Refräng' },
  { id: 'vers2', label: 'Vers 2' },
  { id: 'outro', label: 'Outro' },
];
const STEPS = 16;
const DEFAULT_PATTERN = {
  kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
};
const BEAT_ROWS = [
  { id: 'kick', label: 'Bas', on: 'bg-amber-400' },
  { id: 'snare', label: 'Virvel', on: 'bg-emerald-400' },
  { id: 'hat', label: 'Hi-hat', on: 'bg-sky-400' },
];

const DAYS = [
  { id: 'tors', label: 'Torsdag', short: 'Tors', items: [
    { id: 't1', time: '15:00', title: 'Samling och avfärd', place: 'Centralen, under klockan', dress: 'Resekostym: mjukisbyxor och solglasögon', text: 'Alla åtta på plats. Den som kommer sist bär väskorna första dygnet.' },
    { id: 't2', time: '18:00', title: 'Incheckning och rumsdragning', place: 'Högkvarteret (hemlig adress)', dress: 'Fritt, men strumpor i sandaler ger sämsta rummet', text: 'Nycklar ut, rum lottas. Inga byten efter dragning, inga överklaganden.' },
    { id: 't3', time: '20:00', title: 'Välkomstmiddag', place: 'Långbordet', dress: 'Skjorta. Struken är en bonus, inget krav', text: 'Första skålen, resans regler läses upp och truppen presenteras med påhittad statistik.' },
    { id: 't4', time: '23:00', title: 'Lagkaptensröstning, omgång 1', place: 'Lagkapten Arena', dress: 'Det du har på dig, om det fortfarande sitter kvar', text: 'Vem bar laget i dag? En röst per person, motivering krävs.', tab: 'kapten' },
  ] },
  { id: 'fre', label: 'Fredag', short: 'Fre', items: [
    { id: 'f1', time: '10:00', title: 'Frukost och taktikgenomgång', place: 'Köket', dress: 'Morgonrock godkänd', text: 'Kaffe, ägg och en genomgång på whiteboard som ingen kommer att minnas.' },
    { id: 'f2', time: '12:00', title: 'Lagen dras i rouletten', place: 'Lag-Roulette', dress: 'Neutral klädsel tills hjulet har talat', text: 'Hjulet avgör. Varannan till Lag Gul, varannan till Lag Blå.', tab: 'roulette' },
    { id: 'f3', time: '13:00', title: 'Padel: Lag Gul mot Lag Blå', place: 'Bana 2', dress: 'Lagfärg och pannband. Pannbandet är obligatoriskt', text: 'Bäst av fem set. Förlorarna står för kvällens grillning.' },
    { id: 'f4', time: '19:30', title: 'Grillkväll', place: 'Altanen', dress: 'Hawaiiskjorta eller förkläde, välj sida', text: 'Förlorarlaget vid grillen, vinnarlaget vid högtalaren.' },
    { id: 'f5', time: '23:00', title: 'Lagkaptensröstning, omgång 2', place: 'Lagkapten Arena', dress: 'Grillos accepteras', text: 'Ny kväll, ny bindel. Gårdagens kapten kan väljas om.', tab: 'kapten' },
  ] },
  { id: 'lor', label: 'Lördag', short: 'Lör', items: [
    { id: 'l1', time: '11:00', title: 'Brunch', place: 'Köket', dress: 'Keps långt ner i pannan', text: 'Lugn start. Återhämtning räknas som träning.' },
    { id: 'l2', time: '13:00', title: 'Femkamp', place: 'Gräsmattan', dress: 'Fullt matchställ, benskydd frivilligt', text: 'Fem grenar, samma lag som i går. Poängen förs av gårdagens kapten, vilket är en känd riskfaktor.' },
    { id: 'l3', time: '17:00', title: 'Inspelning av resans låt', place: 'Låtstudion', dress: 'Rockstjärna: solglasögon inomhus', text: 'Texten ska vara klar. Alla sjunger refrängen, ingen slipper undan.', tab: 'studio' },
    { id: 'l4', time: '20:00', title: 'Finalmiddag', place: 'Långbordet', dress: 'Kavaj. Fluga ger extra hype', text: 'Tal från varje lag och världspremiär av låten.' },
    { id: 'l5', time: '23:00', title: 'Lagkaptensröstning, omgång 3', place: 'Lagkapten Arena', dress: 'Kavajen får hänga på stolen', text: 'Sista bindeln för i år delas ut.', tab: 'kapten' },
  ] },
  { id: 'son', label: 'Söndag', short: 'Sön', items: [
    { id: 's1', time: '10:00', title: 'Återhämtningsfrukost', place: 'Köket', dress: 'Huvtröja med luvan uppe', text: 'Tyst frukost är tillåten och rekommenderas.' },
    { id: 's2', time: '12:00', title: 'Prisutdelning', place: 'Altanen', dress: 'Vinnarna bär bindel, övriga bär skam', text: 'Helgens tre kaptener hyllas och totalställningen läses upp.' },
    { id: 's3', time: '14:00', title: 'Hemresa', place: 'Högkvarteret', dress: 'Samma som i torsdags, tyvärr', text: 'Städning lagvis, sedan slutsignal.' },
  ] },
];

/* ---------- Hjälpfunktioner ---------- */
const cx = (...a) => a.filter(Boolean).join(' ');
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (v) => JSON.parse(JSON.stringify(v));
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = (el, frames, opts) => {
  if (el && el.animate && !reducedMotion()) el.animate(frames, opts);
};
const popIn = (el) =>
  animate(el, [{ transform: 'scale(.94) translateY(8px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], {
    duration: 260, easing: 'cubic-bezier(.2,1.2,.3,1)',
  });

function itemDate(dayIdx, time) {
  const [y, m, d] = TRIP_DATE.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d + dayIdx, hh, mm, 0);
}

// Återkommande klasskombinationer (standard Tailwind).
const PRESS = 'transition duration-150 hover:-translate-y-0.5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
const GLOW_GOLD = 'ring-1 ring-amber-400/60 shadow-[0_0_26px_rgba(251,191,36,0.28)]';
const GLOW_GREEN = 'ring-1 ring-emerald-400/50 shadow-[0_0_24px_rgba(52,211,153,0.25)]';
const STRIPE = 'bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0_10px,transparent_10px_20px)]';
const DISPLAY = 'font-black uppercase tracking-tight leading-none';

/* ---------- Lagring (localStorage) ---------- */
const KEY = 'leboys2027.data.v2';
const SKEY = 'leboys2027.session.v2';
const freshData = () => ({
  hype: {},
  checkins: {},
  votes: { tors: [], fre: [], lor: [] },
  song: { intro: [], vers1: [], ref: [], vers2: [], outro: [] },
  bpm: 110,
  pattern: clone(DEFAULT_PATTERN),
  wheel: [],
  listMode: 'order',
});
function readJSON(key) {
  try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
}
function writeJSON(key, v) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* lagring saknas */ }
}
function loadData() {
  const f = freshData();
  const r = readJSON(KEY);
  if (!r || typeof r !== 'object') return f;
  return {
    ...f, ...r,
    votes: { ...f.votes, ...r.votes },
    song: { ...f.song, ...r.song },
    pattern: { ...f.pattern, ...r.pattern },
    hype: r.hype || {},
    checkins: r.checkins || {},
    wheel: Array.isArray(r.wheel) ? r.wheel.filter((n) => BOYS.includes(n)) : [],
  };
}

/* ---------- Ljud (Web Audio API, inga ljudfiler) ---------- */
const Sound = {
  ctx: null, master: null, noise: null, muted: false,
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
  click() { this.burst(0, 0.022, 0.35, 'bandpass', 2600); this.tone(1150, 0, 0.018, 'square', 0.06); },
  tap() { this.tone(520, 0, 0.05, 'triangle', 0.08, 780); },
  pop(n) { const f = 380 + Math.min(n || 0, 25) * 28; this.tone(f, 0, 0.11, 'triangle', 0.16, f * 1.6); },
  error() {
    const c = this.ac();
    if (!c) return;
    this.tone(170, c.currentTime, 0.16, 'sawtooth', 0.14);
    this.tone(120, c.currentTime + 0.15, 0.26, 'sawtooth', 0.14);
  },
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
  kick(t) { this.tone(150, t, 0.26, 'sine', 0.9, 42); },
  snare(t) { this.burst(t, 0.16, 0.42, 'highpass', 1400); this.tone(190, t, 0.09, 'triangle', 0.22, 140); },
  hat(t) { this.burst(t, 0.045, 0.16, 'highpass', 7500); },
};

/* ---------- Konfetti (HTML5 Canvas) ---------- */
const Confetti = (() => {
  let cv = null;
  let c2 = null;
  let parts = [];
  let raf = 0;
  const palette = ['#fbbf24', '#34d399', '#ffffff', '#38bdf8', '#f472b6', '#fef3c7'];
  const loop = () => {
    c2.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 30);
    parts.forEach((p) => {
      p.vy += 0.24; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      c2.save();
      c2.translate(p.x, p.y);
      c2.rotate(p.rot);
      c2.globalAlpha = Math.min(1, p.life / 30);
      c2.fillStyle = p.col;
      c2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)) + 1);
      c2.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; c2.clearRect(0, 0, cv.width, cv.height); }
  };
  return {
    burst(n = 160) {
      if (typeof document === 'undefined' || reducedMotion()) return;
      if (!cv) {
        cv = document.createElement('canvas');
        cv.className = 'fixed inset-0 w-full h-full pointer-events-none z-[60]';
        cv.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cv);
        c2 = cv.getContext('2d');
      }
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      const ox = cv.width / 2;
      const oy = cv.height * 0.38;
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 11;
        parts.push({
          x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
          w: 5 + Math.random() * 7, h: 8 + Math.random() * 8,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          col: palette[i % palette.length], life: 90 + Math.random() * 70,
        });
      }
      if (!raf) raf = requestAnimationFrame(loop);
    },
  };
})();

/* ---------- Småkomponenter ---------- */
const AVATAR_SIZE = {
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-8 h-8 text-sm',
  lg: 'w-11 h-11 text-lg',
  xl: 'w-20 h-20 text-4xl',
};
function Avatar({ name, size = 'md' }) {
  return (
    <span title={name} className={cx('inline-flex items-center justify-center rounded-full font-black text-slate-950 shrink-0', PLAYER[name].bg, AVATAR_SIZE[size])}>
      {PLAYER[name].tag}
    </span>
  );
}

function Card({ children, className }) {
  return <section className={cx('rounded-2xl border border-slate-700 bg-slate-900/90 p-4', className)}>{children}</section>;
}

function Pop({ children, className, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  useEffect(() => { popIn(ref.current); }, []);
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

function SectionTitle({ kicker, title, right }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-semibold">{kicker}</p>
        <h2 className={cx(DISPLAY, 'text-3xl mt-1')}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-700">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => { Sound.tap(); onChange(o.id); }}
          className={cx(PRESS, 'flex-1 px-2 py-2 rounded-lg text-sm font-semibold whitespace-nowrap', value === o.id ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-100')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Countdown({ target, label, sub, big }) {
  const now = useNow();
  const ms = Math.max(0, target - now);
  const parts = [
    ['dagar', Math.floor(ms / 864e5)],
    ['tim', Math.floor(ms / 36e5) % 24],
    ['min', Math.floor(ms / 6e4) % 60],
    ['sek', Math.floor(ms / 1e3) % 60],
  ];
  return (
    <div className={cx('rounded-2xl border border-slate-700 bg-slate-900 p-4', STRIPE, GLOW_GREEN)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </span>
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-emerald-400">{label}</p>
      </div>
      <div className="grid grid-cols-4 gap-2" role="timer" aria-label={label}>
        {parts.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-950 border border-slate-700 py-2 text-center">
            <div className={cx('font-black leading-none tabular-nums text-amber-400', big ? 'text-5xl sm:text-6xl py-2' : 'text-4xl')}>
              {String(v).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-400 mt-3">{sub}</p>
    </div>
  );
}

/* ---------- Inloggning ---------- */
function Login({ onLogin }) {
  const [name, setName] = useState(null);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const cardRef = useRef(null);

  const fail = (m) => {
    Sound.error();
    setMsg(m);
    animate(cardRef.current, [
      { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' },
      { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
    ], { duration: 450, easing: 'ease-in-out' });
  };
  const submit = (e) => {
    e.preventDefault();
    if (!name) { fail('Välj ditt namn först.'); return; }
    if (pw !== ACCOUNTS[name].pw) { setPw(''); fail(`Fel lösenord för ${name}. Tänk på stora och små bokstäver.`); return; }
    Sound.fanfare();
    Confetti.burst(120);
    onLogin(name);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div ref={cardRef} className={cx('w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 overflow-hidden', GLOW_GOLD)}>
        <div className={cx('px-6 pt-7 pb-5 border-b border-dashed border-slate-700', STRIPE)}>
          <p className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">VIP · Matchday pass</p>
          <h1 className={cx(DISPLAY, 'text-5xl mt-2')}>Le boys<br /><span className="text-amber-400">på språng</span></h1>
          <p className="font-bold text-lg text-slate-400 mt-2 tabular-nums">2027 · Tors–Sön · 8 spelare</p>
        </div>
        <form onSubmit={submit} className="px-6 py-6 flex flex-col gap-3">
          <p id="login-who" className="text-sm text-slate-400">Vem är du?</p>
          <div role="radiogroup" aria-labelledby="login-who" className="grid grid-cols-4 gap-2">
            {BOYS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={name === n}
                onClick={() => { Sound.tap(); setName(n); setMsg(''); }}
                className={cx(PRESS, 'flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-semibold', name === n ? 'border-amber-400 bg-amber-400/10 text-slate-100' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-100')}
              >
                <Avatar name={n} />
                {n}
              </button>
            ))}
          </div>
          <label htmlFor="login-pw" className="text-sm text-slate-400 mt-1">
            {name ? `Personligt lösenord för ${name}` : 'Personligt lösenord'}
          </label>
          <div className="flex gap-2">
            <input
              id="login-pw"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••"
              className={cx('flex-1 min-w-0 rounded-xl bg-slate-950 border px-4 py-3 text-lg text-slate-100 focus:outline-none focus:border-amber-400', msg ? 'border-red-400' : 'border-slate-700')}
            />
            <button type="submit" className={cx(PRESS, 'rounded-xl bg-amber-400 text-slate-950 font-bold px-4 flex items-center gap-2')}>
              <Lock className="w-4 h-4" aria-hidden="true" /> Logga in
            </button>
          </div>
          <p role="alert" className={cx('text-sm min-h-5', msg ? 'text-red-400' : 'text-slate-400')}>
            {msg || 'Bara truppen kommer in.'}
          </p>
        </form>
      </div>
    </main>
  );
}

/* ---------- Deltagarvy (innan RELEASE_MODE) ---------- */
function Classified({ user, onLogout }) {
  const start = itemDate(0, TRIP_TIME);
  const fmt = start.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <Pop className="w-full max-w-md flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Avatar name={user} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Inloggad som deltagare</p>
            <p className={cx(DISPLAY, 'text-2xl mt-1')}>{user}</p>
          </div>
          <button type="button" onClick={onLogout} className={cx(PRESS, 'flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:border-amber-400')}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> Logga ut
          </button>
        </div>
        <h1 className={cx(DISPLAY, 'text-5xl')}>Le boys <span className="text-amber-400">på språng</span></h1>
        <Countdown target={start.getTime()} label="Avresa om" sub={`Håll ${fmt} fri. Mer än så får du inte veta.`} big />
        <section className="relative rounded-2xl border-2 border-dashed border-amber-400 bg-slate-900 p-5 overflow-hidden">
          <span aria-hidden="true" className="absolute right-3 top-4 rotate-12 border-2 border-red-400 text-red-400 font-black uppercase text-lg px-2 py-0.5 rounded opacity-80">Hemligt</span>
          <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400 font-semibold">Säkerhetsnivå: Reseledningen</p>
          <h2 className={cx(DISPLAY, 'text-4xl mt-2')}>Klassificerat</h2>
          <p className="mt-3 text-slate-200">
            Endast Reseledningen (Martin och Malte) har åtkomst till agendan och övriga verktyg. Du får veta det du behöver veta, när du behöver veta det.
          </p>
          <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
            <span className="h-3 rounded bg-slate-800 w-11/12" />
            <span className="h-3 rounded bg-slate-800 w-8/12" />
            <span className="h-3 rounded bg-slate-800 w-10/12" />
          </div>
        </section>
      </Pop>
    </main>
  );
}

/* ---------- Flik 1: Agenda ---------- */
const HYPE_MAX = 25;
const hypeLabel = (n) => (n >= HYPE_MAX ? 'Eld i berget' : n >= 16 ? 'Kokar' : n >= 8 ? 'Varmt' : n >= 1 ? 'Ljummet' : 'Kallt');

function AgendaItem({ item, status, open, onToggle, data, mut, user, goTab }) {
  const hype = data.hype[item.id] || 0;
  const here = data.checkins[item.id] || [];
  const mine = here.includes(user);
  const [flames, setFlames] = useState([]);
  const pct = Math.min(100, (hype / HYPE_MAX) * 100);

  const addHype = () => {
    Sound.pop(hype);
    if (hype + 1 === HYPE_MAX) { Sound.fanfare(); Confetti.burst(120); }
    mut((d) => { d.hype[item.id] = (d.hype[item.id] || 0) + 1; });
    const id = uid();
    setFlames((f) => f.concat(id));
    setTimeout(() => setFlames((f) => f.filter((x) => x !== id)), 800);
  };
  const toggleIn = () => {
    Sound.tap();
    mut((d) => {
      const l = d.checkins[item.id] || [];
      d.checkins[item.id] = l.includes(user) ? l.filter((n) => n !== user) : l.concat(user);
    });
  };

  return (
    <li className="relative pl-8">
      <span className={cx('absolute left-1 top-5 w-3.5 h-3.5 rounded-full border-2', status === 'now' ? 'bg-emerald-400 border-emerald-400 animate-pulse motion-reduce:animate-none' : status === 'done' ? 'bg-slate-700 border-slate-700' : 'bg-slate-950 border-amber-400')} />
      <div className={cx('rounded-2xl border bg-slate-900 transition-colors', open ? 'border-amber-400' : 'border-slate-700 hover:border-slate-500', status === 'done' && !open && 'opacity-60')}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 p-3 text-left rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
          <span className="font-black text-xl tabular-nums text-amber-400 w-14 shrink-0">{item.time}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold leading-tight">{item.title}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span>🔥 {hype}</span>
              <span>{here.length}/{BOYS.length} incheckade</span>
              {status === 'now' && <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider">Nu</span>}
              {status === 'done' && <span className="uppercase tracking-wider">Klart</span>}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={cx('w-5 h-5 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <Pop className="px-3 pb-3 flex flex-col gap-3">
            <p className="text-sm text-slate-200">{item.text}</p>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
                <dt className="sr-only">Plats</dt>
                <dd>{item.place}</dd>
              </div>
              <div className="flex items-start gap-2">
                <Shirt className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" aria-hidden="true" />
                <dt className="sr-only">Dresscode</dt>
                <dd className="text-amber-400">{item.dress}</dd>
              </div>
            </dl>

            <div className="rounded-xl bg-slate-950 border border-slate-700 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="uppercase tracking-[0.18em] text-slate-400 font-semibold">Hype-mätare</span>
                <span className={cx('font-bold', pct >= 100 ? 'text-amber-400' : 'text-slate-100')}>{hypeLabel(hype)} · {hype}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#fbbf24,#fb923c)] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <button type="button" onClick={addHype} aria-label="Höj hypen" className={cx(PRESS, 'relative w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-2xl hover:border-amber-400')}>
                  🔥
                  {flames.map((f) => (
                    <span key={f} aria-hidden="true" className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none motion-reduce:hidden">🔥</span>
                  ))}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleIn} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold border', mine ? 'bg-emerald-400 text-slate-950 border-emerald-400' : 'border-emerald-400 text-emerald-400 hover:bg-emerald-400/10')}>
                <Check className="w-4 h-4" aria-hidden="true" /> {mine ? 'Incheckad' : 'Checka in'}
              </button>
              <div className="flex -space-x-2">{here.map((n) => <Avatar key={n} name={n} />)}</div>
              {item.tab && (
                <button type="button" onClick={() => goTab(item.tab)} className={cx(PRESS, 'ml-auto rounded-xl px-3 py-2 text-sm font-bold bg-amber-400 text-slate-950')}>Öppna</button>
              )}
            </div>
          </Pop>
        )}
      </div>
    </li>
  );
}

function Agenda({ data, mut, user, goTab }) {
  const now = useNow();
  const all = useMemo(
    () => DAYS.flatMap((d, di) => d.items.map((it) => ({ it, di, at: itemDate(di, it.time).getTime() }))),
    [],
  );
  const start = itemDate(0, TRIP_TIME).getTime();
  const end = all[all.length - 1].at + 2 * 36e5;
  const next = all.find((a) => a.at > now);
  const [day, setDay] = useState(() => {
    const t = Date.now();
    return t >= start && t <= end ? Math.min(3, Math.floor((t - itemDate(0, '00:00').getTime()) / 864e5)) : 0;
  });
  const [open, setOpen] = useState(null);

  const statusOf = (a) => {
    if (now < a.at) return 'next';
    const i = all.indexOf(a);
    const until = all[i + 1] && all[i + 1].di === a.di ? all[i + 1].at : a.at + 2 * 36e5;
    return now < until ? 'now' : 'done';
  };
  const fmt = new Date(start).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let cd;
  if (now < start) cd = { target: start, label: 'Avspark om', sub: `Samling ${fmt} kl. ${TRIP_TIME}.` };
  else if (next) cd = { target: next.at, label: 'Nästa punkt om', sub: `${DAYS[next.di].label} ${next.it.time} · ${next.it.title}` };
  else cd = { target: now, label: 'Slutsignal', sub: 'Resan är spelad. Tack för i år, grabbar.' };

  const dayItems = all.filter((a) => a.di === day);
  const doneCount = dayItems.filter((a) => statusOf(a) === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      <Countdown {...cd} />
      <SectionTitle kicker="Agenda (Tors–Sön)" title={DAYS[day].label} />
      <Segmented label="Välj dag" value={day} onChange={(v) => { setDay(v); setOpen(null); }} options={DAYS.map((x, i) => ({ id: i, label: x.short }))} />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(doneCount / dayItems.length) * 100}%` }} />
        </div>
        <span className="tabular-nums">{doneCount}/{dayItems.length} avklarade</span>
      </div>
      <ol className="relative flex flex-col gap-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
        {dayItems.map((a) => (
          <AgendaItem
            key={a.it.id}
            item={a.it}
            status={statusOf(a)}
            open={open === a.it.id}
            onToggle={() => { Sound.tap(); setOpen(open === a.it.id ? null : a.it.id); }}
            data={data}
            mut={mut}
            user={user}
            goTab={goTab}
          />
        ))}
      </ol>
    </div>
  );
}

/* ---------- Flik 2: Lagkapten Arena ---------- */
function Captain({ data, mut, user }) {
  const [night, setNight] = useState('tors');
  const [cand, setCand] = useState(null);
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState('night');
  const votes = data.votes[night];
  const mine = votes.find((v) => v.voter === user);
  const nightLabel = NIGHTS.find((n) => n.id === night).label;
  const ok = !!cand && reason.trim().length >= 5;

  useEffect(() => { setCand(null); setReason(''); }, [night, user]);

  const submit = () => {
    if (!ok || mine) return;
    const vote = { id: uid(), voter: user, candidate: cand, reason: reason.trim(), likes: [], ts: Date.now() };
    mut((d) => { if (!d.votes[night].some((v) => v.voter === user)) d.votes[night].push(vote); });
    Sound.fanfare();
    Confetti.burst(200);
  };
  const like = (id) => {
    Sound.pop(6);
    mut((d) => {
      const v = d.votes[night].find((x) => x.id === id);
      if (!v) return;
      v.likes = v.likes.includes(user) ? v.likes.filter((n) => n !== user) : v.likes.concat(user);
    });
  };

  const pool = scope === 'night' ? votes : NIGHTS.flatMap((n) => data.votes[n.id]);
  const table = BOYS.map((n) => ({ n, c: pool.filter((v) => v.candidate === n).length }))
    .sort((a, b) => b.c - a.c || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
  const max = Math.max(1, table[0].c);
  const soleLeader = table[0].c > 0 && table[0].c > table[1].c;
  const feed = votes.slice().sort((a, b) => b.ts - a.ts);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Lagkapten Arena" title="Vem får bindeln?" />
      <Segmented label="Välj kväll" value={night} onChange={setNight} options={NIGHTS} />

      {mine ? (
        <Card className={GLOW_GREEN}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400 font-semibold">Rösten är låst för {nightLabel.toLowerCase()}</p>
              <p className={cx(DISPLAY, 'text-2xl mt-1')}>Du valde {mine.candidate}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3 break-words">Din motivering: {mine.reason}</p>
          <p className="text-xs text-slate-400 mt-2">En röst per person och kväll. Nästa chans kommer nästa kväll.</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-400 mb-3">
            <span className="text-slate-100 font-semibold">{user}</span>, du har en röst för {nightLabel.toLowerCase()}. Du kan inte rösta på dig själv.
          </p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kandidater">
            {BOYS.filter((n) => n !== user).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={cand === n}
                onClick={() => { Sound.tap(); setCand(n); }}
                className={cx(PRESS, 'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5', cand === n ? cx('border-amber-400 bg-amber-400/10', GLOW_GOLD) : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
              >
                <Avatar name={n} size="lg" />
                <span className="font-semibold text-xs sm:text-sm">{n}</span>
              </button>
            ))}
          </div>
          <label htmlFor="vote-reason" className="block text-sm font-semibold mt-4 mb-1.5">
            Varför förtjänar han bindeln? <span className="text-amber-400">Obligatoriskt</span>
          </label>
          <textarea
            id="vote-reason"
            rows={3}
            maxLength={240}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={cand ? `Vad gjorde ${cand} i dag?` : 'Välj en kandidat och motivera valet.'}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
          />
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-xs text-slate-400 tabular-nums">{reason.length}/240</span>
            <button
              type="button"
              onClick={submit}
              disabled={!ok}
              className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}
            >
              <Lock className="w-4 h-4" aria-hidden="true" /> Lås in röst
            </button>
          </div>
          {!ok && <p className="text-xs text-slate-400 mt-2 text-right">{!cand ? 'Välj en kandidat.' : 'Skriv minst fem tecken i motiveringen.'}</p>}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className={cx(DISPLAY, 'text-xl')}>Ställning</h3>
          <div className="w-44">
            <Segmented label="Omfång" value={scope} onChange={setScope} options={[{ id: 'night', label: nightLabel }, { id: 'total', label: 'Totalt' }]} />
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {table.map((r, i) => (
            <li key={r.n} className="flex items-center gap-2.5">
              <Avatar name={r.n} size="sm" />
              <span className="w-16 text-sm font-semibold truncate">{r.n}</span>
              <div className="flex-1 h-6 rounded-md bg-slate-950 overflow-hidden">
                <div className={cx('h-full rounded-md flex items-center justify-end pr-1.5 transition-all duration-500', PLAYER[r.n].bg)} style={{ width: `${(r.c / max) * 100}%` }}>
                  {i === 0 && soleLeader && <span className="text-[10px] font-black text-slate-950 bg-white/80 rounded px-1">C</span>}
                </div>
              </div>
              <span className="w-6 text-right font-black text-lg tabular-nums">{r.c}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-3 tabular-nums">
          {scope === 'night' ? `${votes.length} av ${BOYS.length} har röstat ${nightLabel.toLowerCase()}.` : `${pool.length} röster över tre kvällar.`}
        </p>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Motiveringar, {nightLabel.toLowerCase()}</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-slate-400">Inga röster än. Bli först med att dela ut bindeln.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {feed.map((v) => {
              const liked = v.likes.includes(user);
              return (
                <Pop as="li" key={v.id} className="rounded-xl bg-slate-950 border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Avatar name={v.voter} size="sm" />
                    <span className="font-semibold">{v.voter}</span>
                    <span className="text-slate-400">röstade på</span>
                    <span className={cx('font-semibold', PLAYER[v.candidate].text)}>{v.candidate}</span>
                  </div>
                  <p className="text-sm mt-2 break-words">{v.reason}</p>
                  <button
                    type="button"
                    onClick={() => like(v.id)}
                    aria-pressed={liked}
                    className={cx(PRESS, 'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold', liked ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-400 hover:text-slate-100')}
                  >
                    <Heart className={cx('w-3.5 h-3.5', liked && 'fill-current')} aria-hidden="true" /> Gilla · {v.likes.length}
                  </button>
                </Pop>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------- Flik 3: Låtstudion ---------- */
function BeatMachine({ data, mut }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [noAudio, setNoAudio] = useState(false);
  const live = useRef({ bpm: data.bpm, pattern: data.pattern });
  live.current = { bpm: data.bpm, pattern: data.pattern };
  const timer = useRef(null);
  const touts = useRef([]);

  const clear = () => {
    clearInterval(timer.current);
    timer.current = null;
    touts.current.forEach(clearTimeout);
    touts.current = [];
  };
  const stop = () => { clear(); setPlaying(false); setStep(-1); };
  const start = () => {
    const c = Sound.ac();
    if (!c) { setNoAudio(true); return; }
    let next = c.currentTime + 0.08;
    let s = 0;
    timer.current = setInterval(() => {
      while (next < c.currentTime + 0.12) {
        const p = live.current.pattern;
        if (p.kick[s]) Sound.kick(next);
        if (p.snare[s]) Sound.snare(next);
        if (p.hat[s]) Sound.hat(next);
        const cs = s;
        touts.current.push(setTimeout(() => setStep(cs), Math.max(0, (next - c.currentTime) * 1000)));
        if (touts.current.length > 64) touts.current.splice(0, 32);
        next += 60 / live.current.bpm / 4;
        s = (s + 1) % STEPS;
      }
    }, 25);
    setPlaying(true);
  };
  useEffect(() => clear, []);

  const toggle = (row, i) => {
    mut((d) => { d.pattern[row][i] = d.pattern[row][i] ? 0 : 1; });
    if (!playing) Sound[row]();
  };
  const beat = step >= 0 ? Math.floor(step / 4) : -1;

  return (
    <Card className={playing ? GLOW_GOLD : ''}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={playing ? stop : start}
          aria-label={playing ? 'Stoppa beatet' : 'Spela beatet'}
          className={cx(PRESS, 'w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-slate-950', playing ? 'bg-red-400' : cx('bg-amber-400', GLOW_GOLD))}
        >
          {playing ? <Square className="w-6 h-6 fill-current" aria-hidden="true" /> : <Play className="w-7 h-7 fill-current" aria-hidden="true" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <label htmlFor="beat-bpm" className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Tempo</label>
            <span className="font-black text-3xl leading-none tabular-nums text-amber-400">
              {data.bpm}<span className="text-sm text-slate-400 ml-1">BPM</span>
            </span>
          </div>
          <input
            id="beat-bpm"
            type="range"
            min={90}
            max={140}
            step={1}
            value={data.bpm}
            onChange={(e) => mut((d) => { d.bpm = Number(e.target.value); })}
            className="w-full mt-3 accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 tabular-nums mt-1"><span>90</span><span>115</span><span>140</span></div>
        </div>
      </div>
      <div className="flex gap-1.5 mt-4" aria-hidden="true">
        {[0, 1, 2, 3].map((b) => (
          <span key={b} className={cx('flex-1 h-1.5 rounded-full transition-colors duration-75', beat === b ? 'bg-emerald-400' : 'bg-slate-800')} />
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {BEAT_ROWS.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-12 text-[11px] uppercase tracking-wider text-slate-400 font-semibold shrink-0">{r.label}</span>
            <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5">
              {data.pattern[r.id].map((on, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(r.id, i)}
                  aria-label={`${r.label} steg ${i + 1}`}
                  aria-pressed={!!on}
                  className={cx('h-8 rounded transition-all duration-75', on ? r.on : i % 4 === 0 ? 'bg-slate-700' : 'bg-slate-800', step === i && 'scale-110 brightness-150 ring-1 ring-white')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-slate-400">
          {noAudio ? 'Webbläsaren släpper inte fram ljud här.' : 'Tryck på rutorna för att bygga om beatet. Sjung eller rappa i takt.'}
        </p>
        <button type="button" onClick={() => mut((d) => { d.pattern = clone(DEFAULT_PATTERN); })} className="text-xs text-slate-400 hover:text-slate-100 underline shrink-0 ml-3">
          Grundbeat
        </button>
      </div>
    </Card>
  );
}

function SongBlock({ block, lines, user, mut }) {
  const [text, setText] = useState('');
  const add = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    mut((d) => { d.song[block.id].push({ id: uid(), author: user, text: t }); });
    Sound.pop(lines.length * 2);
    setText('');
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className={cx(DISPLAY, 'text-xl')}>{block.label}</h3>
        <span className="text-xs text-slate-400 tabular-nums">{lines.length} {lines.length === 1 ? 'rad' : 'rader'}</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Tomt än. Första raden sätter tonen.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <Pop as="li" key={l.id} className={cx('flex items-start gap-2 rounded-lg bg-slate-950 border-l-4 px-2.5 py-2', PLAYER[l.author].border)}>
              <span className="flex-1 min-w-0 break-words">{l.text}</span>
              <span className={cx('text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 text-slate-950', PLAYER[l.author].bg)}>{l.author}</span>
              {l.author === user && (
                <button
                  type="button"
                  onClick={() => { Sound.tap(); mut((d) => { d.song[block.id] = d.song[block.id].filter((x) => x.id !== l.id); }); }}
                  aria-label="Ta bort din rad"
                  className="text-slate-400 hover:text-red-400 shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </Pop>
          ))}
        </ol>
      )}
      <form onSubmit={add} className="flex gap-2 mt-3">
        <label htmlFor={`line-${block.id}`} className="sr-only">Ny rad i {block.label}</label>
        <input
          id={`line-${block.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder={`Ny rad från ${user}`}
          className="flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
        />
        <button type="submit" disabled={!text.trim()} className={cx(PRESS, 'rounded-xl px-4 font-bold', text.trim() ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400')}>
          Lägg till
        </button>
      </form>
    </Card>
  );
}

function Studio({ data, mut, user }) {
  const [copied, setCopied] = useState('');
  const total = BLOCKS.reduce((s, b) => s + data.song[b.id].length, 0);
  const copy = () => {
    const txt = BLOCKS.map((b) => `[${b.label}]\n${data.song[b.id].map((l) => `${l.text}  (${l.author})`).join('\n')}`).join('\n\n');
    try {
      navigator.clipboard.writeText(txt).then(() => setCopied('Kopierad'), () => setCopied('Gick inte att kopiera'));
    } catch (e) { setCopied('Gick inte att kopiera'); }
    setTimeout(() => setCopied(''), 2200);
  };
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        kicker="Låtstudion"
        title="Resans låt"
        right={(
          <button type="button" onClick={copy} disabled={!total} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold', total ? 'text-slate-100 hover:border-amber-400' : 'text-slate-500')}>
            <Copy className="w-3.5 h-3.5" aria-hidden="true" /> {copied || 'Kopiera texten'}
          </button>
        )}
      />
      <BeatMachine data={data} mut={mut} />
      {BLOCKS.map((b) => <SongBlock key={b.id} block={b} lines={data.song[b.id]} user={user} mut={mut} />)}
    </div>
  );
}

/* ---------- Flik 4: Lag-Roulette ---------- */
const TAU = Math.PI * 2;
const WHEEL_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
function drawWheel(cv, names, rot) {
  const c = cv.getContext('2d');
  const S = cv.width;
  const R = S / 2;
  const r = R - 22;
  c.clearRect(0, 0, S, S);
  c.save();
  c.translate(R, R);
  c.beginPath(); c.arc(0, 0, R - 4, 0, TAU); c.fillStyle = '#020617'; c.fill();
  if (!names.length) {
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#1e293b'; c.fill();
    c.fillStyle = '#94a3b8'; c.font = `800 34px ${WHEEL_FONT}`; c.textAlign = 'center';
    c.fillText('ALLA ÄR DRAGNA', 0, -r * 0.55);
  } else {
    const seg = TAU / names.length;
    names.forEach((n, i) => {
      const a0 = rot + i * seg;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, a0, a0 + seg); c.closePath();
      c.fillStyle = PLAYER[n].hex; c.fill();
      const g = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fill();
      c.lineWidth = 3; c.strokeStyle = '#020617'; c.stroke();
      c.save();
      c.rotate(a0 + seg / 2);
      c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = '#020617';
      c.font = `900 ${names.length > 4 ? 38 : 48}px ${WHEEL_FONT}`;
      c.fillText(n.toUpperCase(), r - 22, 2);
      c.restore();
    });
  }
  c.beginPath(); c.arc(0, 0, R - 12, 0, TAU); c.lineWidth = 16; c.strokeStyle = '#fbbf24'; c.stroke();
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * TAU;
    c.beginPath(); c.arc(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12), 3.5, 0, TAU);
    c.fillStyle = i % 2 ? '#020617' : '#fffbeb'; c.fill();
  }
  c.restore();
}
const teamOf = (i) => (i % 2 === 0 ? 'Gul' : 'Blå');
const indexAt = (r, n) => Math.floor(((((-Math.PI / 2 - r) % TAU) + TAU) % TAU) / (TAU / n));

function TeamColumn({ title, list, slots, border, text }) {
  return (
    <div className={cx('rounded-xl bg-slate-950 border p-3', border)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={cx(DISPLAY, 'text-xl', text)}>{title}</h4>
        <span className="text-xs text-slate-400 tabular-nums">{list.length}/{slots}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {Array.from({ length: slots }).map((_, i) => (
          <li key={i} className="flex items-center gap-2 h-8">
            {list[i] ? (
              <><Avatar name={list[i]} size="sm" /><span className="font-semibold">{list[i]}</span></>
            ) : (
              <span className="w-full h-7 rounded-md border border-dashed border-slate-700" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Roulette({ data, mut }) {
  const [names, setNames] = useState(() => BOYS.filter((n) => !data.wheel.includes(n)));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const cvRef = useRef(null);
  const ptrRef = useRef(null);
  const rot = useRef(-Math.PI / 2);
  const raf = useRef(0);

  // Hjulet uppdateras först när vinnar-bannern är stängd, så att vinnaren syns kvar tills dess.
  useEffect(() => {
    if (!spinning && !winner) setNames(BOYS.filter((n) => !data.wheel.includes(n)));
  }, [data.wheel, spinning, winner]);
  useEffect(() => { if (cvRef.current) drawWheel(cvRef.current, names, rot.current); }, [names]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const spin = () => {
    if (spinning || winner || !names.length) return;
    Sound.ac();
    setSpinning(true);
    const list = names.slice();
    let w = 15 + Math.random() * 9; // vinkelhastighet (rad/s)
    let last = performance.now();
    let idx = indexAt(rot.current, list.length);
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rot.current += w * dt;
      w -= (0.55 + 0.5 * w) * dt; // friktion: saktar in mjukt mot slutet
      const ni = indexAt(rot.current, list.length);
      if (ni !== idx) {
        idx = ni;
        Sound.click();
        animate(ptrRef.current, [{ transform: 'rotate(-22deg)' }, { transform: 'rotate(0deg)' }], { duration: 110, easing: 'ease-out' });
      }
      if (cvRef.current) drawWheel(cvRef.current, list, rot.current);
      if (w > 0.04) { raf.current = requestAnimationFrame(frame); return; }
      const name = list[indexAt(rot.current, list.length)];
      setSpinning(false);
      setWinner(name);
      mut((d) => { if (!d.wheel.includes(name)) d.wheel.push(name); });
      Sound.fanfare();
      Confetti.burst(220);
    };
    raf.current = requestAnimationFrame(frame);
  };
  const reset = () => {
    cancelAnimationFrame(raf.current);
    Sound.tap();
    setSpinning(false);
    setWinner(null);
    rot.current = -Math.PI / 2;
    mut((d) => { d.wheel = []; });
  };

  const order = data.wheel;
  const pos = winner ? order.indexOf(winner) : -1;
  const gul = order.filter((_, i) => i % 2 === 0);
  const bla = order.filter((_, i) => i % 2 === 1);
  const idle = !spinning && !winner && names.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Lag-Roulette" title="Hjulet avgör" />
      <Card className={STRIPE}>
        <div className="relative mx-auto w-full max-w-sm">
          <div ref={ptrRef} className="absolute left-1/2 -top-2 z-10 -ml-4 origin-top drop-shadow-lg" aria-hidden="true">
            <Triangle className="w-8 h-8 rotate-180 fill-emerald-400 text-slate-950" strokeWidth={2.5} />
          </div>
          <canvas ref={cvRef} width={720} height={720} role="img" aria-label={`Snurrhjul med ${names.join(', ') || 'inga namn kvar'}`} className="block w-full h-auto" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={spin}
              disabled={!idle}
              className={cx(PRESS, 'pointer-events-auto w-1/3 aspect-square rounded-full border-4 border-slate-950 font-black uppercase leading-none text-base sm:text-lg', idle ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400')}
            >
              {spinning ? 'Snurrar' : names.length ? <span>Snurra<br />hjulet</span> : 'Klart'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-400 tabular-nums">{names.length} kvar på hjulet · {order.length}/{BOYS.length} dragna</p>
          <button type="button" onClick={reset} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold hover:border-amber-400')}>
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Återställ hjulet (Alla 8)
          </button>
        </div>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Resultat</h3>
        <Segmented
          label="Visningsläge"
          value={data.listMode}
          onChange={(v) => mut((d) => { d.listMode = v; })}
          options={[{ id: 'order', label: 'Dragningsordning (1–8)' }, { id: 'teams', label: 'Automatiska Lag' }]}
        />
        <div className="mt-3">
          {data.listMode === 'order' ? (
            <ol className="flex flex-col gap-1.5">
              {BOYS.map((_, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-700 px-3 h-11">
                  <span className="font-black text-xl w-6 tabular-nums text-amber-400">{i + 1}</span>
                  {order[i] ? (
                    <span className="flex items-center gap-2 flex-1">
                      <Avatar name={order[i]} size="sm" />
                      <span className="font-semibold">{order[i]}</span>
                      <span className={cx('ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded text-slate-950', i % 2 === 0 ? 'bg-amber-400' : 'bg-sky-400')}>Lag {teamOf(i)}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">Väntar på snurr</span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <TeamColumn title="Lag Gul" list={gul} slots={4} border="border-amber-400" text="text-amber-400" />
              <TeamColumn title="Lag Blå" list={bla} slots={4} border="border-sky-400" text="text-sky-400" />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">Varannan dragen spelare går till Lag Gul och varannan till Lag Blå. Det blir fyra mot fyra.</p>
      </Card>

      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80" onClick={() => setWinner(null)}>
          <Pop
            role="dialog"
            aria-modal="true"
            aria-label="Dragen spelare"
            onClick={(e) => e.stopPropagation()}
            className={cx('w-full max-w-sm rounded-3xl bg-slate-900 border border-amber-400 p-6 text-center', GLOW_GOLD, STRIPE)}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold">Hjulet har talat</p>
            <div className="flex justify-center my-4"><Avatar name={winner} size="xl" /></div>
            <p className={cx(DISPLAY, 'text-5xl text-amber-400')}>{winner}</p>
            <p className="mt-3 text-slate-100">
              Nummer <span className="font-bold tabular-nums">{pos + 1}</span> i dragningen ·{' '}
              <span className={cx('font-bold', pos % 2 === 0 ? 'text-amber-400' : 'text-sky-400')}>Lag {teamOf(pos)}</span>
            </p>
            <button type="button" autoFocus onClick={() => { Sound.tap(); setWinner(null); }} className={cx(PRESS, 'mt-5 w-full rounded-xl bg-amber-400 text-slate-950 font-bold py-3')}>
              {order.length >= BOYS.length ? 'Visa lagen' : 'Ta bort från hjulet och fortsätt'}
            </button>
          </Pop>
        </div>
      )}
    </div>
  );
}

/* ---------- Admin-panel (endast Martin och Malte) ---------- */
function AdminPanel({ onReset }) {
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState('');
  const wipe = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    setArmed(false);
    onReset();
    Sound.error();
    setMsg('All data på den här enheten är nollställd.');
    setTimeout(() => setMsg(''), 2500);
  };
  return (
    <footer className="mt-10 pt-4 border-t border-slate-700 text-xs text-slate-400">
      <p className="uppercase tracking-[0.2em] font-semibold mb-2">Admin-panel</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={wipe} className={cx(PRESS, 'flex items-center gap-1.5 rounded-lg border px-3 py-1.5', armed ? 'border-red-400 text-red-400' : 'border-slate-700 hover:text-slate-100 hover:border-slate-500')}>
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> {armed ? 'Tryck igen för att radera allt' : 'Nollställ all data'}
        </button>
        <span className={cx('rounded-full border px-2 py-1 font-semibold', RELEASE_MODE ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400')}>
          {RELEASE_MODE ? 'Släppt: alla åtta har åtkomst' : 'Hemligt läge: bara Reseledningen har åtkomst'}
        </span>
      </div>
      <p className="mt-2 min-h-4 text-emerald-400" role="status">{msg}</p>
    </footer>
  );
}

/* ---------- Appskal med flikar ---------- */
const TABS = [
  { id: 'agenda', label: 'Agenda', long: 'Agenda (Tors–Sön)', Icon: Calendar },
  { id: 'kapten', label: 'Lagkapten', long: 'Lagkapten', Icon: ShieldCheck },
  { id: 'studio', label: 'Låtstudion', long: 'Låtstudion', Icon: Music },
  { id: 'roulette', label: 'Roulette', long: 'Lag-Roulette', Icon: Dices },
];

function Shell({ user, onLogout }) {
  const [data, setData] = useState(loadData);
  useEffect(() => { writeJSON(KEY, data); }, [data]);
  const mut = (fn) => setData((d) => { const c = clone(d); fn(c); return c; });

  const [tab, setTab] = useState(() => {
    const s = readJSON(SKEY);
    return s && TABS.some((x) => x.id === s.tab) ? s.tab : 'agenda';
  });
  const [muted, setMuted] = useState(false);
  const goTab = (t) => {
    Sound.tap();
    setTab(t);
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), tab: t });
    window.scrollTo(0, 0);
  };
  const toggleMute = () => {
    Sound.muted = !muted;
    setMuted(!muted);
    if (muted) Sound.tap();
  };
  const props = { data, mut, user, goTab };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-slate-700">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className={cx(DISPLAY, 'text-lg truncate')}>Le boys <span className="text-amber-400">på språng</span></p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 mt-1">{TABS.find((t) => t.id === tab).long}</p>
          </div>
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Slå på ljud' : 'Stäng av ljud'} aria-pressed={muted} className={cx(PRESS, 'w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center', muted ? 'text-red-400' : 'text-slate-400 hover:text-slate-100')}>
            {muted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 pl-1 pr-3 py-1">
            <Avatar name={user} />
            <span className="leading-tight">
              <span className={cx('block text-[9px] uppercase tracking-wider', isAdmin(user) ? 'text-amber-400' : 'text-slate-400')}>
                {isAdmin(user) ? 'Admin' : 'Inloggad som'}
              </span>
              <span className="block text-sm font-bold">{user}</span>
            </span>
          </div>
          <button type="button" onClick={onLogout} aria-label="Logga ut" className={cx(PRESS, 'w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-400')}>
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 pb-32">
        {tab === 'agenda' && <Agenda {...props} />}
        {tab === 'kapten' && <Captain {...props} />}
        {tab === 'studio' && <Studio {...props} />}
        {tab === 'roulette' && <Roulette {...props} />}
        {isAdmin(user) && <AdminPanel onReset={() => setData(freshData())} />}
      </main>

      <nav aria-label="Huvudflikar" className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-700">
        <div className="max-w-xl mx-auto grid grid-cols-4">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => goTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cx('relative flex flex-col items-center gap-1 pt-2.5 pb-3 text-[11px] font-semibold transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400', tab === id ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100')}
            >
              {tab === id && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24]" />}
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ---------- Rot ---------- */
export default function LeBoysApp() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  // Sessionen läses först i webbläsaren, så att sidan även fungerar med serverrendering (Next.js).
  useEffect(() => {
    const s = readJSON(SKEY) || {};
    if (ACCOUNTS[s.user]) setUser(s.user);
    setReady(true);
  }, []);

  const set = (u) => {
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), user: u });
    setUser(u);
    window.scrollTo(0, 0);
  };

  let view = null;
  if (ready) {
    if (!user) view = <Login onLogin={set} />;
    else if (!hasFullAccess(user)) view = <Classified user={user} onLogout={() => set(null)} />;
    else view = <Shell key={user} user={user} onLogout={() => set(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(900px_420px_at_50%_-120px,rgba(52,211,153,0.14),transparent_70%)] text-slate-100 font-sans antialiased">
      {view}
    </div>
  );
}
