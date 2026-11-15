// PUB GOLF: REGLER OCH UTRÄKNINGAR.
// Vad: lagen, banan (pubarna) och all räkning av slag, placering och poäng. Ingen skärmbild, bara logik.
// Var: resultaten visas i Pub Golf-fliken, i rouletten och i totaltabellen.
// Används av: components/PubGolf.jsx, components/Roulette.jsx, components/Standings.jsx och lib/scoring.js.

import { POINTS } from './config';
import { BOYS } from './constants';

/* ---------- Pub Golf ---------- */
// Lag: dragningsordningen från rouletten delas i lag om PUB_TEAM_SIZE.
export const PUB_TEAM_SIZE = 2;
export const PUB_TEAMS = [
  { name: 'Lag Birdie', bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400' },
  { name: 'Lag Eagle', bg: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400' },
  { name: 'Lag Albatross', bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400' },
  { name: 'Lag Bogey', bg: 'bg-pink-400', text: 'text-pink-400', border: 'border-pink-400' },
];
// Banan. Pubarna är platshållare: byt namn, dryck, par och uppdrag när ni vet var ni ska.
export const PUB_HOLES = [
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
// Gör om dragningsordningen (en lista med namn) till fyra lag: de två första namnen blir lag 1,
// nästa två lag 2, och så vidare. Körs varje gång lagen ska visas.
export const pubTeams = (draw) => PUB_TEAMS.map((t, i) => ({ ...t, idx: i, members: draw.slice(i * PUB_TEAM_SIZE, (i + 1) * PUB_TEAM_SIZE) }));
// Ett håls slag: klunkar plus straff, minus ett om sidouppdraget klarades.
export const holeNet = (h) => h.sips + (h.penalty || 0) - (h.side ? 1 : 0);
// Resultat jämfört med par som text: ±0, +2 eller -1.
export const relLabel = (rel) => (rel === 0 ? '±0' : rel > 0 ? `+${rel}` : `${rel}`);
// Golfnamnet på ett resultat jämfört med par, till exempel Birdie för ett under par.
export const golfName = (rel) => (rel <= -2 ? 'Eagle' : rel === -1 ? 'Birdie' : rel === 0 ? 'Par' : rel === 1 ? 'Bogey' : 'Dubbelbogey');
// Räknar ihop ett lags runda: summa slag, summa par för de spelade hålen, antal spelade hål och
// antal klarade sidouppdrag. rel är slag minus par (minus är bra).
export function teamStats(scores, idx) {
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
// Hur långt rundan har kommit. complete blir sant först när det inte är testdata, alla åtta är
// lottade och varje lag har registrerat alla hål.
export function pubGolfProgress(pg) {
  const teams = pubTeams(pg.draw).map((t) => ({ ...t, ...teamStats(pg.scores, t.idx) }));
  const total = teams.length * PUB_HOLES.length;
  const played = teams.reduce((sum, t) => sum + t.played, 0);
  const complete = !pg.test && pg.draw.length >= BOYS.length && played === total;
  return { teams, total, played, complete };
}
// Steg för steg: 1) Är rundan inte klar får ingen poäng. 2) Ett lags plats = antal lag som har
// färre slag. 3) Varje spelare i laget får poängen för den platsen ur POINTS.pubgolf.
// Ger tillbaka en lista namn -> poäng. Används av totaltabellen.
export function pubGolfPoints(pg) {
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
// Körs när en admin trycker Ladda testdata i Pub Golf-fliken.
export const pubGolfTestData = () => {
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
