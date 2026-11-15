// BÖTESRUMMET.
// Vad: FinesTab = anmäl en bot, se syndaregistret och de senaste böterna. FineReview = adminrutan där
// böter godkänns eller avslås. En bot räknas först när en admin har godkänt den.
// Var: FinesTab under Mer-menyn, FineReview i Admin-fliken.
// Används av: components/Shell.jsx (FinesTab) och components/AdminTab.jsx (FineReview).
// Här spelas medvetet inga ljud.

import { useState } from 'react';
import { Check, X, Gavel } from 'lucide-react';
import { POINTS } from '../lib/config';
import { BOYS, isAdmin, PLAYER } from '../lib/constants';
import { cx, uid, dayTime } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Avatar, Card, Pop, SectionTitle } from './ui';

/* ---------- Bötesrummet ---------- */
// Props: data = delad data (här används data.fines), mut = funktionen som ändrar data, user = den inloggade.
export function FinesTab({ data, mut, user }) {
  // to = den man har valt att bötfälla. reason = brottet man har skrivit.
  const [to, setTo] = useState(null);
  const [reason, setReason] = useState('');
  const fines = data.fines;
  const ok = !!to && reason.trim().length >= 3;
  // Syndaregistret: antal godkända böter per person, flest först.
  const table = BOYS.map((n) => ({ n, c: fines.filter((f) => f.approved && f.to === n).length })).sort((a, b) => b.c - a.c || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
  const max = Math.max(1, table[0].c);
  const soleWorst = table[0].c > 0 && table[0].c > table[1].c;
  const feed = fines.slice().sort((a, b) => b.ts - a.ts);

  // Körs när man trycker Dela ut bot.
  const submit = (e) => {
    e.preventDefault();
    if (!ok) return;
    const fine = { id: uid(), from: user, to, reason: reason.trim(), ts: Date.now(), approved: false };
    // SPARAR TILL SUPABASE: data.fines. Boten läggs till med approved: false, alltså i väntan på admin.
    mut((d) => { d.fines.push(fine); });
    setTo(null);
    setReason('');
  };
  // Körs när man trycker på krysset vid en bot. SPARAR TILL SUPABASE: boten tas bort ur data.fines.
  const remove = (id) => { mut((d) => { d.fines = d.fines.filter((f) => f.id !== id); }); };

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Bötesrummet" title="Vem ska bötfällas?" />
      <Card>
        <form onSubmit={submit}>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Vem får böterna">
            {BOYS.filter((n) => n !== user).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={to === n}
                onClick={() => setTo(n)}
                className={cx(PRESS, 'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5', to === n ? 'border-red-400 bg-red-400/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
              >
                <Avatar name={n} size="lg" />
                <span className="font-semibold text-xs sm:text-sm">{n}</span>
              </button>
            ))}
          </div>
          <label htmlFor="fine-reason" className="block text-sm font-semibold mt-4 mb-1.5">Brott <span className="text-amber-400">Obligatoriskt</span></label>
          <input id="fine-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} placeholder={to ? `Vad har ${to} gjort?` : 't.ex. Kom sent till frukosten'} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400" />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-xs text-slate-400">Boten gäller först när Reseledningen har godkänt den. Då ger den {POINTS.fine} poäng i totaltabellen.</p>
            <button type="submit" disabled={!ok} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold shrink-0', ok ? 'bg-red-400 text-slate-950' : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Gavel className="w-4 h-4" aria-hidden="true" /> Dela ut bot
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Syndaregistret</h3>
        <ul className="flex flex-col gap-2">
          {table.map((r, i) => (
            <li key={r.n} className="flex items-center gap-2.5">
              <Avatar name={r.n} size="sm" />
              <span className="w-16 text-sm font-semibold truncate">{r.n}</span>
              <div className="flex-1 h-6 rounded-md bg-slate-950 overflow-hidden">
                <div className="h-full rounded-md bg-red-400 flex items-center justify-end pr-1.5 transition-all duration-500" style={{ width: `${(r.c / max) * 100}%` }}>
                  {i === 0 && soleWorst && <span className="text-[10px] font-black text-slate-950 bg-white/80 rounded px-1">VÄRST</span>}
                </div>
              </div>
              <span className="w-6 text-right font-black text-lg tabular-nums">{r.c}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Senaste böterna</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-slate-400">Inga böter än. Någon gör snart bort sig.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {feed.map((f) => (
              <Pop as="li" key={f.id} className={cx('rounded-xl bg-slate-950 border border-slate-700 border-l-4 px-3 py-2.5', f.approved ? 'border-l-red-400' : 'border-l-amber-400')}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className={cx('font-semibold', PLAYER[f.to].text)}>{f.to}</span> <span className="text-slate-400">bötfälld av</span> <span className="font-semibold">{f.from}</span>
                    </p>
                    <p className="text-sm mt-1 break-words">{f.reason}</p>
                    <p className="text-[11px] mt-1 tabular-nums">
                      <span className="text-slate-500">{dayTime(f.ts)} · </span>
                      <span className={cx('font-semibold', f.approved ? 'text-red-400' : 'text-amber-400')}>{f.approved ? 'Godkänd' : 'Väntar på Reseledningen'}</span>
                    </p>
                  </div>
                  {/* ADMIN-KONTROLL: krysset visas för den som anmälde boten, samt för Martin och Malte. */}
                  {(f.from === user || isAdmin(user)) && (
                    <button type="button" onClick={() => remove(f.id)} aria-label="Ta bort boten" className="text-slate-400 hover:text-red-400 shrink-0">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </Pop>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// Admin: böter som väntar på godkännande.
// Visas bara i Admin-fliken, som bara Martin och Malte kommer åt.
// Props: data och mut = delad data och funktionen som ändrar den.
export function FineReview({ data, mut }) {
  const pending = data.fines.filter((f) => !f.approved).sort((a, b) => a.ts - b.ts);
  // approve körs vid Godkänn bot, reject vid Avslå. Båda SPARAR TILL SUPABASE i data.fines:
  // approve sätter approved till true (boten börjar räknas), reject tar bort boten.
  const approve = (id) => { mut((d) => { const f = d.fines.find((x) => x.id === id); if (f) f.approved = true; }); };
  const reject = (id) => { mut((d) => { d.fines = d.fines.filter((x) => x.id !== id); }); };
  const small = 'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold';
  return (
    <Card className={pending.length ? GLOW_GOLD : ''}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h3 className={cx(DISPLAY, 'text-xl')}>Böter att godkänna</h3>
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{pending.length} väntar</span>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400 mt-2">Inga böter väntar. Nya förslag dyker upp här direkt.</p>
      ) : (
        <ul className="flex flex-col gap-2 mt-3">
          {pending.map((f) => (
            <li key={f.id} className="rounded-xl bg-slate-950 border border-amber-400 px-3 py-2.5">
              <p className="text-sm">
                <span className={cx('font-semibold', PLAYER[f.to].text)}>{f.to}</span> <span className="text-slate-400">anmäld av</span> <span className="font-semibold">{f.from}</span>
                <span className="text-[11px] text-slate-500 tabular-nums"> · {dayTime(f.ts)}</span>
              </p>
              <p className="text-sm mt-1 break-words">{f.reason}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button type="button" onClick={() => approve(f.id)} className={cx(small, 'bg-red-400 text-slate-950 border-red-400')}>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Godkänn bot
                </button>
                <button type="button" onClick={() => reject(f.id)} className={cx(small, 'border-slate-700 text-slate-300')}>
                  <X className="w-3.5 h-3.5" aria-hidden="true" /> Avslå
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
