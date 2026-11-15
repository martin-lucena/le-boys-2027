// TOTALTABELLEN.
// Vad: helgens ställning. Tryck på ett namn för att se var poängen kommer ifrån. Längst ner finns
// en ruta som förklarar hur poängen räknas.
// Var: fjärde fliken i flikraden (Tabell).
// Används av: components/Shell.jsx.
// Själva uträkningen görs i lib/scoring.js. Den här filen visar bara resultatet och ändrar ingen data.

import { useState } from 'react';
import { ChevronDown, Medal } from 'lucide-react';
import { POINTS } from '../lib/config';
import { PLAYER, NIGHTS } from '../lib/constants';
import { cx } from '../utils/helpers';
import { Sound } from '../utils/sound';
import { Avatar, Card, Pop, SectionTitle, FoldHeader } from './ui';
import { pubGolfProgress } from '../lib/pubgolf';
import { computeTotals } from '../lib/scoring';

// Props: data = all delad data, user = den inloggade (får guldram),
// guesses = allas gissningar om resmålet (skickas från components/Shell.jsx, behövs för gissningspoängen).
export function StandingsTab({ data, user, guesses }) {
  // rows = en rad per person med poäng per kategori och totalt, bäst först.
  const rows = computeTotals(data, guesses);
  // open = namnet på den rad som är utfälld. rules = om rutan "Så räknas poängen" är utfälld.
  const [open, setOpen] = useState(null);
  const [rules, setRules] = useState(false);
  const max = Math.max(1, rows[0].total);
  // Sant om en person leder ensam. Då visas MVP vid namnet.
  const soleLeader = rows[0].total > 0 && rows[0].total > rows[1].total;
  // Antal kvällar som inte är avslöjade än. Deras röster räknas inte, och det förklaras under tabellen.
  const hiddenNights = NIGHTS.filter((n) => !data.revealed[n.id]).length;
  const signed = (v) => (v > 0 ? `+${v}` : `${v}`);
  // Hur långt Pub Golf-rundan har kommit. Används i texten under tabellen.
  const golf = pubGolfProgress(data.pubgolf, data.pubcourse);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Totaltabellen" title="Helgens ställning" />
      <Card>
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const isOpen = open === r.n;
            return (
              <li key={r.n} className={cx('rounded-xl bg-slate-950 border', r.n === user ? 'border-amber-400' : 'border-slate-700')}>
                <button type="button" onClick={() => { Sound.tap(); setOpen(isOpen ? null : r.n); }} aria-expanded={isOpen} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
                  <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
                  <Avatar name={r.n} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold truncate">{r.n}</span>
                      {i === 0 && soleLeader && <span className="text-[10px] font-black text-slate-950 bg-amber-400 rounded px-1.5 py-0.5">MVP</span>}
                    </span>
                    <span className="block mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <span className={cx('block h-full rounded-full transition-all duration-500', PLAYER[r.n].bg)} style={{ width: `${Math.max(0, (r.total / max) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="font-black text-2xl tabular-nums w-10 text-right">{r.total}</span>
                  <ChevronDown aria-hidden="true" className={cx('w-4 h-4 text-slate-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  // Sju poster: tre per rad på en smal telefon och fyra per rad på bredare skärmar, så
                  // att även det långa ordet "Strippklubb" får plats.
                  <Pop as="dl" className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 px-3 pb-3 text-center">
                    {[['Kapten', r.kapten], ['Uppdrag', r.uppdrag], ['Straffar', r.straffar], ['Golf', r.golf], ['Gissning', r.gissning], ['Böter', r.boter], ['Strippklubb', r.troll]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-900 border border-slate-700 py-1.5">
                        <dt className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-400">{l}</dt>
                        <dd className={cx('font-black tabular-nums', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-500')}>{signed(v)}</dd>
                      </div>
                    ))}
                  </Pop>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-slate-400 mt-3">Tryck på ett namn för att se var poängen kommer ifrån.</p>
        {hiddenNights > 0 && <p className="text-xs text-slate-400 mt-1">Lagkaptensröster räknas först när kvällen är avslöjad. {hiddenNights} av 3 kvällar är dolda.</p>}
        {!golf.complete && (
          <p className="text-xs text-slate-400 mt-1 tabular-nums">
            {data.pubgolf.test ? 'Pub Golf visar testdata och räknas inte.' : `Pub Golf räknas när rundan är klar. ${golf.played} av ${golf.total} hål är registrerade.`}
          </p>
        )}
      </Card>

      <Card>
        <FoldHeader icon={<Medal className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />} title="Så räknas poängen" open={rules} onToggle={() => setRules(!rules)} />
        {rules && (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <li className="flex justify-between gap-3"><span>Röst som lagkapten</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.vote}</span></li>
            <li className="flex justify-between gap-3"><span>Godkänt hemligt uppdrag</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.mission}</span></li>
            <li className="flex justify-between gap-3"><span>Först klar med godkänt uppdrag den dagen</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.missionFirst}</span></li>
            <li className="flex justify-between gap-3"><span>Straffläggning: plats 1, 2 och 3 i topplistan</span><span className="font-bold tabular-nums text-emerald-400">+{POINTS.penalty.join(' / +')}</span></li>
            <li className="flex justify-between gap-3"><span>Pub Golf: plats 1, 2, 3 och 4, till varje spelare i laget när rundan är klar</span><span className="font-bold tabular-nums text-emerald-400 shrink-0">+{POINTS.pubgolf.join(' / +')}</span></li>
            <li className="flex justify-between gap-3"><span>Rätt gissad stad i Vart ska vi?, räknas när resmålet är avslöjat</span><span className="font-bold tabular-nums text-emerald-400 shrink-0">+{POINTS.guess}</span></li>
            <li className="flex justify-between gap-3"><span>Godkänd bot i Bötesrummet</span><span className="font-bold tabular-nums text-red-400">{POINTS.fine}</span></li>
            {/* Skämtsidan i Mer-menyn: minuspoäng en gång per person, första gången sidan öppnas. */}
            <li className="flex justify-between gap-3"><span>Öppnat sidan Strippklubbar (en gång per person)</span><span className="font-bold tabular-nums text-red-400 shrink-0">{POINTS.troll}</span></li>
          </ul>
        )}
      </Card>
    </div>
  );
}
