// GISSA RESMÅLET.
// Vad: GuessBox är rutan "Vart ska vi?" där man gissar stad. GuessList är listan med allas gissningar.
// Var: båda visas på väntsidan. GuessList visas också längst ner i Agenda-fliken.
// Används av: components/Classified.jsx (båda) och components/Shell.jsx (GuessList).
// Datan kommer från hooks/useIntel.js, inte från den vanliga delade datan.

import { useState } from 'react';
import { Lock, Plane, Pencil } from 'lucide-react';
import { PARTICIPANTS, PLAYER } from '../lib/constants';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, Pop, FoldHeader } from './ui';

/* ---------- Destinationsgissningar ---------- */

// Props: user = den inloggade, guesses = alla gissningar, saveGuess = funktion som sparar en gissning.
export function GuessBox({ user, guesses, saveGuess }) {
  // mine = min egen gissning, om jag har gjort någon.
  const mine = guesses.find((g) => g.author === user);
  // editing = håller jag på att ändra min gissning? city och reason = det som står i fälten.
  // msg = felmeddelande. busy = sant medan gissningen sparas. shown = om rutan är utfälld.
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(true);
  // Formuläret visas om jag inte har gissat än, eller om jag har tryckt Ändra gissning.
  const open = !mine || editing;
  const ok = city.trim().length >= 2;

  // Körs när man trycker Ändra gissning: fyller fälten med den gamla gissningen och öppnar formuläret.
  const startEdit = () => {
    Sound.tap();
    setCity(mine.city); setReason(mine.reason || '');
    setEditing(true);
  };
  // Körs när man trycker Lås in gissning. saveGuess SPARAR TILL SUPABASE (tabellen guesses).
  // Går det bra: fanfar och konfetti. Går det fel: felljud och ett meddelande.
  const submit = async (e) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setMsg('');
    try {
      // country skickas tom eftersom kolumnen finns kvar i tabellen och inte får vara null.
      await saveGuess({ author: user, country: '', city: city.trim(), reason: reason.trim() || null });
      setEditing(false);
      Sound.fanfare();
      Confetti.burst(160);
    } catch (err) {
      Sound.error();
      setMsg('Gissningen kunde inte sparas. Kontrollera nätet och försök igen.');
    } finally {
      setBusy(false);
    }
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';

  return (
    <Card>
      <FoldHeader
        icon={<Plane className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />}
        title="Vart ska vi?"
        note={mine ? 'Gissat' : 'Ej gissat'}
        open={shown}
        onToggle={() => setShown(!shown)}
      />
      {shown && (
      <div className="mt-3">
      {!open ? (
        <div className={cx('rounded-xl bg-slate-950 border border-amber-400 p-3', GLOW_GOLD)}>
          <p className="text-xs uppercase tracking-[0.18em] text-amber-400 font-semibold">Din gissning är inlåst</p>
          <p className={cx(DISPLAY, 'text-2xl mt-1 break-words')}>{mine.city}</p>
          {mine.reason && <p className="text-sm text-slate-400 mt-2 break-words">{mine.reason}</p>}
          <button type="button" onClick={startEdit} className={cx(PRESS, 'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-400')}>
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Ändra gissning
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">Gissa vilken stad vi ska till. Du kan ändra dig fram till avresan.</p>
          <div>
            <label htmlFor="guess-city" className="block text-xs font-semibold text-slate-400 mb-1">Stad</label>
            <input id="guess-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="t.ex. Lissabon" className={field} />
          </div>
          <div>
            <label htmlFor="guess-reason" className="block text-xs font-semibold text-slate-400 mb-1">Motivering <span className="text-slate-500">Frivilligt</span></label>
            <textarea id="guess-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={cx(field, 'resize-none')} />
          </div>
          <div className="flex items-center justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => { Sound.tap(); setEditing(false); }} className="text-sm text-slate-400 hover:text-slate-100 px-2">Avbryt</button>
            )}
            <button type="submit" disabled={!ok || busy} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-5 py-3 font-bold', ok && !busy ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              <Lock className="w-4 h-4" aria-hidden="true" /> {busy ? 'Sparar' : 'Lås in gissning'}
            </button>
          </div>
          <p role="alert" className="text-sm text-red-400 min-h-5">{msg || (!ok && city ? 'Skriv minst två tecken i stad.' : '')}</p>
        </form>
      )}
      </div>
      )}
    </Card>
  );
}

// GuessList: allas gissningar. Den egna får guldram.
// Props: guesses = alla gissningar, user = den inloggade.
export function GuessList({ guesses, user }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className={cx(DISPLAY, 'text-xl')}>Gissningar</h3>
        <span className="text-xs text-slate-400 tabular-nums">{guesses.length} av {PARTICIPANTS.length} har gissat</span>
      </div>
      {guesses.length === 0 ? (
        <p className="text-sm text-slate-400">Ingen har gissat än.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guesses.map((g) => (
            <Pop as="li" key={g.author} className={cx('flex items-start gap-2.5 rounded-xl bg-slate-950 border px-3 py-2.5', g.author === user ? 'border-amber-400' : 'border-slate-700')}>
              <Avatar name={g.author} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-semibold">{g.author}</span> <span className="text-slate-400">tror på</span> <span className={cx('font-semibold', PLAYER[g.author].text)}>{g.city}</span></p>
                {g.reason && <p className="text-xs text-slate-400 mt-1 break-words">{g.reason}</p>}
              </div>
            </Pop>
          ))}
        </ul>
      )}
    </Card>
  );
}
