// POÄNGRÄKNINGEN FÖR TOTALTABELLEN.
// Vad: räknar ihop alla poäng per person från röster, uppdrag, straffläggning, Pub Golf och böter.
// Var: resultatet visas i Tabell-fliken.
// Används av: components/Standings.jsx.

import { POINTS } from './config';
import { BOYS, NIGHTS, DAYS } from './constants';
import { pubGolfPoints } from './pubgolf';
import { approvedMissions } from './missions';

/* ---------- Totaltabellen ---------- */
// Räknar ihop helgens poäng per person enligt POINTS högst upp i filen.
// Körs varje gång Tabell-fliken ritas om, alltså så fort någon data ändras. Sparar ingenting,
// utan räknar alltid om från grunden. Poängvärdena (POINTS) ligger i lib/config.js.
export function computeTotals(data) {
  // Straffläggning: alla olika rekord sorterade högst först. Den bästa sviten är plats 1, näst bästa
  // plats 2 och så vidare. Två personer med samma rekord delar plats.
  const bests = Array.from(new Set(BOYS.map((n) => data.scores[n] || 0).filter((v) => v > 0))).sort((a, b) => b - a);
  // Bara de kvällar som en admin har avslöjat.
  const openNights = NIGHTS.filter((n) => data.revealed[n.id]);
  // Pub Golf-poäng per namn. Tom tills hela rundan är klar. Banan (data.pubcourse) avgör hur
  // många hål som måste vara spelade och vilket par varje hål har.
  const golfPoints = pubGolfPoints(data.pubgolf, data.pubcourse);
  const rows = BOYS.map((n) => {
    // Lagkapten: bara avslöjade kvällar räknas, så tabellen inte avslöjar en hemlig omröstning.
    const kapten = openNights.reduce((sum, night) => sum + data.votes[night.id].filter((v) => v.candidate === n).length, 0) * POINTS.vote;
    // Uppdrag: för varje dag, poäng om personens uppdrag är godkänt, plus bonus om hen var först klar.
    let uppdrag = 0;
    DAYS.forEach((d) => {
      const ok = approvedMissions(data.missions.days[d.id]);
      if (ok.includes(n)) uppdrag += POINTS.mission + (ok[0] === n ? POINTS.missionFirst : 0);
    });
    // Straffläggning: vilken plats personens rekord har. Bara de tre bästa platserna ger poäng.
    const rank = bests.indexOf(data.scores[n] || 0);
    const straffar = rank >= 0 && rank < POINTS.penalty.length ? POINTS.penalty[rank] : 0;
    // Böter: bara godkända böter räknas, och POINTS.fine är negativt, så det här drar av poäng.
    const boter = data.fines.filter((f) => f.approved && f.to === n).length * POINTS.fine;
    const golf = golfPoints[n] || 0;
    return { n, kapten, uppdrag, straffar, golf, boter, total: kapten + uppdrag + straffar + golf + boter };
  });
  // Högst poäng först. Vid lika gäller ordningen i BOYS.
  return rows.sort((a, b) => b.total - a.total || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
}
