// LAGKAPTEN-FLIKEN.
// Vad: hemlig röstning om vem som var kvällens lagkapten. En röst per person och kväll, motivering
// krävs, och man kan inte rösta på sig själv. Ställning och motiveringar är dolda tills en admin
// avslöjar kvällen i Admin-fliken.
// Var: andra fliken i flikraden.
// Används av: components/Shell.jsx.

import { useEffect, useRef, useState } from 'react';
import { Lock, Heart, EyeOff } from 'lucide-react';
import { BOYS, PLAYER, NIGHTS } from '../lib/constants';
import { cx, uid } from '../utils/helpers';
import { PRESS, GLOW_GOLD, GLOW_GREEN, STRIPE, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, Pop, SectionTitle, Segmented } from './ui';

/* ---------- Flik 2: Lagkapten Arena ---------- */
// Props: data = all delad data (här används data.votes och data.revealed),
// mut = funktionen som ändrar data, user = den inloggade.
export function Captain({ data, mut, user }) {
  // night = vilken kväll som visas. cand = den jag har tryckt på men inte röstat på än.
  // reason = min motivering. scope = om ställningen visar bara kvällen ('night') eller alla
  // avslöjade kvällar ihop ('total').
  const [night, setNight] = useState('tors');
  const [cand, setCand] = useState(null);
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState('night');
  const votes = data.votes[night];
  // mine = min röst för den valda kvällen, om jag redan har röstat.
  const mine = votes.find((v) => v.voter === user);
  const nightLabel = NIGHTS.find((n) => n.id === night).label;
  // Rösten får skickas först när en kandidat är vald och motiveringen har minst fem tecken.
  const ok = !!cand && reason.trim().length >= 5;
  // Ställning och motiveringar visas först när en admin har avslöjat kvällen i Admin-fliken.
  const revealed = !!data.revealed[night];
  const openNights = NIGHTS.filter((n) => data.revealed[n.id]);

  // Körs när man byter kväll (eller användare): tömmer vald kandidat och motivering.
  useEffect(() => { setCand(null); setReason(''); }, [night, user]);

  // Fira hos alla som har fliken öppen i ögonblicket kvällen avslöjas.
  const seen = useRef({ night, revealed });
  // Körs när kvällen eller dess avslöjande ändras. seen minns hur det såg ut förra gången. Har samma
  // kväll gått från dold till avslöjad sedan dess spelas fanfar och konfetti.
  useEffect(() => {
    if (seen.current.night === night && revealed && !seen.current.revealed) { Sound.fanfare(); Confetti.burst(220); }
    seen.current = { night, revealed };
  }, [night, revealed]);

  // Körs när man trycker Lås in röst.
  const submit = () => {
    if (!ok || mine) return;
    const vote = { id: uid(), voter: user, candidate: cand, reason: reason.trim(), likes: [], ts: Date.now() };
    // SPARAR TILL SUPABASE: data.votes för den valda kvällen. Kontrollen inuti gör att samma person
    // aldrig kan få två röster, även om knappen trycks två gånger eller synken kör ändringen igen.
    mut((d) => { if (!d.votes[night].some((v) => v.voter === user)) d.votes[night].push(vote); });
    Sound.fanfare();
    Confetti.burst(200);
  };
  // Körs när man trycker Gilla på en motivering.
  const like = (id) => {
    Sound.pop(6);
    // SPARAR TILL SUPABASE: data.votes. Mitt namn läggs till i röstens likes, eller tas bort om det redan finns.
    mut((d) => {
      const v = d.votes[night].find((x) => x.id === id);
      if (!v) return;
      v.likes = v.likes.includes(user) ? v.likes.filter((n) => n !== user) : v.likes.concat(user);
    });
  };

  // pool = de röster som ställningen räknas på. table = antal röster per person, flest först.
  // max används för att göra staplarna lagom långa.
  const pool = scope === 'night' ? votes : openNights.flatMap((n) => data.votes[n.id]);
  const table = BOYS.map((n) => ({ n, c: pool.filter((v) => v.candidate === n).length }))
    .sort((a, b) => b.c - a.c || BOYS.indexOf(a.n) - BOYS.indexOf(b.n));
  const max = Math.max(1, table[0].c);
  // Sant om en person leder ensam. Då får stapeln ett C som i kaptensbindel.
  const soleLeader = table[0].c > 0 && table[0].c > table[1].c;
  const feed = votes.slice().sort((a, b) => b.ts - a.ts);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Lagkapten Arena" title="Vem får bindeln?" />
      <Segmented label="Välj kväll" value={night} onChange={setNight} options={NIGHTS} />

      {mine ? (
        <Card className={GLOW_GREEN}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400 font-semibold">Rösten är låst för {nightLabel.toLowerCase()}</p>
              <p className={cx(DISPLAY, 'text-2xl mt-1')}>Du valde {mine.candidate}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3 break-words">Din motivering: {mine.reason}</p>
          <p className="text-xs text-slate-400 mt-2">En röst per person och kväll. Nästa chans kommer nästa kväll.</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-400 mb-3">
            <span className="text-slate-100 font-semibold">{user}</span>, du har en röst för {nightLabel.toLowerCase()}. Du kan inte rösta på dig själv.
          </p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kandidater">
            {BOYS.filter((n) => n !== user).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={cand === n}
                onClick={() => { Sound.tap(); setCand(n); }}
                className={cx(PRESS, 'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5', cand === n ? cx('border-amber-400 bg-amber-400/10', GLOW_GOLD) : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
              >
                <Avatar name={n} size="lg" />
                <span className="font-semibold text-xs sm:text-sm">{n}</span>
              </button>
            ))}
          </div>
          <label htmlFor="vote-reason" className="block text-sm font-semibold mt-4 mb-1.5">
            Varför förtjänar han bindeln? <span className="text-amber-400">Obligatoriskt</span>
          </label>
          <textarea
            id="vote-reason"
            rows={3}
            maxLength={240}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={cand ? `Vad gjorde ${cand} i dag?` : 'Välj en kandidat och motivera valet.'}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
          />
          <div className="flex items-center justify-between gap-3 mt-2">
            <span className="text-xs text-slate-400 tabular-nums">{reason.length}/240</span>
            <button
              type="button"
              onClick={submit}
              disabled={!ok}
              className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}
            >
              <Lock className="w-4 h-4" aria-hidden="true" /> Lås in röst
            </button>
          </div>
          {!ok && <p className="text-xs text-slate-400 mt-2 text-right">{!cand ? 'Välj en kandidat.' : 'Skriv minst fem tecken i motiveringen.'}</p>}
        </Card>
      )}

      {!revealed ? (
        <Card className={STRIPE}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-slate-800 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <EyeOff className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Hemlig omröstning</p>
              <p className={cx(DISPLAY, 'text-2xl mt-1 tabular-nums')}>{votes.length} av {BOYS.length} har röstat</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(votes.length / BOYS.length) * 100}%` }} />
          </div>
          <p className="text-sm text-slate-400 mt-3">
            Ställningen och motiveringarna för {nightLabel.toLowerCase()} är dolda tills Reseledningen avslöjar dem.
          </p>
        </Card>
      ) : (
      <>
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className={cx(DISPLAY, 'text-xl')}>Ställning</h3>
          <div className="w-44">
            <Segmented label="Omfång" value={scope} onChange={setScope} options={[{ id: 'night', label: nightLabel }, { id: 'total', label: 'Totalt' }]} />
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {table.map((r, i) => (
            <li key={r.n} className="flex items-center gap-2.5">
              <Avatar name={r.n} size="sm" />
              <span className="w-16 text-sm font-semibold truncate">{r.n}</span>
              <div className="flex-1 h-6 rounded-md bg-slate-950 overflow-hidden">
                <div className={cx('h-full rounded-md flex items-center justify-end pr-1.5 transition-all duration-500', PLAYER[r.n].bg)} style={{ width: `${(r.c / max) * 100}%` }}>
                  {i === 0 && soleLeader && <span className="text-[10px] font-black text-slate-950 bg-white/80 rounded px-1">C</span>}
                </div>
              </div>
              <span className="w-6 text-right font-black text-lg tabular-nums">{r.c}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-3 tabular-nums">
          {scope === 'night' ? `${votes.length} av ${BOYS.length} har röstat ${nightLabel.toLowerCase()}.` : `${pool.length} röster från ${openNights.length} ${openNights.length === 1 ? 'avslöjad kväll' : 'avslöjade kvällar'}.`}
        </p>
      </Card>

      <Card>
        <h3 className={cx(DISPLAY, 'text-xl mb-3')}>Motiveringar, {nightLabel.toLowerCase()}</h3>
        {feed.length === 0 ? (
          <p className="text-sm text-slate-400">Inga röster än. Bli först med att dela ut bindeln.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {feed.map((v) => {
              const liked = v.likes.includes(user);
              return (
                <Pop as="li" key={v.id} className="rounded-xl bg-slate-950 border border-slate-700 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Avatar name={v.voter} size="sm" />
                    <span className="font-semibold">{v.voter}</span>
                    <span className="text-slate-400">röstade på</span>
                    <span className={cx('font-semibold', PLAYER[v.candidate].text)}>{v.candidate}</span>
                  </div>
                  <p className="text-sm mt-2 break-words">{v.reason}</p>
                  <button
                    type="button"
                    onClick={() => like(v.id)}
                    aria-pressed={liked}
                    className={cx(PRESS, 'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold', liked ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-400 hover:text-slate-100')}
                  >
                    <Heart className={cx('w-3.5 h-3.5', liked && 'fill-current')} aria-hidden="true" /> Gilla · {v.likes.length}
                  </button>
                </Pop>
              );
            })}
          </ul>
        )}
      </Card>
      </>
      )}
    </div>
  );
}
