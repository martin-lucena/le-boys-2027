// VÄNTSIDAN (DELTAGARNAS VY FÖRE RESAN).
// Vad: nedräkning till avresan, rutan Klassificerat, dagens uppdrag (om något gäller), straffläggningen,
// gissa resmålet och listan med gissningar.
// Var: visas för de sex deltagarna tills hemsidan släpps: antingen låser en admin upp den i
// Admin-fliken, eller så sätts RELEASE_MODE till true i lib/config.js.
// Martin och Malte ser aldrig den här sidan.
// Används av: app/LeBoysApp.jsx.

import { LogOut } from 'lucide-react';
import { tripStartTime } from '../lib/agenda';
import { cx, itemDate } from '../utils/helpers';
import { PRESS, DISPLAY } from '../utils/styles';
import { Avatar, Pop, Countdown } from './ui';
import { GuessBox, GuessList } from './Guesses';
import { Penalty } from './Penalty';
import { activeMissionDay } from '../lib/missions';
import { MyMission, MissionBoard } from './Missions';

/* ---------- Deltagarvy (innan RELEASE_MODE) ---------- */
// Props: user = den inloggade, onLogout = körs när man trycker Logga ut,
// intel = gissningarna (från useIntel), shared = delad data och mut (från useSharedData).
export function Classified({ user, onLogout, intel, shared }) {
  // missionDay = vilken dags uppdrag som gäller just nu, eller null. Uppdragsrutorna visas bara då.
  const missionDay = activeMissionDay(shared.data.missions, Date.now());
  // start = tidpunkten för avresan. fmt = samma datum utskrivet på svenska.
  // Tiden hämtas från torsdagens första punkt i den delade agendan, så nedräkningen följer med
  // om en admin ändrar den.
  const start = itemDate(0, tripStartTime(shared.data.agenda));
  const fmt = start.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <Pop className="w-full max-w-md flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Avatar name={user} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Inloggad som deltagare</p>
            <p className={cx(DISPLAY, 'text-2xl mt-1')}>{user}</p>
          </div>
          <button type="button" onClick={onLogout} className={cx(PRESS, 'flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold hover:border-amber-400')}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> Logga ut
          </button>
        </div>
        <h1 className={cx(DISPLAY, 'text-5xl')}>Le boys <span className="text-amber-400">på språng</span></h1>
        <Countdown target={start.getTime()} label="Avresa om" sub={`Håll ${fmt} fri. Mer än så får du inte veta.`} big />
        <section className="relative rounded-2xl border-2 border-dashed border-amber-400 bg-slate-900 p-5 overflow-hidden">
          <span aria-hidden="true" className="absolute right-3 top-4 rotate-12 border-2 border-red-400 text-red-400 font-black uppercase text-lg px-2 py-0.5 rounded opacity-80">Hemligt</span>
          <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400 font-semibold">Säkerhetsnivå: Reseledningen</p>
          <h2 className={cx(DISPLAY, 'text-4xl mt-2')}>Klassificerat</h2>
          <p className="mt-3 text-slate-200">
            Endast Reseledningen (Martin och Malte) har åtkomst till agendan och övriga verktyg. Du får veta det du behöver veta, när du behöver veta det.
          </p>
          <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
            <span className="h-3 rounded bg-slate-800 w-11/12" />
            <span className="h-3 rounded bg-slate-800 w-8/12" />
            <span className="h-3 rounded bg-slate-800 w-10/12" />
          </div>
        </section>
        {missionDay && <MyMission data={shared.data} mut={shared.mut} user={user} day={missionDay} />}
        {missionDay && <MissionBoard data={shared.data} user={user} day={missionDay} />}
        <Penalty data={shared.data} mut={shared.mut} user={user} />
        <GuessBox user={user} guesses={intel.guesses} saveGuess={intel.saveGuess} />
        <GuessList guesses={intel.guesses} user={user} />
      </Pop>
    </main>
  );
}
