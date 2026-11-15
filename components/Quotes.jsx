// KVÄLLENS CITAT.
// Vad: spara roliga saker som sagts, vem som sa det, och ge skratt till andras citat.
// Var: under Mer-menyn.
// Används av: components/Shell.jsx.

import { useState } from 'react';
import { X, Quote, Laugh } from 'lucide-react';
import { BOYS, isAdmin, PLAYER } from '../lib/constants';
import { cx, uid, dayTime } from '../utils/helpers';
import { PRESS } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Avatar, Card, Pop, SectionTitle } from './ui';

/* ---------- Kvällens citat ---------- */
// Props: data = delad data (här används data.quotes), mut = funktionen som ändrar data, user = den inloggade.
export function QuotesTab({ data, mut, user }) {
  // who = vem som sa citatet (vald i listan). text = citatet man har skrivit.
  const [who, setWho] = useState(BOYS[0]);
  const [text, setText] = useState('');
  const quotes = data.quotes.slice().sort((a, b) => b.ts - a.ts);
  const ok = text.trim().length >= 3;

  // Körs när man trycker Spara citat.
  const submit = (e) => {
    e.preventDefault();
    if (!ok) return;
    const quote = { id: uid(), who, text: text.trim(), by: user, laughs: [], ts: Date.now() };
    // SPARAR TILL SUPABASE: data.quotes, ett nytt citat läggs till.
    mut((d) => { d.quotes.push(quote); });
    Sound.pop(12);
    setText('');
  };
  // Körs när man trycker på skrattknappen.
  const laugh = (id) => {
    Sound.pop(8);
    // SPARAR TILL SUPABASE: data.quotes. Mitt namn läggs till i citatets laughs, eller tas bort om det redan finns.
    mut((d) => {
      const q = d.quotes.find((x) => x.id === id);
      if (!q) return;
      q.laughs = q.laughs.includes(user) ? q.laughs.filter((n) => n !== user) : q.laughs.concat(user);
    });
  };
  // Körs när man trycker på krysset. SPARAR TILL SUPABASE: citatet tas bort ur data.quotes.
  const remove = (id) => { Sound.tap(); mut((d) => { d.quotes = d.quotes.filter((q) => q.id !== id); }); };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Kvällens citat" title="Vad sa han nu?" />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div>
            <label htmlFor="quote-who" className="block text-xs font-semibold text-slate-400 mb-1">Vem sa det?</label>
            <select id="quote-who" value={who} onChange={(e) => setWho(e.target.value)} className={field}>
              {BOYS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quote-text" className="block text-xs font-semibold text-slate-400 mb-1">Citatet, ordagrant</label>
            <textarea id="quote-text" rows={2} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} className={cx(field, 'resize-none')} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={!ok} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Quote className="w-4 h-4" aria-hidden="true" /> Spara citat
            </button>
          </div>
        </form>
      </Card>

      {quotes.length === 0 ? (
        <Card><p className="text-sm text-slate-400">Inga citat än. Lyssna noga i kväll.</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {quotes.map((q) => {
            const mine = q.laughs.includes(user);
            return (
              <Pop as="li" key={q.id} className={cx('rounded-2xl bg-slate-900/90 border border-slate-700 border-l-4 p-4', PLAYER[q.who].border)}>
                <p className="text-lg font-semibold leading-snug break-words">”{q.text}”</p>
                <div className="flex items-center gap-2 mt-3">
                  <Avatar name={q.who} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={cx('text-sm font-bold', PLAYER[q.who].text)}>{q.who}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{dayTime(q.ts)} · inlagt av {q.by}</p>
                  </div>
                  <button type="button" onClick={() => laugh(q.id)} aria-pressed={mine} className={cx(PRESS, 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums', mine ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-slate-700 text-slate-400 hover:text-slate-100')}>
                    <Laugh className="w-3.5 h-3.5" aria-hidden="true" /> {q.laughs.length}
                  </button>
                  {/* ADMIN-KONTROLL: krysset visas för den som lade in citatet, samt för Martin och Malte. */}
                  {(q.by === user || isAdmin(user)) && (
                    <button type="button" onClick={() => remove(q.id)} aria-label="Ta bort citatet" className="text-slate-400 hover:text-red-400">
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </Pop>
            );
          })}
        </ul>
      )}
    </div>
  );
}
