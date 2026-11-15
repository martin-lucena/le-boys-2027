// AVSLÖJANDESKÄRMEN.
// Vad: en stor skärm med fanfar och konfetti som säger "Hemsidan är öppen!" och har knappen Gå in.
// Var: visas för en deltagare som har väntsidan uppe i samma ögonblick som en admin låser upp
// hemsidan i Admin-fliken. Den dyker upp direkt, utan att sidan behöver laddas om.
// Används av: app/LeBoysApp.jsx, som också avgör när den ska visas.

import { useEffect } from 'react';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, STRIPE, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Pop } from './ui';

// Props: user = den inloggade deltagaren, onEnter = körs när man trycker Gå in (tar en till appen).
export function Reveal({ user, onEnter }) {
  // Körs en gång, när skärmen dyker upp: fanfar och konfetti. Har deltagaren inte rört skärmen
  // sedan sidan laddades kan webbläsaren stoppa ljudet, men konfettin visas alltid.
  useEffect(() => {
    Sound.fanfare();
    Confetti.burst(240);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <Pop className={cx('w-full max-w-sm rounded-3xl border border-amber-400 bg-slate-900 p-6 text-center', GLOW_GOLD, STRIPE)}>
        <p className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">Reseledningen har låst upp</p>
        <div className="flex justify-center my-5"><Avatar name={user} size="xl" /></div>
        <h1 className={cx(DISPLAY, 'text-5xl')}>Hemsidan <span className="text-amber-400">är öppen!</span></h1>
        <p className="mt-4 text-slate-200">{user}, nu får du se agendan och alla verktyg.</p>
        <button type="button" autoFocus onClick={() => { Sound.tap(); onEnter(); }} className={cx(PRESS, 'mt-6 w-full rounded-xl bg-amber-400 text-slate-950 font-black uppercase text-lg py-3', GLOW_GOLD)}>
          Gå in
        </button>
      </Pop>
    </main>
  );
}
