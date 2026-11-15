// INSTÄLLNINGAR.
// Vad: appens "rattar": hemligt läge eller släppt, Supabase-adress, avresedatum, konton och poängvärden.
// Var: syns inte själv, men styr hela appen. Ändra här om något ska justeras inför resan.
// Används av: nästan alla filer, till exempel lib/constants.js, lib/supabase.js, hooks/, components/Login.jsx
// och lib/scoring.js.

/* =====================================================================
   INSTÄLLNINGAR
   false = bara Martin och Malte ser appen, övriga ser den hemliga nedräkningen.
   true  = alla åtta får Agenda, Lagkapten, Låtstudion och Lag-Roulette.
           Admin-fliken visas alltid bara för Martin och Malte.
   ===================================================================== */
export const RELEASE_MODE = false;

// Supabase: gemensam molndatabas som synkar data i realtid mellan alla deltagare.
// Den publicerbara nyckeln är gjord för att ligga i webbläsarkod.
export const SUPABASE_URL = 'https://ljpuljpykmqngsirqejf.supabase.co';
export const SUPABASE_KEY = 'sb_publishable__qYkYANocLFO-ycXJEcyrw_uzG2jwUB';
export const SUPABASE_TABLE = 'app_state';
// Lokalt testläge: när appen körs på localhost (t.ex. npm run dev i VS Code) sparas allt bara i
// webbläsarens localStorage. Ingenting läses från eller skrivs till Supabase.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];
// Sant när appen körs på den egna datorn (npm run dev). Då sparas allt bara i webbläsaren och
// ingenting skickas till Supabase. Anropas varje gång något ska läsas eller sparas.
export const isLocalDev = () => typeof window !== 'undefined' && LOCAL_HOSTS.includes(window.location.hostname);
export const GUESSES_TABLE = 'guesses'; // Destinationsgissningar: { id, author (unik), city, reason, created_at }. Kolumnen country används inte.

// Avresa: datum (torsdagen) och klockslag för samling.
export const TRIP_DATE = '2027-03-04';
export const TRIP_TIME = '15:00';

// Personliga lösenord (skiftlägeskänsliga).
// Ett konto per person. admin: true finns bara på Martin och Malte och är det som ger adminrättigheter.
// Login.jsx jämför det inskrivna lösenordet med pw här.
export const ACCOUNTS = {
  Martin: { pw: 'K8xP4v', admin: true },
  Malte: { pw: 'M3nR9q', admin: true },
  Max: { pw: 'W7bT2z' },
  Dylan: { pw: 'J5cL8y' },
  Victor: { pw: 'H9fD4s' },
  Petter: { pw: 'R2gN6w' },
  William: { pw: 'P4kV9m' },
  Axel: { pw: 'T6qB3x' },
};

// Poäng i totaltabellen. Ändra här om ni vill väga om tävlingen.
// Används av lib/scoring.js och lib/pubgolf.js när totaltabellen räknas ut, och i texterna som förklarar poängen.
export const POINTS = {
  vote: 2,            // per röst som lagkapten (räknas när kvällen är avslöjad)
  mission: 3,         // godkänt hemligt uppdrag
  missionFirst: 2,    // bonus till den som var först klar med ett godkänt uppdrag den dagen
  penalty: [5, 3, 1], // plats 1, 2 och 3 i straffläggningens topplista
  fine: -1,           // per bot i Bötesrummet som en admin har godkänt
  pubgolf: [6, 4, 2, 0], // per spelare i laget på plats 1, 2, 3 och 4 i Pub Golf, när rundan är klar
};
