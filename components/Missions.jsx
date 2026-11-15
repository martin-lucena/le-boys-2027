// HEMLIGA UPPDRAG.
// Vad: fyra delar. MyMission = mitt eget uppdrag med knappen Klar. MissionBoard = tavlan som visar
// vilka som är klara och när (aldrig själva uppdragstexterna). MissionTab = hela Uppdrag-fliken.
// MissionAdmin = adminrutan där uppdrag delas ut och bedöms.
// Var: Uppdrag-fliken, väntsidan och Admin-fliken.
// Används av: components/Shell.jsx (MissionTab), components/Classified.jsx (MyMission och MissionBoard)
// och components/AdminTab.jsx (MissionAdmin).
// All data ligger i data.missions: en del per dag, med tasks (uppdragstexter), done (klartider),
// proof (bevis) och verdict (admins dom: 'ok' eller 'fail').

import { useState } from 'react';
import { Check, X, RotateCcw, Trash2, Target, Clock } from 'lucide-react';
import { POINTS } from '../lib/config';
import { BOYS, DAYS } from '../lib/constants';
import { cx, clockTime } from '../utils/helpers';
import { PRESS, GLOW_GOLD, GLOW_GREEN, STRIPE, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { Avatar, Card, Pop, SectionTitle, Segmented } from './ui';
import { activeMissionDay, approvedMissions } from '../lib/missions';

// Det egna uppdraget: man ser bara sitt eget.
// Props: data och mut = delad data och funktionen som ändrar den, user = den inloggade,
// day = vilken dags uppdrag som visas (tors, fre, lor eller son).
export function MyMission({ data, mut, user, day }) {
  const m = data.missions.days[day];
  const text = m.tasks[user];
  const doneAt = m.done[user];
  const verdict = m.verdict[user];
  const dayLabel = DAYS.find((d) => d.id === day).label;
  // proof = det man skrivit i fältet Bevis.
  const [proof, setProof] = useState('');

  // Körs när man trycker Klar! Stämplar tiden just nu.
  const finish = (e) => {
    e.preventDefault();
    if (!text || doneAt) return;
    const ts = new Date().toISOString();
    const p = proof.trim();
    // Sätts bara om det inte redan finns en tid, så första bekräftelsen gäller.
    // SPARAR TILL SUPABASE: data.missions för dagen. Min klartid sätts i done och beviset i proof.
    mut((d) => {
      const t = d.missions.days[day];
      if (t.tasks[user] && !t.done[user]) { t.done[user] = ts; if (p) t.proof[user] = p; }
    });
    setProof('');
    Sound.fanfare();
    Confetti.burst(200);
  };

  return (
    <Card className={cx(STRIPE, verdict === 'ok' ? GLOW_GREEN : GLOW_GOLD)}>
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
        <h2 className={cx(DISPLAY, 'text-2xl flex-1 min-w-0')}>Ditt hemliga uppdrag</h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold shrink-0">{dayLabel}</span>
      </div>
      {!text ? (
        <p className="text-sm text-slate-400 mt-3">Du har inget uppdrag i dag. Njut av friheten så länge den varar.</p>
      ) : (
        <>
          <p className="mt-3 rounded-xl bg-slate-950 border border-slate-700 px-3 py-3 text-slate-100 break-words whitespace-pre-wrap">{text}</p>
          <p className="text-xs text-slate-400 mt-2">Bara du ser texten. De andra ser bara om och när du blev klar.</p>
          {doneAt ? (
            <div className={cx('mt-3 rounded-xl border px-3 py-2.5', verdict === 'ok' ? 'bg-emerald-400/10 border-emerald-400' : verdict === 'fail' ? 'bg-red-400/10 border-red-400' : 'bg-amber-400/10 border-amber-400')}>
              <p className="font-semibold">
                Inskickat <span className="tabular-nums">kl. {clockTime(doneAt)}</span>
              </p>
              <p className={cx('text-sm mt-0.5', verdict === 'ok' ? 'text-emerald-400' : verdict === 'fail' ? 'text-red-400' : 'text-amber-400')}>
                {verdict === 'ok' ? `Godkänt av Reseledningen: +${POINTS.mission} poäng.` : verdict === 'fail' ? 'Underkänt. Be Reseledningen återställa det om du vill försöka igen.' : 'Väntar på att Reseledningen godkänner.'}
              </p>
              {m.proof[user] && <p className="text-sm text-slate-300 mt-1 break-words">Ditt bevis: {m.proof[user]}</p>}
            </div>
          ) : (
            <form onSubmit={finish} className="mt-3 flex flex-col gap-2">
              <label htmlFor="mission-proof" className="block text-xs font-semibold text-slate-400">Bevis <span className="text-slate-500">Frivilligt: vem såg det, vad hände?</span></label>
              <input id="mission-proof" value={proof} onChange={(e) => setProof(e.target.value)} maxLength={140} className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400" />
              <button type="submit" className={cx(PRESS, 'w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-black uppercase text-lg py-3', GLOW_GOLD)}>
                <Check className="w-5 h-5" aria-hidden="true" /> Klar!
              </button>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

// Gemensam tavla: vilka som är klara, i vilken ordning och exakt när. Uppdragstexterna visas inte.
// Props: data = delad data, user = den inloggade (får guldram), day = vilken dag som visas.
export function MissionBoard({ data, user, day }) {
  const m = data.missions.days[day];
  const players = BOYS.filter((n) => m.tasks[n]);
  // done = klara (godkända eller i väntan på dom), i tidsordning. failed = underkända.
  // waiting = har uppdrag men är inte klara. first = den som var först med ett godkänt uppdrag.
  const done = players.filter((n) => m.done[n] && m.verdict[n] !== 'fail').sort((a, b) => new Date(m.done[a]) - new Date(m.done[b]));
  const failed = players.filter((n) => m.done[n] && m.verdict[n] === 'fail');
  const waiting = players.filter((n) => !m.done[n]);
  const first = approvedMissions(m)[0];
  const dayLabel = DAYS.find((d) => d.id === day).label;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className={cx(DISPLAY, 'text-xl')}>Uppdragstavlan, {dayLabel.toLowerCase()}</h3>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{done.length} av {players.length} klara</span>
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-slate-400">Inga uppdrag är utdelade för {dayLabel.toLowerCase()} än.</p>
      ) : (
        <>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(done.length / players.length) * 100}%` }} />
          </div>
          <ol className="flex flex-col gap-1.5">
            {done.map((n, i) => {
              const ok = m.verdict[n] === 'ok';
              return (
                <Pop as="li" key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : ok ? 'border-emerald-400/60' : 'border-slate-700')}>
                  <span className="font-black text-lg w-5 tabular-nums text-amber-400">{i + 1}</span>
                  <Avatar name={n} size="sm" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{n}</span>
                    <span className={cx('block text-[11px] font-semibold', ok ? 'text-emerald-400' : 'text-amber-400')}>
                      {ok ? `Godkänd · +${POINTS.mission + (n === first ? POINTS.missionFirst : 0)} p${n === first ? ' (först)' : ''}` : 'Väntar på godkännande'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-slate-100 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" /> {clockTime(m.done[n])}
                  </span>
                </Pop>
              );
            })}
            {failed.map((n) => (
              <li key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : 'border-red-400/60')}>
                <span className="w-5 text-red-400 font-black">×</span>
                <Avatar name={n} size="sm" />
                <span className="font-semibold flex-1 min-w-0 truncate text-slate-300">{n}</span>
                <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">Underkänd</span>
              </li>
            ))}
            {waiting.map((n) => (
              <li key={n} className={cx('flex items-center gap-2.5 rounded-xl bg-slate-950 border px-3 py-2', n === user ? 'border-amber-400' : 'border-slate-700')}>
                <span className="w-5 text-slate-600 font-black">–</span>
                <Avatar name={n} size="sm" />
                <span className="font-semibold flex-1 min-w-0 truncate text-slate-300">{n}</span>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Inte klar</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}

// Flik: Uppdrag. Det egna uppdraget och den gemensamma tavlan, för alla.
// Props: data och mut = delad data och funktionen som ändrar den, user = den inloggade.
export function MissionTab({ data, mut, user }) {
  // day = dagen vars uppdrag gäller just nu, eller null. Se lib/missions.js.
  const day = activeMissionDay(data.missions, Date.now());
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle kicker="Hemliga uppdrag" title={day ? DAYS.find((d) => d.id === day).label : 'Uppdrag'} />
      {day ? (
        <>
          <MyMission data={data} mut={mut} user={user} day={day} />
          <MissionBoard data={data} user={user} day={day} />
        </>
      ) : (
        <Card className={STRIPE}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-slate-800 border border-amber-400 text-amber-400 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={cx(DISPLAY, 'text-2xl')}>Inga uppdrag just nu</p>
              <p className="text-sm text-slate-400 mt-1">Reseledningen delar ut hemliga uppdrag under resan. Håll utkik här.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Admin: dela ut uppdrag per dag, till en person eller gemensamt till alla, och godkänn eller underkänn.
// Visas bara i Admin-fliken, som bara Martin och Malte kommer åt.
// Props: data och mut = delad data och funktionen som ändrar den.
export function MissionAdmin({ data, mut }) {
  // day = dagen man delar ut för. who = mottagare ('alla' eller ett namn). text = uppdragstexten.
  // msg = kvittot som visas en stund efter utdelning.
  const [day, setDay] = useState('tors');
  const [who, setWho] = useState('alla');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const m = data.missions.days[day];
  const dayLabel = DAYS.find((d) => d.id === day).label;
  const current = activeMissionDay(data.missions, Date.now());
  // Visar ett kvitto i 2,5 sekunder.
  const say = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };

  // Körs när man trycker Dela ut.
  const assign = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const targets = who === 'alla' ? BOYS : [who];
    // SPARAR TILL SUPABASE: data.missions. Uppdragstexten skrivs in i tasks för mottagaren, eller för alla åtta.
    mut((d) => { targets.forEach((n) => { d.missions.days[day].tasks[n] = t; }); });
    Sound.pop(10);
    setText('');
    say(who === 'alla' ? `Gemensamt uppdrag utdelat till alla för ${dayLabel.toLowerCase()}.` : `Uppdrag utdelat till ${who} för ${dayLabel.toLowerCase()}.`);
  };
  // Körs när man trycker Godkänn eller Underkänn. SPARAR TILL SUPABASE: verdict för personen den dagen.
  const judge = (n, v) => {
    if (v === 'ok') Sound.pop(14); else Sound.error();
    mut((d) => { const t = d.missions.days[day]; if (t.done[n]) t.verdict[n] = v; });
  };
  // Körs när man trycker Låt försöka igen. SPARAR TILL SUPABASE: tar bort klartid, bevis och dom,
  // men uppdraget finns kvar.
  const reopen = (n) => {
    Sound.tap();
    mut((d) => { const t = d.missions.days[day]; delete t.done[n]; delete t.proof[n]; delete t.verdict[n]; });
  };
  // Körs när man trycker på papperskorgen. SPARAR TILL SUPABASE: tar bort uppdraget helt för personen den dagen.
  const remove = (n) => {
    Sound.tap();
    mut((d) => { const t = d.missions.days[day]; delete t.tasks[n]; delete t.done[n]; delete t.proof[n]; delete t.verdict[n]; });
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';
  const small = 'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold';

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
        <h3 className={cx(DISPLAY, 'text-xl')}>Hemliga uppdrag</h3>
      </div>

      <p className="text-xs font-semibold text-slate-400 mt-4 mb-1.5">Vilken dags uppdrag visas för gänget</p>
      <Segmented
        label="Aktiv uppdragsdag"
        value={data.missions.active}
        // SPARAR TILL SUPABASE: data.missions.active, vilken dags uppdrag som visas för gänget.
        onChange={(v) => mut((d) => { d.missions.active = v; })}
        options={[{ id: 'auto', label: 'Auto' }, { id: 'off', label: 'Av' }].concat(DAYS.map((d) => ({ id: d.id, label: d.short })))}
      />
      <p className="text-xs text-slate-400 mt-1.5">
        {data.missions.active === 'auto' ? 'Auto följer resans datum. ' : ''}
        Visas just nu: <span className="font-semibold text-slate-100">{current ? DAYS.find((d) => d.id === current).label : 'inget uppdrag'}</span>
      </p>

      <p className="text-xs font-semibold text-slate-400 mt-5 mb-1.5">Dela ut uppdrag för</p>
      <Segmented label="Dag att dela ut för" value={day} onChange={setDay} options={DAYS.map((d) => ({ id: d.id, label: d.short }))} />
      <form onSubmit={assign} className="flex flex-col gap-2 mt-3">
        <div>
          <label htmlFor="mission-who" className="block text-xs font-semibold text-slate-400 mb-1">Till</label>
          <select id="mission-who" value={who} onChange={(e) => setWho(e.target.value)} className={field}>
            <option value="alla">Alla (gemensamt uppdrag)</option>
            {BOYS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mission-text" className="block text-xs font-semibold text-slate-400 mb-1">Uppdrag</label>
          <textarea id="mission-text" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="t.ex. Få någon att säga ordet ananas före lunch" className={cx(field, 'resize-none')} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-emerald-400 min-h-4" role="status">{msg}</p>
          <button type="submit" disabled={!text.trim()} className={cx(PRESS, 'rounded-xl px-5 py-2.5 font-bold shrink-0', text.trim() ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400')}>
            Dela ut
          </button>
        </div>
      </form>

      <h4 className="text-xs font-semibold text-slate-400 mt-5 mb-1.5">Utdelat för {dayLabel.toLowerCase()}</h4>
      <ul className="flex flex-col gap-1.5">
        {BOYS.map((n) => {
          const v = m.verdict[n];
          return (
            <li key={n} className={cx('rounded-xl bg-slate-950 border px-3 py-2', m.done[n] && !v ? 'border-amber-400' : 'border-slate-700')}>
              <div className="flex items-start gap-2.5">
                <Avatar name={n} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {n}
                    {m.done[n] && (
                      <span className={cx('ml-2 text-xs font-bold tabular-nums', v === 'ok' ? 'text-emerald-400' : v === 'fail' ? 'text-red-400' : 'text-amber-400')}>
                        {v === 'ok' ? 'Godkänd' : v === 'fail' ? 'Underkänd' : 'Väntar'} · {clockTime(m.done[n])}
                      </span>
                    )}
                  </p>
                  <p className={cx('text-sm break-words', m.tasks[n] ? 'text-slate-300' : 'text-slate-500 italic')}>{m.tasks[n] || 'Inget uppdrag'}</p>
                  {m.proof[n] && <p className="text-xs text-slate-400 mt-1 break-words">Bevis: {m.proof[n]}</p>}
                </div>
                {m.tasks[n] && (
                  <button type="button" onClick={() => remove(n)} aria-label={`Ta bort uppdraget för ${n}`} title="Ta bort uppdrag" className="text-slate-400 hover:text-red-400 shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              {m.done[n] && (
                <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
                  <button type="button" onClick={() => judge(n, 'ok')} aria-pressed={v === 'ok'} className={cx(small, v === 'ok' ? 'bg-emerald-400 text-slate-950 border-emerald-400' : 'border-emerald-400 text-emerald-400')}>
                    <Check className="w-3 h-3" aria-hidden="true" /> Godkänn
                  </button>
                  <button type="button" onClick={() => judge(n, 'fail')} aria-pressed={v === 'fail'} className={cx(small, v === 'fail' ? 'bg-red-400 text-slate-950 border-red-400' : 'border-red-400 text-red-400')}>
                    <X className="w-3 h-3" aria-hidden="true" /> Underkänn
                  </button>
                  <button type="button" onClick={() => reopen(n)} className={cx(small, 'border-slate-700 text-slate-300')}>
                    <RotateCcw className="w-3 h-3" aria-hidden="true" /> Låt försöka igen
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
