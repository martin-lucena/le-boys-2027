// ADMIN-FLIKEN.
// Vad: Reseledningens verktyg. Avslöja eller dölj lagkaptensresultat, godkänn böter, dela ut och
// bedöm uppdrag, återställ agendan till standard, se appens status och nollställ all data.
// Var: under Mer-menyn, BARA för Martin och Malte. Kontrollen görs i components/Shell.jsx.
// Används av: components/Shell.jsx.

import { useState } from 'react';
import { Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { RELEASE_MODE } from '../lib/config';
import { BOYS, NIGHTS } from '../lib/constants';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { freshData } from '../utils/storage';
import { freshAgenda } from '../lib/agenda';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Card, SectionTitle } from './ui';
import { MissionAdmin } from './Missions';
import { FineReview } from './Fines';

/* ---------- Admin (endast Martin och Malte) ---------- */
// Props: data och mut = delad data och funktionen som ändrar den,
// sync = läget för anslutningen till Supabase ('live', 'offline', 'local' eller 'connecting').
export function AdminTab({ data, mut, sync }) {
  // armed = sant i tre sekunder efter första trycket på Nollställ (säkerhetsspärr). msg = kvittot efteråt.
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState('');
  // Samma sak för knappen Återställ agendan: armedAgenda = spärren, agendaMsg = kvittot efteråt.
  const [armedAgenda, setArmedAgenda] = useState(false);
  const [agendaMsg, setAgendaMsg] = useState('');

  // Körs när man trycker Avslöja eller Dölj igen för en kväll.
  const toggleReveal = (id) => {
    const on = !data.revealed[id];
    // SPARAR TILL SUPABASE: data.revealed för kvällen. När den blir true visas ställning och
    // motiveringar för alla, och kvällens röster börjar räknas i totaltabellen.
    mut((d) => { d.revealed[id] = on; });
    if (on) { Sound.fanfare(); Confetti.burst(200); } else Sound.tap();
  };
  // Körs när man trycker Nollställ all data.
  const wipe = () => {
    // Första trycket laddar bara knappen. Först ett andra tryck inom tre sekunder raderar.
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    setArmed(false);
    // Topplistan i straffläggningen (scores) sparas, liksom gissningarna som ligger i en egen tabell.
    // Agendan sparas också: den återställs bara med sin egen knapp, se resetAgenda nedan.
    // SPARAR TILL SUPABASE: all delad data ersätts med tom data (freshData), utom straffläggningens
    // topplista och agendan.
    mut((d) => { const scores = d.scores; const agenda = d.agenda; Object.assign(d, freshData()); d.scores = scores; d.agenda = agenda; });
    Sound.error();
    setMsg(sync === 'live' ? 'Allt utom gissningar, topplista och agenda är nollställt för alla.' : 'Allt utom gissningar, topplista och agenda är nollställt på den här enheten.');
    setTimeout(() => setMsg(''), 2500);
  };
  // Körs när man trycker Återställ agendan till standard. Kräver två tryck inom tre sekunder,
  // precis som Nollställ all data. Hela Admin-fliken visas bara för Martin och Malte.
  const resetAgenda = () => {
    if (!armedAgenda) { Sound.tap(); setArmedAgenda(true); setTimeout(() => setArmedAgenda(false), 3000); return; }
    setArmedAgenda(false);
    // SPARAR TILL SUPABASE: data.agenda ersätts med standardpunkterna från DAYS. Hype och
    // incheckningar för punkter som inte längre finns tas bort ur data.hype och data.checkins.
    mut((d) => {
      d.agenda = freshAgenda();
      const ids = new Set(Object.values(d.agenda).flat().map((x) => x.id));
      Object.keys(d.hype).forEach((id) => { if (!ids.has(id)) delete d.hype[id]; });
      Object.keys(d.checkins).forEach((id) => { if (!ids.has(id)) delete d.checkins[id]; });
    });
    Sound.error();
    setAgendaMsg('Agendan är återställd till standard.');
    setTimeout(() => setAgendaMsg(''), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Reseledningen" title="Admin" />

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl')}>Avslöja lagkapten</h3>
        <p className="text-sm text-slate-400 mt-1 mb-3">Ställning och motiveringar är dolda för alla tills du avslöjar kvällen.</p>
        <ul className="flex flex-col gap-2">
          {NIGHTS.map((n) => {
            const on = !!data.revealed[n.id];
            const count = data.votes[n.id].length;
            return (
              <li key={n.id} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 py-2.5', on ? 'border-emerald-400' : 'border-slate-700')}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{n.label}</p>
                  <p className="text-xs text-slate-400 tabular-nums">
                    {count} av {BOYS.length} röster · <span className={on ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>{on ? 'Avslöjad' : 'Dold'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleReveal(n.id)}
                  aria-pressed={on}
                  className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shrink-0', on ? 'border border-slate-700 text-slate-300 hover:border-amber-400' : cx('bg-amber-400 text-slate-950', GLOW_GOLD))}
                >
                  {on ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  {on ? 'Dölj igen' : 'Avslöja'}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <FineReview data={data} mut={mut} />

      <MissionAdmin data={data} mut={mut} />

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl')}>Agenda</h3>
        <p className="text-sm text-slate-400 mt-1">
          Agendan redigeras i Agenda-fliken med knappen Redigera agenda. Här kan du kasta alla ändringar och gå tillbaka till standardagendan. Går inte att ångra.
        </p>
        <button type="button" onClick={resetAgenda} className={cx(PRESS, 'mt-3 flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold', armedAgenda ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> {armedAgenda ? 'Tryck igen för att återställa agendan' : 'Återställ agendan till standard'}
        </button>
        <p className="mt-2 min-h-5 text-sm text-emerald-400" role="status">{agendaMsg}</p>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Status och nollställning</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cx('rounded-full border px-2 py-1 font-semibold', RELEASE_MODE ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400')}>
            {RELEASE_MODE ? 'Släppt: alla åtta har åtkomst' : 'Hemligt läge: bara Reseledningen har åtkomst'}
          </span>
          <span className={cx('rounded-full border px-2 py-1 font-semibold', sync === 'live' ? 'border-emerald-400 text-emerald-400' : sync === 'offline' ? 'border-red-400 text-red-400' : sync === 'local' ? 'border-sky-400 text-sky-400' : 'border-slate-700 text-slate-400')}>
            {sync === 'live' ? 'Synkad live med molnet' : sync === 'offline' ? 'Ingen kontakt med molnet: sparas bara lokalt' : sync === 'local' ? 'Lokalt testläge: sparas bara i den här webbläsaren' : 'Ansluter till molnet'}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          Nollställer hype, incheckningar, röster, avslöjanden, uppdrag, böter, citat, Pub Golf, låttext och roulette. Gissningarna, straffläggningens topplista och agendan ligger kvar. Går inte att ångra.
        </p>
        <button type="button" onClick={wipe} className={cx(PRESS, 'mt-3 flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold', armed ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
          <Trash2 className="w-4 h-4" aria-hidden="true" /> {armed ? 'Tryck igen för att radera allt' : 'Nollställ all data'}
        </button>
        <p className="mt-2 min-h-5 text-sm text-emerald-400" role="status">{msg}</p>
      </Card>
    </div>
  );
}
