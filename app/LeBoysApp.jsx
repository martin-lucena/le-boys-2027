// ROTEN I APPEN.
// Vad: bestämmer vilken vy som visas: inloggningen, deltagarnas väntsida, avslöjandeskärmen
// (när hemsidan just har släppts) eller hela appen.
// Var: det här är det första som laddas. app/page.tsx visar den här komponenten på startsidan.
// Använder: hooks/useSharedData.js och hooks/useIntel.js (all data), components/Login.jsx,
// components/Classified.jsx, components/Reveal.jsx och components/Shell.jsx (vyerna).
// "use client" på raden nedan betyder att koden körs i webbläsaren, inte på servern.

'use client';

import { useEffect, useState } from 'react';
import { ACCOUNTS } from '../lib/config';
import { hasFullAccess } from '../lib/constants';
import { SKEY, readJSON, writeJSON } from '../utils/storage';
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
  // waited = namnet på den deltagare som har haft väntsidan uppe sedan sidan laddades, annars null.
  // Det är så appen vet vem som ska få avslöjandeskärmen när hemsidan släpps.
  const [waited, setWaited] = useState(null);

  // Sessionen läses först i webbläsaren, så att sidan även fungerar med serverrendering (Next.js).
  // Körs en gång, direkt när sidan har laddats i webbläsaren: läser sparad inloggning från localStorage
  // och loggar in personen igen om namnet finns bland kontona. Sedan sätts ready till true.
  useEffect(() => {
    const s = readJSON(SKEY) || {};
    if (ACCOUNTS[s.user]) setUser(s.user);
    setReady(true);
  }, []);

  // Loggar in (u = ett namn) eller ut (u = null). Sparar valet i webbläsaren och rullar upp till toppen.
  // Körs när inloggningen lyckas och när man trycker Logga ut.
  const set = (u) => {
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), user: u });
    setUser(u);
    setWaited(null);
    window.scrollTo(0, 0);
  };

  // full = får den inloggade se hela appen? Räknas om varje gång datan ändras. När en admin låser
  // upp hemsidan kommer det nya läget (data.release) via realtidssynken, och full blir sant hos
  // alla på en gång, utan att någon behöver ladda om.
  const full = !!user && hasFullAccess(user, shared.data.release);
  // Kom ihåg att den här personen står på väntsidan. (Att ändra state direkt här, medan komponenten
  // ritas, är tillåtet i React när det styrs av ett villkor som sedan slutar gälla. Komponenten
  // ritas då genast om en gång med det nya värdet.)
  if (ready && user && !full && waited !== user) setWaited(user);
  // Avslöjandeskärmen visas om personen stod på väntsidan och nu har fått full åtkomst.
  const reveal = full && waited === user;

  let view = null;
  if (ready) {
    // Här väljs vyn: ingen inloggad -> Login. Inloggad utan full åtkomst -> väntsidan (Classified).
    // Stod man på väntsidan när hemsidan släpptes -> avslöjandeskärmen (Reveal). Knappen Gå in
    // nollställer waited, och då visas hela appen (Shell). Martin och Malte har alltid full
    // åtkomst och kommer direkt till Shell.
    if (!user) view = <Login onLogin={set} />;
    else if (!full) view = <Classified user={user} intel={intel} shared={shared} onLogout={() => set(null)} />;
    else if (reveal) view = <Reveal user={user} onEnter={() => { setWaited(null); window.scrollTo(0, 0); }} />;
    else view = <Shell key={user} user={user} shared={shared} intel={intel} onLogout={() => set(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(900px_420px_at_50%_-120px,rgba(52,211,153,0.14),transparent_70%)] text-slate-100 font-sans antialiased">
      {view}
    </div>
  );
}
