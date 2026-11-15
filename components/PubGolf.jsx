// PUB GOLF-FLIKEN.
// Vad: live-ställning mellan lagen, scorekort, formulär för att registrera ett hål, banan och reglerna.
// Var: under Mer-menyn.
// Används av: components/Shell.jsx.
// Reglerna och uträkningarna ligger i lib/pubgolf.js. Lagen lottas i rouletten (components/Roulette.jsx).

import { useEffect, useState } from 'react';
import { Dices, Target, Medal, Flag, Beer, Minus, Plus, ClipboardList } from 'lucide-react';
import { POINTS } from '../lib/config';
import { BOYS, isAdmin } from '../lib/constants';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { freshPubGolf } from '../utils/storage';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, SectionTitle, FoldHeader } from './ui';
import { PUB_TEAM_SIZE, PUB_HOLES, pubTeams, holeNet, relLabel, golfName, teamStats, pubGolfPoints, pubGolfTestData } from '../lib/pubgolf';

// Props: data = delad data (här används data.pubgolf), mut = funktionen som ändrar data,
// user = den inloggade, goTab = byter flik (till rouletten).
export function PubGolfTab({ data, mut, user, goTab }) {
  const pg = data.pubgolf;
  const teams = pubTeams(pg.draw);
  const drawn = pg.draw.length;
  const ready = drawn >= BOYS.length;
  // myTeam = numret på mitt lag (lag 0 om jag inte är lottad än).
  const myTeam = Math.max(0, teams.findIndex((t) => t.members.includes(user)));
  // Första hålet som ett lag inte har registrerat än.
  const firstOpen = (idx) => { const i = PUB_HOLES.findIndex((_, h) => !(pg.scores[idx] && pg.scores[idx][h])); return i < 0 ? 0 : i; };

  // Formuläret "Registrera hål": team och hole = valt lag och hål, sips = klunkar,
  // side = sidouppdraget klarat, penalty = antal straff.
  // course och rules = om rutorna Banan och Regler är utfällda. flash = kvittot som visas efter sparning.
  const [team, setTeam] = useState(myTeam);
  const [hole, setHole] = useState(() => firstOpen(myTeam));
  const [sips, setSips] = useState(PUB_HOLES[0].par);
  const [side, setSide] = useState(false);
  const [penalty, setPenalty] = useState(0);
  const [course, setCourse] = useState(true);
  const [rules, setRules] = useState(false);
  const [flash, setFlash] = useState('');

  // Fyll i formuläret från sparat resultat när man byter lag eller hål, annars från hålets par.
  useEffect(() => {
    const saved = pg.scores[team] && pg.scores[team][hole];
    setSips(saved ? saved.sips : PUB_HOLES[hole].par);
    setSide(saved ? !!saved.side : false);
    setPenalty(saved ? saved.penalty || 0 : 0);
  }, [team, hole]);

  // stats = varje lag med sina siffror. board = samma lag sorterade för ställningen: lag som har
  // spelat först, sedan bäst resultat mot par, flest spelade hål, flest sidouppdrag.
  const stats = teams.map((t) => ({ ...t, ...teamStats(pg.scores, t.idx) }));
  const board = stats.slice().sort((a, b) => (b.played > 0) - (a.played > 0) || a.rel - b.rel || b.played - a.played || b.sides - a.sides || a.idx - b.idx);
  const anyPlayed = stats.some((t) => t.played > 0);
  // Poäng till totaltabellen per namn. Tom tills hela rundan är klar.
  const golfPoints = pubGolfPoints(pg);
  const saved = pg.scores[team] && pg.scores[team][hole];
  const h = PUB_HOLES[hole];
  // Hålets slag enligt det som står i formuläret: klunkar plus straff, minus ett om sidouppdraget klarades.
  const net = sips + penalty - (side ? 1 : 0);

  // Körs när man trycker Registrera hålet eller Uppdatera hålet.
  const save = (e) => {
    e.preventDefault();
    const entry = { sips, side, penalty, by: user, ts: Date.now() };
    // SPARAR TILL SUPABASE: data.pubgolf.scores, resultatet för valt lag och hål. Skriver över om hålet
    // redan var registrerat.
    mut((d) => { if (!d.pubgolf.scores[team]) d.pubgolf.scores[team] = {}; d.pubgolf.scores[team][hole] = entry; });
    const rel = net - h.par;
    if (rel < 0) { Sound.fanfare(); Confetti.burst(160); } else Sound.pop(10);
    setFlash(`${teams[team].name}, hål ${hole + 1}: ${net} slag (${golfName(rel)}).`);
    setTimeout(() => setFlash(''), 3500);
    // Hoppa vidare till lagets nästa oregistrerade hål, om det finns något.
    const nextOpen = PUB_HOLES.findIndex((_, i) => i !== hole && !(pg.scores[team] && pg.scores[team][i]));
    if (nextOpen >= 0) setHole(nextOpen);
  };
  // De här tre körs från adminknapparna (som bara Martin och Malte ser). Alla tre SPARAR TILL SUPABASE i data.pubgolf:
  // clearHole tar bort resultatet för valt lag och hål, loadTest ersätter allt med testdata,
  // clearAll tömmer både lag och resultat.
  const clearHole = () => { Sound.tap(); mut((d) => { if (d.pubgolf.scores[team]) delete d.pubgolf.scores[team][hole]; }); };
  const loadTest = () => { Sound.pop(8); mut((d) => { d.pubgolf = pubGolfTestData(); }); };
  const clearAll = () => { Sound.tap(); mut((d) => { d.pubgolf = freshPubGolf(); }); };
  const step = 'w-11 h-11 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-slate-100 hover:border-amber-400 disabled:opacity-40';

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        kicker="Pub Golf"
        title="Lägst antal klunkar vinner"
        right={pg.test ? <span className="text-[11px] uppercase tracking-wider text-amber-400 border border-amber-400 rounded-full px-2 py-1 shrink-0">Testdata</span> : null}
      />

      {/* 1. Lagen och live-ställning */}
      <Card className={anyPlayed ? GLOW_GOLD : ''}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className={cx(DISPLAY, 'text-xl')}>Live-ställning</h3>
          <span className="text-xs text-slate-400 tabular-nums">Banans par: {PUB_HOLES.reduce((s, x) => s + x.par, 0)}</span>
        </div>
        {drawn === 0 ? (
          <div className="rounded-xl bg-slate-950 border border-dashed border-amber-400 p-4 text-center">
            <p className="font-semibold">Inga lag är lottade än</p>
            <p className="text-sm text-slate-400 mt-1">Lagen dras i Lag-Rouletten i läget Pub Golf-lag.</p>
            <button type="button" onClick={() => goTab('roulette')} className={cx(PRESS, 'mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-bold px-5 py-2.5')}>
              <Dices className="w-4 h-4" aria-hidden="true" /> Till rouletten
            </button>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {board.map((t, i) => (
              <li key={t.name} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 py-2.5', t.members.includes(user) ? 'border-amber-400' : 'border-slate-700')}>
                <span className="font-black text-xl w-5 tabular-nums text-amber-400">{t.played ? i + 1 : '–'}</span>
                <span className={cx('w-1.5 self-stretch rounded-full', t.bg)} />
                <div className="flex-1 min-w-0">
                  <p className={cx('font-bold', t.text)}>{t.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300 mt-1">
                    {t.members.map((n) => <span key={n} className="inline-flex items-center gap-1"><Avatar name={n} size="sm" />{n}</span>)}
                    {t.members.length < PUB_TEAM_SIZE && <span className="text-slate-500">Väntar på lottning</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cx('font-black text-2xl leading-none tabular-nums', !t.played ? 'text-slate-600' : t.rel < 0 ? 'text-emerald-400' : t.rel > 0 ? 'text-red-400' : 'text-slate-100')}>{t.played ? relLabel(t.rel) : '–'}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums mt-1">{t.strokes} slag · {t.played}/{PUB_HOLES.length} hål</p>
                  {golfPoints[t.members[0]] !== undefined && <p className="text-[11px] font-bold text-amber-400 tabular-nums">+{golfPoints[t.members[0]]} p i totalen</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {drawn > 0 && !ready && <p className="text-xs text-amber-400 mt-3">Lottningen pågår: {drawn} av {BOYS.length} är dragna.</p>}

        {drawn > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs tabular-nums text-center border-separate border-spacing-y-1">
              <caption className="sr-only">Scorekort per lag och hål</caption>
              <thead>
                <tr className="text-slate-400">
                  <th scope="col" className="text-left font-semibold pr-2">Hål</th>
                  {PUB_HOLES.map((_, i) => <th key={i} scope="col" className="font-semibold w-7">{i + 1}</th>)}
                  <th scope="col" className="font-semibold pl-2">Tot</th>
                </tr>
                <tr className="text-slate-500">
                  <th scope="row" className="text-left font-normal pr-2">Par</th>
                  {PUB_HOLES.map((x, i) => <td key={i}>{x.par}</td>)}
                  <td className="pl-2">{PUB_HOLES.reduce((s, x) => s + x.par, 0)}</td>
                </tr>
              </thead>
              <tbody>
                {stats.map((t) => (
                  <tr key={t.name}>
                    <th scope="row" className={cx('text-left font-bold pr-2 whitespace-nowrap', t.text)}>{t.name.replace('Lag ', '')}</th>
                    {PUB_HOLES.map((x, i) => {
                      const s = pg.scores[t.idx] && pg.scores[t.idx][i];
                      const v = s ? holeNet(s) : null;
                      return <td key={i} className={cx('font-bold', v === null ? 'text-slate-700' : v < x.par ? 'text-emerald-400' : v > x.par ? 'text-red-400' : 'text-slate-100')}>{v === null ? '·' : v}</td>;
                    })}
                    <td className="pl-2 font-black">{t.played ? t.strokes : '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ADMIN-KONTROLL: knapparna för testdata och rensning visas bara för Martin och Malte. */}
        {isAdmin(user) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-700 text-xs">
            <span className="text-slate-400">Admin:</span>
            <button type="button" onClick={loadTest} className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-amber-400">Ladda testdata</button>
            {(drawn > 0 || anyPlayed) && <button type="button" onClick={clearAll} className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-red-400 hover:text-red-400">Rensa lag och poäng</button>}
          </div>
        )}
      </Card>

      {/* 4. Scorekort (ligger högt upp eftersom det används mest under rundan) */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h3 className={cx(DISPLAY, 'text-xl')}>Registrera hål</h3>
        </div>
        {drawn === 0 ? (
          <p className="text-sm text-slate-400">Scorekortet öppnas när lagen är lottade.</p>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div>
              <p id="pg-team" className="text-xs font-semibold text-slate-400 mb-1.5">Lag</p>
              <div role="radiogroup" aria-labelledby="pg-team" className="grid grid-cols-2 gap-2">
                {teams.map((t) => (
                  <button key={t.name} type="button" role="radio" aria-checked={team === t.idx} onClick={() => { Sound.tap(); setTeam(t.idx); setHole(firstOpen(t.idx)); }}
                    className={cx(PRESS, 'rounded-xl border px-3 py-2 text-left', team === t.idx ? cx(t.border, 'bg-slate-800') : 'border-slate-700 bg-slate-950')}>
                    <span className={cx('block font-bold text-sm', t.text)}>{t.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{t.members.join(' och ') || 'Inte lottat'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p id="pg-hole" className="text-xs font-semibold text-slate-400 mb-1.5">Hål</p>
              <div role="radiogroup" aria-labelledby="pg-hole" className="grid grid-cols-9 gap-1">
                {PUB_HOLES.map((_, i) => {
                  const done = !!(pg.scores[team] && pg.scores[team][i]);
                  return (
                    <button key={i} type="button" role="radio" aria-checked={hole === i} aria-label={`Hål ${i + 1}${done ? ', registrerat' : ''}`} onClick={() => { Sound.tap(); setHole(i); }}
                      className={cx('h-10 rounded-lg border font-black tabular-nums transition', hole === i ? 'bg-amber-400 text-slate-950 border-amber-400' : done ? 'border-emerald-400 text-emerald-400 bg-slate-950' : 'border-slate-700 text-slate-300 bg-slate-950')}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm mt-2"><span className="font-semibold">{h.pub}</span> <span className="text-slate-400">· {h.drink} · Par {h.par}</span></p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span id="pg-sips" className="text-sm font-semibold">Klunkar</span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="pg-sips">
                <button type="button" onClick={() => { Sound.tap(); setSips(Math.max(1, sips - 1)); }} disabled={sips <= 1} aria-label="Färre klunkar" className={step}><Minus className="w-4 h-4" aria-hidden="true" /></button>
                <span className="font-black text-4xl tabular-nums w-12 text-center text-amber-400" aria-live="polite">{sips}</span>
                <button type="button" onClick={() => { Sound.tap(); setSips(Math.min(20, sips + 1)); }} disabled={sips >= 20} aria-label="Fler klunkar" className={step}><Plus className="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>

            <label htmlFor="pg-side" className={cx('flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer', side ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700 bg-slate-950')}>
              <input id="pg-side" type="checkbox" checked={side} onChange={(e) => setSide(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-400 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Sidouppdraget klarat <span className="text-emerald-400">−1 slag</span></span>
                <span className="block text-xs text-slate-400 mt-0.5">{h.side}</span>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3">
              <span id="pg-pen" className="text-sm font-semibold">Straff <span className="text-red-400">+1 slag styck</span><span className="block text-xs font-normal text-slate-400">Spill, fusk eller hjälp utifrån</span></span>
              <div className="flex items-center gap-3" role="group" aria-labelledby="pg-pen">
                <button type="button" onClick={() => { Sound.tap(); setPenalty(Math.max(0, penalty - 1)); }} disabled={penalty <= 0} aria-label="Färre straff" className={step}><Minus className="w-4 h-4" aria-hidden="true" /></button>
                <span className={cx('font-black text-2xl tabular-nums w-8 text-center', penalty ? 'text-red-400' : 'text-slate-500')} aria-live="polite">{penalty}</span>
                <button type="button" onClick={() => { Sound.tap(); setPenalty(Math.min(5, penalty + 1)); }} disabled={penalty >= 5} aria-label="Fler straff" className={step}><Plus className="w-4 h-4" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5">
              <p className="text-sm">Hålets resultat: <span className="font-black tabular-nums">{net} slag</span> <span className={cx('font-semibold', net < h.par ? 'text-emerald-400' : net > h.par ? 'text-red-400' : 'text-slate-300')}>({golfName(net - h.par)}, {relLabel(net - h.par)})</span></p>
              {/* ADMIN-KONTROLL: bara Martin och Malte kan rensa ett registrerat hål. */}
              {saved && isAdmin(user) && <button type="button" onClick={clearHole} className="text-xs text-slate-400 hover:text-red-400 underline shrink-0">Rensa hålet</button>}
            </div>
            <button type="submit" className={cx(PRESS, 'w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-black uppercase py-3', GLOW_GOLD)}>
              <Flag className="w-5 h-5" aria-hidden="true" /> {saved ? 'Uppdatera hålet' : 'Registrera hålet'}
            </button>
            <p className="text-sm text-emerald-400 min-h-5" role="status">{flash || (saved ? `Senast registrerat av ${saved.by}.` : '')}</p>
          </form>
        )}
      </Card>

      {/* 2. Banan */}
      <Card>
        <FoldHeader icon={<Flag className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />} title="Banan" note={`${PUB_HOLES.length} hål · exempelpubar`} open={course} onToggle={() => setCourse(!course)} />
        {course && (
          <ol className="flex flex-col gap-2 mt-3">
            {PUB_HOLES.map((x, i) => (
              <li key={x.pub} className="flex gap-3 rounded-xl bg-slate-950 border border-slate-700 p-3">
                <div className="flex flex-col items-center shrink-0 w-10">
                  <span className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 font-black text-lg flex items-center justify-center tabular-nums">{i + 1}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Par {x.par}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{x.pub}</p>
                  <p className="flex items-center gap-1.5 text-sm text-amber-400 mt-1"><Beer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {x.drink} · {x.par} {x.par === 1 ? 'klunk' : 'klunkar'}</p>
                  <p className="flex items-start gap-1.5 text-sm text-slate-300 mt-1"><Target className="w-3.5 h-3.5 shrink-0 mt-1 text-slate-400" aria-hidden="true" /> {x.side}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* 3. Poängsystem och regler */}
      <Card>
        <FoldHeader icon={<Medal className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />} title="Regler och poäng" open={rules} onToggle={() => setRules(!rules)} />
        {rules && (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><span className="font-semibold">Som vanlig golf:</span> lägst antal slag efter nio hål vinner.</li>
            <li><span className="font-semibold">Slag:</span> antalet klunkar som den långsammaste i laget behöver för att tömma hålets dryck.</li>
            <li><span className="font-semibold">Par:</span> målet för hålet. Under par är birdie eller eagle, över par är bogey.</li>
            <li><span className="font-semibold text-emerald-400">Sidouppdrag: −1 slag.</span> Varje pub har ett uppdrag. Klarar hela laget det dras ett slag av.</li>
            <li><span className="font-semibold text-red-400">Straff: +1 slag styck.</span> Spill, fusk, hjälp från ett annat lag eller att lämna kvar i glaset.</li>
            <li><span className="font-semibold">Vattenhindret:</span> hål 5 dricks i vatten. Det är obligatoriskt.</li>
            <li><span className="font-semibold">Alkoholfritt:</span> räknas precis som originalet, utan straff.</li>
            <li><span className="font-semibold">Vid lika:</span> flest spelade hål vinner, därefter flest klarade sidouppdrag.</li>
            <li><span className="font-semibold text-amber-400">Totaltabellen:</span> när alla lag har spelat alla hål får varje spelare {POINTS.pubgolf.join(', ')} poäng för plats 1 till {POINTS.pubgolf.length}. Lag på samma antal slag delar placering.</li>
          </ul>
        )}
      </Card>
    </div>
  );
}
