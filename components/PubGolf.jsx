// PUB GOLF-FLIKEN.
// Vad: live-ställning mellan lagen, scorekort, formulär för att registrera ett hål, banan och reglerna.
// Var: under Mer-menyn.
// Används av: components/Shell.jsx.
// Reglerna och uträkningarna ligger i lib/pubgolf.js. Lagen lottas i rouletten (components/Roulette.jsx).

import { useEffect, useState } from 'react';
import { Dices, Target, Medal, Flag, Beer, Minus, Plus, ClipboardList, Pencil, Trash2, ArrowUp, ArrowDown, TriangleAlert } from 'lucide-react';
import { POINTS } from '../lib/config';
import { BOYS, isAdmin } from '../lib/constants';
import { cx, uid } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { freshPubGolf } from '../utils/storage';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, Pop, SectionTitle, FoldHeader } from './ui';
import { PUB_TEAM_SIZE, PUB_MIN_HOLES, PUB_MAX_HOLES, PUB_MIN_PAR, PUB_MAX_PAR, clampPar, pubTeams, holeNet, relLabel, golfName, teamStats, pubGolfPoints, pubGolfTestData, coursePar, isDefaultCourse } from '../lib/pubgolf';

// HoleEditor: rutan där en admin fyller i ett hål. Öppnas av Ändra och Lägg till hål i
// redigeringsläget för banan.
// Props: form = hålets värden när rutan öppnas (id är null för ett nytt hål),
// number = hålets nummer på banan (visas överst),
// onSave = körs med de ifyllda värdena när man trycker Spara, onCancel = körs vid Avbryt.
function HoleEditor({ form, number, onSave, onCancel }) {
  // f = det som står i fälten just nu. Startar med hålets nuvarande värden.
  const [f, setF] = useState(form);
  // Ger en funktion som uppdaterar ett av textfälten när man skriver i det.
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });
  // Pub och dryck är obligatoriska. Sidouppdraget får vara tomt.
  const ok = f.pub.trim().length > 0 && f.drink.trim().length > 0;
  // Körs när man trycker Spara (eller Enter i ett fält).
  const submit = (e) => {
    e.preventDefault();
    if (ok) onSave(f);
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';
  const label = 'block text-xs font-semibold text-slate-400 mb-1';
  const step = 'w-11 h-11 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-slate-100 hover:border-amber-400 disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <Pop
        role="dialog"
        aria-modal="true"
        aria-label={form.id ? 'Ändra hål' : 'Nytt hål'}
        className={cx('w-full max-w-sm max-h-full overflow-y-auto rounded-3xl bg-slate-900 border border-amber-400 p-5', GLOW_GOLD)}
      >
        <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-semibold">Hål {number}</p>
        <h3 className={cx(DISPLAY, 'text-2xl mt-1')}>{form.id ? 'Ändra hål' : 'Nytt hål'}</h3>
        <form onSubmit={submit} className="flex flex-col gap-3 mt-4">
          <div>
            <label htmlFor="hole-pub" className={label}>Pub <span className="text-amber-400">Obligatoriskt</span></label>
            <input id="hole-pub" value={f.pub} onChange={set('pub')} maxLength={40} className={field} />
          </div>
          <div>
            <label htmlFor="hole-drink" className={label}>Dryck <span className="text-amber-400">Obligatoriskt</span></label>
            <input id="hole-drink" value={f.drink} onChange={set('drink')} maxLength={40} className={field} />
          </div>
          {/* Par väljs med minus och plus, och kan bara vara 1 till 6. */}
          <div className="flex items-center justify-between gap-3">
            <span id="hole-par" className="text-xs font-semibold text-slate-400">Par ({PUB_MIN_PAR}–{PUB_MAX_PAR})</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="hole-par">
              <button type="button" onClick={() => { Sound.tap(); setF({ ...f, par: clampPar(f.par - 1) }); }} disabled={f.par <= PUB_MIN_PAR} aria-label="Lägre par" className={step}><Minus className="w-4 h-4" aria-hidden="true" /></button>
              <span className="font-black text-3xl tabular-nums w-8 text-center text-amber-400" aria-live="polite">{f.par}</span>
              <button type="button" onClick={() => { Sound.tap(); setF({ ...f, par: clampPar(f.par + 1) }); }} disabled={f.par >= PUB_MAX_PAR} aria-label="Högre par" className={step}><Plus className="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </div>
          <div>
            <label htmlFor="hole-side" className={label}>Sidouppdrag</label>
            <textarea id="hole-side" rows={3} value={f.side} onChange={set('side')} maxLength={160} className={cx(field, 'resize-none')} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-100 px-2">Avbryt</button>
            <button type="submit" disabled={!ok} className={cx(PRESS, 'rounded-xl px-5 py-3 font-bold', ok ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              Spara
            </button>
          </div>
          {!ok && <p className="text-xs text-slate-400 text-right">Fyll i pub och dryck.</p>}
        </form>
      </Pop>
    </div>
  );
}

// Props: data = delad data (här används data.pubgolf och data.pubcourse), mut = funktionen som
// ändrar data, user = den inloggade, goTab = byter flik (till rouletten).
export function PubGolfTab({ data, mut, user, goTab }) {
  const pg = data.pubgolf;
  // holes = banan från den delade datan: en lista med hål i spelordning. Varje hål har ett fast id,
  // och resultaten i pg.scores sparas per lag och hål-id (pg.scores[lag][hål-id]).
  // Banan har alltid minst ett hål (se normalizeCourse i lib/pubgolf.js).
  const holes = data.pubcourse;
  const teams = pubTeams(pg.draw);
  const drawn = pg.draw.length;
  const ready = drawn >= BOYS.length;
  // myTeam = numret på mitt lag (lag 0 om jag inte är lottad än).
  const myTeam = Math.max(0, teams.findIndex((t) => t.members.includes(user)));
  // Resultatet som ett lag har registrerat på ett hål, eller undefined om hålet inte är spelat.
  const scoreOf = (idx, holeId) => pg.scores[idx] && pg.scores[idx][holeId];
  // Id för första hålet som ett lag inte har registrerat än (banans första hål om alla är klara).
  const firstOpen = (idx) => (holes.find((x) => !scoreOf(idx, x.id)) || holes[0]).id;

  // Formuläret "Registrera hål": team = valt lag, holeId = id för valt hål, sips = klunkar,
  // side = sidouppdraget klarat, penalty = antal straff.
  // course och rules = om rutorna Banan och Regler är utfällda. flash = kvittot som visas efter sparning.
  const [team, setTeam] = useState(myTeam);
  const [holeId, setHoleId] = useState(() => firstOpen(myTeam));
  const [sips, setSips] = useState(holes[0].par);
  const [side, setSide] = useState(false);
  const [penalty, setPenalty] = useState(0);
  const [course, setCourse] = useState(true);
  const [rules, setRules] = useState(false);
  const [flash, setFlash] = useState('');

  // hole = det valda hålets plats på banan (0 = hål 1), h = själva hålet. Valet sparas som id och
  // inte som nummer, så att samma hål förblir valt om en admin flyttar det medan formuläret är
  // öppet. Har hålet tagits bort väljs banans första hål.
  const hole = Math.max(0, holes.findIndex((x) => x.id === holeId));
  const h = holes[hole];

  // Fyll i formuläret från sparat resultat när man byter lag eller hål, annars från hålets par.
  useEffect(() => {
    const saved = scoreOf(team, h.id);
    setSips(saved ? saved.sips : h.par);
    setSide(saved ? !!saved.side : false);
    setPenalty(saved ? saved.penalty || 0 : 0);
  }, [team, h.id]);

  // stats = varje lag med sina siffror. board = samma lag sorterade för ställningen: lag som har
  // spelat först, sedan bäst resultat mot par, flest spelade hål, flest sidouppdrag.
  const stats = teams.map((t) => ({ ...t, ...teamStats(pg.scores, t.idx, holes) }));
  const board = stats.slice().sort((a, b) => (b.played > 0) - (a.played > 0) || a.rel - b.rel || b.played - a.played || b.sides - a.sides || a.idx - b.idx);
  const anyPlayed = stats.some((t) => t.played > 0);
  // Poäng till totaltabellen per namn. Tom tills hela rundan är klar.
  const golfPoints = pubGolfPoints(pg, holes);
  const saved = scoreOf(team, h.id);
  // Banans par: summan av alla håls par.
  const totalPar = coursePar(holes);
  // Hålets slag enligt det som står i formuläret: klunkar plus straff, minus ett om sidouppdraget klarades.
  const net = sips + penalty - (side ? 1 : 0);

  // Körs när man trycker Registrera hålet eller Uppdatera hålet.
  const save = (e) => {
    e.preventDefault();
    const entry = { sips, side, penalty, by: user, ts: Date.now() };
    const id = h.id;
    // SPARAR TILL SUPABASE: data.pubgolf.scores, resultatet för valt lag och hål (sparas under hålets
    // id). Skriver över om hålet redan var registrerat. Har en admin hunnit ta bort hålet från
    // banan under tiden sparas ingenting.
    mut((d) => {
      if (!d.pubcourse.some((x) => x.id === id)) return;
      if (!d.pubgolf.scores[team]) d.pubgolf.scores[team] = {};
      d.pubgolf.scores[team][id] = entry;
    });
    const rel = net - h.par;
    if (rel < 0) { Sound.fanfare(); Confetti.burst(160); } else Sound.pop(10);
    setFlash(`${teams[team].name}, hål ${hole + 1}: ${net} slag (${golfName(rel)}).`);
    setTimeout(() => setFlash(''), 3500);
    // Hoppa vidare till lagets nästa oregistrerade hål, om det finns något.
    const nextOpen = holes.find((x) => x.id !== id && !scoreOf(team, x.id));
    if (nextOpen) setHoleId(nextOpen.id);
  };
  // De här tre körs från adminknapparna (som bara Martin och Malte ser). Alla tre SPARAR TILL SUPABASE i data.pubgolf:
  // clearHole tar bort resultatet för valt lag och hål, loadTest ersätter allt med testdata
  // (anpassad efter banan som den ser ut just nu), clearAll tömmer både lag och resultat.
  // Ingen av dem ändrar banan (data.pubcourse).
  const clearHole = () => { const id = h.id; Sound.tap(); mut((d) => { if (d.pubgolf.scores[team]) delete d.pubgolf.scores[team][id]; }); };
  const loadTest = () => { Sound.pop(8); mut((d) => { d.pubgolf = pubGolfTestData(d.pubcourse); }); };
  const clearAll = () => { Sound.tap(); mut((d) => { d.pubgolf = freshPubGolf(); }); };

  /* ----- Redigera banan (bara admins) ----- */
  // ADMIN-KONTROLL: bara Martin och Malte får redigera banan.
  const canEdit = isAdmin(user);
  // editing = är redigeringsläget påslaget? Det visar knapparna för att flytta, ändra, ta bort
  // och lägga till hål.
  const [editing, setEditing] = useState(false);
  // form = hålet som just nu redigeras i rutan (null = rutan är stängd).
  const [form, setForm] = useState(null);
  // confirmId = id för det hål där Ta bort är tryckt och som väntar på bekräftelse (null = inget).
  const [confirmId, setConfirmId] = useState(null);
  // Hur många lag som har ett registrerat resultat på ett hål. Används i varningen vid borttagning.
  const resultsOn = (id) => teams.filter((t) => scoreOf(t.idx, id)).length;

  // Körs när man trycker Lägg till hål: öppnar rutan med tomma fält.
  const startAdd = () => {
    Sound.tap();
    setConfirmId(null);
    setForm({ id: null, pub: '', drink: '', par: 3, side: '' });
  };
  // Körs när man trycker Ändra på ett hål: öppnar rutan med hålets nuvarande värden.
  const startEdit = (x) => {
    Sound.tap();
    setConfirmId(null);
    setForm({ id: x.id, pub: x.pub, drink: x.drink, par: x.par, side: x.side });
  };
  // Körs när man trycker Spara i rutan. f = det som står i fälten.
  const saveHole = (f) => {
    if (!canEdit) return; // admin-kontroll en gång till, innan något sparas
    const fields = { pub: f.pub.trim(), drink: f.drink.trim(), par: clampPar(f.par), side: f.side.trim() };
    // Ett nytt hål får ett nytt unikt id. Det skapas här, utanför mut, så att hålet får samma id
    // även om synken behöver köra ändringen en gång till.
    const id = f.id || uid();
    // SPARAR TILL SUPABASE: data.pubcourse. Ett befintligt hål uppdateras på sin plats (resultaten
    // rörs inte), ett nytt läggs sist på banan om den inte redan har 18 hål.
    mut((d) => {
      const x = d.pubcourse.find((o) => o.id === id);
      if (x) Object.assign(x, fields);
      else if (!f.id && d.pubcourse.length < PUB_MAX_HOLES) d.pubcourse.push({ id, ...fields });
      // Annars: hålet har tagits bort av någon annan under tiden, eller banan är full. Gör ingenting.
    });
    Sound.pop(10);
    setForm(null);
  };
  // Körs när man trycker på pil upp (dir = -1) eller pil ner (dir = 1) på ett hål.
  const moveHole = (id, dir) => {
    if (!canEdit) return; // admin-kontroll en gång till, innan något sparas
    Sound.tap();
    setConfirmId(null);
    // SPARAR TILL SUPABASE: data.pubcourse. Hålet byter plats med grannen ovanför eller nedanför.
    // Resultaten behöver inte flyttas: de är sparade under hålets id och följer därför med hålet
    // till dess nya nummer av sig själva.
    mut((d) => {
      const i = d.pubcourse.findIndex((o) => o.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.pubcourse.length) return;
      const tmp = d.pubcourse[i];
      d.pubcourse[i] = d.pubcourse[j];
      d.pubcourse[j] = tmp;
    });
  };
  // Körs när man trycker Ta bort på ett hål: visar bekräftelsen under hålet, med en varning om
  // hålet har registrerade resultat. Ingenting tas bort än.
  const askRemove = (id) => { Sound.tap(); setConfirmId(id); };
  // Körs när man bekräftar borttagningen i rutan under hålet.
  const removeHole = (id) => {
    if (!canEdit) return; // admin-kontroll en gång till, innan något tas bort
    Sound.tap();
    setConfirmId(null);
    // SPARAR TILL SUPABASE: hålet tas bort ur data.pubcourse, och alla lags resultat på hålet tas
    // bort ur data.pubgolf.scores så att inget skräp blir kvar. Banans sista hål går inte att ta bort.
    mut((d) => {
      if (d.pubcourse.length <= PUB_MIN_HOLES || !d.pubcourse.some((o) => o.id === id)) return;
      d.pubcourse = d.pubcourse.filter((o) => o.id !== id);
      Object.values(d.pubgolf.scores).forEach((card) => { if (card) delete card[id]; });
    });
  };
  const tool = 'w-9 h-9 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-300 hover:border-amber-400 disabled:opacity-40';
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
          <span className="text-xs text-slate-400 tabular-nums">Banans par: {totalPar}</span>
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
                  <p className="text-[11px] text-slate-400 tabular-nums mt-1">{t.strokes} slag · {t.played}/{holes.length} hål</p>
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
                  {holes.map((x, i) => <th key={x.id} scope="col" className="font-semibold w-7">{i + 1}</th>)}
                  <th scope="col" className="font-semibold pl-2">Tot</th>
                </tr>
                <tr className="text-slate-500">
                  <th scope="row" className="text-left font-normal pr-2">Par</th>
                  {holes.map((x) => <td key={x.id}>{x.par}</td>)}
                  <td className="pl-2">{totalPar}</td>
                </tr>
              </thead>
              <tbody>
                {stats.map((t) => (
                  <tr key={t.name}>
                    <th scope="row" className={cx('text-left font-bold pr-2 whitespace-nowrap', t.text)}>{t.name.replace('Lag ', '')}</th>
                    {holes.map((x) => {
                      const s = scoreOf(t.idx, x.id);
                      const v = s ? holeNet(s) : null;
                      return <td key={x.id} className={cx('font-bold', v === null ? 'text-slate-700' : v < x.par ? 'text-emerald-400' : v > x.par ? 'text-red-400' : 'text-slate-100')}>{v === null ? '·' : v}</td>;
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
                  <button key={t.name} type="button" role="radio" aria-checked={team === t.idx} onClick={() => { Sound.tap(); setTeam(t.idx); setHoleId(firstOpen(t.idx)); }}
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
                {holes.map((x, i) => {
                  const done = !!scoreOf(team, x.id);
                  return (
                    <button key={x.id} type="button" role="radio" aria-checked={hole === i} aria-label={`Hål ${i + 1}${done ? ', registrerat' : ''}`} onClick={() => { Sound.tap(); setHoleId(x.id); }}
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
        <FoldHeader icon={<Flag className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />} title="Banan" note={`${holes.length} hål${isDefaultCourse(holes) ? ' · exempelpubar' : ''}`} open={course} onToggle={() => setCourse(!course)} />
        {/* ADMIN-KONTROLL: knappen som slår på och av redigeringsläget visas bara för Martin och Malte. */}
        {course && canEdit && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => { Sound.tap(); setEditing(!editing); setConfirmId(null); }}
              aria-pressed={editing}
              className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shrink-0', editing ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-slate-700 text-slate-100 hover:border-amber-400')}
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {editing ? 'Sluta redigera' : 'Redigera banan'}
            </button>
          </div>
        )}
        {course && (
          <ol className="flex flex-col gap-2 mt-3">
            {holes.map((x, i) => {
              // n = antal lag som har ett resultat på hålet. Avgör om varningen ska visas vid borttagning.
              const n = resultsOn(x.id);
              return (
                <li key={x.id} className="rounded-xl bg-slate-950 border border-slate-700 p-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 w-10">
                      <span className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 font-black text-lg flex items-center justify-center tabular-nums">{i + 1}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Par {x.par}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight">{x.pub}</p>
                      <p className="flex items-center gap-1.5 text-sm text-amber-400 mt-1"><Beer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {x.drink} · {x.par} {x.par === 1 ? 'klunk' : 'klunkar'}</p>
                      {/* Ett hål kan sakna sidouppdrag om en admin har lämnat fältet tomt. */}
                      {x.side && <p className="flex items-start gap-1.5 text-sm text-slate-300 mt-1"><Target className="w-3.5 h-3.5 shrink-0 mt-1 text-slate-400" aria-hidden="true" /> {x.side}</p>}
                    </div>
                  </div>
                  {/* ADMIN-KONTROLL: verktygen för att flytta, ändra och ta bort hålet visas bara för
                      Martin och Malte, och bara i redigeringsläget. */}
                  {canEdit && editing && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-700">
                      <button type="button" onClick={() => moveHole(x.id, -1)} disabled={i === 0} aria-label={`Flytta hål ${i + 1} uppåt`} className={tool}><ArrowUp className="w-4 h-4" aria-hidden="true" /></button>
                      <button type="button" onClick={() => moveHole(x.id, 1)} disabled={i === holes.length - 1} aria-label={`Flytta hål ${i + 1} nedåt`} className={tool}><ArrowDown className="w-4 h-4" aria-hidden="true" /></button>
                      <button type="button" onClick={() => startEdit(x)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 h-9 text-xs font-bold text-slate-100 hover:border-amber-400">
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Ändra
                      </button>
                      <button type="button" onClick={() => askRemove(x.id)} disabled={holes.length <= PUB_MIN_HOLES} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 h-9 text-xs font-bold text-slate-300 hover:border-red-400 hover:text-red-400 disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Ta bort
                      </button>
                    </div>
                  )}
                  {/* Bekräftelsen för Ta bort. Har hålet registrerade resultat visas en varning om
                      att de försvinner. Hålet tas bort först när man trycker på den röda knappen. */}
                  {canEdit && editing && confirmId === x.id && (
                    <div role="alert" className="mt-3 rounded-xl border border-red-400 bg-red-400/10 p-3">
                      {n > 0 ? (
                        <p className="flex items-start gap-2 text-sm text-red-400 font-semibold">
                          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>Varning: hål {i + 1} har registrerade resultat från {n} lag. Resultaten försvinner om du tar bort hålet. Går inte att ångra.</span>
                        </p>
                      ) : (
                        <p className="text-sm text-slate-100">Ta bort hål {i + 1}, {x.pub}? Hålet har inga registrerade resultat.</p>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                        <button type="button" onClick={() => { Sound.tap(); setConfirmId(null); }} className="text-sm text-slate-400 hover:text-slate-100 px-2">Avbryt</button>
                        <button type="button" onClick={() => removeHole(x.id)} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border border-red-400 text-red-400 px-4 py-2.5 text-sm font-bold')}>
                          <Trash2 className="w-4 h-4" aria-hidden="true" /> {n > 0 ? 'Ta bort hålet och resultaten' : 'Ta bort hålet'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {/* ADMIN-KONTROLL: Lägg till hål visas bara för Martin och Malte, och bara i redigeringsläget.
            Knappen är avstängd när banan har 18 hål. */}
        {course && canEdit && editing && (
          <>
            <button type="button" onClick={startAdd} disabled={holes.length >= PUB_MAX_HOLES} className={cx(PRESS, 'w-full mt-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-400 text-amber-400 px-3 py-3 text-sm font-bold disabled:opacity-40')}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Lägg till hål
            </button>
            <p className="text-xs text-slate-400 mt-2">Banan kan ha {PUB_MIN_HOLES} till {PUB_MAX_HOLES} hål. Ändringar syns direkt hos alla. Flyttar du ett hål följer dess resultat med.</p>
          </>
        )}
      </Card>
      {/* Rutan för Ändra och Lägg till hål. key gör att fälten börjar om från början för varje hål. */}
      {canEdit && form && (
        <HoleEditor
          key={form.id || 'nytt'}
          form={form}
          number={form.id ? holes.findIndex((x) => x.id === form.id) + 1 : holes.length + 1}
          onSave={saveHole}
          onCancel={() => { Sound.tap(); setForm(null); }}
        />
      )}

      {/* 3. Poängsystem och regler */}
      <Card>
        <FoldHeader icon={<Medal className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />} title="Regler och poäng" open={rules} onToggle={() => setRules(!rules)} />
        {rules && (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><span className="font-semibold">Som vanlig golf:</span> lägst antal slag efter banans {holes.length} hål vinner.</li>
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
