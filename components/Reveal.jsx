// AVSLÖJANDET AV RESMÅLET.
// Vad: en helskärm som avslöjar vart resan går. Först nedräkning 3–2–1 med trumvirvel, sedan ett
// flygplan som flyger över skärmen, sedan stadens namn på en avgångstavla där bokstäverna rullar
// och stannar en i taget. Till sist fanfar, konfetti, allas gissningar och knappen Gå in.
// Var: läggs ovanpå hela appen första gången en person är inne efter att resmålet har satts
// (en admin fyller i staden när hemsidan låses upp i Admin-fliken). Kan visas igen med knappen
// "Se avslöjandet igen" i Agenda-fliken.
// Används av: app/LeBoysApp.jsx, som också avgör när den ska visas.

import { useEffect, useRef, useState } from 'react';
import { Plane, Volume2 } from 'lucide-react';
import { POINTS } from '../lib/config';
import { sameCity } from '../lib/scoring';
import { cx, reducedMotion } from '../utils/helpers';
import { PRESS, GLOW_GOLD, GLOW_GREEN, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Pop } from './ui';

// Tecknen som rullar förbi på avgångstavlan innan rätt bokstav stannar.
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
const randomFlap = () => FLAP[Math.floor(Math.random() * FLAP.length)];
// Hur länge flygplanet flyger över skärmen, i millisekunder.
const PLANE_MS = 2400;
// Hur ofta de rullande bokstäverna byts, i millisekunder.
const ROLL_MS = 70;

// Ritar flygplanet sett från sidan, med nosen åt höger. ctx = ritytan, (x, y) = planets mitt,
// s = skala (1 = cirka 100 pixlar långt), angle = lutning i radianer (negativ = nosen uppåt).
function drawPlane(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  // Bortre vingen (mörkare, sticker upp bakom kroppen).
  ctx.fillStyle = '#b45309';
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-18, -24); ctx.lineTo(-8, -24); ctx.lineTo(12, -4); ctx.closePath(); ctx.fill();
  // Stjärtfenan.
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-50, -26); ctx.lineTo(-40, -26); ctx.lineTo(-22, -4); ctx.closePath(); ctx.fill();
  // Kroppen.
  ctx.beginPath(); ctx.ellipse(0, 0, 48, 9, 0, 0, Math.PI * 2); ctx.fill();
  // Närmaste vingen (pekar nedåt bakåt).
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(-22, 30); ctx.lineTo(-10, 30); ctx.lineTo(20, 2); ctx.closePath(); ctx.fill();
  // Fönstren.
  ctx.fillStyle = '#0f172a';
  for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.arc(i * 8 + 4, -2.5, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// Props: user = den inloggade, city = resmålets stad (från data.destination.city),
// guesses = allas gissningar ({ author, city }, från hooks/useIntel.js),
// onEnter = körs när man trycker Gå in (stänger avslöjandet).
export function Reveal({ user, city, guesses, onEnter }) {
  // phase = var i avslöjandet vi är:
  //   'check' = kollar om webbläsaren släpper fram ljud (en kort stund, inget visas)
  //   'wait'  = ljudet är spärrat tills man trycker: visar en startknapp
  //   'count' = nedräkningen 3–2–1 med trumvirvel
  //   'plane' = flygplanet flyger över skärmen
  //   'board' = bokstäverna rullar på avgångstavlan
  //   'done'  = allt är avslöjat: fanfar, konfetti, gissningarna och Gå in
  // Har användaren bett om minskade rörelser (prefers-reduced-motion) hoppar vi direkt till 'done'.
  const [phase, setPhase] = useState(() => (reducedMotion() ? 'done' : 'check'));
  // count = siffran som visas i nedräkningen.
  const [count, setCount] = useState(3);
  // locked = hur många bokstäver som har stannat på tavlan. roll = de slumpade bokstäver som
  // visas i de rutor som fortfarande rullar.
  const [locked, setLocked] = useState(0);
  const [roll, setRoll] = useState([]);
  // canvasRef pekar på ritytan där flygplanet ritas.
  const canvasRef = useRef(null);

  // Stadens namn i versaler, uppdelat i ord. Varje ord blir en egen rad med rutor på tavlan, så
  // att långa namn får plats på en smal telefon. Varje ruta får ett löpnummer (i) över hela namnet.
  const words = city.trim().toLocaleUpperCase('sv-SE').split(/\s+/).filter(Boolean);
  let total = 0;
  const rows = words.map((w) => Array.from(w).map((ch) => { total += 1; return { ch, i: total - 1 }; }));
  // Rutornas storlek väljs efter det längsta ordet, så att raden ryms på 320 pixlars bredd.
  const longest = Math.max(1, ...rows.map((r) => r.length));
  const cell = longest <= 7 ? 'w-9 h-12 text-2xl' : longest <= 9 ? 'w-7 h-10 text-xl' : longest <= 12 ? 'w-5 h-8 text-base' : 'w-4 h-7 text-xs';
  const gap = longest <= 12 ? 'gap-1' : 'gap-0.5';
  // I slutläget står alla bokstäver stilla, oavsett hur vi kom dit.
  const lockedNow = phase === 'done' ? total : locked;

  // Styr nedräkningen och flygplanet. Körs varje gång phase ändras. Funktionen som returneras
  // städar upp (stoppar klockor och animationen) om avslöjandet stängs mitt i.
  useEffect(() => {
    // Ljudkontroll. iPhone spelar inget ljud förrän man har tryckt på skärmen. Sound.ac() försöker
    // väcka ljudmotorn. Går den igång (eller om ljudet är avstängt, eller saknas helt) börjar
    // nedräkningen direkt. Annars visas en startknapp, så att ingen får en tyst trumvirvel.
    if (phase === 'check') {
      const c = Sound.ac();
      const t = setTimeout(() => setPhase(!c || Sound.muted || c.state === 'running' ? 'count' : 'wait'), 200);
      return () => clearTimeout(t);
    }
    // Nedräkningen: trumvirveln är tre sekunder lång, och siffran byts varje sekund.
    if (phase === 'count') {
      Sound.drumroll(3);
      const timers = [
        setTimeout(() => setCount(2), 1000),
        setTimeout(() => setCount(1), 2000),
        setTimeout(() => setPhase('plane'), 3000),
      ];
      return () => timers.forEach(clearTimeout);
    }
    // Flygplanet: ritas om i canvas ungefär 60 gånger per sekund tills det har flugit ut till höger.
    if (phase === 'plane') {
      const cv = canvasRef.current;
      const ctx = cv && cv.getContext('2d');
      // Går det inte att rita hoppar vi vidare till tavlan.
      if (!ctx) { const t = setTimeout(() => setPhase('board'), 0); return () => clearTimeout(t); }
      // Ritytan görs skarp även på skärmar med hög upplösning (dpr = pixlar per punkt).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Planet är ungefär en tredjedel av skärmens bredd och flyger snett uppåt från vänster till höger.
      const s = Math.max(1, Math.min(w, 520) / 300);
      const x0 = -60 * s;
      const x1 = w + 60 * s;
      const y0 = h * 0.64;
      const y1 = h * 0.36;
      const angle = Math.atan2(y1 - y0, x1 - x0);
      let raf = 0;
      let startTs = null;
      const frame = (ts) => {
        if (startTs === null) startTs = ts;
        const p = Math.min(1, (ts - startTs) / PLANE_MS);
        const x = x0 + (x1 - x0) * p;
        const y = y0 + (y1 - y0) * p;
        ctx.clearRect(0, 0, w, h);
        // Kondensstrimman: en linje bakom planet som tonar bort bakåt.
        const trail = ctx.createLinearGradient(x0, y0, x, y);
        trail.addColorStop(0, 'rgba(226,232,240,0)');
        trail.addColorStop(1, 'rgba(226,232,240,0.6)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        drawPlane(ctx, x, y, s, angle);
        if (p < 1) raf = requestAnimationFrame(frame);
        else setPhase('board');
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }
    // Slutet: fanfar och konfetti. (Konfettin gör ingenting vid minskade rörelser.)
    if (phase === 'done') {
      Sound.fanfare();
      Confetti.burst(240);
    }
    return undefined;
  }, [phase]);

  // Avgångstavlan. Var 70:e millisekund byts de rullande bokstäverna mot nya slumpade, och med
  // jämna mellanrum stannar nästa bokstav med ett klick. Långa namn går fortare per bokstav.
  // Körs när phase blir 'board' (och om igen om en admin rättar staden mitt i).
  useEffect(() => {
    if (phase !== 'board') return undefined;
    const every = total > 10 ? 3 : 5; // antal byten mellan varje bokstav som stannar
    let tick = 0;
    let n = 0;
    let after = 0;
    const id = setInterval(() => {
      tick += 1;
      if (tick % every === 0) {
        n += 1;
        setLocked(n);
        Sound.flap();
      }
      if (n >= total) {
        // Alla bokstäver står stilla: en kort paus, sedan slutläget.
        clearInterval(id);
        after = setTimeout(() => setPhase('done'), 600);
        return;
      }
      setRoll(Array.from({ length: total }, randomFlap));
    }, ROLL_MS);
    return () => { clearInterval(id); clearTimeout(after); };
  }, [phase, total]);

  // Körs när man trycker på startknappen (visas bara när ljudet var spärrat). Själva trycket är
  // det som gör att webbläsaren släpper fram ljudet.
  const start = () => { Sound.ac(); Sound.tap(); setPhase('count'); };

  // Gissningarna med rätt stad överst. right = sant om gissningen är samma stad som resmålet.
  // Sorteringen behåller den vanliga ordningen (äldst först) inom varje grupp.
  const list = guesses
    .map((g) => ({ author: g.author, city: g.city, right: sameCity(g.city, city) }))
    .sort((a, b) => Number(b.right) - Number(a.right));
  const winners = list.filter((g) => g.right).length;

  return (
    // Helskärm ovanpå appen. h-dvh är skärmens verkliga höjd på iPhone (även när Safaris fält syns),
    // och env(safe-area-inset-*) håller innehållet borta från kameraön och strecket längst ner.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Avslöjandet av resmålet"
      className="fixed inset-x-0 top-0 z-50 h-dvh overflow-y-auto overscroll-contain bg-slate-950 bg-[radial-gradient(900px_420px_at_50%_-120px,rgba(251,191,36,0.16),transparent_70%)] pt-[calc(env(safe-area-inset-top)_+_1.5rem)] pb-[calc(env(safe-area-inset-bottom)_+_1.5rem)] pl-[calc(env(safe-area-inset-left)_+_1rem)] pr-[calc(env(safe-area-inset-right)_+_1rem)]"
    >
      <div className="min-h-full w-full max-w-sm mx-auto flex flex-col items-center justify-center gap-6 text-center">
        {/* Startknappen: bara när webbläsaren kräver ett tryck innan ljud får spelas. */}
        {phase === 'wait' && (
          <Pop className="flex flex-col items-center gap-5">
            <p className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">Reseledningen har talat</p>
            <h1 className={cx(DISPLAY, 'text-4xl')}>Resmålet <span className="text-amber-400">är klart</span></h1>
            <p className="flex items-center gap-2 text-sm text-slate-400"><Volume2 className="w-4 h-4" aria-hidden="true" /> Skruva upp ljudet</p>
            <button type="button" autoFocus onClick={start} className={cx(PRESS, 'flex items-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-black uppercase text-lg px-6 py-3', GLOW_GOLD)}>
              <Plane className="w-5 h-5" aria-hidden="true" /> Avslöja resmålet
            </button>
          </Pop>
        )}

        {/* Nedräkningen. key={count} gör att siffran poppar fram på nytt för varje ny siffra. */}
        {phase === 'count' && (
          <>
            <p className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">Resmålet avslöjas om</p>
            <Pop key={count} className="text-[10rem] leading-none font-black tabular-nums text-amber-400" aria-live="assertive">{count}</Pop>
          </>
        )}

        {/* Flygplanet: texten står i mitten och planet ritas i en canvas som täcker hela skärmen. */}
        {phase === 'plane' && (
          <>
            <p className={cx(DISPLAY, 'text-3xl')}>Le boys <span className="text-amber-400">lyfter mot</span></p>
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
          </>
        )}

        {/* Avgångstavlan, medan bokstäverna rullar och när allt är klart. */}
        {(phase === 'board' || phase === 'done') && (
          <>
            <div className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-3 py-4">
              <p className="flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">
                <Plane className="w-4 h-4" aria-hidden="true" /> Avgång · Destination
              </p>
              {/* Skärmläsare får hela namnet på en gång när det är klart, inte de rullande bokstäverna. */}
              <div role="img" aria-label={phase === 'done' ? city : 'Resmålet avslöjas'} className="mt-3 flex flex-col items-center gap-2">
                {rows.map((r, ri) => (
                  <div key={ri} className={cx('flex', gap)}>
                    {r.map(({ ch, i }) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className={cx(
                          'relative flex items-center justify-center rounded bg-slate-950 border font-black tabular-nums after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-slate-900',
                          cell,
                          i < lockedNow ? 'border-amber-400 text-amber-400' : 'border-slate-700 text-slate-500',
                        )}
                      >
                        {i < lockedNow ? ch : roll[i] || ''}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {phase === 'done' && (
              <Pop className="w-full flex flex-col gap-4">
                <h1 className={cx(DISPLAY, 'text-4xl')}>Vi åker till <span className="text-amber-400">{city}!</span></h1>

                {/* Allas gissningar, rätt stad överst med märket Rätt! */}
                <div className="w-full rounded-2xl bg-slate-900 border border-slate-700 p-3 text-left">
                  <h2 className={cx(DISPLAY, 'text-xl')}>Gissningarna</h2>
                  <p className={cx('text-xs mt-1 font-semibold', winners ? 'text-emerald-400' : 'text-slate-400')}>
                    {list.length === 0 ? 'Ingen hann gissa.' : winners ? `${winners} av ${list.length} gissade rätt och får +${POINTS.guess} poäng.` : 'Ingen gissade rätt.'}
                  </p>
                  {list.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2">
                      {list.map((g) => (
                        <li key={g.author} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 py-2', g.right ? cx('border-emerald-400', GLOW_GREEN) : g.author === user ? 'border-amber-400' : 'border-slate-700')}>
                          <Avatar name={g.author} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs text-slate-400">{g.author}</span>
                            <span className="block font-semibold truncate">{g.city}</span>
                          </span>
                          {g.right && <span className="shrink-0 rounded bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider px-2 py-1">Rätt!</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Ingen autoFocus här: då skulle telefonen rulla ner till knappen och gömma tavlan. */}
                <button type="button" onClick={() => { Sound.tap(); onEnter(); }} className={cx(PRESS, 'w-full rounded-xl bg-amber-400 text-slate-950 font-black uppercase text-lg py-3', GLOW_GOLD)}>
                  Gå in
                </button>
              </Pop>
            )}
          </>
        )}
      </div>
    </div>
  );
}
