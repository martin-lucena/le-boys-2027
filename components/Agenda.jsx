// AGENDA-FLIKEN.
// Vad: nedräkning till nästa punkt och en tidslinje per dag (tors till sön). Varje punkt kan fällas
// ut och har en hype-mätare och incheckning.
// Var: första fliken i flikraden.
// Används av: components/Shell.jsx.
// Agendan (tider och texter) ligger i den delade datan, data.agenda, och synkas till alla i
// realtid. DAYS i lib/constants.js är bara startvärdet och ger dagarnas namn. Se lib/agenda.js.
// Admins (Martin och Malte) kan redigera agendan här med knappen Redigera agenda:
// ändra, ta bort och lägga till programpunkter.
// När resmålet är satt finns också knappen "Se avslöjandet igen" under nedräkningen.

import { useMemo, useState } from 'react';
import { Check, ChevronDown, MapPin, Shirt, Pencil, Plus, Trash2, Plane } from 'lucide-react';
import { BOYS, DAYS, isAdmin } from '../lib/constants';
import { TIME_RE, sortAgenda, tripStartTime } from '../lib/agenda';
import { cx, uid, itemDate, dayTime } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Confetti } from '../utils/confetti';
import { HYPE_MAX } from '../utils/storage';
import { Avatar, Pop, SectionTitle, Segmented, Countdown } from './ui';
import { useNow } from '../hooks/useNow';

/* ---------- Flik 1: Agenda ---------- */
// Hype-mätaren är full vid HYPE_MAX (25, står i utils/storage.js) och kan inte gå högre.
// hypeLabel ger texten bredvid mätaren utifrån antalet.
const hypeLabel = (n) => (n >= HYPE_MAX ? 'Eld i berget' : n >= 16 ? 'Kokar' : n >= 8 ? 'Varmt' : n >= 1 ? 'Ljummet' : 'Kallt');

// AgendaItem: en punkt i tidslinjen. Används bara av Agenda längre ner i filen.
// Props: item = punkten (tid, titel, plats ...), status = 'next', 'now' eller 'done',
// open = om den är utfälld, onToggle = körs när man trycker på raden,
// data och mut = delad data och funktionen som ändrar den, user = den inloggade,
// goTab = byter flik (används av knappen Öppna), links = flikarna som en punkt får länka till.
// Bara i redigeringsläget (admins): editing = visa knapparna Ändra och Ta bort,
// armed = Ta bort är tryckt en gång och väntar på bekräftelse,
// onEdit = körs vid Ändra, onDelete = körs vid Ta bort.
function AgendaItem({ item, status, open, onToggle, data, mut, user, goTab, links, editing, armed, onEdit, onDelete }) {
  const hype = data.hype[item.id] || 0;
  const here = data.checkins[item.id] || [];
  const mine = here.includes(user);
  // flames = de små eldar som just nu flyger upp från hype-knappen. Varje eld tas bort efter 0,8 sekunder.
  const [flames, setFlames] = useState([]);
  const pct = Math.min(100, (hype / HYPE_MAX) * 100);
  // Knappen Öppna visas bara om punkten länkar till en flik som faktiskt finns.
  const hasLink = !!item.tab && links.some((l) => l.id === item.tab);

  // full = mätaren står på max. Då är eldknappen avstängd och texten "Fullt!" visas.
  const full = hype >= HYPE_MAX;

  // Körs när man trycker på eldknappen. Fanfar och konfetti när mätaren blir full.
  const addHype = () => {
    // Full mätare: gör ingenting alls, varken ljud, eldar eller sparning.
    if (full) return;
    Sound.pop(hype);
    if (hype + 1 === HYPE_MAX) { Sound.fanfare(); Confetti.burst(120); }
    // SPARAR TILL SUPABASE: data.hype, antalet för den här punkten ökar med ett, men aldrig över HYPE_MAX.
    // Kontrollen görs här inne mot det färska värdet, eftersom mut kan köras om när flera trycker
    // samtidigt. Har någon annan hunnit fylla mätaren händer då ingenting.
    mut((d) => {
      const cur = d.hype[item.id] || 0;
      if (cur < HYPE_MAX) d.hype[item.id] = cur + 1;
    });
    const id = uid();
    setFlames((f) => f.concat(id));
    setTimeout(() => setFlames((f) => f.filter((x) => x !== id)), 800);
  };
  // Körs när man trycker Checka in eller Incheckad.
  const toggleIn = () => {
    Sound.tap();
    // SPARAR TILL SUPABASE: data.checkins. Mitt namn läggs till i punktens lista, eller tas bort om det redan finns där.
    mut((d) => {
      const l = d.checkins[item.id] || [];
      d.checkins[item.id] = l.includes(user) ? l.filter((n) => n !== user) : l.concat(user);
    });
  };

  return (
    <li className="relative pl-8">
      <span className={cx('absolute left-1 top-5 w-3.5 h-3.5 rounded-full border-2', status === 'now' ? 'bg-emerald-400 border-emerald-400 animate-pulse motion-reduce:animate-none' : status === 'done' ? 'bg-slate-700 border-slate-700' : 'bg-slate-950 border-amber-400')} />
      <div className={cx('rounded-2xl border bg-slate-900 transition-colors', open ? 'border-amber-400' : 'border-slate-700 hover:border-slate-500', status === 'done' && !open && 'opacity-60')}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 p-3 text-left rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
          <span className="font-black text-xl tabular-nums text-amber-400 w-14 shrink-0">{item.time}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold leading-tight">{item.title}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
              <span>🔥 {hype}</span>
              <span>{here.length}/{BOYS.length} incheckade</span>
              {status === 'now' && <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold uppercase tracking-wider">Nu</span>}
              {status === 'done' && <span className="uppercase tracking-wider">Klart</span>}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={cx('w-5 h-5 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>
        {/* Visas bara på punkter som en admin har lagt till eller ändrat i appen. */}
        {item.by && (
          <p className="px-3 pb-2 -mt-1 text-[11px] text-slate-500 tabular-nums">Senast ändrad av {item.by}, {dayTime(item.ts)}</p>
        )}
        {/* ADMIN-KONTROLL: editing kan bara bli sant för Martin och Malte (se Agenda längre ner). */}
        {editing && (
          <div className="flex flex-wrap gap-2 px-3 pb-3">
            <button type="button" onClick={onEdit} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border border-amber-400 text-amber-400 px-3 py-2 text-xs font-bold')}>
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Ändra
            </button>
            <button type="button" onClick={onDelete} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold', armed ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-slate-700 text-slate-300 hover:border-red-400 hover:text-red-400')}>
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> {armed ? 'Tryck igen för att ta bort' : 'Ta bort'}
            </button>
          </div>
        )}
        {open && (
          <Pop className="px-3 pb-3 flex flex-col gap-3">
            <p className="text-sm text-slate-200">{item.text}</p>
            <dl className="flex flex-col gap-1.5 text-sm">
              {/* Plats och dresscode är frivilliga på punkter som läggs till i appen, så raderna visas bara om de är ifyllda. */}
              {item.place && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">Plats</dt>
                  <dd>{item.place}</dd>
                </div>
              )}
              {item.dress && (
                <div className="flex items-start gap-2">
                  <Shirt className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <dt className="sr-only">Dresscode</dt>
                  <dd className="text-amber-400">{item.dress}</dd>
                </div>
              )}
            </dl>

            <div className="rounded-xl bg-slate-950 border border-slate-700 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="uppercase tracking-[0.18em] text-slate-400 font-semibold">Hype-mätare</span>
                <span className={cx('font-bold', pct >= 100 ? 'text-amber-400' : 'text-slate-100')}>{hypeLabel(hype)} · {hype}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#fbbf24,#fb923c)] transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                {/* Vid full mätare är knappen avstängd (disabled) och nedtonad, utan tryckkänsla och guldkant. */}
                <button type="button" onClick={addHype} disabled={full} aria-label={full ? 'Hypen är full' : 'Höj hypen'} className={cx('relative w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-2xl', full ? 'opacity-30 grayscale cursor-not-allowed' : cx(PRESS, 'hover:border-amber-400'))}>
                  🔥
                  {flames.map((f) => (
                    <span key={f} aria-hidden="true" className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none motion-reduce:hidden">🔥</span>
                  ))}
                </button>
              </div>
              {full && <p className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-400 text-right">Fullt!</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleIn} className={cx(PRESS, 'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold border', mine ? 'bg-emerald-400 text-slate-950 border-emerald-400' : 'border-emerald-400 text-emerald-400 hover:bg-emerald-400/10')}>
                <Check className="w-4 h-4" aria-hidden="true" /> {mine ? 'Incheckad' : 'Checka in'}
              </button>
              <div className="flex -space-x-2">{here.map((n) => <Avatar key={n} name={n} />)}</div>
              {hasLink && (
                <button type="button" onClick={() => goTab(item.tab)} className={cx(PRESS, 'ml-auto rounded-xl px-3 py-2 text-sm font-bold bg-amber-400 text-slate-950')}>Öppna</button>
              )}
            </div>
          </Pop>
        )}
      </div>
    </li>
  );
}

// AgendaEditor: rutan där en admin fyller i en programpunkt. Öppnas av Ändra och Lägg till punkt.
// Props: form = punktens värden när rutan öppnas (id är null för en ny punkt),
// dayLabel = dagens namn (visas överst), links = flikarna man kan länka till,
// onSave = körs med de ifyllda värdena när man trycker Spara, onCancel = körs vid Avbryt.
function AgendaEditor({ form, dayLabel, links, onSave, onCancel }) {
  // f = det som står i fälten just nu. Startar med punktens nuvarande värden.
  const [f, setF] = useState(form);
  // Ger en funktion som uppdaterar ett av fälten när man skriver i det.
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });
  // Tid och titel är obligatoriska. Tiden måste se ut som 09:30.
  const ok = TIME_RE.test(f.time) && f.title.trim().length > 0;
  // Körs när man trycker Spara (eller Enter i ett fält).
  const submit = (e) => {
    e.preventDefault();
    if (ok) onSave(f);
  };
  const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400';
  const label = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <Pop
        role="dialog"
        aria-modal="true"
        aria-label={form.id ? 'Ändra programpunkt' : 'Ny programpunkt'}
        className={cx('w-full max-w-sm max-h-full overflow-y-auto rounded-3xl bg-slate-900 border border-amber-400 p-5', GLOW_GOLD)}
      >
        <p className="text-[11px] tracking-[0.22em] uppercase text-emerald-400 font-semibold">{dayLabel}</p>
        <h3 className={cx(DISPLAY, 'text-2xl mt-1')}>{form.id ? 'Ändra punkt' : 'Ny punkt'}</h3>
        <form onSubmit={submit} className="flex flex-col gap-3 mt-4">
          <div>
            <label htmlFor="agenda-time" className={label}>Tid <span className="text-amber-400">Obligatoriskt</span></label>
            <input id="agenda-time" type="time" required value={f.time} onChange={set('time')} className={cx(field, 'scheme-dark')} />
          </div>
          <div>
            <label htmlFor="agenda-title" className={label}>Titel <span className="text-amber-400">Obligatoriskt</span></label>
            <input id="agenda-title" value={f.title} onChange={set('title')} maxLength={80} className={field} />
          </div>
          <div>
            <label htmlFor="agenda-place" className={label}>Plats</label>
            <input id="agenda-place" value={f.place} onChange={set('place')} maxLength={80} className={field} />
          </div>
          <div>
            <label htmlFor="agenda-dress" className={label}>Dresscode</label>
            <input id="agenda-dress" value={f.dress} onChange={set('dress')} maxLength={120} className={field} />
          </div>
          <div>
            <label htmlFor="agenda-text" className={label}>Beskrivning</label>
            <textarea id="agenda-text" rows={3} value={f.text} onChange={set('text')} maxLength={300} className={cx(field, 'resize-none')} />
          </div>
          <div>
            <label htmlFor="agenda-tab" className={label}>Länk till flik</label>
            <select id="agenda-tab" value={f.tab} onChange={set('tab')} className={field}>
              <option value="">Ingen</option>
              {links.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-100 px-2">Avbryt</button>
            <button type="submit" disabled={!ok} className={cx(PRESS, 'rounded-xl px-5 py-3 font-bold', ok ? cx('bg-amber-400 text-slate-950', GLOW_GOLD) : 'bg-slate-800 text-slate-400 cursor-not-allowed')}>
              Spara
            </button>
          </div>
          {!ok && <p className="text-xs text-slate-400 text-right">Fyll i tid och titel.</p>}
        </form>
      </Pop>
    </div>
  );
}

// Agenda: hela fliken.
// Props: data och mut = delad data och funktionen som ändrar den, user = den inloggade,
// goTab = funktion som byter flik, links = flikarna som en programpunkt kan länka till
// ({ id, label }, skickas från components/Shell.jsx),
// onReplay = visar avslöjandet av resmålet igen (kommer från app/LeBoysApp.jsx via Shell).
export function Agenda({ data, mut, user, goTab, links, onReplay }) {
  // now = tiden just nu. Uppdateras varje sekund, så nedräkningen och Nu-markeringen följer klockan.
  const now = useNow();
  // all = alla punkter från alla dagar i en lång lista, med exakt starttid för var och en.
  // Punkterna läses från den delade datan (data.agenda), inte från DAYS, så ändringar som en admin
  // gör syns direkt hos alla. Varje dags lista är redan sorterad efter klockslag.
  // useMemo gör att listan bara räknas om när agendan har ändrats.
  const all = useMemo(
    () => DAYS.flatMap((d, di) => data.agenda[d.id].map((it) => ({ it, di, at: itemDate(di, it.time).getTime() }))),
    [data.agenda],
  );
  // Resan börjar vid torsdagens första punkt i agendan. Ändrar en admin den tiden följer
  // nedräkningen "Avspark om" med. startTime är klockslaget som text, start är exakt tidpunkt.
  const startTime = tripStartTime(data.agenda);
  const start = itemDate(0, startTime).getTime();
  // Resan räknas som slut två timmar efter sista punkten. Är agendan helt tom finns ingen sista punkt.
  const last = all[all.length - 1];
  const end = last ? last.at + 2 * 36e5 : start;
  const next = all.find((a) => a.at > now);
  // day = vilken dag som visas (0 = torsdag). Startar på dagens dag om resan pågår, annars torsdag.
  const [day, setDay] = useState(() => {
    const t = Date.now();
    return t >= start && t <= end ? Math.min(3, Math.floor((t - itemDate(0, '00:00').getTime()) / 864e5)) : 0;
  });
  // open = id för den punkt som är utfälld, eller null.
  const [open, setOpen] = useState(null);
  // ADMIN-KONTROLL: bara Martin och Malte får redigera agendan.
  const canEdit = isAdmin(user);
  // editing = är redigeringsläget påslaget? Det visar knapparna Ändra, Ta bort och Lägg till punkt.
  const [editing, setEditing] = useState(false);
  // form = punkten som just nu redigeras i rutan (null = rutan är stängd).
  const [form, setForm] = useState(null);
  // armedId = id för den punkt där Ta bort är tryckt en gång och väntar på ett andra tryck.
  const [armedId, setArmedId] = useState(null);

  // Körs när man trycker Lägg till punkt: öppnar rutan med tomma fält för dagen som visas.
  const startAdd = () => {
    Sound.tap();
    setForm({ id: null, dayId: DAYS[day].id, time: '12:00', title: '', place: '', dress: '', text: '', tab: '' });
  };
  // Körs när man trycker Ändra på en punkt: öppnar rutan med punktens nuvarande värden.
  const startEdit = (it) => {
    Sound.tap();
    setForm({ id: it.id, dayId: DAYS[day].id, time: it.time, title: it.title, place: it.place || '', dress: it.dress || '', text: it.text || '', tab: it.tab || '' });
  };
  // Körs när man trycker Spara i rutan. f = det som står i fälten.
  const saveItem = (f) => {
    if (!canEdit) return; // admin-kontroll en gång till, innan något sparas
    const fields = { time: f.time, title: f.title.trim(), place: f.place.trim(), dress: f.dress.trim(), text: f.text.trim() };
    if (f.tab) fields.tab = f.tab;
    // Vem som ändrade och när. Visas som "Senast ändrad av ..." under punkten.
    const stamp = { by: user, ts: Date.now() };
    // En ny punkt får ett nytt unikt id. Det skapas här, utanför mut, så att punkten får samma id
    // även om synken behöver köra ändringen en gång till.
    const id = f.id || uid();
    // SPARAR TILL SUPABASE: data.agenda för dagen. En befintlig punkt uppdateras, en ny läggs till.
    // Sedan sorteras dagens punkter efter klockslag.
    mut((d) => {
      const list = d.agenda[f.dayId];
      const it = list.find((x) => x.id === id);
      if (it) {
        Object.assign(it, fields, stamp);
        if (!fields.tab) delete it.tab; // länken togs bort i rutan
      } else if (!f.id) {
        list.push({ id, ...fields, ...stamp });
      } else {
        return; // punkten har tagits bort av någon annan under tiden: gör ingenting
      }
      sortAgenda(list);
    });
    Sound.pop(10);
    setForm(null);
  };
  // Körs när man trycker Ta bort på en punkt. Första trycket laddar knappen i tre sekunder,
  // andra trycket tar bort punkten.
  const removeItem = (id) => {
    if (!canEdit) return; // admin-kontroll en gång till, innan något tas bort
    Sound.tap();
    if (armedId !== id) {
      setArmedId(id);
      setTimeout(() => setArmedId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setArmedId(null);
    if (open === id) setOpen(null);
    const dayId = DAYS[day].id;
    // SPARAR TILL SUPABASE: punkten tas bort ur data.agenda, och dess hype och incheckningar
    // tas bort ur data.hype och data.checkins så att inget skräp blir kvar.
    mut((d) => {
      d.agenda[dayId] = d.agenda[dayId].filter((x) => x.id !== id);
      delete d.hype[id];
      delete d.checkins[id];
    });
  };

  // Avgör en punkts status: 'next' om den inte har börjat, 'now' från starttiden tills nästa punkt
  // samma dag börjar (dagens sista punkt räknas i två timmar), därefter 'done'.
  const statusOf = (a) => {
    if (now < a.at) return 'next';
    const i = all.indexOf(a);
    const until = all[i + 1] && all[i + 1].di === a.di ? all[i + 1].at : a.at + 2 * 36e5;
    return now < until ? 'now' : 'done';
  };
  const fmt = new Date(start).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Vad nedräkningen ska visa: före resan räknar den ner till samlingen, under resan till nästa punkt,
  // och efter sista punkten visas Slutsignal.
  let cd;
  if (now < start) cd = { target: start, label: 'Avspark om', sub: `Samling ${fmt} kl. ${startTime}.` };
  else if (next) cd = { target: next.at, label: 'Nästa punkt om', sub: `${DAYS[next.di].label} ${next.it.time} · ${next.it.title}` };
  else cd = { target: now, label: 'Slutsignal', sub: 'Resan är spelad. Tack för i år, grabbar.' };

  const dayItems = all.filter((a) => a.di === day);
  const doneCount = dayItems.filter((a) => statusOf(a) === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      <Countdown {...cd} />
      {/* Visas först när resmålet är satt (data.destination.city). Öppnar helskärmen i
          components/Reveal.jsx en gång till, med nedräkning, flygplan och avgångstavla. */}
      {data.destination.city && (
        <button type="button" onClick={() => { Sound.tap(); onReplay(); }} className={cx(PRESS, 'self-start flex items-center gap-2 rounded-xl border border-slate-700 text-slate-100 hover:border-amber-400 px-3 py-2 text-xs font-bold')}>
          <Plane className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> Se avslöjandet igen
        </button>
      )}
      <SectionTitle
        kicker="Agenda (Tors–Sön)"
        title={DAYS[day].label}
        // ADMIN-KONTROLL: knappen som slår på och av redigeringsläget visas bara för Martin och Malte.
        right={canEdit ? (
          <button
            type="button"
            onClick={() => { Sound.tap(); setEditing(!editing); setArmedId(null); }}
            aria-pressed={editing}
            className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shrink-0', editing ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-slate-700 text-slate-100 hover:border-amber-400')}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {editing ? 'Sluta redigera' : 'Redigera agenda'}
          </button>
        ) : null}
      />
      <Segmented label="Välj dag" value={day} onChange={(v) => { setDay(v); setOpen(null); setArmedId(null); }} options={DAYS.map((x, i) => ({ id: i, label: x.short }))} />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          {/* En dag kan vara tom om en admin har tagit bort alla punkter. Då är mätaren tom i stället för att dela med noll. */}
          <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${dayItems.length ? (doneCount / dayItems.length) * 100 : 0}%` }} />
        </div>
        <span className="tabular-nums">{doneCount}/{dayItems.length} avklarade</span>
      </div>
      {dayItems.length === 0 ? (
        <p className="text-sm text-slate-400">Inga punkter den här dagen.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
          {dayItems.map((a) => (
            <AgendaItem
              key={a.it.id}
              item={a.it}
              status={statusOf(a)}
              open={open === a.it.id}
              onToggle={() => { Sound.tap(); setOpen(open === a.it.id ? null : a.it.id); }}
              data={data}
              mut={mut}
              user={user}
              goTab={goTab}
              links={links}
              editing={canEdit && editing}
              armed={armedId === a.it.id}
              onEdit={() => startEdit(a.it)}
              onDelete={() => removeItem(a.it.id)}
            />
          ))}
        </ol>
      )}
      {/* ADMIN-KONTROLL: Lägg till punkt visas bara för Martin och Malte, och bara i redigeringsläget. */}
      {canEdit && editing && (
        <button type="button" onClick={startAdd} className={cx(PRESS, 'flex items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-400 text-amber-400 px-3 py-3 text-sm font-bold')}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Lägg till punkt
        </button>
      )}
      {/* Rutan för Ändra och Lägg till. key gör att fälten börjar om från början för varje punkt. */}
      {canEdit && form && (
        <AgendaEditor
          key={form.id || 'ny'}
          form={form}
          dayLabel={DAYS.find((d) => d.id === form.dayId).label}
          links={links}
          onSave={saveItem}
          onCancel={() => { Sound.tap(); setForm(null); }}
        />
      )}
    </div>
  );
}
