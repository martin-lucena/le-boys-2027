// STRAFFLÄGGNINGEN.
// Vad: ett litet spel ritat på en canvas (en rityta). Sätt så många straffar i rad som möjligt.
// Var: på väntsidan och längst ner i Agenda-fliken.
// Används av: components/Classified.jsx och components/Shell.jsx.
//
// SÅ GÅR EN STRAFF TILL (spelet går igenom "faser"):
// idle   = väntar på att man trycker Starta.
// aimX   = ett sikte åker fram och tillbaka i sidled. Tryck låser sidled.
// aimY   = siktet åker upp och ner. Tryck låser höjden och skjuter.
// fly    = bollen flyger i en halv sekund och målvakten kastar sig.
// result = MÅL, RÄDDNING eller UTANFÖR visas i en sekund.
// Vid mål börjar det om på aimX med lite snabbare sikte. Annars blir fasen over och sviten är slut.

import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { BOYS } from '../lib/constants';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, FoldHeader } from './ui';

/* ---------- Straffläggning (HTML5 Canvas) ---------- */
// Spelplan i canvas-koordinater: målram, straffpunkt och målvaktens utgångsläge.
// Planens mått i canvasens egna koordinater (720 x 480): målets kanter, marklinjen, straffpunkten
// och var målvakten står från början.
const PK = { W: 720, H: 480, left: 140, right: 580, top: 90, ground: 300, ballX: 360, ballY: 430, keepX: 360, keepY: 245 };
// pingPong går från 0 upp till 1 och tillbaka till 0 om och om igen. Det får siktet att åka fram och tillbaka.
// lerp ger en punkt mellan a och b: t = 0 ger a, t = 1 ger b, t = 0.5 ger mitt emellan.
const pingPong = (x) => { const f = x % 2; return f < 1 ? f : 2 - f; };
const lerp = (a, b, t) => a + (b - a) * t;

// Ritar hela planen en gång: bakgrund, gräs, mål, målvakt, sikte, boll och text.
// cv = canvasen, g = spelets läge just nu. Körs ungefär 60 gånger per sekund av loopen längre ner.
function drawPenalty(cv, g) {
  const c = cv.getContext('2d');
  const { W, H, left, right, top, ground } = PK;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#020617'; c.fillRect(0, 0, W, ground);
  const grass = c.createLinearGradient(0, ground, 0, H);
  grass.addColorStop(0, '#047857'); grass.addColorStop(1, '#064e3b');
  c.fillStyle = grass; c.fillRect(0, ground, W, H - ground);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, ground); c.lineTo(W, ground); c.stroke();
  c.beginPath(); c.ellipse(PK.ballX, PK.ballY + 8, 26, 7, 0, 0, Math.PI * 2); c.stroke();

  // Nät och målram
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1;
  for (let x = left; x <= right; x += 22) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, ground); c.stroke(); }
  for (let y = top; y <= ground; y += 21) { c.beginPath(); c.moveTo(left, y); c.lineTo(right, y); c.stroke(); }
  c.strokeStyle = '#f8fafc'; c.lineWidth = 8; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(left, ground); c.lineTo(left, top); c.lineTo(right, top); c.lineTo(right, ground); c.stroke();

  // e är hur långt skottet har kommit, från 0 till 1. Formeln gör att rörelsen går fort i början och
  // bromsar in mot slutet. Samma e flyttar både bollen och målvakten.
  const moving = g.phase === 'fly' || g.phase === 'result';
  const e = moving ? 1 - (1 - g.p) * (1 - g.p) : 0;

  // Målvakt
  const kx = lerp(PK.keepX, g.kx, e);
  const ky = lerp(PK.keepY, g.ky, e);
  const lean = moving ? Math.max(-1.2, Math.min(1.2, (g.kx - PK.keepX) / 170)) * e : 0;
  c.save();
  c.translate(kx, ky); c.rotate(lean);
  c.strokeStyle = '#fbbf24'; c.lineWidth = 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-14, -22); c.lineTo(-34, -52); c.moveTo(14, -22); c.lineTo(34, -52); c.stroke();
  c.beginPath(); c.moveTo(-9, 30); c.lineTo(-13, 55); c.moveTo(9, 30); c.lineTo(13, 55); c.stroke();
  c.fillStyle = '#fbbf24'; c.fillRect(-18, -30, 36, 62);
  c.fillStyle = '#020617'; c.font = '900 22px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', 0, 0);
  c.fillStyle = '#fde68a'; c.beginPath(); c.arc(0, -44, 13, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#34d399';
  c.beginPath(); c.arc(-34, -54, 8, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(34, -54, 8, 0, Math.PI * 2); c.fill();
  c.restore();

  // Sikte
  if (g.phase === 'aimX' || g.phase === 'aimY') {
    const ax = g.phase === 'aimX' ? g.ax : g.tx;
    const ay = g.phase === 'aimY' ? g.ay : 195;
    c.strokeStyle = 'rgba(52,211,153,.55)'; c.lineWidth = 2; c.setLineDash([8, 8]);
    c.beginPath();
    if (g.phase === 'aimX') { c.moveTo(ax, 50); c.lineTo(ax, ground + 10); } else { c.moveTo(90, ay); c.lineTo(630, ay); }
    c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#34d399'; c.lineWidth = 4;
    c.beginPath(); c.arc(ax, ay, 18, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(ax - 26, ay); c.lineTo(ax + 26, ay); c.moveTo(ax, ay - 26); c.lineTo(ax, ay + 26); c.stroke();
  }

  // Boll
  const bx = moving ? lerp(PK.ballX, g.tx, e) : PK.ballX;
  const by = moving ? lerp(PK.ballY, g.ty, e) - Math.sin(Math.PI * g.p) * 18 : PK.ballY;
  const br = moving ? lerp(16, 10, e) : 16;
  c.fillStyle = '#f8fafc'; c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#020617'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#020617'; c.beginPath(); c.arc(bx, by, br * 0.35, 0, Math.PI * 2); c.fill();

  // Text på planen
  let text = '';
  let color = '#f8fafc';
  if (g.phase === 'idle') text = 'TRYCK PÅ STARTA';
  else if (g.phase === 'over') text = `SLUT: ${g.streak} MÅL I RAD`;
  else if (g.phase === 'result') {
    if (g.outcome === 'goal') { text = 'MÅL!'; color = '#34d399'; }
    else { text = g.outcome === 'save' ? 'RÄDDNING!' : 'UTANFÖR!'; color = '#f87171'; }
  }
  if (text) {
    c.font = `900 ${text.length > 10 ? 40 : 64}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 8; c.strokeStyle = '#020617'; c.strokeText(text, W / 2, 190);
    c.fillStyle = color; c.fillText(text, W / 2, 190);
  }
}

// Props: data = all delad data (här används data.scores, allas rekord), mut = funktionen som ändrar
// data, user = den inloggade.
export function Penalty({ data, mut, user }) {
  // cvRef pekar på canvasen på skärmen.
  const cvRef = useRef(null);
  // g = spelets läge: fas, starttid, svit, siktets läge (ax, ay), var skottet går (tx, ty), vart
  // målvakten kastar sig (kx, ky) och utfall. Ligger i en ref eftersom det ändras 60 gånger per
  // sekund, och då ska inte hela komponenten ritas om varje gång.
  const g = useRef({ phase: 'idle', t0: 0, p: 0, streak: 0, ax: 360, ay: 195, tx: 360, ty: 195, kx: PK.keepX, ky: PK.keepY, outcome: null });
  // ui = det av spelets läge som knappen och texten under planen behöver: fas, svit och om det blev rekord.
  const [ui, setUi] = useState({ phase: 'idle', streak: 0, record: false });
  // shown = om rutan är utfälld.
  const [shown, setShown] = useState(true);
  const scores = data.scores || {};
  const best = scores[user] || 0;
  // live håller senaste rekordet och senaste mut, så att loopen nedan (som startas en enda gång)
  // alltid når färska värden.
  const live = useRef({ best, mut });
  live.current = { best, mut };

  // SPELLOOPEN. Startar när komponenten visas och kör funktionen frame inför varje ny bild på skärmen.
  // Varje varv: räkna ut tiden sedan fasen började, flytta det som ska flyttas, och rita om planen.
  // Funktionen som returneras sist stoppar loopen när komponenten försvinner.
  useEffect(() => {
    let raf = 0;
    const frame = (now) => {
      const s = g.current;
      const t = (now - s.t0) / 1000;
      const speed = Math.min(2.2, 0.8 + s.streak * 0.12); // siktet går fortare för varje mål
      // Siktet flyttas: i sidled mellan x = 100 och 620, i höjdled mellan y = 290 och 60.
      if (s.phase === 'aimX') s.ax = 100 + 520 * pingPong(t * speed);
      else if (s.phase === 'aimY') s.ay = 290 - 230 * pingPong(t * speed * 1.15);
      else if (s.phase === 'fly') {
        // Bollen flyger: p går från 0 till 1 på en halv sekund. När den är framme räknas ett mål till sviten.
        s.p = Math.min(1, t / 0.5);
        if (s.p >= 1) {
          s.phase = 'result'; s.t0 = now;
          if (s.outcome === 'goal') { s.streak += 1; Sound.pop(s.streak * 3); Sound.burst(0, 0.5, 0.12, 'bandpass', 1200); }
          else Sound.error();
          setUi({ phase: 'result', streak: s.streak, record: false });
        }
      } else if (s.phase === 'result' && t > 1) {
        if (s.outcome === 'goal') {
          // Mål: en sekund har gått, börja sikta på nästa straff.
          s.phase = 'aimX'; s.t0 = now; s.p = 0;
          setUi({ phase: 'aimX', streak: s.streak, record: false });
        } else {
          // Miss eller räddning: sviten är slut. Blev den längre än det gamla rekordet sparas den.
          s.phase = 'over';
          const record = s.streak > live.current.best;
          if (record) {
            const n = s.streak;
            // SPARAR TILL SUPABASE: data.scores[user], mitt rekord. Kontrollen inuti gör att ett högre rekord
            // aldrig skrivs över av ett lägre.
            live.current.mut((d) => { if ((d.scores[user] || 0) < n) d.scores[user] = n; });
            Sound.fanfare();
            Confetti.burst(200);
          }
          setUi({ phase: 'over', streak: s.streak, record });
        }
      }
      if (cvRef.current) drawPenalty(cvRef.current, s);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [user]);

  // Körs när man trycker på knappen under planen. Vad som händer beror på fasen.
  const tap = () => {
    const s = g.current;
    const now = performance.now();
    if (s.phase === 'idle' || s.phase === 'over') {
      Sound.tap();
      // Starta eller Spela igen: nollställ sviten och börja sikta i sidled.
      s.streak = 0; s.p = 0; s.outcome = null; s.phase = 'aimX'; s.t0 = now;
      setUi({ phase: 'aimX', streak: 0, record: false });
    } else if (s.phase === 'aimX') {
      Sound.tap();
      // Lås sidled: spara var siktet stod (tx) och börja sikta i höjdled.
      s.tx = s.ax; s.phase = 'aimY'; s.t0 = now;
      setUi({ phase: 'aimY', streak: s.streak, record: false });
    } else if (s.phase === 'aimY') {
      // Skjut: spara höjden (ty) och avgör direkt hur det går. Sedan visas bara animationen.
      // 1. Målvakten "läser" skottet med 30 procents chans, plus 6 procentenheter per mål i sviten (högst 75).
      // 2. Läser han rätt kastar han sig nära siktet, annars mot en slumpad punkt i målet.
      // 3. Utanför målramen = miss. Inom räckhåll för målvakten = räddning. Annars mål.
      s.ty = s.ay;
      // Målvakten läser skytten bättre ju längre sviten är.
      const reads = Math.random() < Math.min(0.75, 0.3 + s.streak * 0.06);
      const kx = reads ? s.tx + (Math.random() * 140 - 70) : 170 + Math.random() * 380;
      const ky = reads ? s.ty + (Math.random() * 80 - 40) : 120 + Math.random() * 150;
      s.kx = Math.max(170, Math.min(550, kx));
      s.ky = Math.max(125, Math.min(250, ky));
      const inGoal = s.tx > PK.left + 12 && s.tx < PK.right - 12 && s.ty > PK.top + 12 && s.ty < PK.ground;
      const saved = Math.abs(s.tx - s.kx) < 62 && Math.abs(s.ty - s.ky) < 58;
      s.outcome = !inGoal ? 'miss' : saved ? 'save' : 'goal';
      s.phase = 'fly'; s.t0 = now; s.p = 0;
      Sound.kick();
      setUi({ phase: 'fly', streak: s.streak, record: false });
    }
  };

  const label = { idle: 'Starta', aimX: 'Lås sidled', aimY: 'Skjut', fly: 'Skott på väg', result: 'Vänta', over: 'Spela igen' }[ui.phase];
  const busy = ui.phase === 'fly' || ui.phase === 'result';
  // Topplistan: alla som har satt minst en straff, bäst först.
  const table = BOYS.filter((n) => scores[n] > 0).sort((a, b) => scores[b] - scores[a]);

  return (
    <Card>
      <FoldHeader
        icon={<Trophy className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
        title="Straffläggning"
        note={`Ditt rekord: ${best}`}
        open={shown}
        onToggle={() => setShown(!shown)}
      />
      {shown && (
      <div className="mt-3">
      <canvas
        ref={cvRef}
        width={PK.W}
        height={PK.H}
        role="img"
        aria-label="Straffläggning: mål med målvakt"
        className="block w-full h-auto rounded-xl border border-slate-700 select-none"
      />
      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1 min-w-0">
          <p className="font-black text-3xl leading-none tabular-nums text-amber-400">{ui.streak}<span className="text-sm text-slate-400 ml-1.5">mål i rad</span></p>
          <p className="text-xs text-slate-400 mt-1" role="status">
            {ui.phase === 'over' ? (ui.record ? 'Nytt personligt rekord!' : 'Sviten bröts. Försök igen.') : 'Ett tryck låser sidled, nästa tryck låser höjden och skjuter.'}
          </p>
        </div>
        <button type="button" onClick={tap} disabled={busy} className={cx(PRESS, 'rounded-xl px-5 py-3 font-bold shrink-0', busy ? 'bg-slate-800 text-slate-400' : cx('bg-amber-400 text-slate-950', GLOW_GOLD))}>
          {label}
        </button>
      </div>
      <h3 className={cx(DISPLAY, 'text-lg mt-4 mb-2')}>Topplista</h3>
      {table.length === 0 ? (
        <p className="text-sm text-slate-400">Ingen har satt en straff än.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {table.map((n, i) => (
            <li key={n} className={cx('flex items-center gap-3 rounded-xl bg-slate-950 border px-3 h-10', n === user ? 'border-amber-400' : 'border-slate-700')}>
              <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
              <Avatar name={n} size="sm" />
              <span className="font-semibold flex-1">{n}</span>
              <span className="font-black tabular-nums">{scores[n]}</span>
            </li>
          ))}
        </ol>
      )}
      </div>
      )}
    </Card>
  );
}
