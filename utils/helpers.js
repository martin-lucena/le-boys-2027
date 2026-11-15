// SMÅ HJÄLPFUNKTIONER.
// Vad: korta verktyg som används överallt: sätta ihop CSS-klasser, skapa id, kopiera data, animera
// och räkna ut datum och klockslag.
// Var: syns inte själva.
// Används av: nästan alla filer.

import { TRIP_DATE } from '../lib/config';

/* ---------- Hjälpfunktioner ---------- */
// Sätter ihop flera klassnamn till en text och hoppar över tomma värden.
// Gör att man kan skriva: cx('alltid', villkor && 'bara ibland').
export const cx = (...a) => a.filter(Boolean).join(' ');
// Ett slumpat id på åtta tecken, till exempel för en ny röst, bot eller låtrad.
export const uid = () => Math.random().toString(36).slice(2, 10);
// En helt fristående kopia av ett värde, så att ändringar i kopian inte påverkar originalet.
export const clone = (v) => JSON.parse(JSON.stringify(v));
// Sant om användaren har bett telefonen att minska rörelser. Då hoppar appen över animationer och konfetti.
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Spelar en liten animation på ett element (om rörelser är tillåtna).
export const animate = (el, frames, opts) => {
  if (el && el.animate && !reducedMotion()) el.animate(frames, opts);
};
// "Poppar in" ett element: det växer och tonar fram på en kvarts sekund.
export const popIn = (el) =>
  animate(el, [{ transform: 'scale(.94) translateY(8px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], {
    duration: 260, easing: 'cubic-bezier(.2,1.2,.3,1)',
  });

// Gör om "dag nummer X på resan" och ett klockslag till ett riktigt datum.
// dayIdx 0 = torsdagen (TRIP_DATE i lib/config.js), 1 = fredagen och så vidare.
export function itemDate(dayIdx, time) {
  const [y, m, d] = TRIP_DATE.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d + dayIdx, hh, mm, 0);
}

// Tid som text. clockTime ger klockslag med sekunder, dayTime ger veckodag plus timme och minut.
export const clockTime = (iso) => new Date(iso).toLocaleTimeString('sv-SE');
export const dayTime = (ts) => new Date(ts).toLocaleString('sv-SE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
