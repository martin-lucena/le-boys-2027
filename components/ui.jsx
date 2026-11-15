// SMÅ BYGGKLOSSAR.
// Vad: återanvända delar av gränssnittet: Avatar (färgad cirkel med initialer), Card (ruta),
// Pop (innehåll som poppar in), SectionTitle (sidrubrik), Segmented (växlare mellan val),
// Countdown (nedräkning) och FoldHeader (rubrik som fäller ihop en ruta).
// Var: överallt i appen.
// Används av: alla andra filer i components/.
//
// ORDLISTA FÖR REACT:
// - En komponent är en funktion som ger tillbaka det som ska visas. Den körs om varje gång något ändras.
// - Props är det man skickar in till en komponent, som inställningar: <Avatar name="Max" size="lg" />.
// - useState ger ett värde som komponenten kommer ihåg, plus en funktion som ändrar det.
//   När värdet ändras ritas komponenten om.
// - useEffect kör kod efter att komponenten har ritats. Listan sist ([a, b]) säger när: bara när
//   något i listan har ändrats. Tom lista ([]) betyder en gång, när komponenten först visas.
// - useRef är en låda som behåller sitt innehåll utan att komponenten ritas om när det ändras.

import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { PLAYER } from '../lib/constants';
import { cx, popIn } from '../utils/helpers';
import { PRESS, GLOW_GREEN, STRIPE, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { useNow } from '../hooks/useNow';

/* ---------- Småkomponenter ---------- */
const AVATAR_SIZE = {
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-8 h-8 text-sm',
  lg: 'w-11 h-11 text-lg',
  xl: 'w-20 h-20 text-4xl',
};
// Avatar: färgad cirkel med personens initialer.
// Props: name = personens namn (styr färg och bokstäver), size = 'sm', 'md', 'lg' eller 'xl'.
export function Avatar({ name, size = 'md' }) {
  return (
    <span title={name} className={cx('inline-flex items-center justify-center rounded-full font-black text-slate-950 shrink-0', PLAYER[name].bg, AVATAR_SIZE[size])}>
      {PLAYER[name].tag}
    </span>
  );
}

// Card: en ruta med rundade hörn och ram.
// Props: children = innehållet, className = extra utseende (till exempel glöd).
export function Card({ children, className }) {
  return <section className={cx('rounded-2xl border border-slate-700 bg-slate-900/90 p-4', className)}>{children}</section>;
}

// Pop: visar sitt innehåll med en liten "poppa in"-animation första gången det dyker upp.
// Props: children = innehållet, className = utseende, as = vilken sorts element det ska vara
// (div om inget anges), övriga props skickas vidare till elementet.
export function Pop({ children, className, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  // Körs en gång när elementet först visas: spelar animationen.
  useEffect(() => { popIn(ref.current); }, []);
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

// SectionTitle: rubriken högst upp på varje flik.
// Props: kicker = liten grön text ovanför, title = den stora rubriken, right = valfritt innehåll till höger.
export function SectionTitle({ kicker, title, right }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-semibold">{kicker}</p>
        <h2 className={cx(DISPLAY, 'text-3xl mt-1')}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

// Segmented: en rad med knappar där en är vald (till exempel Tors / Fre / Lör).
// Props: options = valen ({ id, label }), value = id för det valda, onChange = körs med det nya
// id:t när man trycker, label = beskrivning för skärmläsare.
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-700">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => { Sound.tap(); onChange(o.id); }}
          className={cx(PRESS, 'flex-1 px-2 py-2 rounded-lg text-sm font-semibold whitespace-nowrap', value === o.id ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-100')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Countdown: nedräkning i dagar, timmar, minuter och sekunder. Ritas om varje sekund via useNow.
// Props: target = tidpunkten att räkna ner till, label = rubriken, sub = texten under,
// big = större siffror (används på väntsidan).
export function Countdown({ target, label, sub, big }) {
  const now = useNow();
  const ms = Math.max(0, target - now);
  const parts = [
    ['dagar', Math.floor(ms / 864e5)],
    ['tim', Math.floor(ms / 36e5) % 24],
    ['min', Math.floor(ms / 6e4) % 60],
    ['sek', Math.floor(ms / 1e3) % 60],
  ];
  return (
    <div className={cx('rounded-2xl border border-slate-700 bg-slate-900 p-4', STRIPE, GLOW_GREEN)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping motion-reduce:animate-none" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </span>
        <p className="text-xs tracking-[0.2em] uppercase font-semibold text-emerald-400">{label}</p>
      </div>
      <div className="grid grid-cols-4 gap-2" role="timer" aria-label={label}>
        {parts.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-950 border border-slate-700 py-2 text-center">
            <div className={cx('font-black leading-none tabular-nums text-amber-400', big ? 'text-5xl sm:text-6xl py-2' : 'text-4xl')}>
              {String(v).padStart(2, '0')}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mt-1">{l}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-400 mt-3">{sub}</p>
    </div>
  );
}

// Rubrik som fäller ihop och fäller ut en ruta. Pilen visar att den går att trycka på.
// Props: icon = ikonen till vänster, title = rubriken, note = liten statustext under rubriken,
// open = om rutan är utfälld just nu, onToggle = körs när man trycker på rubriken.
export function FoldHeader({ icon, title, note, open, onToggle }) {
  return (
    <h2>
      <button
        type="button"
        onClick={() => { Sound.tap(); onToggle(); }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
      >
        {icon}
        <span className="flex-1 min-w-0">
          <span className={cx(DISPLAY, 'block text-2xl break-words')}>{title}</span>
          {note && <span className="block text-xs font-normal normal-case tracking-normal text-slate-400 tabular-nums mt-1">{note}</span>}
        </span>
        <span className={cx('w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors', open ? 'border-slate-700 text-slate-300' : 'border-amber-400 text-amber-400')}>
          <ChevronDown className={cx('w-5 h-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
    </h2>
  );
}
