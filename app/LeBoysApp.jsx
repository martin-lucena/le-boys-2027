// ROTEN I APPEN.
// Vad: bestämmer vilken av tre vyer som visas: inloggningen, deltagarnas väntsida eller hela appen.
// Var: det här är det första som laddas. app/page.tsx visar den här komponenten på startsidan.
// Använder: hooks/useSharedData.js och hooks/useIntel.js (all data), components/Login.jsx,
// components/Classified.jsx och components/Shell.jsx (de tre vyerna).
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
    window.scrollTo(0, 0);
  };

  let view = null;
  if (ready) {
    // Här väljs vyn: ingen inloggad -> Login. Inloggad utan full åtkomst -> väntsidan (Classified).
    // Annars hela appen (Shell). hasFullAccess är sant för Martin och Malte, och för alla när
    // RELEASE_MODE är true.
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
