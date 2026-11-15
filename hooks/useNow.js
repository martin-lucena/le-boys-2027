// KLOCKA.
// Vad: ger aktuell tid och ser till att komponenten ritas om varje sekund.
// Var: nedräkningen och agendans Nu/Klart-markeringar.
// Används av: components/ui.jsx (Countdown) och components/Agenda.jsx.
// En "hook" är en funktion som en komponent anropar för att få data som kan ändras över tid.

import { useEffect, useState } from 'react';

// Ger tillbaka tiden just nu i millisekunder.
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  // Körs när komponenten visas: startar en timer som uppdaterar tiden varje sekund.
  // Funktionen som returneras körs när komponenten försvinner och stänger av timern.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
