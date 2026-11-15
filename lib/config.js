// INSTÄLLNINGAR.
// Vad: appens "rattar": hemligt läge eller släppt, Supabase-adress, avresedatum, konton, poängvärden
// och bilderna till skämtsidan "Strippklubbar".
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
// Hemsidan kan också låsas upp för alla direkt i appen, med knappen "Lås upp för alla" i
// Admin-fliken. Det läget sparas i den delade datan (data.release) och kräver lösenordet nedan.
// RELEASE_MODE ovan finns kvar som reserv: sätts den till true är sidan öppen oavsett knappen.
// Lösenordet är skiftlägeskänsligt, finns för att ingen ska öppna sidan av misstag och får
// aldrig visas på skärmen. Används bara av components/AdminTab.jsx.
export const RELEASE_PASSWORD = 'x7#mK9!pL2';

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
  guess: 5,           // rätt gissad stad i "Vart ska vi?", räknas först när resmålet är avslöjat
  troll: -1,          // en gång per person: första gången man öppnar sidan "Strippklubbar" (ett skämt)
};

// Skämtsidan "Strippklubbar" (components/Strip.jsx).
// TROLL_BUCKET = namnet på den publika bucketen i Supabase Storage där bilderna ligger.
// TROLL = vilken bild och vilken text varje person får se:
//   file  = filnamnet i bucketen.
//   text  = den stora texten ovanför hjärtat.
//   focus = (valfritt) vilken del av bilden som hamnar i mitten av hjärtat, i procent från vänster
//           och uppifrån. '50% 30%' (standard) är mitten i sidled och en bit ner från överkanten,
//           där ansiktet oftast sitter. '50% 0%' är överkanten, '50% 100%' underkanten.
//   zoom  = (valfritt) förstoring. 1 (standard) är ingen förstoring, 1.5 är en och en halv gång.
// Saknas file, eller går bilden inte att ladda, visas ett rosa hjärta utan bild med samma text.
export const TROLL_BUCKET = 'Troll';
export const TROLL = {
  Martin:  { file: 'unnamed.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Malte:   { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Max:     { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Dylan:   { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Victor:  { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Petter:  { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  William: { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
  Axel:    { file: 'FILNAMN.jpg', text: 'Not on my watch!', focus: '50% 30%', zoom: 1 },
};
