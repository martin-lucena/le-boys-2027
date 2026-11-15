// ROTEN I APPEN.
// Vad: bestämmer vilken vy som visas: inloggningen, deltagarnas väntsida eller hela appen, och
// lägger avslöjandet av resmålet ovanpå appen första gången en person är inne efter att resmålet
// har satts.
// Var: det här är det första som laddas. app/page.tsx visar den här komponenten på startsidan.
// Använder: hooks/useSharedData.js och hooks/useIntel.js (all data), components/Login.jsx,
// components/Classified.jsx, components/Reveal.jsx och components/Shell.jsx (vyerna).
// "use client" på raden nedan betyder att koden körs i webbläsaren, inte på servern.

'use client';

import { useEffect, useState } from 'react';
import { ACCOUNTS } from '../lib/config';
import { hasFullAccess } from '../lib/constants';
import { SKEY, REVEAL_KEY, readJSON, writeJSON } from '../utils/storage';
import { useSharedData } from '../hooks/useSharedData';
import { useIntel } from '../hooks/useIntel';
import { Login } from '../components/Login';
import { Classified } from '../components/Classified';
import { Reveal } from '../components/Reveal';
import { Shell } from '../components/Shell';

/* ---------- Rot ---------- */
// Komponenten tar inga props. Den hämtar datan själv och skickar den vidare nedåt till vyerna.
export default function LeBoysApp() {
  // shared = all delad data plus funktionen mut som ändrar den. Se hooks/useSharedData.js.
  const shared = useSharedData();
  // intel = gissningarna om resmålet plus funktionen som sparar en gissning. Se hooks/useIntel.js.
  const intel = useIntel();
  // ready = har vi hunnit kolla i webbläsarens minne om någon redan är inloggad? Tills dess visas inget.
  const [ready, setReady] = useState(false);
  // user = namnet på den som är inloggad, eller null om ingen är det.
  const [user, setUser] = useState(null);
  // seen = vilka på den här telefonen som redan har sett avslöjandet av resmålet ({ namn: true }).
  // Läses från och sparas i webbläsarens minne (REVEAL_KEY), så att avslöjandet bara visas
  // automatiskt en gång per person.
  const [seen, setSeen] = useState({});
  // replay = sant när man har tryckt "Se avslöjandet igen" i Agenda-fliken.
  const [replay, setReplay] = useState(false);

  // Sessionen läses först i webbläsaren, så att sidan även fungerar med serverrendering (Next.js).
  // Körs en gång, direkt när sidan har laddats i webbläsaren: läser sparad inloggning från localStorage
  // och loggar in personen igen om namnet finns bland kontona. Läser också vilka som redan har sett
  // avslöjandet. Sedan sätts ready till true.
  useEffect(() => {
    const s = readJSON(SKEY) || {};
    if (ACCOUNTS[s.user]) setUser(s.user);
    setSeen(readJSON(REVEAL_KEY) || {});
    setReady(true);
  }, []);

  // Loggar in (u = ett namn) eller ut (u = null). Sparar valet i webbläsaren och rullar upp till toppen.
  // Körs när inloggningen lyckas och när man trycker Logga ut.
  const set = (u) => {
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), user: u });
    setUser(u);
    setReplay(false);
    window.scrollTo(0, 0);
  };

  // full = får den inloggade se hela appen? Räknas om varje gång datan ändras. När en admin låser
  // upp hemsidan kommer det nya läget (data.release) via realtidssynken, och full blir sant hos
  // alla på en gång, utan att någon behöver ladda om.
  const full = !!user && hasFullAccess(user, shared.data.release);
  // city = resmålets stad. Tom text tills en admin har låst upp hemsidan och fyllt i staden.
  const city = shared.data.destination.city;
  // Avslöjandet visas ovanpå appen om personen är inne i appen, resmålet är satt och personen
  // antingen inte har sett det än eller har bett om att få se det igen. Räknas om varje gång datan
  // ändras: den som har väntsidan uppe när en admin låser upp får både full åtkomst och staden via
  // synken, och då dyker avslöjandet upp direkt, utan omladdning.
  const showReveal = full && !!city && (replay || !seen[user]);
  // Körs när man trycker Gå in: sparar att personen har sett avslöjandet och stänger det.
  const closeReveal = () => {
    const next = { ...(readJSON(REVEAL_KEY) || {}), ...seen, [user]: true };
    writeJSON(REVEAL_KEY, next);
    setSeen(next);
    setReplay(false);
    window.scrollTo(0, 0);
  };

  let view = null;
  if (ready) {
    // Här väljs vyn: ingen inloggad -> Login. Inloggad utan full åtkomst -> väntsidan (Classified).
    // Annars hela appen (Shell), och ovanpå den avslöjandet (Reveal) när det ska visas. Martin och
    // Malte har alltid full åtkomst och kommer direkt till Shell.
    if (!user) view = <Login onLogin={set} />;
    else if (!full) view = <Classified user={user} intel={intel} shared={shared} onLogout={() => set(null)} />;
    else {
      view = (
        <>
          {/* onReplay körs av knappen "Se avslöjandet igen" i Agenda-fliken. */}
          <Shell key={user} user={user} shared={shared} intel={intel} onLogout={() => set(null)} onReplay={() => setReplay(true)} />
          {showReveal && <Reveal user={user} city={city} guesses={intel.guesses} onEnter={closeReveal} />}
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(900px_420px_at_50%_-120px,rgba(52,211,153,0.14),transparent_70%)] text-slate-100 font-sans antialiased">
      {view}
    </div>
  );
}
