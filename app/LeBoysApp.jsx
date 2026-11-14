'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Calendar, ShieldCheck, Music, Dices, Lock, LogOut, Volume2, VolumeX, Heart, Check, Play, Square,
  ChevronDown, X, Copy, MapPin, Shirt, RotateCcw, Triangle, Trash2, Plane, Pencil, Trophy, Settings, Eye, EyeOff, Target, Clock, Medal, Gavel, Quote, Laugh, LayoutGrid, Flag, Beer, Minus, Plus, ClipboardList,
} from 'lucide-react';

/* =====================================================================
   INSTÄLLNINGAR
   false = bara Martin och Malte ser appen, övriga ser den hemliga nedräkningen.
   true  = alla åtta får Agenda, Lagkapten, Låtstudion och Lag-Roulette.
           Admin-fliken visas alltid bara för Martin och Malte.
   ===================================================================== */
const RELEASE_MODE = false;

// Supabase: gemensam molndatabas som synkar data i realtid mellan alla deltagare.
// Den publicerbara nyckeln är gjord för att ligga i webbläsarkod.
const SUPABASE_URL = 'https://ljpuljpykmqngsirqejf.supabase.co';
const SUPABASE_KEY = 'sb_publishable__qYkYANocLFO-ycXJEcyrw_uzG2jwUB';
const SUPABASE_TABLE = 'app_state';
// Lokalt testläge: när appen körs på localhost (t.ex. npm run dev i VS Code) sparas allt bara i
// webbläsarens localStorage. Ingenting läses från eller skrivs till Supabase.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
const isLocalDev = () => typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname);
const GUESSES_TABLE = 'guesses'; // Destinationsgissningar: { id, author (unik), city, reason, created_at }. Kolumnen country används inte.

// Avresa: datum (torsdagen) och klockslag för samling.
const TRIP_DATE = '2027-03-04';
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

// Poäng i totaltabellen. Ändra här om ni vill väga om tävlingen.
const POINTS = {
  vote: 2,            // per röst som lagkapten (räknas när kvällen är avslöjad)
  mission: 3,         // godkänt hemligt uppdrag
  missionFirst: 2,    // bonus till den som var först klar med ett godkänt uppdrag den dagen
  penalty: [5, 3, 1], // plats 1, 2 och 3 i straffläggningens topplista
  fine: -1,           // per bot i Bötesrummet som en admin har godkänt
  pubgolf: [6, 4, 2, 0], // per spelare i laget på plats 1, 2, 3 och 4 i Pub Golf, när rundan är klar
};

const BOYS = ['Martin', 'Malte', 'Max', 'Dylan', 'Victor', 'Petter', 'William', 'Axel'];
const isAdmin = (name) => !!(ACCOUNTS[name] && ACCOUNTS[name].admin);
const PARTICIPANTS = BOYS.filter((n) => !isAdmin(n));
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
const LOCAL_GUESSES_KEY = 'leboys2027.guesses.local';
// Hemliga uppdrag: per dag vem som har vilket uppdrag (tasks), när det bockades av (done, ISO-tid),
// eventuellt bevis (proof) och admins dom (verdict: 'ok' eller 'fail').
// active: 'auto' följer resans datum, 'off' stänger av, annars ett dag-id (tors, fre, lor, son).
const freshMissions = () => ({
  active: 'auto',
  days: {
    tors: { tasks: {}, done: {}, proof: {}, verdict: {} },
    fre: { tasks: {}, done: {}, proof: {}, verdict: {} },
    lor: { tasks: {}, done: {}, proof: {}, verdict: {} },
    son: { tasks: {}, done: {}, proof: {}, verdict: {} },
  },
});
// Pub Golf: draw är den officiella lottningen från rouletten, scores är lag -> hål -> resultat.
const freshPubGolf = () => ({ draw: [], scores: {}, test: false });
const freshData = () => ({
  hype: {},
  checkins: {},
  votes: { tors: [], fre: [], lor: [] },
  song: { intro: [], vers1: [], ref: [], vers2: [], outro: [] },
  bpm: 110,
  pattern: clone(DEFAULT_PATTERN),
  wheel: [],
  listMode: 'order',
  scores: {},                   // straffläggning: namn -> bästa svit
  revealed: { tors: false, fre: false, lor: false }, // lagkapten: vilka kvällar som är avslöjade
  missions: freshMissions(),
  fines: [],   // böter: { id, from, to, reason, ts, approved }. Gäller först när en admin har godkänt.
  quotes: [],  // citat: { id, who, text, by, laughs: [namn], ts }
  pubgolf: freshPubGolf(),
});
function readJSON(key) {
  try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
}
function writeJSON(key, v) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* lagring saknas */ }
}
function normalizeData(r) {
  const f = freshData();
  if (!r || typeof r !== 'object') return f;
  return {
    ...f, ...r,
    votes: { ...f.votes, ...r.votes },
    song: { ...f.song, ...r.song },
    pattern: { ...f.pattern, ...r.pattern },
    hype: r.hype || {},
    checkins: r.checkins || {},
    wheel: Array.isArray(r.wheel) ? r.wheel.filter((n) => BOYS.includes(n)) : [],
    scores: r.scores && typeof r.scores === 'object' ? r.scores : {},
    revealed: { ...f.revealed, ...r.revealed },
    fines: Array.isArray(r.fines) ? r.fines.filter((x) => x && BOYS.includes(x.to) && BOYS.includes(x.from)) : [],
    quotes: Array.isArray(r.quotes) ? r.quotes.filter((x) => x && BOYS.includes(x.who)).map((x) => ({ ...x, laughs: Array.isArray(x.laughs) ? x.laughs : [] })) : [],
    pubgolf: {
      draw: r.pubgolf && Array.isArray(r.pubgolf.draw) ? r.pubgolf.draw.filter((n) => BOYS.includes(n)) : [],
      scores: r.pubgolf && r.pubgolf.scores && typeof r.pubgolf.scores === 'object' ? r.pubgolf.scores : {},
      test: !!(r.pubgolf && r.pubgolf.test),
    },
    missions: (() => {
      const m = r.missions || {};
      const out = freshMissions();
      out.active = m.active || 'auto';
      Object.keys(out.days).forEach((id) => {
        const src = (m.days && m.days[id]) || {};
        out.days[id] = { tasks: src.tasks || {}, done: src.done || {}, proof: src.proof || {}, verdict: src.verdict || {} };
      });
      return out;
    })(),
  };
}
function loadData() {
  return normalizeData(readJSON(KEY));
}

/* ---------- Realtidssynk (Supabase) ----------
   Varje delad del av datan är en egen rad i tabellen app_state: { key, value (jsonb), version }.
   En ändring skrivs bara om radens version är oförändrad sedan vi senast läste den.
   Har någon annan hunnit före läses raden om och ändringen körs igen på den färska datan,
   så att två samtidiga röster, hype-klick eller låtrader aldrig skriver över varandra.
   Ej delat (stannar per enhet): beat-mönstret och listans visningsläge.
   Gissningarna ligger i en egen tabell (guesses), se useIntel nedan. */
const SHARED_KEYS = ['hype', 'checkins', 'votes', 'song', 'bpm', 'wheel', 'scores', 'revealed', 'missions', 'fines', 'quotes', 'pubgolf'];
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function useSharedData() {
  const [data, setData] = useState(loadData);
  const [sync, setSync] = useState('connecting'); // 'connecting' | 'live' | 'offline'
  const dataRef = useRef(data);
  dataRef.current = data;
  const server = useRef({}); // key -> { value, version }, senast kända läge i databasen
  const pending = useRef([]);
  const busy = useRef(false);

  useEffect(() => { writeJSON(KEY, data); }, [data]);

  const accept = (rows) => {
    const patch = {};
    (rows || []).forEach((r) => {
      if (!r || !SHARED_KEYS.includes(r.key)) return;
      const cur = server.current[r.key];
      if (cur && cur.version >= r.version) return;
      server.current[r.key] = { value: r.value, version: r.version };
      patch[r.key] = r.value;
    });
    if (Object.keys(patch).length) setData((d) => normalizeData({ ...d, ...patch }));
  };

  const pull = async (keys) => {
    const { data: rows, error } = await supabase.from(SUPABASE_TABLE).select('key,value,version').in('key', keys);
    if (error) throw error;
    accept(rows);
    return rows || [];
  };

  // Läser hela läget och skapar saknade rader (tomma) första gången appen körs mot databasen.
  const pullAll = async () => {
    const rows = await pull(SHARED_KEYS);
    const have = new Set(rows.map((r) => r.key));
    const fresh = freshData();
    const missing = SHARED_KEYS.filter((k) => !have.has(k) && fresh[k] !== undefined);
    if (missing.length) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(missing.map((k) => ({ key: k, value: fresh[k], version: 1 })), { onConflict: 'key', ignoreDuplicates: true });
      if (error) throw error;
      await pull(missing);
    }
  };

  // Kör alla väntande ändringar mot den senaste databasversionen och skriv de delar som ändrats.
  const pushFns = async (fns) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // Utgå från databasens läge (eller tomt läge för rader som inte finns än), aldrig från den lokala
      // kopian, så att en ändring som redan visats lokalt inte räknas två gånger.
      const known = {};
      const fresh = freshData();
      SHARED_KEYS.forEach((k) => {
        if (server.current[k]) known[k] = server.current[k].value;
        else if (fresh[k] !== undefined) known[k] = fresh[k];
      });
      const base = normalizeData({ ...dataRef.current, ...known });
      const next = clone(base);
      fns.forEach((fn) => fn(next));
      const changed = SHARED_KEYS.filter((k) => next[k] !== undefined && !same(next[k], base[k]));
      if (!changed.length) return;

      let conflict = false;
      for (const k of changed) {
        const cur = server.current[k];
        const res = cur
          ? await supabase.from(SUPABASE_TABLE)
            .update({ value: next[k], version: cur.version + 1, updated_at: new Date().toISOString() })
            .eq('key', k).eq('version', cur.version)
            .select('key,value,version')
          : await supabase.from(SUPABASE_TABLE)
            .insert({ key: k, value: next[k], version: 1 })
            .select('key,value,version');
        if (res.error && res.error.code !== '23505') throw res.error;
        if (res.error || !res.data || !res.data.length) { conflict = true; await pull([k]); break; }
        accept(res.data);
      }
      if (!conflict) return;
    }
  };

  const flush = async () => {
    if (busy.current || isLocalDev()) return;
    busy.current = true;
    try {
      while (pending.current.length) {
        const fns = pending.current.splice(0);
        try {
          await pushFns(fns);
        } catch (e) {
          pending.current.unshift(...fns); // försök igen vid nästa anslutning
          throw e;
        }
      }
      setSync('live');
    } catch (e) {
      setSync('offline');
    } finally {
      busy.current = false;
    }
  };

  // Samma signatur som tidigare: ändringen syns direkt lokalt och skickas sedan till databasen.
  const mut = (fn) => {
    setData((d) => { const c = clone(d); fn(c); return c; });
    if (isLocalDev()) return; // lokalt testläge: stannar i localStorage
    pending.current.push(fn);
    flush();
  };

  useEffect(() => {
    if (isLocalDev()) { setSync('local'); return undefined; }
    let alive = true;
    const refresh = () => pullAll().then(() => { if (alive) { setSync('live'); flush(); } }, () => { if (alive) setSync('offline'); });
    refresh();
    const channel = supabase
      .channel('app_state_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLE }, (payload) => {
        if (payload.new && payload.new.key) accept([payload.new]);
      })
      .subscribe((status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') refresh(); // hämta det som missats vid (åter)anslutning
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSync('offline');
      });
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, mut, sync };
}

/* ---------- Destinationsgissningar (tabellen guesses) ---------- */
function useIntel() {
  const [guesses, setGuesses] = useState([]);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'live' | 'offline' | 'local'

  const load = async () => {
    const g = await supabase.from(GUESSES_TABLE).select('id,author,city,reason,created_at').order('created_at', { ascending: true });
    if (g.error) throw g.error;
    setGuesses((g.data || []).filter((x) => BOYS.includes(x.author)));
  };

  useEffect(() => {
    if (isLocalDev()) {
      const saved = readJSON(LOCAL_GUESSES_KEY);
      setGuesses(Array.isArray(saved) ? saved.filter((x) => BOYS.includes(x.author)) : []);
      setStatus('local');
      return undefined;
    }
    let alive = true;
    const refresh = () => load().then(() => { if (alive) setStatus('live'); }, () => { if (alive) setStatus('offline'); });
    refresh();
    const channel = supabase
      .channel('intel_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: GUESSES_TABLE }, refresh)
      .subscribe((st) => {
        if (!alive) return;
        if (st === 'SUBSCRIBED') refresh();
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('offline');
      });
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  // En gissning per person: sparas om ifall man ändrar sig.
  const saveGuess = async (guess) => {
    if (isLocalDev()) {
      const next = guesses.filter((g) => g.author !== guess.author).concat({ ...guess, created_at: new Date().toISOString() });
      writeJSON(LOCAL_GUESSES_KEY, next);
      setGuesses(next);
      return;
    }
    const { error } = await supabase.from(GUESSES_TABLE).upsert(guess, { onConflict: 'author' });
    if (error) throw error;
    await load();
  };

  return { guesses, status, saveGuess };
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

/* ---------- Destinationsgissningar ---------- */
// Rubrik som fäller ihop och fäller ut en ruta. Pilen visar att den går att trycka på.
function FoldHeader({ icon, title, note, open, onToggle }) {
  return (
    <h2>
      <button
        type="button"
        onClick={() => { Sound.tap(); onToggle(); }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
      >
        {icon}
        <span className="flex-1 min-w-0">
          <span className={cx(DISPLAY, 'block text-2xl break-words')}>{title}</span>
          {note && <span className="block text-xs font-normal normal-case tracking-normal text-slate-400 tabular-nums mt-1">{note}</span>}
        </span>
        <span className={cx('w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors', open ? 'border-slate-700 text-slate-300' : 'border-amber-400 text-amber-400')}>
          <ChevronDown className={cx('w-5 h-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
    </h2>
  );
}

function GuessBox({ user, guesses, saveGuess }) {
  const mine = guesses.find((g) => g.author === user);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(true);
  const open = !mine || editing;
  const ok = city.trim().length >= 2;

  const startEdit = () => {
    Sound.tap();
    setCity(mine.city); setReason(mine.reason || '');
    setEditing(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setMsg('');
    try {
      // country skickas tom eftersom kolumnen finns kvar i tabellen och inte får vara null.
      await saveGuess({ author: user, country: '', city: city.trim(), reason: reason.trim() || null });
      setEditing(false);
      Sound.fanfare();
      Confetti.burst(160);
    } catch (err) {
      Sound.error();
      setMsg('Gissningen kunde inte sparas. Kontrollera nätet och försök igen.');
    } finally {
      setBusy(false);
    }
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';

  return (
    <Card>
      <FoldHeader
        icon={<Plane className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
        title="Vart ska vi?"
        note={mine ? 'Gissat' : 'Ej gissat'}
        open={shown}
        onToggle={() => setShown(!shown)}
      />
      {shown && (
      <div className="mt-3">
      {!open ? (
        <div className={cx('rounded-xl bg-slate-950 border border-amber-400 p-3', GLOW_GOLD)}>
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Din gissning är inlåst</p>
          <p className={cx(DISPLAY, 'text-2xl mt-1 break-words')}>{mine.city}</p>
          {mine.reason && <p className="text-sm text-slate-400 mt-2 break-words">{mine.reason}</p>}
          <button type="button" onClick={startEdit} className={cx(PRESS, 'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-400')}>
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Ändra gissning
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">Gissa vilken stad vi ska till. Du kan ändra dig fram till avresan.</p>
          <div>
            <label htmlFor="guess-city" className="block text-xs font-semibold text-slate-400 mb-1">Stad</label>
            <input id="guess-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="t.ex. Lissabon" className={field} />
          </div>
          <div>
            <label htmlFor="guess-reason" className="block text-xs font-semibold text-slate-400 mb-1">Motivering <span className="text-slate-500">Frivilligt</span></label>
            <textarea id="guess-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={cx(field, 'resize-none')} />
          </div>
          <div className="flex items-center justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => { Sound.tap(); setEditing(false); }} className="text-sm text-slate-400 hover:text-slate-100 px-2">Avbryt</button>
            )}
            <button type="submit" disabled={!ok || busy} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok && !busy ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Lock className="w-4 h-4" aria-hidden="true" /> {busy ? 'Sparar' : 'Lås in gissning'}
            </button>
          </div>
          <p role="alert" className="text-sm text-red-400 min-h-5">{msg || (!ok && city ? 'Skriv minst två tecken i stad.' : '')}</p>
        </form>
      )}
      </div>
      )}
    </Card>
  );
}

function GuessList({ guesses, user }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className={cx(DISPLAY, 'text-xl')}>Gissningar</h3>
        <span className="text-xs text-slate-400 tabular-nums">{guesses.length} av {PARTICIPANTS.length} har gissat</span>
      </div>
      {guesses.length === 0 ? (
        <p className="text-sm text-slate-400">Ingen har gissat än.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guesses.map((g) => (
            <Pop as="li" key={g.author} className={cx('flex items-start gap-2.5 rounded-xl bg-slate-950 border px-3 py-2.5', g.author === user ? 'border-amber-400' : 'border-slate-700')}>
              <Avatar name={g.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-semibold">{g.author}</span> <span className="text-slate-400">tror på</span> <span className={cx('font-semibold', PLAYER[g.author].text)}>{g.city}</span></p>
                {g.reason && <p className="text-xs text-slate-400 mt-1 break-words">{g.reason}</p>}
              </div>
            </Pop>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Straffläggning (HTML5 Canvas) ---------- */
// Spelplan i canvas-koordinater: målram, straffpunkt och målvaktens utgångsläge.
const PK = { W: 720, H: 480, left: 140, right: 580, top: 90, ground: 300, ballX: 360, ballY: 430, keepX: 360, keepY: 245 };
const pingPong = (x) => { const f = x % 2; return f < 1 ? f : 2 - f; };
const lerp = (a, b, t) => a + (b - a) * t;

function drawPenalty(cv, g) {
  const c = cv.getContext('2d');
  const { W, H, left, right, top, ground } = PK;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#020617'; c.fillRect(0, 0, W, ground);
  const grass = c.createLinearGradient(0, ground, 0, H);
  grass.addColorStop(0, '#047857'); grass.addColorStop(1, '#064e3b');
  c.fillStyle = grass; c.fillRect(0, ground, W, H - ground);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, ground); c.lineTo(W, ground); c.stroke();
  c.beginPath(); c.ellipse(PK.ballX, PK.ballY + 8, 26, 7, 0, 0, Math.PI * 2); c.stroke();

  // Nät och målram
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1;
  for (let x = left; x <= right; x += 22) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, ground); c.stroke(); }
  for (let y = top; y <= ground; y += 21) { c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke(); }
  c.strokeStyle = '#f8fafc'; c.lineWidth = 8; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(left, ground); c.lineTo(left, top); c.lineTo(right, top); c.lineTo(right, ground); c.stroke();

  const moving = g.phase === 'fly' || g.phase === 'result';
  const e = moving ? 1 - (1 - g.p) * (1 - g.p) : 0;

  // Målvakt
  const kx = lerp(PK.keepX, g.kx, e);
  const ky = lerp(PK.keepY, g.ky, e);
  const lean = moving ? Math.max(-1.2, Math.min(1.2, (g.kx - PK.keepX) / 170)) * e : 0;
  c.save();
  c.translate(kx, ky); c.rotate(lean);
  c.strokeStyle = '#fbbf24'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-14, -22); c.lineTo(-34, -52); c.moveTo(14, -22); c.lineTo(34, -52); c.stroke();
  c.beginPath(); c.moveTo(-9, 30); c.lineTo(-13, 55); c.moveTo(9, 30); c.lineTo(13, 55); c.stroke();
  c.fillStyle = '#fbbf24'; c.fillRect(-18, -30, 36, 62);
  c.fillStyle = '#020617'; c.font = '900 22px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 0, 0);
  c.fillStyle = '#fde68a'; c.beginPath(); c.arc(0, -44, 13, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#34d399';
  c.beginPath(); c.arc(-34, -54, 8, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(34, -54, 8, 0, Math.PI * 2); c.fill();
  c.restore();

  // Sikte
  if (g.phase === 'aimX' || g.phase === 'aimY') {
    const ax = g.phase === 'aimX' ? g.ax : g.tx;
    const ay = g.phase === 'aimY' ? g.ay : 195;
    c.strokeStyle = 'rgba(52,211,153,.55)'; c.lineWidth = 2; c.setLineDash([8, 8]);
    c.beginPath();
    if (g.phase === 'aimX') { c.moveTo(ax, 50); c.lineTo(ax, ground + 10); } else { c.moveTo(90, ay); c.lineTo(630, ay); }
    c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#34d399'; c.lineWidth = 4;
    c.beginPath(); c.arc(ax, ay, 18, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(ax - 26, ay); c.lineTo(ax + 26, ay); c.moveTo(ax, ay - 26); c.lineTo(ax, ay + 26); c.stroke();
  }

  // Boll
  const bx = moving ? lerp(PK.ballX, g.tx, e) : PK.ballX;
  const by = moving ? lerp(PK.ballY, g.ty, e) - Math.sin(Math.PI * g.p) * 18 : PK.ballY;
  const br = moving ? lerp(16, 10, e) : 16;
  c.fillStyle = '#f8fafc'; c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#020617'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#020617'; c.beginPath(); c.arc(bx, by, br * 0.35, 0, Math.PI * 2); c.fill();

  // Text på planen
  let text = '';
  let color = '#f8fafc';
  if (g.phase === 'idle') text = 'TRYCK PÅ STARTA';
  else if (g.phase === 'over') text = `SLUT: ${g.streak} MÅL I RAD`;
  else if (g.phase === 'result') {
    if (g.outcome === 'goal') { text = 'MÅL!'; color = '#34d399'; }
    else { text = g.outcome === 'save' ? 'RÄDDNING!' : 'UTANFÖR!'; color = '#f87171'; }
  }
  if (text) {
    c.font = `900 ${text.length > 10 ? 40 : 64}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 8; c.strokeStyle = '#020617'; c.strokeText(text, W / 2, 190);
    c.fillStyle = color; c.fillText(text, W / 2, 190);
  }
}

function Penalty({ data, mut, user }) {
  const cvRef = useRef(null);
  const g = useRef({ phase: 'idle', t0: 0, p: 0, streak: 0, ax: 360, ay: 195, tx: 360, ty: 195, kx: PK.keepX, ky: PK.keepY, outcome: null });
  const [ui, setUi] = useState({ phase: 'idle', streak: 0, record: false });
  const [shown, setShown] = useState(true);
  const scores = data.scores || {};
  const best = scores[user] || 0;
  const live = useRef({ best, mut });
  live.current = { best, mut };

  useEffect(() => {
    let raf = 0;
    const frame = (now) => {
      const s = g.current;
      const t = (now - s.t0) / 1000;
      const speed = Math.min(2.2, 0.8 + s.streak * 0.12); // siktet går fortare för varje mål
      if (s.phase === 'aimX') s.ax = 100 + 520 * pingPong(t * speed);
      else if (s.phase === 'aimY') s.ay = 290 - 230 * pingPong(t * speed * 1.15);
      else if (s.phase === 'fly') {
        s.p = Math.min(1, t / 0.5);
        if (s.p >= 1) {
          s.phase = 'result'; s.t0 = now;
          if (s.outcome === 'goal') { s.streak += 1; Sound.pop(s.streak * 3); Sound.burst(0, 0.5, 0.12, 'bandpass', 1200); }
          else Sound.error();
          setUi({ phase: 'result', streak: s.streak, record: false });
        }
      } else if (s.phase === 'result' && t > 1) {
        if (s.outcome === 'goal') {
          s.phase = 'aimX'; s.t0 = now; s.p = 0;
          setUi({ phase: 'aimX', streak: s.streak, record: false });
        } else {
          s.phase = 'over';
          const record = s.streak > live.current.best;
          if (record) {
            const n = s.streak;
            live.current.mut((d) => { if ((d.scores[user] || 0) < n) d.scores[user] = n; });
            Sound.fanfare();
            Confetti.burst(200);
          }
          setUi({ phase: 'over', streak: s.streak, record });
        }
      }
      if (cvRef.current) drawPenalty(cvRef.current, s);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [user]);

  const tap = () => {
    const s = g.current;
    const now = performance.now();
    if (s.phase === 'idle' || s.phase === 'over') {
      Sound.tap();
      s.streak = 0; s.p = 0; s.outcome = null; s.phase = 'aimX'; s.t0 = now;
      setUi({ phase: 'aimX', streak: 0, record: false });
    } else if (s.phase === 'aimX') {
      Sound.tap();
      s.tx = s.ax; s.phase = 'aimY'; s.t0 = now;
      setUi({ phase: 'aimY', streak: s.streak, record: false });
    } else if (s.phase === 'aimY') {
      s.ty = s.ay;
      // Målvakten läser skytten bättre ju längre sviten är.
      const reads = Math.random() < Math.min(0.75, 0.3 + s.streak * 0.06);
      const kx = reads ? s.tx + (Math.random() * 140 - 70) : 170 + Math.random() * 380;
      const ky = reads ? s.ty + (Math.random() * 80 - 40) : 120 + Math.random() * 150;
      s.kx = Math.max(170, Math.min(550, kx));
      s.ky = Math.max(125, Math.min(250, ky));
      const inGoal = s.tx > PK.left + 12 && s.tx < PK.right - 12 && s.ty > PK.top + 12 && s.ty < PK.ground;
      const saved = Math.abs(s.tx - s.kx) < 62 && Math.abs(s.ty - s.ky) < 58;
      s.outcome = !inGoal ? 'miss' : saved ? 'save' : 'goal';
      s.phase = 'fly'; s.t0 = now; s.p = 0;
      Sound.kick();
      setUi({ phase: 'fly', streak: s.streak, record: false });
    }
  };

  const label = { idle: 'Starta', aimX: 'Lås sidled', aimY: 'Skjut', fly: 'Skott på väg', result: 'Vänta', over: 'Spela igen' }[ui.phase];
  const busy = ui.phase === 'fly' || ui.phase === 'result';
  const table = BOYS.filter((n) => scores[n] > 0).sort((a, b) => scores[b] - scores[a]);

  return (
    <Card>
      <FoldHeader
        icon={<Trophy className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
        title="Straffläggning"
        note={`Ditt rekord: ${best}`}
        open={shown}
        onToggle={() => setShown(!shown)}
      />
      {shown && (
      <div className="mt-3">
      <canvas
        ref={cvRef}
        width={PK.W}
        height={PK.H}
        role="img"
        aria-label="Straffläggning: mål med målvakt"
        className="block w-full h-auto rounded-xl border border-slate-700 select-none"
      />
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-3xl leading-none tabular-nums text-amber-400">{ui.streak}<span className="text-sm text-slate-400 ml-1.5">mål i rad</span></p>
          <p className="text-xs text-slate-400 mt-1" role="status">
            {ui.phase === 'over' ? (ui.record ? 'Nytt personligt rekord!' : 'Sviten bröts. Försök igen.') : 'Ett tryck låser sidled, nästa tryck låser höjden och skjuter.'}
          </p>
        </div>
        <button type="button" onClick={tap} disabled={busy} className={cx(PRESS, 'rounded-xl px-5 py-3 font-bold shrink-0', busy ? 'bg-slate-800 text-slate-400' : cx('bg-amber-400 text-slate-950', GLOW_GOLD))}>
          {label}
        </button>
      </div>
      <h3 className={cx(DISPLAY, 'text-lg mt-4 mb-2')}>Topplista</h3>
      {table.length === 0 ? (
        <p className="text-sm text-slate-400">Ingen har satt en straff än.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {table.map((n, i) => (
            <li key={n} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 h-10', n === user ? 'border-amber-400' : 'border-slate-700')}>
              <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
              <Avatar name={n} size="sm" />
              <span className="font-semibold flex-1">{n}</span>
              <span className="font-black tabular-nums">{scores[n]}</span>
            </li>
          ))}
        </ol>
      )}
      </div>
      )}
    </Card>
  );
}

/* ---------- Deltagarvy (innan RELEASE_MODE) ---------- */
function Classified({ user, onLogout, intel, shared }) {
  const missionDay = activeMissionDay(shared.data.missions, Date.now());
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
        {missionDay && <MyMission data={shared.data} mut={shared.mut} user={user} day={missionDay} />}
        {missionDay && <MissionBoard data={shared.data} user={user} day={missionDay} />}
        <Penalty data={shared.data} mut={shared.mut} user={user} />
        <GuessBox user={user} guesses={intel.guesses} saveGuess={intel.saveGuess} />
        <GuessList guesses={intel.guesses} user={user} />
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
  // Ställning och motiveringar visas först när en admin har avslöjat kvällen i Admin-fliken.
  const revealed = !!data.revealed[night];
  const openNights = NIGHTS.filter((n) => data.revealed[n.id]);

  useEffect(() => { setCand(null); setReason(''); }, [night, user]);

  // Fira hos alla som har fliken öppen i ögonblicket kvällen avslöjas.
  const seen = useRef({ night, revealed });
  useEffect(() => {
    if (seen.current.night === night && revealed && !seen.current.revealed) { Sound.fanfare(); Confetti.burst(220); }
    seen.current = { night, revealed };
  }, [night, revealed]);

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

  const pool = scope === 'night' ? votes : openNights.flatMap((n) => data.votes[n.id]);
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

      {!revealed ? (
        <Card className={STRIPE}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-slate-800 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <EyeOff className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Hemlig omröstning</p>
              <p className={cx(DISPLAY, 'text-2xl mt-1 tabular-nums')}>{votes.length} av {BOYS.length} har röstat</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(votes.length / BOYS.length) * 100}%` }} />
          </div>
          <p className="text-sm text-slate-400 mt-3">
            Ställningen och motiveringarna för {nightLabel.toLowerCase()} är dolda tills Reseledningen avslöjar dem.
          </p>
        </Card>
      ) : (
      <>
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
          {scope === 'night' ? `${votes.length} av ${BOYS.length} har röstat ${nightLabel.toLowerCase()}.` : `${pool.length} röster från ${openNights.length} ${openNights.length === 1 ? 'avslöjad kväll' : 'avslöjade kvällar'}.`}
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
      </>
      )}
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

function Roulette({ data, mut, user, goTab }) {
  // Två lägen: officiell lottning av Pub Golf-lag (sparas som lagen) eller fritt snurr.
  const [mode, setMode] = useState('free');
  const official = mode === 'pubgolf';
  const order = official ? data.pubgolf.draw : data.wheel;
  const canSpin = !official || isAdmin(user); // bara admins lottar och nollställer Pub Golf-lagen
  const [names, setNames] = useState(() => BOYS.filter((n) => !order.includes(n)));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [armed, setArmed] = useState(false);
  const cvRef = useRef(null);
  const ptrRef = useRef(null);
  const rot = useRef(-Math.PI / 2);
  const raf = useRef(0);

  // Hjulet uppdateras först när vinnar-bannern är stängd, så att vinnaren syns kvar tills dess.
  useEffect(() => {
    if (!spinning && !winner) setNames(BOYS.filter((n) => !order.includes(n)));
  }, [order, spinning, winner]);
  useEffect(() => { if (cvRef.current) drawWheel(cvRef.current, names, rot.current); }, [names]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const spin = () => {
    if (spinning || winner || !names.length || !canSpin) return;
    Sound.ac();
    setSpinning(true);
    const toPubGolf = official;
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
      mut((d) => {
        const target = toPubGolf ? d.pubgolf.draw : d.wheel;
        if (!target.includes(name)) target.push(name);
      });
      Sound.fanfare();
      Confetti.burst(220);
    };
    raf.current = requestAnimationFrame(frame);
  };
  const reset = () => {
    if (!canSpin) return;
    if (official && !armed) { Sound.tap(); setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    cancelAnimationFrame(raf.current);
    Sound.tap();
    setArmed(false);
    setSpinning(false);
    setWinner(null);
    rot.current = -Math.PI / 2;
    // Nya lag betyder ny tävling, så Pub Golf-poängen nollställs tillsammans med lagen.
    if (official) mut((d) => { d.pubgolf = freshPubGolf(); });
    else mut((d) => { d.wheel = []; });
  };
  const changeMode = (v) => { if (spinning || winner) return; setArmed(false); setMode(v); };

  const pos = winner ? order.indexOf(winner) : -1;
  const gul = order.filter((_, i) => i % 2 === 0);
  const bla = order.filter((_, i) => i % 2 === 1);
  const teams = pubTeams(data.pubgolf.draw);
  const winTeam = official && pos >= 0 ? PUB_TEAMS[Math.floor(pos / PUB_TEAM_SIZE)] : null;
  const idle = !spinning && !winner && names.length > 0 && canSpin;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Lag-Roulette" title="Hjulet avgör" />
      <Segmented label="Läge för snurret" value={mode} onChange={changeMode} options={[{ id: 'free', label: 'Fritt snurr' }, { id: 'pubgolf', label: 'Pub Golf-lag' }]} />
      {official ? (
        <div className="rounded-xl border border-amber-400 bg-amber-400/10 px-3 py-2.5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Officiell lottning</p>
          <p className="text-sm mt-1">
            Varje snurr sparas direkt som Pub Golf-lag. De {PUB_TEAM_SIZE} första som dras bildar {PUB_TEAMS[0].name}, nästa {PUB_TEAM_SIZE} {PUB_TEAMS[1].name}, och så vidare.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <p className="text-xs text-slate-400">{isAdmin(user) ? 'Du är admin och kan snurra och nollställa.' : 'Bara Reseledningen kan snurra och nollställa.'}</p>
            <button type="button" onClick={() => goTab('pubgolf')} className={cx(PRESS, 'rounded-lg border border-amber-400 text-amber-400 px-2.5 py-1 text-xs font-bold')}>Öppna Pub Golf</button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-400">Fritt snurr för andra beslut och straff. Påverkar inte Pub Golf-lagen.</p>
      )}

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
              {spinning ? 'Snurrar' : !names.length ? 'Klart' : !canSpin ? <span>Endast<br />admin</span> : <span>Snurra<br />hjulet</span>}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-400 tabular-nums">{names.length} kvar på hjulet · {order.length}/{BOYS.length} dragna</p>
          {canSpin && (
            <button type="button" onClick={reset} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold', armed ? 'border-red-400 text-red-400' : 'border-slate-700 hover:border-amber-400')}>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {official ? (armed ? 'Tryck igen: lag och poäng raderas' : 'Nollställ Pub Golf-lagen') : 'Återställ hjulet (Alla 8)'}
            </button>
          )}
        </div>
      </Card>

      {official ? (
        <Card>
          <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Pub Golf-lagen</h3>
          <div className="grid grid-cols-2 gap-3">
            {teams.map((t) => (
              <TeamColumn key={t.name} title={t.name} list={t.members} slots={PUB_TEAM_SIZE} border={t.border} text={t.text} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Lagen här är samma som visas i Pub Golf-fliken och uppdateras hos alla direkt.</p>
        </Card>
      ) : (
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
      )}

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
              {winTeam
                ? <span className={cx('font-bold', winTeam.text)}>{winTeam.name}</span>
                : <span className={cx('font-bold', pos % 2 === 0 ? 'text-amber-400' : 'text-sky-400')}>Lag {teamOf(pos)}</span>}
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

/* ---------- Pub Golf ---------- */
// Lag: dragningsordningen från rouletten delas i lag om PUB_TEAM_SIZE.
const PUB_TEAM_SIZE = 2;
const PUB_TEAMS = [
  { name: 'Lag Birdie', bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400' },
  { name: 'Lag Eagle', bg: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400' },
  { name: 'Lag Albatross', bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400' },
  { name: 'Lag Bogey', bg: 'bg-pink-400', text: 'text-pink-400', border: 'border-pink-400' },
];
// Banan. Pubarna är platshållare: byt namn, dryck, par och uppdrag när ni vet var ni ska.
const PUB_HOLES = [
  { pub: 'The Rusty Putter', drink: 'Stor stark', par: 4, side: 'Skåla med en främling och få hans eller hennes förnamn.' },
  { pub: 'Bunkern', drink: 'Gin och tonic', par: 3, side: 'Hela laget pratar bara på låtsasdialekt tills glasen är tomma.' },
  { pub: 'Hål i ett', drink: 'Shot', par: 1, side: 'Ingen i laget får grimasera efteråt.' },
  { pub: 'Green Room', drink: 'Cider', par: 3, side: 'Ta en lagbild tillsammans med bartendern.' },
  { pub: 'Vattenhindret', drink: 'Ett stort glas vatten', par: 2, side: 'Laget beställer på ett annat språk än svenska och engelska.' },
  { pub: 'The 19th Hole', drink: 'Ljus lager', par: 4, side: 'Drick bara med vänsterhanden. Vänsterhänta byter till höger.' },
  { pub: 'Caddyshack', drink: 'Aperol spritz', par: 3, side: 'En i laget är caddie och bär den andras jacka genom hela puben.' },
  { pub: 'Sandfällan', drink: 'Mörk öl', par: 5, side: 'Ingen får säga orden öl eller skål, eller varandras namn.' },
  { pub: 'Klubbhuset', drink: 'Valfritt', par: 3, side: 'Laget håller ett tacktal på 30 sekunder till hela sällskapet.' },
];
const pubTeams = (draw) => PUB_TEAMS.map((t, i) => ({ ...t, idx: i, members: draw.slice(i * PUB_TEAM_SIZE, (i + 1) * PUB_TEAM_SIZE) }));
// Ett håls slag: klunkar plus straff, minus ett om sidouppdraget klarades.
const holeNet = (h) => h.sips + (h.penalty || 0) - (h.side ? 1 : 0);
const relLabel = (rel) => (rel === 0 ? '±0' : rel > 0 ? `+${rel}` : `${rel}`);
const golfName = (rel) => (rel <= -2 ? 'Eagle' : rel === -1 ? 'Birdie' : rel === 0 ? 'Par' : rel === 1 ? 'Bogey' : 'Dubbelbogey');
function teamStats(scores, idx) {
  const card = scores[idx] || {};
  let strokes = 0;
  let par = 0;
  let played = 0;
  let sides = 0;
  PUB_HOLES.forEach((h, i) => {
    const s = card[i];
    if (!s) return;
    strokes += holeNet(s); par += h.par; played += 1; if (s.side) sides += 1;
  });
  return { strokes, par, played, sides, rel: strokes - par };
}
// Poäng till totaltabellen. Delas ut först när alla lag har spelat alla hål, så att ett lag som
// bara hunnit ett hål inte leder. Lag på samma antal slag delar placering. Testdata räknas aldrig.
function pubGolfProgress(pg) {
  const teams = pubTeams(pg.draw).map((t) => ({ ...t, ...teamStats(pg.scores, t.idx) }));
  const total = teams.length * PUB_HOLES.length;
  const played = teams.reduce((sum, t) => sum + t.played, 0);
  const complete = !pg.test && pg.draw.length >= BOYS.length && played === total;
  return { teams, total, played, complete };
}
function pubGolfPoints(pg) {
  const { teams, complete } = pubGolfProgress(pg);
  const out = {};
  if (!complete) return out;
  teams.forEach((t) => {
    const place = teams.filter((o) => o.strokes < t.strokes).length;
    t.members.forEach((n) => { out[n] = POINTS.pubgolf[place] || 0; });
  });
  return out;
}
// Testdata som admins kan ladda för att prova vyn. Märks tydligt och kan rensas.
const pubGolfTestData = () => {
  const row = (list) => Object.fromEntries(list.map(([sips, side, penalty], i) => [i, { sips, side: !!side, penalty: penalty || 0, by: 'Testdata', ts: Date.now() }]));
  return {
    test: true,
    draw: ['Max', 'Axel', 'Martin', 'Petter', 'Malte', 'Dylan', 'Victor', 'William'],
    scores: {
      0: row([[4, 1], [3, 0], [1, 1], [2, 1], [2, 0], [5, 0, 1]]),
      1: row([[5, 0], [3, 1], [2, 0, 1], [3, 1], [2, 1]]),
      2: row([[3, 1], [4, 0], [1, 0], [4, 0, 1], [3, 0], [4, 1]]),
      3: row([[6, 0, 1], [3, 0], [1, 1], [3, 0], [2, 1]]),
    },
  };
};

function PubGolfTab({ data, mut, user, goTab }) {
  const pg = data.pubgolf;
  const teams = pubTeams(pg.draw);
  const drawn = pg.draw.length;
  const ready = drawn >= BOYS.length;
  const myTeam = Math.max(0, teams.findIndex((t) => t.members.includes(user)));
  const firstOpen = (idx) => { const i = PUB_HOLES.findIndex((_, h) => !(pg.scores[idx] && pg.scores[idx][h])); return i < 0 ? 0 : i; };

  const [team, setTeam] = useState(myTeam);
  const [hole, setHole] = useState(() => firstOpen(myTeam));
  const [sips, setSips] = useState(PUB_HOLES[0].par);
  const [side, setSide] = useState(false);
  const [penalty, setPenalty] = useState(0);
  const [course, setCourse] = useState(true);
  const [rules, setRules] = useState(false);
  const [flash, setFlash] = useState('');

  // Fyll i formuläret från sparat resultat när man byter lag eller hål, annars från hålets par.
  useEffect(() => {
    const saved = pg.scores[team] && pg.scores[team][hole];
    setSips(saved ? saved.sips : PUB_HOLES[hole].par);
    setSide(saved ? !!saved.side : false);
    setPenalty(saved ? saved.penalty || 0 : 0);
  }, [team, hole]);

  const stats = teams.map((t) => ({ ...t, ...teamStats(pg.scores, t.idx) }));
  const board = stats.slice().sort((a, b) => (b.played > 0) - (a.played > 0) || a.rel - b.rel || b.played - a.played || b.sides - a.sides || a.idx - b.idx);
  const anyPlayed = stats.some((t) => t.played > 0);
  const golfPoints = pubGolfPoints(pg);
  const saved = pg.scores[team] && pg.scores[team][hole];
  const h = PUB_HOLES[hole];
  const net = sips + penalty - (side ? 1 : 0);

  const save = (e) => {
    e.preventDefault();
    const entry = { sips, side, penalty, by: user, ts: Date.now() };
    mut((d) => { if (!d.pubgolf.scores[team]) d.pubgolf.scores[team] = {}; d.pubgolf.scores[team][hole] = entry; });
    const rel = net - h.par;
    if (rel < 0) { Sound.fanfare(); Confetti.burst(160); } else Sound.pop(10);
    setFlash(`${teams[team].name}, hål ${hole + 1}: ${net} slag (${golfName(rel)}).`);
    setTimeout(() => setFlash(''), 3500);
    const nextOpen = PUB_HOLES.findIndex((_, i) => i !== hole && !(pg.scores[team] && pg.scores[team][i]));
    if (nextOpen >= 0) setHole(nextOpen);
  };
  const clearHole = () => { Sound.tap(); mut((d) => { if (d.pubgolf.scores[team]) delete d.pubgolf.scores[team][hole]; }); };
  const loadTest = () => { Sound.pop(8); mut((d) => { d.pubgolf = pubGolfTestData(); }); };
  const clearAll = () => { Sound.tap(); mut((d) => { d.pubgolf = freshPubGolf(); }); };
  const step = 'w-11 h-11 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-slate-100 hover:border-amber-400 disabled:opacity-40';

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        kicker="Pub Golf"
        title="Lägst antal klunkar vinner"
        right={pg.test ? <span className="text-[11px] uppercase tracking-wider text-amber-400 border border-amber-400 rounded-full px-2 py-1 shrink-0">Testdata</span> : null}
      />

      {/* 1. Lagen och live-ställning */}
      <Card className={anyPlayed ? GLOW_GOLD : ''}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className={cx(DISPLAY, 'text-xl')}>Live-ställning</h3>
          <span className="text-xs text-slate-400 tabular-nums">Banans par: {PUB_HOLES.reduce((s, x) => s + x.par, 0)}</span>
        </div>
        {drawn === 0 ? (
          <div className="rounded-xl bg-slate-950 border border-dashed border-amber-400 p-4 text-center">
            <p className="font-semibold">Inga lag är lottade än</p>
            <p className="text-sm text-slate-400 mt-1">Lagen dras i Lag-Rouletten i läget Pub Golf-lag.</p>
            <button type="button" onClick={() => goTab('roulette')} className={cx(PRESS, 'mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-bold px-5 py-2.5')}>
              <Dices className="w-4 h-4" aria-hidden="true" /> Till rouletten
            </button>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {board.map((t, i) => (
              <li key={t.name} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 py-2.5', t.members.includes(user) ? 'border-amber-400' : 'border-slate-700')}>
                <span className="font-black text-xl w-5 tabular-nums text-amber-400">{t.played ? i + 1 : '–'}</span>
                <span className={cx('w-1.5 self-stretch rounded-full', t.bg)} />
                <div className="flex-1 min-w-0">
                  <p className={cx('font-bold', t.text)}>{t.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 mt-1">
                    {t.members.map((n) => <span key={n} className="inline-flex items-center gap-1"><Avatar name={n} size="sm" />{n}</span>)}
                    {t.members.length < PUB_TEAM_SIZE && <span className="text-slate-500">Väntar på lottning</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cx('font-black text-2xl leading-none tabular-nums', !t.played ? 'text-slate-600' : t.rel < 0 ? 'text-emerald-400' : t.rel > 0 ? 'text-red-400' : 'text-slate-100')}>{t.played ? relLabel(t.rel) : '–'}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums mt-1">{t.strokes} slag · {t.played}/{PUB_HOLES.length} hål</p>
                  {golfPoints[t.members[0]] !== undefined && <p className="text-[11px] font-bold text-amber-400 tabular-nums">+{golfPoints[t.members[0]]} p i totalen</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {drawn > 0 && !ready && <p className="text-xs text-amber-400 mt-3">Lottningen pågår: {drawn} av {BOYS.length} är dragna.</p>}

        {drawn > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs tabular-nums text-center border-separate border-spacing-y-1">
              <caption className="sr-only">Scorekort per lag och hål</caption>
              <thead>
                <tr className="text-slate-400">
                  <th scope="col" className="text-left font-semibold pr-2">Hål</th>
                  {PUB_HOLES.map((_, i) => <th key={i} scope="col" className="font-semibold w-7">{i + 1}</th>)}
                  <th scope="col" className="font-semibold pl-2">Tot</th>
                </tr>
                <tr className="text-slate-500">
                  <th scope="row" className="text-left font-normal pr-2">Par</th>
                  {PUB_HOLES.map((x, i) => <td key={i}>{x.par}</td>)}
                  <td className="pl-2">{PUB_HOLES.reduce((s, x) => s + x.par, 0)}</td>
                </tr>
              </thead>
              <tbody>
                {stats.map((t) => (
                  <tr key={t.name}>
                    <th scope="row" className={cx('text-left font-bold pr-2 whitespace-nowrap', t.text)}>{t.name.replace('Lag ', '')}</th>
                    {PUB_HOLES.map((x, i) => {
                      const s = pg.scores[t.idx] && pg.scores[t.idx][i];
                      const v = s ? holeNet(s) : null;
                      return <td key={i} className={cx('font-bold', v === null ? 'text-slate-700' : v < x.par ? 'text-emerald-400' : v > x.par ? 'text-red-400' : 'text-slate-100')}>{v === null ? '·' : v}</td>;
                    })}
                    <td className="pl-2 font-black">{t.played ? t.strokes : '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin(user) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-700 text-xs">
            <span className="text-slate-400">Admin:</span>
            <button type="button" onClick={loadTest} className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-amber-400">Ladda testdata</button>
            {(drawn > 0 || anyPlayed) && <button type="button" onClick={clearAll} className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-red-400 hover:text-red-400">Rensa lag och poäng</button>}
          </div>
        )}
      </Card>

      {/* 4. Scorekort (ligger högt upp eftersom det används mest under rundan) */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h3 className={cx(DISPLAY, 'text-xl')}>Registrera hål</h3>
        </div>
        {drawn === 0 ? (
          <p className="text-sm text-slate-400">Scorekortet öppnas när lagen är lottade.</p>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div>
              <p id="pg-team" className="text-xs font-semibold text-slate-400 mb-1.5">Lag</p>
              <div role="radiogroup" aria-labelledby="pg-team" className="grid grid-cols-2 gap-2">
                {teams.map((t) => (
                  <button key={t.name} type="button" role="radio" aria-checked={team === t.idx} onClick={() => { Sound.tap(); setTeam(t.idx); setHole(firstOpen(t.idx)); }}
                    className={cx(PRESS, 'rounded-xl border px-3 py-2 text-left', team === t.idx ? cx(t.border, 'bg-slate-800') : 'border-slate-700 bg-slate-950')}>
                    <span className={cx('block font-bold text-sm', t.text)}>{t.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{t.members.join(' och ') || 'Inte lottat'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p id="pg-hole" className="text-xs font-semibold text-slate-400 mb-1.5">Hål</p>
              <div role="radiogroup" aria-labelledby="pg-hole" className="grid grid-cols-9 gap-1">
                {PUB_HOLES.map((_, i) => {
                  const done = !!(pg.scores[team] && pg.scores[team][i]);
                  return (
                    <button key={i} type="button" role="radio" aria-checked={hole === i} aria-label={`Hål ${i + 1}${done ? ', registrerat' : ''}`} onClick={() => { Sound.tap(); setHole(i); }}
                      className={cx('h-10 rounded-lg border font-black tabular-nums transition', hole === i ? 'bg-amber-400 text-slate-950 border-amber-400' : done ? 'border-emerald-400 text-emerald-400 bg-slate-950' : 'border-slate-700 text-slate-300 bg-slate-950')}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm mt-2"><span className="font-semibold">{h.pub}</span> <span className="text-slate-400">· {h.drink} · Par {h.par}</span></p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span id="pg-sips" className="text-sm font-semibold">Klunkar</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="pg-sips">
                <button type="button" onClick={() => { Sound.tap(); setSips(Math.max(1, sips - 1)); }} disabled={sips <= 1} aria-label="Färre klunkar" className={step}><Minus className="w-4 h-4" aria-hidden="true" /></button>
                <span className="font-black text-4xl tabular-nums w-12 text-center text-amber-400" aria-live="polite">{sips}</span>
                <button type="button" onClick={() => { Sound.tap(); setSips(Math.min(20, sips + 1)); }} disabled={sips >= 20} aria-label="Fler klunkar" className={step}><Plus className="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>

            <label htmlFor="pg-side" className={cx('flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer', side ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700 bg-slate-950')}>
              <input id="pg-side" type="checkbox" checked={side} onChange={(e) => setSide(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-400 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Sidouppdraget klarat <span className="text-emerald-400">−1 slag</span></span>
                <span className="block text-xs text-slate-400 mt-0.5">{h.side}</span>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3">
              <span id="pg-pen" className="text-sm font-semibold">Straff <span className="text-red-400">+1 slag styck</span><span className="block text-xs font-normal text-slate-400">Spill, fusk eller hjälp utifrån</span></span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="pg-pen">
                <button type="button" onClick={() => { Sound.tap(); setPenalty(Math.max(0, penalty - 1)); }} disabled={penalty <= 0} aria-label="Färre straff" className={step}><Minus className="w-4 h-4" aria-hidden="true" /></button>
                <span className={cx('font-black text-2xl tabular-nums w-8 text-center', penalty ? 'text-red-400' : 'text-slate-500')} aria-live="polite">{penalty}</span>
                <button type="button" onClick={() => { Sound.tap(); setPenalty(Math.min(5, penalty + 1)); }} disabled={penalty >= 5} aria-label="Fler straff" className={step}><Plus className="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5">
              <p className="text-sm">Hålets resultat: <span className="font-black tabular-nums">{net} slag</span> <span className={cx('font-semibold', net < h.par ? 'text-emerald-400' : net > h.par ? 'text-red-400' : 'text-slate-300')}>({golfName(net - h.par)}, {relLabel(net - h.par)})</span></p>
              {saved && isAdmin(user) && <button type="button" onClick={clearHole} className="text-xs text-slate-400 hover:text-red-400 underline shrink-0">Rensa hålet</button>}
            </div>
            <button type="submit" className={cx(PRESS, 'w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-black uppercase py-3', GLOW_GOLD)}>
              <Flag className="w-5 h-5" aria-hidden="true" /> {saved ? 'Uppdatera hålet' : 'Registrera hålet'}
            </button>
            <p className="text-sm text-emerald-400 min-h-5" role="status">{flash || (saved ? `Senast registrerat av ${saved.by}.` : '')}</p>
          </form>
        )}
      </Card>

      {/* 2. Banan */}
      <Card>
        <FoldHeader icon={<Flag className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />} title="Banan" note={`${PUB_HOLES.length} hål · exempelpubar`} open={course} onToggle={() => setCourse(!course)} />
        {course && (
          <ol className="flex flex-col gap-2 mt-3">
            {PUB_HOLES.map((x, i) => (
              <li key={x.pub} className="flex gap-3 rounded-xl bg-slate-950 border border-slate-700 p-3">
                <div className="flex flex-col items-center shrink-0 w-10">
                  <span className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 font-black text-lg flex items-center justify-center tabular-nums">{i + 1}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Par {x.par}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{x.pub}</p>
                  <p className="flex items-center gap-1.5 text-sm text-amber-400 mt-1"><Beer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {x.drink} · {x.par} {x.par === 1 ? 'klunk' : 'klunkar'}</p>
                  <p className="flex items-start gap-1.5 text-sm text-slate-300 mt-1"><Target className="w-3.5 h-3.5 shrink-0 mt-1 text-slate-400" aria-hidden="true" /> {x.side}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* 3. Poängsystem och regler */}
      <Card>
        <FoldHeader icon={<Medal className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />} title="Regler och poäng" open={rules} onToggle={() => setRules(!rules)} />
        {rules && (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><span className="font-semibold">Som vanlig golf:</span> lägst antal slag efter nio hål vinner.</li>
            <li><span className="font-semibold">Slag:</span> antalet klunkar som den långsammaste i laget behöver för att tömma hålets dryck.</li>
            <li><span className="font-semibold">Par:</span> målet för hålet. Under par är birdie eller eagle, över par är bogey.</li>
            <li><span className="font-semibold text-emerald-400">Sidouppdrag: −1 slag.</span> Varje pub har ett uppdrag. Klarar hela laget det dras ett slag av.</li>
            <li><span className="font-semibold text-red-400">Straff: +1 slag styck.</span> Spill, fusk, hjälp från ett annat lag eller att lämna kvar i glaset.</li>
            <li><span className="font-semibold">Vattenhindret:</span> hål 5 dricks i vatten. Det är obligatoriskt.</li>
            <li><span className="font-semibold">Alkoholfritt:</span> räknas precis som originalet, utan straff.</li>
            <li><span className="font-semibold">Vid lika:</span> flest spelade hål vinner, därefter flest klarade sidouppdrag.</li>
            <li><span className="font-semibold text-amber-400">Totaltabellen:</span> när alla lag har spelat alla hål får varje spelare {POINTS.pubgolf.join(', ')} poäng för plats 1 till {POINTS.pubgolf.length}. Lag på samma antal slag delar placering.</li>
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------- Hemliga uppdrag ---------- */
// Vilken dags uppdrag som gäller just nu: admins val, eller resans datum i läget Auto.
function activeMissionDay(missions, now) {
  if (missions.active === 'off') return null;
  if (missions.active !== 'auto') return DAYS.some((d) => d.id === missions.active) ? missions.active : null;
  const start = itemDate(0, '00:00').getTime();
  const i = Math.floor((now - start) / 864e5);
  return now >= start && i < DAYS.length ? DAYS[i].id : null;
}
const clockTime = (iso) => new Date(iso).toLocaleTimeString('sv-SE');
const dayTime = (ts) => new Date(ts).toLocaleString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

// Godkända uppdrag för en dag, i tidsordning. Den första får bonuspoäng.
function approvedMissions(m) {
  return BOYS.filter((n) => m.tasks[n] && m.done[n] && m.verdict[n] === 'ok').sort((a, b) => new Date(m.done[a]) - new Date(m.done[b]));
}

// Det egna uppdraget: man ser bara sitt eget.
function MyMission({ data, mut, user, day }) {
  const m = data.missions.days[day];
  const text = m.tasks[user];
  const doneAt = m.done[user];
  const verdict = m.verdict[user];
  const dayLabel = DAYS.find((d) => d.id === day).label;
  const [proof, setProof] = useState('');

  const finish = (e) => {
    e.preventDefault();
    if (!text || doneAt) return;
    const ts = new Date().toISOString();
    const p = proof.trim();
    // Sätts bara om det inte redan finns en tid, så första bekräftelsen gäller.
    mut((d) => {
      const t = d.missions.days[day];
      if (t.tasks[user] && !t.done[user]) { t.done[user] = ts; if (p) t.proof[user] = p; }
    });
    setProof('');
    Sound.fanfare();
    Confetti.burst(200);
  };

  return (
    <Card className={cx(STRIPE, verdict === 'ok' ? GLOW_GREEN : GLOW_GOLD)}>
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
        <h2 className={cx(DISPLAY, 'text-2xl flex-1 min-w-0')}>Ditt hemliga uppdrag</h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold shrink-0">{dayLabel}</span>
      </div>
      {!text ? (
        <p className="text-sm text-slate-400 mt-3">Du har inget uppdrag i dag. Njut av friheten så länge den varar.</p>
      ) : (
        <>
          <p className="mt-3 rounded-xl bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 break-words whitespace-pre-wrap">{text}</p>
          <p className="text-xs text-slate-400 mt-2">Bara du ser texten. De andra ser bara om och när du blev klar.</p>
          {doneAt ? (
            <div className={cx('mt-3 rounded-xl border px-3 py-2.5', verdict === 'ok' ? 'bg-emerald-400/10 border-emerald-400' : verdict === 'fail' ? 'bg-red-400/10 border-red-400' : 'bg-amber-400/10 border-amber-400')}>
              <p className="font-semibold">
                Inskickat <span className="tabular-nums">kl. {clockTime(doneAt)}</span>
              </p>
              <p className={cx('text-sm mt-0.5', verdict === 'ok' ? 'text-emerald-400' : verdict === 'fail' ? 'text-red-400' : 'text-amber-400')}>
                {verdict === 'ok' ? `Godkänt av Reseledningen: +${POINTS.mission} poäng.` : verdict === 'fail' ? 'Underkänt. Be Reseledningen återställa det om du vill försöka igen.' : 'Väntar på att Reseledningen godkänner.'}
              </p>
              {m.proof[user] && <p className="text-sm text-slate-300 mt-1 break-words">Ditt bevis: {m.proof[user]}</p>}
            </div>
          ) : (
            <form onSubmit={finish} className="mt-3 flex flex-col gap-2">
              <label htmlFor="mission-proof" className="block text-xs font-semibold text-slate-400">Bevis <span className="text-slate-500">Frivilligt: vem såg det, vad hände?</span></label>
              <input id="mission-proof" value={proof} onChange={(e) => setProof(e.target.value)} maxLength={140} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400" />
              <button type="submit" className={cx(PRESS, 'w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-black uppercase text-lg py-3', GLOW_GOLD)}>
                <Check className="w-5 h-5" aria-hidden="true" /> Klar!
              </button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

// Gemensam tavla: vilka som är klara, i vilken ordning och exakt när. Uppdragstexterna visas inte.
function MissionBoard({ data, user, day }) {
  const m = data.missions.days[day];
  const players = BOYS.filter((n) => m.tasks[n]);
  const done = players.filter((n) => m.done[n] && m.verdict[n] !== 'fail').sort((a, b) => new Date(m.done[a]) - new Date(m.done[b]));
  const failed = players.filter((n) => m.done[n] && m.verdict[n] === 'fail');
  const waiting = players.filter((n) => !m.done[n]);
  const first = approvedMissions(m)[0];
  const dayLabel = DAYS.find((d) => d.id === day).label;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className={cx(DISPLAY, 'text-xl')}>Uppdragstavlan, {dayLabel.toLowerCase()}</h3>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{done.length} av {players.length} klara</span>
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-slate-400">Inga uppdrag är utdelade för {dayLabel.toLowerCase()} än.</p>
      ) : (
        <>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(done.length / players.length) * 100}%` }} />
          </div>
          <ol className="flex flex-col gap-1.5">
            {done.map((n, i) => {
              const ok = m.verdict[n] === 'ok';
              return (
                <Pop as="li" key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : ok ? 'border-emerald-400/60' : 'border-slate-700')}>
                  <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
                  <Avatar name={n} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{n}</span>
                    <span className={cx('block text-[11px] font-semibold', ok ? 'text-emerald-400' : 'text-amber-400')}>
                      {ok ? `Godkänd · +${POINTS.mission + (n === first ? POINTS.missionFirst : 0)} p${n === first ? ' (först)' : ''}` : 'Väntar på godkännande'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-slate-100 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> {clockTime(m.done[n])}
                  </span>
                </Pop>
              );
            })}
            {failed.map((n) => (
              <li key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : 'border-red-400/60')}>
                <span className="w-5 text-red-400 font-black">×</span>
                <Avatar name={n} size="sm" />
                <span className="font-semibold flex-1 min-w-0 truncate text-slate-300">{n}</span>
                <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Underkänd</span>
              </li>
            ))}
            {waiting.map((n) => (
              <li key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : 'border-slate-700')}>
                <span className="w-5 text-slate-600 font-black">–</span>
                <Avatar name={n} size="sm" />
                <span className="font-semibold flex-1 min-w-0 truncate text-slate-300">{n}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Inte klar</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

// Flik: Uppdrag. Det egna uppdraget och den gemensamma tavlan, för alla.
function MissionTab({ data, mut, user }) {
  const day = activeMissionDay(data.missions, Date.now());
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Hemliga uppdrag" title={day ? DAYS.find((d) => d.id === day).label : 'Uppdrag'} />
      {day ? (
        <>
          <MyMission data={data} mut={mut} user={user} day={day} />
          <MissionBoard data={data} user={user} day={day} />
        </>
      ) : (
        <Card className={STRIPE}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-slate-800 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={cx(DISPLAY, 'text-2xl')}>Inga uppdrag just nu</p>
              <p className="text-sm text-slate-400 mt-1">Reseledningen delar ut hemliga uppdrag under resan. Håll utkik här.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Admin: dela ut uppdrag per dag, till en person eller gemensamt till alla, och godkänn eller underkänn.
function MissionAdmin({ data, mut }) {
  const [day, setDay] = useState('tors');
  const [who, setWho] = useState('alla');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const m = data.missions.days[day];
  const dayLabel = DAYS.find((d) => d.id === day).label;
  const current = activeMissionDay(data.missions, Date.now());
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  const assign = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const targets = who === 'alla' ? BOYS : [who];
    mut((d) => { targets.forEach((n) => { d.missions.days[day].tasks[n] = t; }); });
    Sound.pop(10);
    setText('');
    say(who === 'alla' ? `Gemensamt uppdrag utdelat till alla för ${dayLabel.toLowerCase()}.` : `Uppdrag utdelat till ${who} för ${dayLabel.toLowerCase()}.`);
  };
  const judge = (n, v) => {
    if (v === 'ok') Sound.pop(14); else Sound.error();
    mut((d) => { const t = d.missions.days[day]; if (t.done[n]) t.verdict[n] = v; });
  };
  const reopen = (n) => {
    Sound.tap();
    mut((d) => { const t = d.missions.days[day]; delete t.done[n]; delete t.proof[n]; delete t.verdict[n]; });
  };
  const remove = (n) => {
    Sound.tap();
    mut((d) => { const t = d.missions.days[day]; delete t.tasks[n]; delete t.done[n]; delete t.proof[n]; delete t.verdict[n]; });
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';
  const small = 'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold';

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
        <h3 className={cx(DISPLAY, 'text-xl')}>Hemliga uppdrag</h3>
      </div>

      <p className="text-xs font-semibold text-slate-400 mt-4 mb-1.5">Vilken dags uppdrag visas för gänget</p>
      <Segmented
        label="Aktiv uppdragsdag"
        value={data.missions.active}
        onChange={(v) => mut((d) => { d.missions.active = v; })}
        options={[{ id: 'auto', label: 'Auto' }, { id: 'off', label: 'Av' }].concat(DAYS.map((d) => ({ id: d.id, label: d.short })))}
      />
      <p className="text-xs text-slate-400 mt-1.5">
        {data.missions.active === 'auto' ? 'Auto följer resans datum. ' : ''}
        Visas just nu: <span className="font-semibold text-slate-100">{current ? DAYS.find((d) => d.id === current).label : 'inget uppdrag'}</span>
      </p>

      <p className="text-xs font-semibold text-slate-400 mt-5 mb-1.5">Dela ut uppdrag för</p>
      <Segmented label="Dag att dela ut för" value={day} onChange={setDay} options={DAYS.map((d) => ({ id: d.id, label: d.short }))} />
      <form onSubmit={assign} className="flex flex-col gap-2 mt-3">
        <div>
          <label htmlFor="mission-who" className="block text-xs font-semibold text-slate-400 mb-1">Till</label>
          <select id="mission-who" value={who} onChange={(e) => setWho(e.target.value)} className={field}>
            <option value="alla">Alla (gemensamt uppdrag)</option>
            {BOYS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mission-text" className="block text-xs font-semibold text-slate-400 mb-1">Uppdrag</label>
          <textarea id="mission-text" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="t.ex. Få någon att säga ordet ananas före lunch" className={cx(field, 'resize-none')} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-emerald-400 min-h-4" role="status">{msg}</p>
          <button type="submit" disabled={!text.trim()} className={cx(PRESS, 'rounded-xl px-5 py-2.5 font-bold shrink-0', text.trim() ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400')}>
            Dela ut
          </button>
        </div>
      </form>

      <h4 className="text-xs font-semibold text-slate-400 mt-5 mb-1.5">Utdelat för {dayLabel.toLowerCase()}</h4>
      <ul className="flex flex-col gap-1.5">
        {BOYS.map((n) => {
          const v = m.verdict[n];
          return (
            <li key={n} className={cx('rounded-xl bg-slate-950 border px-3 py-2', m.done[n] && !v ? 'border-amber-400' : 'border-slate-700')}>
              <div className="flex items-start gap-2.5">
                <Avatar name={n} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {n}
                    {m.done[n] && (
                      <span className={cx('ml-2 text-xs font-bold tabular-nums', v === 'ok' ? 'text-emerald-400' : v === 'fail' ? 'text-red-400' : 'text-amber-400')}>
                        {v === 'ok' ? 'Godkänd' : v === 'fail' ? 'Underkänd' : 'Väntar'} · {clockTime(m.done[n])}
                      </span>
                    )}
                  </p>
                  <p className={cx('text-sm break-words', m.tasks[n] ? 'text-slate-300' : 'text-slate-500 italic')}>{m.tasks[n] || 'Inget uppdrag'}</p>
                  {m.proof[n] && <p className="text-xs text-slate-400 mt-1 break-words">Bevis: {m.proof[n]}</p>}
                </div>
                {m.tasks[n] && (
                  <button type="button" onClick={() => remove(n)} aria-label={`Ta bort uppdraget för ${n}`} title="Ta bort uppdrag" className="text-slate-400 hover:text-red-400 shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              {m.done[n] && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
                  <button type="button" onClick={() => judge(n, 'ok')} aria-pressed={v === 'ok'} className={cx(small, v === 'ok' ? 'bg-emerald-400 text-slate-950 border-emerald-400' : 'border-emerald-400 text-emerald-400')}>
                    <Check className="w-3 h-3" aria-hidden="true" /> Godkänn
                  </button>
                  <button type="button" onClick={() => judge(n, 'fail')} aria-pressed={v === 'fail'} className={cx(small, v === 'fail' ? 'bg-red-400 text-slate-950 border-red-400' : 'border-red-400 text-red-400')}>
                    <X className="w-3 h-3" aria-hidden="true" /> Underkänn
                  </button>
                  <button type="button" onClick={() => reopen(n)} className={cx(small, 'border-slate-700 text-slate-300')}>
                    <RotateCcw className="w-3 h-3" aria-hidden="true" /> Låt försöka igen
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------- Bötesrummet ---------- */
function FinesTab({ data, mut, user }) {
  const [to, setTo] = useState(null);
  const [reason, setReason] = useState('');
  const fines = data.fines;
  const ok = !!to && reason.trim().length >= 3;
  const table = BOYS.map((n) => ({ n, c: fines.filter((f) => f.approved && f.to === n).length })).sort((a, b) => b.c - a.c || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
  const max = Math.max(1, table[0].c);
  const soleWorst = table[0].c > 0 && table[0].c > table[1].c;
  const feed = fines.slice().sort((a, b) => b.ts - a.ts);

  const submit = (e) => {
    e.preventDefault();
    if (!ok) return;
    const fine = { id: uid(), from: user, to, reason: reason.trim(), ts: Date.now(), approved: false };
    mut((d) => { d.fines.push(fine); });
    setTo(null);
    setReason('');
  };
  const remove = (id) => { mut((d) => { d.fines = d.fines.filter((f) => f.id !== id); }); };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Bötesrummet" title="Vem ska bötfällas?" />
      <Card>
        <form onSubmit={submit}>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Vem får böterna">
            {BOYS.filter((n) => n !== user).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={to === n}
                onClick={() => setTo(n)}
                className={cx(PRESS, 'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5', to === n ? 'border-red-400 bg-red-400/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
              >
                <Avatar name={n} size="lg" />
                <span className="font-semibold text-xs sm:text-sm">{n}</span>
              </button>
            ))}
          </div>
          <label htmlFor="fine-reason" className="block text-sm font-semibold mt-4 mb-1.5">Brott <span className="text-amber-400">Obligatoriskt</span></label>
          <input id="fine-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} placeholder={to ? `Vad har ${to} gjort?` : 't.ex. Kom sent till frukosten'} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400" />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-xs text-slate-400">Boten gäller först när Reseledningen har godkänt den. Då ger den {POINTS.fine} poäng i totaltabellen.</p>
            <button type="submit" disabled={!ok} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold shrink-0', ok ? 'bg-red-400 text-slate-950' : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Gavel className="w-4 h-4" aria-hidden="true" /> Dela ut bot
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Syndaregistret</h3>
        <ul className="flex flex-col gap-2">
          {table.map((r, i) => (
            <li key={r.n} className="flex items-center gap-2.5">
              <Avatar name={r.n} size="sm" />
              <span className="w-16 text-sm font-semibold truncate">{r.n}</span>
              <div className="flex-1 h-6 rounded-md bg-slate-950 overflow-hidden">
                <div className="h-full rounded-md bg-red-400 flex items-center justify-end pr-1.5 transition-all duration-500" style={{ width: `${(r.c / max) * 100}%` }}>
                  {i === 0 && soleWorst && <span className="text-[10px] font-black text-slate-950 bg-white/80 rounded px-1">VÄRST</span>}
                </div>
              </div>
              <span className="w-6 text-right font-black text-lg tabular-nums">{r.c}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Senaste böterna</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-slate-400">Inga böter än. Någon gör snart bort sig.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {feed.map((f) => (
              <Pop as="li" key={f.id} className={cx('rounded-xl bg-slate-950 border border-slate-700 border-l-4 px-3 py-2.5', f.approved ? 'border-l-red-400' : 'border-l-amber-400')}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className={cx('font-semibold', PLAYER[f.to].text)}>{f.to}</span> <span className="text-slate-400">bötfälld av</span> <span className="font-semibold">{f.from}</span>
                    </p>
                    <p className="text-sm mt-1 break-words">{f.reason}</p>
                    <p className="text-[11px] mt-1 tabular-nums">
                      <span className="text-slate-500">{dayTime(f.ts)} · </span>
                      <span className={cx('font-semibold', f.approved ? 'text-red-400' : 'text-amber-400')}>{f.approved ? 'Godkänd' : 'Väntar på Reseledningen'}</span>
                    </p>
                  </div>
                  {(f.from === user || isAdmin(user)) && (
                    <button type="button" onClick={() => remove(f.id)} aria-label="Ta bort boten" className="text-slate-400 hover:text-red-400 shrink-0">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </Pop>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// Admin: böter som väntar på godkännande.
function FineReview({ data, mut }) {
  const pending = data.fines.filter((f) => !f.approved).sort((a, b) => a.ts - b.ts);
  const approve = (id) => { mut((d) => { const f = d.fines.find((x) => x.id === id); if (f) f.approved = true; }); };
  const reject = (id) => { mut((d) => { d.fines = d.fines.filter((x) => x.id !== id); }); };
  const small = 'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold';
  return (
    <Card className={pending.length ? GLOW_GOLD : ''}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h3 className={cx(DISPLAY, 'text-xl')}>Böter att godkänna</h3>
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{pending.length} väntar</span>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400 mt-2">Inga böter väntar. Nya förslag dyker upp här direkt.</p>
      ) : (
        <ul className="flex flex-col gap-2 mt-3">
          {pending.map((f) => (
            <li key={f.id} className="rounded-xl bg-slate-950 border border-amber-400 px-3 py-2.5">
              <p className="text-sm">
                <span className={cx('font-semibold', PLAYER[f.to].text)}>{f.to}</span> <span className="text-slate-400">anmäld av</span> <span className="font-semibold">{f.from}</span>
                <span className="text-[11px] text-slate-500 tabular-nums"> · {dayTime(f.ts)}</span>
              </p>
              <p className="text-sm mt-1 break-words">{f.reason}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button type="button" onClick={() => approve(f.id)} className={cx(small, 'bg-red-400 text-slate-950 border-red-400')}>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Godkänn bot
                </button>
                <button type="button" onClick={() => reject(f.id)} className={cx(small, 'border-slate-700 text-slate-300')}>
                  <X className="w-3.5 h-3.5" aria-hidden="true" /> Avslå
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Kvällens citat ---------- */
function QuotesTab({ data, mut, user }) {
  const [who, setWho] = useState(BOYS[0]);
  const [text, setText] = useState('');
  const quotes = data.quotes.slice().sort((a, b) => b.ts - a.ts);
  const ok = text.trim().length >= 3;

  const submit = (e) => {
    e.preventDefault();
    if (!ok) return;
    const quote = { id: uid(), who, text: text.trim(), by: user, laughs: [], ts: Date.now() };
    mut((d) => { d.quotes.push(quote); });
    Sound.pop(12);
    setText('');
  };
  const laugh = (id) => {
    Sound.pop(8);
    mut((d) => {
      const q = d.quotes.find((x) => x.id === id);
      if (!q) return;
      q.laughs = q.laughs.includes(user) ? q.laughs.filter((n) => n !== user) : q.laughs.concat(user);
    });
  };
  const remove = (id) => { Sound.tap(); mut((d) => { d.quotes = d.quotes.filter((q) => q.id !== id); }); };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Kvällens citat" title="Vad sa han nu?" />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div>
            <label htmlFor="quote-who" className="block text-xs font-semibold text-slate-400 mb-1">Vem sa det?</label>
            <select id="quote-who" value={who} onChange={(e) => setWho(e.target.value)} className={field}>
              {BOYS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quote-text" className="block text-xs font-semibold text-slate-400 mb-1">Citatet, ordagrant</label>
            <textarea id="quote-text" rows={2} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} className={cx(field, 'resize-none')} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!ok} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Quote className="w-4 h-4" aria-hidden="true" /> Spara citat
            </button>
          </div>
        </form>
      </Card>

      {quotes.length === 0 ? (
        <Card><p className="text-sm text-slate-400">Inga citat än. Lyssna noga i kväll.</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {quotes.map((q) => {
            const mine = q.laughs.includes(user);
            return (
              <Pop as="li" key={q.id} className={cx('rounded-2xl bg-slate-900/90 border border-slate-700 border-l-4 p-4', PLAYER[q.who].border)}>
                <p className="text-lg font-semibold leading-snug break-words">”{q.text}”</p>
                <div className="flex items-center gap-2 mt-3">
                  <Avatar name={q.who} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={cx('text-sm font-bold', PLAYER[q.who].text)}>{q.who}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{dayTime(q.ts)} · inlagt av {q.by}</p>
                  </div>
                  <button type="button" onClick={() => laugh(q.id)} aria-pressed={mine} className={cx(PRESS, 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums', mine ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-slate-700 text-slate-400 hover:text-slate-100')}>
                    <Laugh className="w-3.5 h-3.5" aria-hidden="true" /> {q.laughs.length}
                  </button>
                  {(q.by === user || isAdmin(user)) && (
                    <button type="button" onClick={() => remove(q.id)} aria-label="Ta bort citatet" className="text-slate-400 hover:text-red-400">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </Pop>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Totaltabellen ---------- */
// Räknar ihop helgens poäng per person enligt POINTS högst upp i filen.
function computeTotals(data) {
  const bests = Array.from(new Set(BOYS.map((n) => data.scores[n] || 0).filter((v) => v > 0))).sort((a, b) => b - a);
  const openNights = NIGHTS.filter((n) => data.revealed[n.id]);
  const golfPoints = pubGolfPoints(data.pubgolf);
  const rows = BOYS.map((n) => {
    // Lagkapten: bara avslöjade kvällar räknas, så tabellen inte avslöjar en hemlig omröstning.
    const kapten = openNights.reduce((sum, night) => sum + data.votes[night.id].filter((v) => v.candidate === n).length, 0) * POINTS.vote;
    let uppdrag = 0;
    DAYS.forEach((d) => {
      const ok = approvedMissions(data.missions.days[d.id]);
      if (ok.includes(n)) uppdrag += POINTS.mission + (ok[0] === n ? POINTS.missionFirst : 0);
    });
    const rank = bests.indexOf(data.scores[n] || 0);
    const straffar = rank >= 0 && rank < POINTS.penalty.length ? POINTS.penalty[rank] : 0;
    const boter = data.fines.filter((f) => f.approved && f.to === n).length * POINTS.fine;
    const golf = golfPoints[n] || 0;
    return { n, kapten, uppdrag, straffar, golf, boter, total: kapten + uppdrag + straffar + golf + boter };
  });
  return rows.sort((a, b) => b.total - a.total || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
}

function StandingsTab({ data, user }) {
  const rows = computeTotals(data);
  const [open, setOpen] = useState(null);
  const [rules, setRules] = useState(false);
  const max = Math.max(1, rows[0].total);
  const soleLeader = rows[0].total > 0 && rows[0].total > rows[1].total;
  const hiddenNights = NIGHTS.filter((n) => !data.revealed[n.id]).length;
  const signed = (v) => (v > 0 ? `+${v}` : `${v}`);
  const golf = pubGolfProgress(data.pubgolf);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Totaltabellen" title="Helgens ställning" />
      <Card>
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const isOpen = open === r.n;
            return (
              <li key={r.n} className={cx('rounded-xl bg-slate-950 border', r.n === user ? 'border-amber-400' : 'border-slate-700')}>
                <button type="button" onClick={() => { Sound.tap(); setOpen(isOpen ? null : r.n); }} aria-expanded={isOpen} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
                  <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
                  <Avatar name={r.n} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold truncate">{r.n}</span>
                      {i === 0 && soleLeader && <span className="text-[10px] font-black text-slate-950 bg-amber-400 rounded px-1.5 py-0.5">MVP</span>}
                    </span>
                    <span className="block mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <span className={cx('block h-full rounded-full transition-all duration-500', PLAYER[r.n].bg)} style={{ width: `${Math.max(0, (r.total / max) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="font-black text-2xl tabular-nums w-10 text-right">{r.total}</span>
                  <ChevronDown aria-hidden="true" className={cx('w-4 h-4 text-slate-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <Pop as="dl" className="grid grid-cols-5 gap-1.5 px-3 pb-3 text-center">
                    {[['Kapten', r.kapten], ['Uppdrag', r.uppdrag], ['Straffar', r.straffar], ['Golf', r.golf], ['Böter', r.boter]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-900 border border-slate-700 py-1.5">
                        <dt className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-400">{l}</dt>
                        <dd className={cx('font-black tabular-nums', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-500')}>{signed(v)}</dd>
                      </div>
                    ))}
                  </Pop>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-slate-400 mt-3">Tryck på ett namn för att se var poängen kommer ifrån.</p>
        {hiddenNights > 0 && <p className="text-xs text-slate-400 mt-1">Lagkaptensröster räknas först när kvällen är avslöjad. {hiddenNights} av 3 kvällar är dolda.</p>}
        {!golf.complete && (
          <p className="text-xs text-slate-400 mt-1 tabular-nums">
            {data.pubgolf.test ? 'Pub Golf visar testdata och räknas inte.' : `Pub Golf räknas när rundan är klar. ${golf.played} av ${golf.total} hål är registrerade.`}
          </p>
        )}
      </Card>

      <Card>
        <FoldHeader icon={<Medal className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />} title="Så räknas poängen" open={rules} onToggle={() => setRules(!rules)} />
        {rules && (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <li className="flex justify-between gap-3"><span>Röst som lagkapten</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.vote}</span></li>
            <li className="flex justify-between gap-3"><span>Godkänt hemligt uppdrag</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.mission}</span></li>
            <li className="flex justify-between gap-3"><span>Först klar med godkänt uppdrag den dagen</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.missionFirst}</span></li>
            <li className="flex justify-between gap-3"><span>Straffläggning: plats 1, 2 och 3 i topplistan</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.penalty.join(' / +')}</span></li>
            <li className="flex justify-between gap-3"><span>Pub Golf: plats 1, 2, 3 och 4, till varje spelare i laget när rundan är klar</span><span className="font-bold tabular-nums text-emerald-400 shrink-0">+{POINTS.pubgolf.join(' / +')}</span></li>
            <li className="flex justify-between gap-3"><span>Godkänd bot i Bötesrummet</span><span className="font-bold tabular-nums text-red-400">{POINTS.fine}</span></li>
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------- Admin (endast Martin och Malte) ---------- */
function AdminTab({ data, mut, sync }) {
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState('');

  const toggleReveal = (id) => {
    const on = !data.revealed[id];
    mut((d) => { d.revealed[id] = on; });
    if (on) { Sound.fanfare(); Confetti.burst(200); } else Sound.tap();
  };
  const wipe = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    setArmed(false);
    // Topplistan i straffläggningen (scores) sparas, liksom gissningarna som ligger i en egen tabell.
    mut((d) => { const scores = d.scores; Object.assign(d, freshData()); d.scores = scores; });
    Sound.error();
    setMsg(sync === 'live' ? 'Allt utom gissningar och topplista är nollställt för alla.' : 'Allt utom gissningar och topplista är nollställt på den här enheten.');
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Reseledningen" title="Admin" />

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl')}>Avslöja lagkapten</h3>
        <p className="text-sm text-slate-400 mt-1 mb-3">Ställning och motiveringar är dolda för alla tills du avslöjar kvällen.</p>
        <ul className="flex flex-col gap-2">
          {NIGHTS.map((n) => {
            const on = !!data.revealed[n.id];
            const count = data.votes[n.id].length;
            return (
              <li key={n.id} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 py-2.5', on ? 'border-emerald-400' : 'border-slate-700')}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{n.label}</p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {count} av {BOYS.length} röster · <span className={on ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{on ? 'Avslöjad' : 'Dold'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReveal(n.id)}
                  aria-pressed={on}
                  className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shrink-0', on ? 'border border-slate-700 text-slate-300 hover:border-amber-400' : cx('bg-amber-400 text-slate-950', GLOW_GOLD))}
                >
                  {on ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  {on ? 'Dölj igen' : 'Avslöja'}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <FineReview data={data} mut={mut} />

      <MissionAdmin data={data} mut={mut} />

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Status och nollställning</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cx('rounded-full border px-2 py-1 font-semibold', RELEASE_MODE ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400')}>
            {RELEASE_MODE ? 'Släppt: alla åtta har åtkomst' : 'Hemligt läge: bara Reseledningen har åtkomst'}
          </span>
          <span className={cx('rounded-full border px-2 py-1 font-semibold', sync === 'live' ? 'border-emerald-400 text-emerald-400' : sync === 'offline' ? 'border-red-400 text-red-400' : sync === 'local' ? 'border-sky-400 text-sky-400' : 'border-slate-700 text-slate-400')}>
            {sync === 'live' ? 'Synkad live med molnet' : sync === 'offline' ? 'Ingen kontakt med molnet: sparas bara lokalt' : sync === 'local' ? 'Lokalt testläge: sparas bara i den här webbläsaren' : 'Ansluter till molnet'}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          Nollställer hype, incheckningar, röster, avslöjanden, uppdrag, böter, citat, Pub Golf, låttext och roulette. Gissningarna och straffläggningens topplista ligger kvar. Går inte att ångra.
        </p>
        <button type="button" onClick={wipe} className={cx(PRESS, 'mt-3 flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold', armed ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
          <Trash2 className="w-4 h-4" aria-hidden="true" /> {armed ? 'Tryck igen för att radera allt' : 'Nollställ all data'}
        </button>
        <p className="mt-2 min-h-5 text-sm text-emerald-400" role="status">{msg}</p>
      </Card>
    </div>
  );
}

/* ---------- Appskal med flikar ---------- */
// Flikar. main: true ligger i flikraden längst ner, övriga nås via Mer-menyn.
const TABS = [
  { id: 'agenda', label: 'Agenda', long: 'Agenda (Tors–Sön)', Icon: Calendar, main: true },
  { id: 'kapten', label: 'Lagkapten', long: 'Lagkapten', Icon: ShieldCheck, main: true },
  { id: 'uppdrag', label: 'Uppdrag', long: 'Hemliga uppdrag', Icon: Target, main: true },
  { id: 'tabell', label: 'Tabell', long: 'Totaltabellen', Icon: Medal, main: true },
  { id: 'pubgolf', label: 'Pub Golf', long: 'Pub Golf', Icon: Flag, hint: 'Lag, bana och scorekort' },
  { id: 'boter', label: 'Bötesrummet', long: 'Bötesrummet', Icon: Gavel, hint: 'Dela ut böter' },
  { id: 'citat', label: 'Citat', long: 'Kvällens citat', Icon: Quote, hint: 'Spara det som sades' },
  { id: 'studio', label: 'Låtstudion', long: 'Låtstudion', Icon: Music, hint: 'Resans låt och beat' },
  { id: 'roulette', label: 'Lag-Roulette', long: 'Lag-Roulette', Icon: Dices, hint: 'Dra lagen' },
  { id: 'admin', label: 'Admin', long: 'Admin', Icon: Settings, hint: 'Reseledningens verktyg', adminOnly: true },
];

function Shell({ user, onLogout, shared, intel }) {
  const { data, mut, sync } = shared;

  // Admin-fliken finns bara för konton med admin: true.
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin(user));
  const mainTabs = tabs.filter((t) => t.main);
  const moreTabs = tabs.filter((t) => !t.main);
  const [tab, setTab] = useState(() => {
    const s = readJSON(SKEY);
    return s && tabs.some((x) => x.id === s.tab) ? s.tab : 'agenda';
  });
  const [muted, setMuted] = useState(false);
  const [more, setMore] = useState(false);
  const inMore = moreTabs.some((t) => t.id === tab);
  const goTab = (t) => {
    Sound.tap();
    setTab(t);
    setMore(false);
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), tab: t });
    window.scrollTo(0, 0);
  };
  const toggleMute = () => {
    Sound.muted = !muted;
    setMuted(!muted);
    if (muted) Sound.tap();
  };
  useEffect(() => {
    if (!more) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMore(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [more]);
  const props = { data, mut, user, goTab };
  const tabClass = (active) => cx('relative flex flex-col items-center gap-1 pt-2.5 pb-3 text-[11px] font-semibold min-w-0 transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400', active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100');
  const marker = <span className="absolute top-0 h-0.5 w-10 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24]" />;

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
        {tab === 'agenda' && (
          <div className="mt-6 flex flex-col gap-4">
            <Penalty data={data} mut={mut} user={user} />
            <GuessList guesses={intel.guesses} user={user} />
          </div>
        )}
        {tab === 'kapten' && <Captain {...props} />}
        {tab === 'uppdrag' && <MissionTab data={data} mut={mut} user={user} />}
        {tab === 'tabell' && <StandingsTab data={data} user={user} />}
        {tab === 'pubgolf' && <PubGolfTab {...props} />}
        {tab === 'boter' && <FinesTab data={data} mut={mut} user={user} />}
        {tab === 'citat' && <QuotesTab data={data} mut={mut} user={user} />}
        {tab === 'studio' && <Studio {...props} />}
        {tab === 'roulette' && <Roulette {...props} />}
        {tab === 'admin' && isAdmin(user) && <AdminTab data={data} mut={mut} sync={sync} />}
      </main>

      {more && (
        <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={() => setMore(false)}>
          <Pop
            role="dialog"
            aria-modal="true"
            aria-label="Fler sidor"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-16 inset-x-0 mx-auto max-w-xl px-3"
          >
            <div className={cx('rounded-3xl bg-slate-900 border border-amber-400 p-4', GLOW_GOLD)}>
              <div className="flex items-center justify-between mb-3">
                <p className={cx(DISPLAY, 'text-xl')}>Mer</p>
                <button type="button" onClick={() => setMore(false)} aria-label="Stäng menyn" className={cx(PRESS, 'w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100')}>
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moreTabs.map(({ id, label, hint, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTab(id)}
                    aria-current={tab === id ? 'page' : undefined}
                    className={cx(PRESS, 'flex items-center gap-3 rounded-2xl border p-3 text-left', tab === id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
                  >
                    <span className={cx('w-10 h-10 rounded-full flex items-center justify-center shrink-0', tab === id ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400')}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{label}</span>
                      <span className="block text-[11px] text-slate-400 leading-tight mt-0.5">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Pop>
        </div>
      )}

      <nav aria-label="Huvudflikar" className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-700">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {mainTabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => goTab(id)} aria-current={tab === id ? 'page' : undefined} className={tabClass(tab === id && !more)}>
              {tab === id && !more && marker}
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </button>
          ))}
          <button type="button" onClick={() => { Sound.tap(); setMore(!more); }} aria-expanded={more} aria-haspopup="dialog" className={tabClass(more || inMore)}>
            {(more || inMore) && marker}
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
            {inMore && !more ? TABS.find((t) => t.id === tab).label : 'Mer'}
          </button>
        </div>
      </nav>
    </div>
  );
}

/* ---------- Rot ---------- */
export default function LeBoysApp() {
  const shared = useSharedData();
  const intel = useIntel();
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
    else if (!hasFullAccess(user)) view = <Classified user={user} intel={intel} shared={shared} onLogout={() => set(null)} />;
    else view = <Shell key={user} user={user} shared={shared} intel={intel} onLogout={() => set(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(900px_420px_at_50%_-120px,rgba(52,211,153,0.14),transparent_70%)] text-slate-100 font-sans antialiased">
      {view}
    </div>
  );
}
