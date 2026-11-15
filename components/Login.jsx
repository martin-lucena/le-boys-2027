// INLOGGNINGEN.
// Vad: välj ditt namn, skriv ditt lösenord. Vid fel skakar kortet och ett felljud spelas.
// Var: det första man ser när man inte är inloggad.
// Används av: app/LeBoysApp.jsx.

import { useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { ACCOUNTS } from '../lib/config';
import { BOYS } from '../lib/constants';
import { cx, animate } from '../utils/helpers';
import { PRESS, GLOW_GOLD, STRIPE, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar } from './ui';

/* ---------- Inloggning ---------- */
// Props: onLogin = funktion som körs med namnet när inloggningen lyckas.
export function Login({ onLogin }) {
  // name = namnet man har tryckt på. pw = det man skrivit i lösenordsrutan. msg = felmeddelandet som visas.
  const [name, setName] = useState(null);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  // cardRef pekar på själva kortet på skärmen, så att det kan skakas vid fel.
  const cardRef = useRef(null);

  // Körs vid fel: spelar felljud, visar meddelandet m och skakar kortet i sidled.
  const fail = (m) => {
    Sound.error();
    setMsg(m);
    animate(cardRef.current, [
      { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' },
      { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
    ], { duration: 450, easing: 'ease-in-out' });
  };
  // Körs när man trycker Logga in (eller Enter). Kontrollerar att ett namn är valt och att lösenordet
  // stämmer exakt med det i ACCOUNTS (lib/config.js). Stämmer det: fanfar, konfetti och onLogin.
  const submit = (e) => {
    e.preventDefault();
    if (!name) { fail('Välj ditt namn först.'); return; }
    if (pw !== ACCOUNTS[name].pw) { setPw(''); fail(`Fel lösenord för ${name}. Tänk på stora och små bokstäver.`); return; }
    Sound.fanfare();
    Confetti.burst(120);
    onLogin(name);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div ref={cardRef} className={cx('w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 overflow-hidden', GLOW_GOLD)}>
        <div className={cx('px-6 pt-7 pb-5 border-b border-dashed border-slate-700', STRIPE)}>
          <p className="text-[11px] tracking-[0.3em] uppercase text-emerald-400 font-semibold">VIP · Matchday pass</p>
          <h1 className={cx(DISPLAY, 'text-5xl mt-2')}>Le boys<br /><span className="text-amber-400">på språng</span></h1>
          <p className="font-bold text-lg text-slate-400 mt-2 tabular-nums">2027 · Tors–Sön · 8 spelare</p>
        </div>
        <form onSubmit={submit} className="px-6 py-6 flex flex-col gap-3">
          <p id="login-who" className="text-sm text-slate-400">Vem är du?</p>
          <div role="radiogroup" aria-labelledby="login-who" className="grid grid-cols-4 gap-2">
            {BOYS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={name === n}
                onClick={() => { Sound.tap(); setName(n); setMsg(''); }}
                className={cx(PRESS, 'flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-semibold', name === n ? 'border-amber-400 bg-amber-400/10 text-slate-100' : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-100')}
              >
                <Avatar name={n} />
                {n}
              </button>
            ))}
          </div>
          <label htmlFor="login-pw" className="text-sm text-slate-400 mt-1">
            {name ? `Personligt lösenord för ${name}` : 'Personligt lösenord'}
          </label>
          <div className="flex gap-2">
            <input
              id="login-pw"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••"
              className={cx('flex-1 min-w-0 rounded-xl bg-slate-950 border px-4 py-3 text-lg text-slate-100 focus:outline-none focus:border-amber-400', msg ? 'border-red-400' : 'border-slate-700')}
            />
            <button type="submit" className={cx(PRESS, 'rounded-xl bg-amber-400 text-slate-950 font-bold px-4 flex items-center gap-2')}>
              <Lock className="w-4 h-4" aria-hidden="true" /> Logga in
            </button>
          </div>
          <p role="alert" className={cx('text-sm min-h-5', msg ? 'text-red-400' : 'text-slate-400')}>
            {msg || 'Bara truppen kommer in.'}
          </p>
        </form>
      </div>
    </main>
  );
}
