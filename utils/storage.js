// DATAMODELLEN OCH WEBBLÄSARENS MINNE.
// Vad: beskriver hur all data ser ut när den är tom (freshData), lagar trasig eller gammal data
// (normalizeData) och läser och skriver i webbläsarens localStorage.
// Var: syns inte själv.
// Används av: hooks/useSharedData.js, hooks/useIntel.js, app/LeBoysApp.jsx, components/Shell.jsx,
// components/Roulette.jsx, components/PubGolf.jsx och components/AdminTab.jsx.
// Agendans startvärde och kontroll ligger i lib/agenda.js.

import { BOYS, DEFAULT_PATTERN } from '../lib/constants';
import { freshAgenda, normalizeAgenda } from '../lib/agenda';
import { clone } from './helpers';

/* ---------- Lagring (localStorage) ---------- */
// Namnen som datan sparas under i webbläsaren: KEY = all appdata, SKEY = vem som är inloggad och
// vilken flik som är öppen, LOCAL_GUESSES_KEY = gissningar i lokalt testläge.
export const KEY = 'leboys2027.data.v2';
export const SKEY = 'leboys2027.session.v2';
export const LOCAL_GUESSES_KEY = 'leboys2027.guesses.local';
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
export const freshPubGolf = () => ({ draw: [], scores: {}, test: false });
// Hela datan i tomt skick. Används första gången appen körs och när en admin nollställer allt.
export const freshData = () => ({
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
  // agendan: dag-id -> lista med programpunkter. Startvärdet är punkterna i DAYS. Se lib/agenda.js.
  agenda: freshAgenda(),
  // release: är hemsidan upplåst för alla? open = ja eller nej, by = vilken admin som låste upp,
  // at = när (tidpunkt i millisekunder). Ändras bara från Admin-fliken, med lösenord.
  release: { open: false, by: null, at: null },
});
// Läser ett sparat värde ur webbläsarens minne. Ger null om inget finns eller om det inte går att läsa.
export function readJSON(key) {
  try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
}
// Sparar ett värde i webbläsarens minne. Misslyckas tyst om minnet är avstängt eller fullt.
export function writeJSON(key, v) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* lagring saknas */ }
}
// Tar emot data som kan vara ofullständig (gammal version, eller bara vissa delar från databasen)
// och fyller i allt som saknas från freshData. Rensar också bort namn som inte finns i BOYS.
// Körs varje gång data läses in, så att resten av appen kan lita på att alla fält finns.
export function normalizeData(r) {
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
    // Agendan: saknade dagar fylls med standardpunkterna, trasiga punkter rensas bort.
    agenda: normalizeAgenda(r.agenda),
    // Släppläget: allt som inte tydligt säger "öppen" räknas som stängt.
    release: r.release && r.release.open
      ? { open: true, by: r.release.by || null, at: r.release.at || null }
      : { open: false, by: null, at: null },
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
// Körs en gång när appen startar: läser det som sparades i webbläsaren förra gången.
export function loadData() {
  return normalizeData(readJSON(KEY));
}
