// APPSKALET.
// Vad: ramen runt hela appen när man är inloggad med full åtkomst: sidhuvudet (titel, ljudknapp,
// vem man är, logga ut), flikraden längst ner och Mer-menyn. Bestämmer vilken flik som visas.
// Var: alltid synlig runt innehållet.
// Används av: app/LeBoysApp.jsx.
// Ny sida? Lägg till den i TABS nedan och visa komponenten i <main> längre ner.

import { useEffect, useState } from 'react';
import { Calendar, ShieldCheck, Music, Dices, LogOut, Volume2, VolumeX, X, Settings, Target, Medal, Gavel, Quote, LayoutGrid, Flag } from 'lucide-react';
import { isAdmin } from '../lib/constants';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { SKEY, readJSON, writeJSON } from '../utils/storage';
import { Sound } from '../utils/sound';
import { Avatar, Pop } from './ui';
import { GuessList } from './Guesses';
import { Penalty } from './Penalty';
import { Agenda } from './Agenda';
import { Captain } from './Captain';
import { Studio } from './Studio';
import { Roulette } from './Roulette';
import { PubGolfTab } from './PubGolf';
import { MissionTab } from './Missions';
import { FinesTab } from './Fines';
import { QuotesTab } from './Quotes';
import { StandingsTab } from './Standings';
import { AdminTab } from './AdminTab';

/* ---------- Appskal med flikar ---------- */
// Flikar. main: true ligger i flikraden längst ner, övriga nås via Mer-menyn.
// id = internt namn, label = text i flikraden, long = text i sidhuvudet, Icon = ikonen,
// hint = förklaringen i Mer-menyn, adminOnly = visas bara för Martin och Malte.
const TABS = [
  { id: 'agenda', label: 'Agenda', long: 'Agenda (Tors–Sön)', Icon: Calendar, main: true },
  { id: 'kapten', label: 'Lagkapten', long: 'Lagkapten', Icon: ShieldCheck, main: true },
  { id: 'uppdrag', label: 'Uppdrag', long: 'Hemliga uppdrag', Icon: Target, main: true },
  { id: 'tabell', label: 'Tabell', long: 'Totaltabellen', Icon: Medal, main: true },
  { id: 'pubgolf', label: 'Pub Golf', long: 'Pub Golf', Icon: Flag, hint: 'Lag, bana och scorekort' },
  { id: 'boter', label: 'Bötesrummet', long: 'Bötesrummet', Icon: Gavel, hint: 'Dela ut böter' },
  { id: 'citat', label: 'Citat', long: 'Kvällens citat', Icon: Quote, hint: 'Spara det som sades' },
  { id: 'studio', label: 'Låtstudion', long: 'Låtstudion', Icon: Music, hint: 'Resans låt och beat' },
  { id: 'roulette', label: 'Lag-Roulette', long: 'Lag-Roulette', Icon: Dices, hint: 'Dra lagen' },
  { id: 'admin', label: 'Admin', long: 'Admin', Icon: Settings, hint: 'Reseledningens verktyg', adminOnly: true },
];

// Props: user = den inloggade, onLogout = körs när man trycker på logga ut-knappen,
// shared = delad data, mut och sync (från useSharedData), intel = gissningarna (från useIntel).
export function Shell({ user, onLogout, shared, intel }) {
  const { data, mut, sync } = shared;

  // Admin-fliken finns bara för konton med admin: true.
  // ADMIN-KONTROLL: isAdmin är bara sant för Martin och Malte, så övriga får aldrig Admin i sin lista.
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin(user));
  const mainTabs = tabs.filter((t) => t.main);
  const moreTabs = tabs.filter((t) => !t.main);
  // tab = fliken som visas. Startar på den flik man hade öppen senast (sparad i webbläsaren), annars Agenda.
  const [tab, setTab] = useState(() => {
    const s = readJSON(SKEY);
    return s && tabs.some((x) => x.id === s.tab) ? s.tab : 'agenda';
  });
  // muted = är ljudet avstängt? more = är Mer-menyn öppen?
  const [muted, setMuted] = useState(false);
  const [more, setMore] = useState(false);
  // Sant om den öppna fliken är en av dem som ligger i Mer-menyn. Då markeras Mer-knappen.
  const inMore = moreTabs.some((t) => t.id === tab);
  // Byter flik: stänger Mer-menyn, sparar valet i webbläsaren och rullar upp. Körs från flikraden och
  // Mer-menyn, och skickas vidare till flikarna så att de kan länka till varandra.
  const goTab = (t) => {
    Sound.tap();
    setTab(t);
    setMore(false);
    writeJSON(SKEY, { ...(readJSON(SKEY) || {}), tab: t });
    window.scrollTo(0, 0);
  };
  // Körs när man trycker på högtalaren: slår av eller på allt ljud (Sound.muted i utils/sound.js).
  const toggleMute = () => {
    Sound.muted = !muted;
    setMuted(!muted);
    if (muted) Sound.tap();
  };
  // Körs när Mer-menyn öppnas: lyssnar efter Escape-tangenten så att menyn kan stängas med den.
  // Lyssnaren tas bort igen när menyn stängs.
  useEffect(() => {
    if (!more) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMore(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [more]);
  // Det som de flesta flikar behöver, samlat så att det kan skickas med {...props}.
  const props = { data, mut, user, goTab };
  // Flikarna som en programpunkt i agendan kan länka till: alla utom Agenda själv och Admin.
  const agendaLinks = TABS.filter((t) => t.id !== 'agenda' && !t.adminOnly);
  const tabClass = (active) => cx('relative flex flex-col items-center gap-1 pt-2.5 pb-3 text-[11px] font-semibold min-w-0 transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400', active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100');
  const marker = <span className="absolute top-0 h-0.5 w-10 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24]" />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-slate-700">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className={cx(DISPLAY, 'text-lg truncate')}>Le boys <span className="text-amber-400">på språng</span></p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 mt-1">{TABS.find((t) => t.id === tab).long}</p>
          </div>
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Slå på ljud' : 'Stäng av ljud'} aria-pressed={muted} className={cx(PRESS, 'w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center', muted ? 'text-red-400' : 'text-slate-400 hover:text-slate-100')}>
            {muted ? <VolumeX className="w-4 h-4" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
          </button>
          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 pl-1 pr-3 py-1">
            <Avatar name={user} />
            <span className="leading-tight">
              {/* ADMIN-KONTROLL: Martin och Malte får texten Admin i guld vid sitt namn. */}
              <span className={cx('block text-[9px] uppercase tracking-wider', isAdmin(user) ? 'text-amber-400' : 'text-slate-400')}>
                {isAdmin(user) ? 'Admin' : 'Inloggad som'}
              </span>
              <span className="block text-sm font-bold">{user}</span>
            </span>
          </div>
          <button type="button" onClick={onLogout} aria-label="Logga ut" className={cx(PRESS, 'w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-red-400')}>
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Här visas den valda fliken. Bara den komponent vars villkor är sant ritas. */}
      <main className="max-w-xl mx-auto px-4 pt-5 pb-32">
        {tab === 'agenda' && <Agenda {...props} links={agendaLinks} />}
        {tab === 'agenda' && (
          <div className="mt-6 flex flex-col gap-4">
            <Penalty data={data} mut={mut} user={user} />
            <GuessList guesses={intel.guesses} user={user} />
          </div>
        )}
        {tab === 'kapten' && <Captain {...props} />}
        {tab === 'uppdrag' && <MissionTab data={data} mut={mut} user={user} />}
        {tab === 'tabell' && <StandingsTab data={data} user={user} />}
        {tab === 'pubgolf' && <PubGolfTab {...props} />}
        {tab === 'boter' && <FinesTab data={data} mut={mut} user={user} />}
        {tab === 'citat' && <QuotesTab data={data} mut={mut} user={user} />}
        {tab === 'studio' && <Studio {...props} />}
        {tab === 'roulette' && <Roulette {...props} />}
        {/* ADMIN-KONTROLL: Admin-fliken ritas bara för Martin och Malte, även om någon annan skulle lyckas välja den. */}
        {tab === 'admin' && isAdmin(user) && <AdminTab data={data} mut={mut} sync={sync} user={user} />}
      </main>

      {/* Mer-menyn: visas ovanpå sidan när more är true. Ett tryck utanför rutan stänger den. */}
      {more && (
        <div className="fixed inset-0 z-40 bg-slate-950/70" onClick={() => setMore(false)}>
          <Pop
            role="dialog"
            aria-modal="true"
            aria-label="Fler sidor"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-16 inset-x-0 mx-auto max-w-xl px-3"
          >
            <div className={cx('rounded-3xl bg-slate-900 border border-amber-400 p-4', GLOW_GOLD)}>
              <div className="flex items-center justify-between mb-3">
                <p className={cx(DISPLAY, 'text-xl')}>Mer</p>
                <button type="button" onClick={() => setMore(false)} aria-label="Stäng menyn" className={cx(PRESS, 'w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-100')}>
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moreTabs.map(({ id, label, hint, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTab(id)}
                    aria-current={tab === id ? 'page' : undefined}
                    className={cx(PRESS, 'flex items-center gap-3 rounded-2xl border p-3 text-left', tab === id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500')}
                  >
                    <span className={cx('w-10 h-10 rounded-full flex items-center justify-center shrink-0', tab === id ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-400')}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{label}</span>
                      <span className="block text-[11px] text-slate-400 leading-tight mt-0.5">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Pop>
        </div>
      )}

      {/* Flikraden längst ner: de fyra huvudflikarna plus Mer. */}
      <nav aria-label="Huvudflikar" className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-700">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {mainTabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => goTab(id)} aria-current={tab === id ? 'page' : undefined} className={tabClass(tab === id && !more)}>
              {tab === id && !more && marker}
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </button>
          ))}
          <button type="button" onClick={() => { Sound.tap(); setMore(!more); }} aria-expanded={more} aria-haspopup="dialog" className={tabClass(more || inMore)}>
            {(more || inMore) && marker}
            <LayoutGrid className="w-5 h-5" aria-hidden="true" />
            {inMore && !more ? TABS.find((t) => t.id === tab).label : 'Mer'}
          </button>
        </div>
      </nav>
    </div>
  );
}
