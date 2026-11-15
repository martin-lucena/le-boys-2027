// LAG-ROULETTEN.
// Vad: ett snurrhjul som drar ett namn i taget. Två lägen: "Fritt snurr" (för valfria beslut, alla
// får snurra) och "Pub Golf-lag" (den officiella lottningen av lagen, bara admins får snurra).
// Var: under Mer-menyn.
// Används av: components/Shell.jsx.

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Triangle } from 'lucide-react';
import { BOYS, isAdmin, PLAYER } from '../lib/constants';
import { cx, animate } from '../utils/helpers';
import { PRESS, GLOW_GOLD, STRIPE, DISPLAY } from '../utils/styles';
import { freshPubGolf } from '../utils/storage';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, Pop, SectionTitle, Segmented } from './ui';
import { PUB_TEAM_SIZE, PUB_TEAMS, pubTeams } from '../lib/pubgolf';

/* ---------- Flik 4: Lag-Roulette ---------- */
// TAU = ett helt varv i radianer (samma sak som 360 grader). Vinklar i canvas räknas i radianer.
const TAU = Math.PI * 2;
const WHEEL_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
// Ritar hjulet en gång. cv = canvasen, names = namnen som är kvar på hjulet, rot = hur mycket
// hjulet är vridet. Varje namn får en lika stor tårtbit i personens färg. Körs för varje bildruta
// medan hjulet snurrar.
function drawWheel(cv, names, rot) {
  const c = cv.getContext('2d');
  const S = cv.width;
  const R = S / 2;
  const r = R - 22;
  c.clearRect(0, 0, S, S);
  c.save();
  c.translate(R, R);
  c.beginPath(); c.arc(0, 0, R - 4, 0, TAU); c.fillStyle = '#020617'; c.fill();
  if (!names.length) {
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#1e293b'; c.fill();
    c.fillStyle = '#94a3b8'; c.font = `800 34px ${WHEEL_FONT}`; c.textAlign = 'center';
    c.fillText('ALLA ÄR DRAGNA', 0, -r * 0.55);
  } else {
    const seg = TAU / names.length;
    names.forEach((n, i) => {
      const a0 = rot + i * seg;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, a0, a0 + seg); c.closePath();
      c.fillStyle = PLAYER[n].hex; c.fill();
      const g = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fill();
      c.lineWidth = 3; c.strokeStyle = '#020617'; c.stroke();
      c.save();
      c.rotate(a0 + seg / 2);
      c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = '#020617';
      c.font = `900 ${names.length > 4 ? 38 : 48}px ${WHEEL_FONT}`;
      c.fillText(n.toUpperCase(), r - 22, 2);
      c.restore();
    });
  }
  c.beginPath(); c.arc(0, 0, R - 12, 0, TAU); c.lineWidth = 16; c.strokeStyle = '#fbbf24'; c.stroke();
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * TAU;
    c.beginPath(); c.arc(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12), 3.5, 0, TAU);
    c.fillStyle = i % 2 ? '#020617' : '#fffbeb'; c.fill();
  }
  c.restore();
}
// Fritt snurr: varannan dragen hamnar i Lag Gul, varannan i Lag Blå.
const teamOf = (i) => (i % 2 === 0 ? 'Gul' : 'Blå');
// Vilken tårtbit ligger under pilen just nu? Pilen sitter högst upp på hjulet. Givet hjulets
// vridning r och antalet bitar n räknas pilens läge om till ett nummer på biten. De dubbla
// %-tecknen ser bara till att vinkeln hamnar mellan 0 och ett helt varv.
const indexAt = (r, n) => Math.floor(((((-Math.PI / 2 - r) % TAU) + TAU) % TAU) / (TAU / n));

// TeamColumn: en ruta med ett lags namn och spelare. Tomma platser visas som streckade rader.
// Props: title = lagets namn, list = spelarna, slots = antal platser, border och text = färgklasser.
function TeamColumn({ title, list, slots, border, text }) {
  return (
    <div className={cx('rounded-xl bg-slate-950 border p-3', border)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={cx(DISPLAY, 'text-xl', text)}>{title}</h4>
        <span className="text-xs text-slate-400 tabular-nums">{list.length}/{slots}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {Array.from({ length: slots }).map((_, i) => (
          <li key={i} className="flex items-center gap-2 h-8">
            {list[i] ? (
              <><Avatar name={list[i]} size="sm" /><span className="font-semibold">{list[i]}</span></>
            ) : (
              <span className="w-full h-7 rounded-md border border-dashed border-slate-700" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Roulette: hela fliken.
// Props: data = delad data (data.wheel = dragna i fritt snurr, data.pubgolf.draw = dragna till
// Pub Golf-lagen), mut = funktionen som ändrar data, user = den inloggade, goTab = byter flik.
export function Roulette({ data, mut, user, goTab }) {
  // Två lägen: officiell lottning av Pub Golf-lag (sparas som lagen) eller fritt snurr.
  const [mode, setMode] = useState('free');
  const official = mode === 'pubgolf';
  // order = de som redan är dragna i det valda läget, i den ordning de drogs.
  const order = official ? data.pubgolf.draw : data.wheel;
  // ADMIN-KONTROLL: i läget Pub Golf-lag får bara Martin och Malte snurra och nollställa.
  // I fritt snurr får alla.
  const canSpin = !official || isAdmin(user); // bara admins lottar och nollställer Pub Golf-lagen
  // names = namnen som är kvar på hjulet. spinning = snurrar hjulet just nu?
  // winner = den som just drogs (visas i en ruta tills man stänger den).
  // armed = sant i tre sekunder efter första trycket på Nollställ, som en säkerhetsspärr.
  const [names, setNames] = useState(() => BOYS.filter((n) => !order.includes(n)));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [armed, setArmed] = useState(false);
  // cvRef = canvasen. ptrRef = pilen. rot = hjulets vridning. raf = id för den pågående animationen.
  const cvRef = useRef(null);
  const ptrRef = useRef(null);
  const rot = useRef(-Math.PI / 2);
  const raf = useRef(0);

  // Hjulet uppdateras först när vinnar-bannern är stängd, så att vinnaren syns kvar tills dess.
  useEffect(() => {
    if (!spinning && !winner) setNames(BOYS.filter((n) => !order.includes(n)));
  }, [order, spinning, winner]);
  // Körs när namnen på hjulet ändras: ritar om hjulet.
  useEffect(() => { if (cvRef.current) drawWheel(cvRef.current, names, rot.current); }, [names]);
  // Körs när man lämnar fliken: stoppar en pågående snurr.
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Körs när man trycker Snurra hjulet.
  const spin = () => {
    // Gör inget om hjulet redan snurrar, vinnarrutan är öppen, hjulet är tomt eller om man inte får
    // snurra (admin-kontrollen ovan, kollas här en gång till).
    if (spinning || winner || !names.length || !canSpin) return;
    Sound.ac();
    setSpinning(true);
    const toPubGolf = official;
    const list = names.slice();
    // HJULETS FYSIK. w är farten (hur fort hjulet vrids). Starten slumpas, så ingen kan veta var det stannar.
    let w = 15 + Math.random() * 9; // vinkelhastighet (rad/s)
    let last = performance.now();
    let idx = indexAt(rot.current, list.length);
    // frame körs inför varje ny bild på skärmen, ungefär 60 gånger per sekund, tills hjulet står still.
    const frame = (now) => {
      // dt = tiden sedan förra bilden. Hjulet vrids fart gånger tid, sedan bromsas farten lite.
      // Bromsen är större ju fortare det går, så hjulet tappar fart snabbt i början och rullar ut mjukt.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rot.current += w * dt;
      w -= (0.55 + 0.5 * w) * dt; // friktion: saktar in mjukt mot slutet
      // Varje gång en ny tårtbit passerar pilen hörs ett klick och pilen rycker till.
      const ni = indexAt(rot.current, list.length);
      if (ni !== idx) {
        idx = ni;
        Sound.click();
        animate(ptrRef.current, [{ transform: 'rotate(-22deg)' }, { transform: 'rotate(0deg)' }], { duration: 110, easing: 'ease-out' });
      }
      if (cvRef.current) drawWheel(cvRef.current, list, rot.current);
      // Så länge hjulet rör sig: beställ nästa bild och fortsätt. Annars har det stannat, och biten under
      // pilen vinner.
      if (w > 0.04) { raf.current = requestAnimationFrame(frame); return; }
      const name = list[indexAt(rot.current, list.length)];
      setSpinning(false);
      setWinner(name);
      // SPARAR TILL SUPABASE: namnet läggs sist i data.pubgolf.draw (läget Pub Golf-lag) eller i
      // data.wheel (fritt snurr). Kontrollen gör att samma namn aldrig läggs till två gånger.
      mut((d) => {
        const target = toPubGolf ? d.pubgolf.draw : d.wheel;
        if (!target.includes(name)) target.push(name);
      });
      Sound.fanfare();
      Confetti.burst(220);
    };
    raf.current = requestAnimationFrame(frame);
  };
  // Körs när man trycker Återställ hjulet eller Nollställ Pub Golf-lagen.
  const reset = () => {
    if (!canSpin) return;
    // Säkerhetsspärr i Pub Golf-läget: första trycket laddar bara knappen, andra trycket inom tre sekunder nollställer.
    if (official && !armed) { Sound.tap(); setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    cancelAnimationFrame(raf.current);
    Sound.tap();
    setArmed(false);
    setSpinning(false);
    setWinner(null);
    rot.current = -Math.PI / 2;
    // Nya lag betyder ny tävling, så Pub Golf-poängen nollställs tillsammans med lagen.
    // SPARAR TILL SUPABASE: hela data.pubgolf töms (lag och resultat), eller så töms data.wheel i fritt snurr.
    if (official) mut((d) => { d.pubgolf = freshPubGolf(); });
    else mut((d) => { d.wheel = []; });
  };
  // Körs när man byter läge. Går inte medan hjulet snurrar eller vinnarrutan är öppen.
  const changeMode = (v) => { if (spinning || winner) return; setArmed(false); setMode(v); };

  const pos = winner ? order.indexOf(winner) : -1;
  // Uppdelning för visningen: gul och bla för fritt snurr, teams för Pub Golf.
  // winTeam = vilket Pub Golf-lag den nyss dragna hamnade i.
  const gul = order.filter((_, i) => i % 2 === 0);
  const bla = order.filter((_, i) => i % 2 === 1);
  const teams = pubTeams(data.pubgolf.draw);
  const winTeam = official && pos >= 0 ? PUB_TEAMS[Math.floor(pos / PUB_TEAM_SIZE)] : null;
  const idle = !spinning && !winner && names.length > 0 && canSpin;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Lag-Roulette" title="Hjulet avgör" />
      <Segmented label="Läge för snurret" value={mode} onChange={changeMode} options={[{ id: 'free', label: 'Fritt snurr' }, { id: 'pubgolf', label: 'Pub Golf-lag' }]} />
      {official ? (
        <div className="rounded-xl border border-amber-400 bg-amber-400/10 px-3 py-2.5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Officiell lottning</p>
          <p className="text-sm mt-1">
            Varje snurr sparas direkt som Pub Golf-lag. De {PUB_TEAM_SIZE} första som dras bildar {PUB_TEAMS[0].name}, nästa {PUB_TEAM_SIZE} {PUB_TEAMS[1].name}, och så vidare.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            {/* ADMIN-KONTROLL: texten talar om ifall man är Martin eller Malte och därmed får snurra här. */}
            <p className="text-xs text-slate-400">{isAdmin(user) ? 'Du är admin och kan snurra och nollställa.' : 'Bara Reseledningen kan snurra och nollställa.'}</p>
            <button type="button" onClick={() => goTab('pubgolf')} className={cx(PRESS, 'rounded-lg border border-amber-400 text-amber-400 px-2.5 py-1 text-xs font-bold')}>Öppna Pub Golf</button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-400">Fritt snurr för andra beslut och straff. Påverkar inte Pub Golf-lagen.</p>
      )}

      <Card className={STRIPE}>
        <div className="relative mx-auto w-full max-w-sm">
          <div ref={ptrRef} className="absolute left-1/2 -top-2 z-10 -ml-4 origin-top drop-shadow-lg" aria-hidden="true">
            <Triangle className="w-8 h-8 rotate-180 fill-emerald-400 text-slate-950" strokeWidth={2.5} />
          </div>
          <canvas ref={cvRef} width={720} height={720} role="img" aria-label={`Snurrhjul med ${names.join(', ') || 'inga namn kvar'}`} className="block w-full h-auto" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              onClick={spin}
              disabled={!idle}
              className={cx(PRESS, 'pointer-events-auto w-1/3 aspect-square rounded-full border-4 border-slate-950 font-black uppercase leading-none text-base sm:text-lg', idle ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400')}
            >
              {spinning ? 'Snurrar' : !names.length ? 'Klart' : !canSpin ? <span>Endast<br />admin</span> : <span>Snurra<br />hjulet</span>}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-400 tabular-nums">{names.length} kvar på hjulet · {order.length}/{BOYS.length} dragna</p>
          {canSpin && (
            <button type="button" onClick={reset} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold', armed ? 'border-red-400 text-red-400' : 'border-slate-700 hover:border-amber-400')}>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {official ? (armed ? 'Tryck igen: lag och poäng raderas' : 'Nollställ Pub Golf-lagen') : 'Återställ hjulet (Alla 8)'}
            </button>
          )}
        </div>
      </Card>

      {official ? (
        <Card>
          <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Pub Golf-lagen</h3>
          <div className="grid grid-cols-2 gap-3">
            {teams.map((t) => (
              <TeamColumn key={t.name} title={t.name} list={t.members} slots={PUB_TEAM_SIZE} border={t.border} text={t.text} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">Lagen här är samma som visas i Pub Golf-fliken och uppdateras hos alla direkt.</p>
        </Card>
      ) : (
        <Card>
          <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Resultat</h3>
          <Segmented
            label="Visningsläge"
            value={data.listMode}
            // Ändrar data.listMode (lista eller lag). Synkas INTE till Supabase, sparas bara i den här webbläsaren.
            onChange={(v) => mut((d) => { d.listMode = v; })}
            options={[{ id: 'order', label: 'Dragningsordning (1–8)' }, { id: 'teams', label: 'Automatiska Lag' }]}
          />
          <div className="mt-3">
            {data.listMode === 'order' ? (
              <ol className="flex flex-col gap-1.5">
                {BOYS.map((_, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-700 px-3 h-11">
                    <span className="font-black text-xl w-6 tabular-nums text-amber-400">{i + 1}</span>
                    {order[i] ? (
                      <span className="flex items-center gap-2 flex-1">
                        <Avatar name={order[i]} size="sm" />
                        <span className="font-semibold">{order[i]}</span>
                        <span className={cx('ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded text-slate-950', i % 2 === 0 ? 'bg-amber-400' : 'bg-sky-400')}>Lag {teamOf(i)}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">Väntar på snurr</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <TeamColumn title="Lag Gul" list={gul} slots={4} border="border-amber-400" text="text-amber-400" />
                <TeamColumn title="Lag Blå" list={bla} slots={4} border="border-sky-400" text="text-sky-400" />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">Varannan dragen spelare går till Lag Gul och varannan till Lag Blå. Det blir fyra mot fyra.</p>
        </Card>
      )}

      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80" onClick={() => setWinner(null)}>
          <Pop
            role="dialog"
            aria-modal="true"
            aria-label="Dragen spelare"
            onClick={(e) => e.stopPropagation()}
            className={cx('w-full max-w-sm rounded-3xl bg-slate-900 border border-amber-400 p-6 text-center', GLOW_GOLD, STRIPE)}
          >
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-semibold">Hjulet har talat</p>
            <div className="flex justify-center my-4"><Avatar name={winner} size="xl" /></div>
            <p className={cx(DISPLAY, 'text-5xl text-amber-400')}>{winner}</p>
            <p className="mt-3 text-slate-100">
              Nummer <span className="font-bold tabular-nums">{pos + 1}</span> i dragningen ·{' '}
              {winTeam
                ? <span className={cx('font-bold', winTeam.text)}>{winTeam.name}</span>
                : <span className={cx('font-bold', pos % 2 === 0 ? 'text-amber-400' : 'text-sky-400')}>Lag {teamOf(pos)}</span>}
            </p>
            <button type="button" autoFocus onClick={() => { Sound.tap(); setWinner(null); }} className={cx(PRESS, 'mt-5 w-full rounded-xl bg-amber-400 text-slate-950 font-bold py-3')}>
              {order.length >= BOYS.length ? 'Visa lagen' : 'Ta bort från hjulet och fortsätt'}
            </button>
          </Pop>
        </div>
      )}
    </div>
  );
}
