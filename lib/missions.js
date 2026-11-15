// HEMLIGA UPPDRAG: HJÄLPLOGIK.
// Vad: räknar ut vilken dags uppdrag som gäller just nu och vilka uppdrag som är godkända.
// Var: syns inte själv. Resultatet styr Uppdrag-fliken, väntsidan och totaltabellen.
// Används av: components/Missions.jsx, components/Classified.jsx och lib/scoring.js.

import { BOYS, DAYS } from './constants';
import { itemDate } from '../utils/helpers';

/* ---------- Hemliga uppdrag ---------- */
// Vilken dags uppdrag som gäller just nu: admins val, eller resans datum i läget Auto.
// Steg för steg: 1) Har admin valt Av visas inget. 2) Har admin valt en viss dag gäller den.
// 3) Annars (Auto) räknas hur många dygn som gått sedan resans första dag, och den dagen gäller.
// Före och efter resan blir svaret null, alltså inget uppdrag.
export function activeMissionDay(missions, now) {
  if (missions.active === 'off') return null;
  if (missions.active !== 'auto') return DAYS.some((d) => d.id === missions.active) ? missions.active : null;
  const start = itemDate(0, '00:00').getTime();
  const i = Math.floor((now - start) / 864e5);
  return now >= start && i < DAYS.length ? DAYS[i].id : null;
}

// Godkända uppdrag för en dag, i tidsordning. Den första får bonuspoäng.
// m är en dags uppdrag. Tar bara med dem som har ett uppdrag, är klara och har fått godkänt av admin.
export function approvedMissions(m) {
  return BOYS.filter((n) => m.tasks[n] && m.done[n] && m.verdict[n] === 'ok').sort((a, b) => new Date(m.done[a]) - new Date(m.done[b]));
}
