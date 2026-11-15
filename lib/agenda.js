// AGENDAN SOM DELAD DATA.
// Vad: hjälpfunktioner för agendan, som numera ligger i den delade datan (data.agenda) och kan
// redigeras av admins i appen. Här finns startvärdet, sorteringen och kontrollen av inläst data.
// Var: syns inte själv. Agendan visas och redigeras i Agenda-fliken.
// Används av: utils/storage.js, components/Agenda.jsx, components/Classified.jsx och components/AdminTab.jsx.
//
// Så ser data.agenda ut: en lista med programpunkter per dag.
//   { tors: [punkt, punkt ...], fre: [...], lor: [...], son: [...] }
// Dagarna är fasta (de kommer från DAYS i lib/constants.js). Bara punkterna går att ändra.
// En punkt: { id, time ('15:00'), title, place, dress, text, tab (valfri länk till en flik),
//             by och ts (vem som senast ändrade punkten och när, finns bara på ändrade punkter) }.

import { TRIP_TIME } from './config';
import { DAYS } from './constants';
import { clone } from '../utils/helpers';

// Ett giltigt klockslag ser ut som 09:30. Det är formatet som ett tidsfält (type="time") ger.
export const TIME_RE = /^\d{2}:\d{2}$/;

// Standardagendan: en fristående kopia av punkterna i DAYS. Används första gången appen körs mot
// databasen och när en admin trycker "Återställ agendan till standard".
export const freshAgenda = () => Object.fromEntries(DAYS.map((d) => [d.id, clone(d.items)]));

// Sorterar en dags punkter efter klockslag, tidigast först. Eftersom tiderna alltid skrivs med
// två siffror (09:30) räcker det att jämföra dem som text. Körs efter varje ändring, så
// ordningen sköter sig själv. Ändrar listan på plats och ger tillbaka den.
export const sortAgenda = (list) => list.sort((a, b) => a.time.localeCompare(b.time));

// Klockslaget då resan börjar: torsdagens första programpunkt. Listan är sorterad, så den första
// punkten är den tidigaste. Är torsdagen tom används TRIP_TIME från lib/config.js som reserv.
// Används av nedräkningen före resan, både i Agenda-fliken och på väntsidan, så att den följer
// med när en admin ändrar tiden i agendan.
export function tripStartTime(agenda) {
  const first = agenda[DAYS[0].id][0];
  return first ? first.time : TRIP_TIME;
}

// Lagar agendan när den läses in från webbläsaren eller databasen. Saknas hela agendan eller en
// dag används standardpunkterna för den dagen. Punkter utan id, giltig tid eller titel rensas bort.
// En dag som en admin har tömt helt är en tom lista och förblir tom.
export function normalizeAgenda(a) {
  const out = {};
  DAYS.forEach((d) => {
    const src = a && Array.isArray(a[d.id]) ? a[d.id] : null;
    out[d.id] = src
      ? sortAgenda(src.filter((x) => x && typeof x.id === 'string' && TIME_RE.test(x.time) && typeof x.title === 'string'))
      : clone(d.items);
  });
  return out;
}
