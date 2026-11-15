// KONFETTI.
// Vad: skjuter ut konfetti över hela skärmen. Ritas på en egen genomskinlig yta (canvas) ovanpå appen.
// Var: vid inloggning, röstning, rekord, vinst i rouletten och avslöjanden.
// Används av: Login, Guesses, Penalty, Agenda, Captain, Roulette, PubGolf, Missions och AdminTab.

import { reducedMotion } from './helpers';

/* ---------- Konfetti (HTML5 Canvas) ---------- */
// Anropas som Confetti.burst(antal bitar).
export const Confetti = (() => {
  let cv = null;
  let c2 = null;
  let parts = [];
  let raf = 0;
  const palette = ['#fbbf24', '#34d399', '#ffffff', '#38bdf8', '#f472b6', '#fef3c7'];
  // Körs ungefär 60 gånger per sekund så länge det finns bitar kvar: varje bit faller lite, snurrar
  // och bleknar. När alla bitar är borta stannar loopen av sig själv.
  const loop = () => {
    c2.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 30);
    parts.forEach((p) => {
      p.vy += 0.24; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      c2.save();
      c2.translate(p.x, p.y);
      c2.rotate(p.rot);
      c2.globalAlpha = Math.min(1, p.life / 30);
      c2.fillStyle = p.col;
      c2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)) + 1);
      c2.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; c2.clearRect(0, 0, cv.width, cv.height); }
  };
  return {
    // Skapar n nya bitar mitt på skärmen med slumpad riktning och fart, och startar loopen.
    // Gör ingenting om användaren har bett om minskade rörelser.
    burst(n = 160) {
      if (typeof document === 'undefined' || reducedMotion()) return;
      if (!cv) {
        cv = document.createElement('canvas');
        cv.className = 'fixed inset-0 w-full h-full pointer-events-none z-[60]';
        cv.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cv);
        c2 = cv.getContext('2d');
      }
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      const ox = cv.width / 2;
      const oy = cv.height * 0.38;
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 11;
        parts.push({
          x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5,
          w: 5 + Math.random() * 7, h: 8 + Math.random() * 8,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          col: palette[i % palette.length], life: 90 + Math.random() * 70,
        });
      }
      if (!raf) raf = requestAnimationFrame(loop);
    },
  };
})();
