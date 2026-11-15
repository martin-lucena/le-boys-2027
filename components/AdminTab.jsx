// ADMIN-FLIKEN.
// Vad: Reseledningens verktyg. Lås upp hemsidan för alla (med lösenord), avslöja eller dölj
// lagkaptensresultat, godkänn böter, dela ut och
// bedöm uppdrag, återställ agendan och Pub Golf-banan till standard, se appens status och nollställ all data.
// Var: under Mer-menyn, BARA för Martin och Malte. Kontrollen görs i components/Shell.jsx.
// Används av: components/Shell.jsx.

import { useRef, useState } from 'react';
import { Trash2, Eye, EyeOff, RotateCcw, Lock, LockOpen } from 'lucide-react';
import { RELEASE_MODE, RELEASE_PASSWORD } from '../lib/config';
import { BOYS, NIGHTS, isAdmin } from '../lib/constants';
import { cx, animate, dayTime } from '../utils/helpers';
import { PRESS, GLOW_GOLD, GLOW_GREEN, DISPLAY } from '../utils/styles';
import { freshData } from '../utils/storage';
import { freshAgenda } from '../lib/agenda';
import { freshCourse } from '../lib/pubgolf';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Card, SectionTitle } from './ui';
import { MissionAdmin } from './Missions';
import { FineReview } from './Fines';

/* ---------- Admin (endast Martin och Malte) ---------- */
// Props: data och mut = delad data och funktionen som ändrar den,
// sync = läget för anslutningen till Supabase ('live', 'offline', 'local' eller 'connecting'),
// user = den inloggade adminen (sparas som den som låste upp hemsidan).
export function AdminTab({ data, mut, sync, user }) {
  // armed = sant i tre sekunder efter första trycket på Nollställ (säkerhetsspärr). msg = kvittot efteråt.
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState('');
  // Samma sak för knappen Återställ agendan: armedAgenda = spärren, agendaMsg = kvittot efteråt.
  const [armedAgenda, setArmedAgenda] = useState(false);
  const [agendaMsg, setAgendaMsg] = useState('');
  // Och för knappen Återställ banan: armedCourse = spärren, courseMsg = kvittot efteråt.
  const [armedCourse, setArmedCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState('');
  // Rutan Släpp hemsidan: release = släppläget i den delade datan ({ open, by, at }).
  // askPw = visas lösenordsfältet? pw = det man har skrivit i fältet. pwMsg = felmeddelandet.
  // releaseRef pekar på rutan på skärmen, så att den kan skakas vid fel lösenord.
  const release = data.release;
  const [askPw, setAskPw] = useState(false);
  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const releaseRef = useRef(null);

  // Körs när man trycker Lås upp för alla eller Lås igen: visar lösenordsfältet.
  const startRelease = () => { Sound.tap(); setAskPw(true); setPw(''); setPwMsg(''); };
  // Körs när man trycker Avbryt: gömmer lösenordsfältet utan att ändra något.
  const cancelRelease = () => { Sound.tap(); setAskPw(false); setPw(''); setPwMsg(''); };
  // Körs när man trycker Bekräfta. Samma lösenord krävs för att låsa upp och för att låsa igen.
  const confirmRelease = (e) => {
    e.preventDefault();
    // ADMIN-KONTROLL: bara Martin och Malte får ändra släppläget (kollas igen här, innan något sparas).
    if (!isAdmin(user)) return;
    // Fel lösenord: felljud, rutan skakar och ingenting sparas. Jämförelsen är skiftlägeskänslig.
    if (pw !== RELEASE_PASSWORD) {
      Sound.error();
      setPw('');
      setPwMsg('Fel lösenord, ingenting har ändrats');
      animate(releaseRef.current, [
        { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' },
        { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
      ], { duration: 450, easing: 'ease-in-out' });
      return;
    }
    // Rätt lösenord: växla läget. Vid upplåsning sparas vem som gjorde det och när.
    const next = release.open ? { open: false, by: null, at: null } : { open: true, by: user, at: Date.now() };
    // SPARAR TILL SUPABASE: data.release. Alla som har väntsidan uppe får det nya läget direkt
    // via synken. Blir sidan öppen visas avslöjandeskärmen hos dem (se app/LeBoysApp.jsx).
    mut((d) => { d.release = next; });
    if (next.open) { Sound.fanfare(); Confetti.burst(200); } else Sound.tap();
    setAskPw(false);
    setPw('');
    setPwMsg('');
  };

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
    // Släppläget (release) sparas också, så att en nollställning aldrig låser eller öppnar hemsidan.
    // Pub Golf-banan (pubcourse) sparas också: den återställs bara med sin egen knapp, se resetCourse
    // nedan. Lagen och resultaten i Pub Golf (pubgolf) nollställs däremot.
    // SPARAR TILL SUPABASE: all delad data ersätts med tom data (freshData), utom straffläggningens
    // topplista, agendan, Pub Golf-banan och släppläget.
    mut((d) => { const scores = d.scores; const agenda = d.agenda; const rel = d.release; const pubcourse = d.pubcourse; Object.assign(d, freshData()); d.scores = scores; d.agenda = agenda; d.release = rel; d.pubcourse = pubcourse; });
    Sound.error();
    setMsg(sync === 'live' ? 'Allt utom gissningar, topplista, agenda, Pub Golf-bana och släppläge är nollställt för alla.' : 'Allt utom gissningar, topplista, agenda, Pub Golf-bana och släppläge är nollställt på den här enheten.');
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
  // Körs när man trycker Återställ banan till standard. Kräver två tryck inom tre sekunder,
  // precis som Återställ agendan. Hela Admin-fliken visas bara för Martin och Malte.
  const resetCourse = () => {
    // ADMIN-KONTROLL: kollas igen här, innan något sparas.
    if (!isAdmin(user)) return;
    if (!armedCourse) { Sound.tap(); setArmedCourse(true); setTimeout(() => setArmedCourse(false), 3000); return; }
    setArmedCourse(false);
    // SPARAR TILL SUPABASE: data.pubcourse ersätts med standardbanan (PUB_HOLES). Resultat på hål
    // som inte längre finns tas bort ur data.pubgolf.scores. Standardhålen har alltid samma id,
    // så resultat på standardhål som aldrig togs bort ligger kvar.
    mut((d) => {
      d.pubcourse = freshCourse();
      const ids = new Set(d.pubcourse.map((x) => x.id));
      Object.values(d.pubgolf.scores).forEach((card) => {
        if (card) Object.keys(card).forEach((id) => { if (!ids.has(id)) delete card[id]; });
      });
    });
    Sound.error();
    setCourseMsg('Banan är återställd till standard.');
    setTimeout(() => setCourseMsg(''), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Reseledningen" title="Admin" />

      {/* Släpp hemsidan: låser upp hela appen för alla åtta, eller låser den igen. Kräver lösenord. */}
      <div ref={releaseRef}>
        <Card className={release.open ? GLOW_GREEN : ''}>
          <h3 className={cx(DISPLAY, 'text-xl')}>Släpp hemsidan</h3>
          <p className={cx('text-sm mt-1 font-semibold', release.open || RELEASE_MODE ? 'text-emerald-400' : 'text-amber-400')}>
            {release.open
              ? `Öppen för alla sedan ${dayTime(release.at)}, av ${release.by}`
              : RELEASE_MODE ? 'Öppen för alla genom RELEASE_MODE i koden' : 'Hemligt: bara Reseledningen har åtkomst'}
          </p>
          {!askPw ? (
            <button type="button" onClick={startRelease} className={cx(PRESS, 'mt-3 flex items-center gap-2 rounded-xl px-5 py-3 font-bold', release.open ? 'border border-slate-700 text-slate-300 hover:border-amber-400' : cx('bg-amber-400 text-slate-950', GLOW_GOLD))}>
              {release.open ? <Lock className="w-4 h-4" aria-hidden="true" /> : <LockOpen className="w-4 h-4" aria-hidden="true" />}
              {release.open ? 'Lås igen' : 'Lås upp för alla'}
            </button>
          ) : (
            <form onSubmit={confirmRelease} className="mt-3 flex flex-col gap-2">
              <label htmlFor="release-pw" className="block text-xs font-semibold text-slate-400">
                {release.open ? 'Lösenord för att låsa hemsidan igen' : 'Lösenord för att låsa upp hemsidan för alla'}
              </label>
              <div className="flex gap-2">
                <input
                  id="release-pw"
                  type="password"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={cx('flex-1 min-w-0 rounded-xl bg-slate-950 border px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400', pwMsg ? 'border-red-400' : 'border-slate-700')}
                />
                <button type="submit" className={cx(PRESS, 'rounded-xl bg-amber-400 text-slate-950 font-bold px-4 shrink-0')}>Bekräfta</button>
              </div>
              <button type="button" onClick={cancelRelease} className="self-start text-sm text-slate-400 hover:text-slate-100">Avbryt</button>
            </form>
          )}
          <p role="alert" className="mt-2 min-h-5 text-sm text-red-400">{pwMsg}</p>
        </Card>
      </div>

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

      {/* Pub Golf-banan: kastar alla ändringar av banan. Två tryck krävs, som för agendan. */}
      <Card>
        <h3 className={cx(DISPLAY, 'text-xl')}>Pub Golf-banan</h3>
        <p className="text-sm text-slate-400 mt-1">
          Banan redigeras i Pub Golf-fliken med knappen Redigera banan. Här kan du kasta alla ändringar och gå tillbaka till standardbanan. Resultat på hål som försvinner tas bort. Går inte att ångra.
        </p>
        <button type="button" onClick={resetCourse} className={cx(PRESS, 'mt-3 flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold', armedCourse ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> {armedCourse ? 'Tryck igen för att återställa banan' : 'Återställ banan till standard'}
        </button>
        <p className="mt-2 min-h-5 text-sm text-emerald-400" role="status">{courseMsg}</p>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Status och nollställning</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Visar det faktiska läget: upplåst med knappen ovan, släppt genom RELEASE_MODE i koden, eller hemligt. */}
          <span className={cx('rounded-full border px-2 py-1 font-semibold', release.open || RELEASE_MODE ? 'border-emerald-400 text-emerald-400' : 'border-amber-400 text-amber-400')}>
            {release.open ? 'Släppt med knappen: alla åtta har åtkomst' : RELEASE_MODE ? 'Släppt i koden (RELEASE_MODE): alla åtta har åtkomst' : 'Hemligt läge: bara Reseledningen har åtkomst'}
          </span>
          <span className={cx('rounded-full border px-2 py-1 font-semibold', sync === 'live' ? 'border-emerald-400 text-emerald-400' : sync === 'offline' ? 'border-red-400 text-red-400' : sync === 'local' ? 'border-sky-400 text-sky-400' : 'border-slate-700 text-slate-400')}>
            {sync === 'live' ? 'Synkad live med molnet' : sync === 'offline' ? 'Ingen kontakt med molnet: sparas bara lokalt' : sync === 'local' ? 'Lokalt testläge: sparas bara i den här webbläsaren' : 'Ansluter till molnet'}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          Nollställer hype, incheckningar, röster, avslöjanden, uppdrag, böter, citat, Pub Golf (lag och resultat), låttext och roulette. Gissningarna, straffläggningens topplista, agendan och Pub Golf-banan ligger kvar, och hemsidan förblir låst eller öppen som den är. Går inte att ångra.
        </p>
        <button type="button" onClick={wipe} className={cx(PRESS, 'mt-3 flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold', armed ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
          <Trash2 className="w-4 h-4" aria-hidden="true" /> {armed ? 'Tryck igen för att radera allt' : 'Nollställ all data'}
        </button>
        <p className="mt-2 min-h-5 text-sm text-emerald-400" role="status">{msg}</p>
      </Card>
    </div>
  );
}
