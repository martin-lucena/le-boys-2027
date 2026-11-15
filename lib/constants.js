// FASTA LISTOR.
// Vad: sådant som inte ändras medan appen körs: deltagarna, deras färger, kvällarna, låtens delar,
// grundbeatet och hela agendan.
// Var: namnen och färgerna syns överallt, DAYS syns i Agenda-fliken.
// Används av: i stort sett alla komponenter samt lib/pubgolf.js, lib/missions.js, lib/scoring.js,
// utils/storage.js och hooks/useIntel.js.

import { RELEASE_MODE, ACCOUNTS } from './config';

// Alla åtta deltagare. Ordningen här används också för att skilja åt personer med lika många poäng.
export const BOYS = ['Martin', 'Malte', 'Max', 'Dylan', 'Victor', 'Petter', 'William', 'Axel'];
// ADMIN-KONTROLL: ger true bara för Martin och Malte (de som har admin: true i ACCOUNTS).
// Används överallt där något bara ska synas eller få göras av Reseledningen.
export const isAdmin = (name) => !!(ACCOUNTS[name] && ACCOUNTS[name].admin);
// De sex som inte är admins. Används för att räkna hur många som har gissat resmål.
export const PARTICIPANTS = BOYS.filter((n) => !isAdmin(n));
// Får personen se hela appen? Ja om något av detta stämmer:
// 1. personen är admin (Martin eller Malte),
// 2. RELEASE_MODE i lib/config.js är true (reserven i koden),
// 3. en admin har låst upp hemsidan i Admin-fliken (release.open är true).
// release = data.release från den delade datan: { open, by, at }.
// Används i app/LeBoysApp.jsx för att välja mellan väntsidan och appen.
export const hasFullAccess = (name, release) => isAdmin(name) || RELEASE_MODE || !!(release && release.open);

// Spelarfärger: Tailwind-klasser för gränssnittet, hex för canvas-hjulet.
export const PLAYER = {
  Martin: { bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400', hex: '#fbbf24', tag: 'Mr' },
  Malte: { bg: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400', hex: '#34d399', tag: 'Ma' },
  Max: { bg: 'bg-sky-400', text: 'text-sky-400', border: 'border-sky-400', hex: '#38bdf8', tag: 'Mx' },
  Dylan: { bg: 'bg-orange-400', text: 'text-orange-400', border: 'border-orange-400', hex: '#fb923c', tag: 'D' },
  Victor: { bg: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400', hex: '#c084fc', tag: 'V' },
  Petter: { bg: 'bg-lime-400', text: 'text-lime-400', border: 'border-lime-400', hex: '#a3e635', tag: 'P' },
  William: { bg: 'bg-pink-400', text: 'text-pink-400', border: 'border-pink-400', hex: '#f472b6', tag: 'W' },
  Axel: { bg: 'bg-indigo-400', text: 'text-indigo-400', border: 'border-indigo-400', hex: '#818cf8', tag: 'A' },
};

// De tre kvällar som har lagkaptensröstning.
export const NIGHTS = [
  { id: 'tors', label: 'Torsdag' },
  { id: 'fre', label: 'Fredag' },
  { id: 'lor', label: 'Lördag' },
];
// Låtens delar i Låtstudion, i den ordning de visas.
export const BLOCKS = [
  { id: 'intro', label: 'Intro' },
  { id: 'vers1', label: 'Vers 1' },
  { id: 'ref', label: 'Refräng' },
  { id: 'vers2', label: 'Vers 2' },
  { id: 'outro', label: 'Outro' },
];
// Beat-maskinen: en takt är uppdelad i 16 steg. 1 = ljudet spelas på det steget, 0 = tyst.
export const STEPS = 16;
export const DEFAULT_PATTERN = {
  kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
};
// De tre raderna i beat-maskinen. on är färgen på en tänd ruta.
export const BEAT_ROWS = [
  { id: 'kick', label: 'Bas', on: 'bg-amber-400' },
  { id: 'snare', label: 'Virvel', on: 'bg-emerald-400' },
  { id: 'hat', label: 'Hi-hat', on: 'bg-sky-400' },
];

// Agendan. Varje punkt har ett id (används som nyckel för hype och incheckning), tid, titel, plats,
// klädkod och text. tab betyder att punkten får en Öppna-knapp som hoppar till den fliken.
export const DAYS = [
  { id: 'tors', label: 'Torsdag', short: 'Tors', items: [
    { id: 't1', time: '15:00', title: 'Samling och avfärd', place: 'Centralen, under klockan', dress: 'Resekostym: mjukisbyxor och solglasögon', text: 'Alla åtta på plats. Den som kommer sist bär väskorna första dygnet.' },
    { id: 't2', time: '18:00', title: 'Incheckning och rumsdragning', place: 'Högkvarteret (hemlig adress)', dress: 'Fritt, men strumpor i sandaler ger sämsta rummet', text: 'Nycklar ut, rum lottas. Inga byten efter dragning, inga överklaganden.' },
    { id: 't3', time: '20:00', title: 'Välkomstmiddag', place: 'Långbordet', dress: 'Skjorta. Struken är en bonus, inget krav', text: 'Första skålen, resans regler läses upp och truppen presenteras med påhittad statistik.' },
    { id: 't4', time: '23:00', title: 'Lagkaptensröstning, omgång 1', place: 'Lagkapten Arena', dress: 'Det du har på dig, om det fortfarande sitter kvar', text: 'Vem bar laget i dag? En röst per person, motivering krävs.', tab: 'kapten' },
  ] },
  { id: 'fre', label: 'Fredag', short: 'Fre', items: [
    { id: 'f1', time: '10:00', title: 'Frukost och taktikgenomgång', place: 'Köket', dress: 'Morgonrock godkänd', text: 'Kaffe, ägg och en genomgång på whiteboard som ingen kommer att minnas.' },
    { id: 'f2', time: '12:00', title: 'Lagen dras i rouletten', place: 'Lag-Roulette', dress: 'Neutral klädsel tills hjulet har talat', text: 'Hjulet avgör. Varannan till Lag Gul, varannan till Lag Blå.', tab: 'roulette' },
    { id: 'f3', time: '13:00', title: 'Padel: Lag Gul mot Lag Blå', place: 'Bana 2', dress: 'Lagfärg och pannband. Pannbandet är obligatoriskt', text: 'Bäst av fem set. Förlorarna står för kvällens grillning.' },
    { id: 'f4', time: '19:30', title: 'Grillkväll', place: 'Altanen', dress: 'Hawaiiskjorta eller förkläde, välj sida', text: 'Förlorarlaget vid grillen, vinnarlaget vid högtalaren.' },
    { id: 'f5', time: '23:00', title: 'Lagkaptensröstning, omgång 2', place: 'Lagkapten Arena', dress: 'Grillos accepteras', text: 'Ny kväll, ny bindel. Gårdagens kapten kan väljas om.', tab: 'kapten' },
  ] },
  { id: 'lor', label: 'Lördag', short: 'Lör', items: [
    { id: 'l1', time: '11:00', title: 'Brunch', place: 'Köket', dress: 'Keps långt ner i pannan', text: 'Lugn start. Återhämtning räknas som träning.' },
    { id: 'l2', time: '13:00', title: 'Femkamp', place: 'Gräsmattan', dress: 'Fullt matchställ, benskydd frivilligt', text: 'Fem grenar, samma lag som i går. Poängen förs av gårdagens kapten, vilket är en känd riskfaktor.' },
    { id: 'l3', time: '17:00', title: 'Inspelning av resans låt', place: 'Låtstudion', dress: 'Rockstjärna: solglasögon inomhus', text: 'Texten ska vara klar. Alla sjunger refrängen, ingen slipper undan.', tab: 'studio' },
    { id: 'l4', time: '20:00', title: 'Finalmiddag', place: 'Långbordet', dress: 'Kavaj. Fluga ger extra hype', text: 'Tal från varje lag och världspremiär av låten.' },
    { id: 'l5', time: '23:00', title: 'Lagkaptensröstning, omgång 3', place: 'Lagkapten Arena', dress: 'Kavajen får hänga på stolen', text: 'Sista bindeln för i år delas ut.', tab: 'kapten' },
  ] },
  { id: 'son', label: 'Söndag', short: 'Sön', items: [
    { id: 's1', time: '10:00', title: 'Återhämtningsfrukost', place: 'Köket', dress: 'Huvtröja med luvan uppe', text: 'Tyst frukost är tillåten och rekommenderas.' },
    { id: 's2', time: '12:00', title: 'Prisutdelning', place: 'Altanen', dress: 'Vinnarna bär bindel, övriga bär skam', text: 'Helgens tre kaptener hyllas och totalställningen läses upp.' },
    { id: 's3', time: '14:00', title: 'Hemresa', place: 'Högkvarteret', dress: 'Samma som i torsdags, tyvärr', text: 'Städning lagvis, sedan slutsignal.' },
  ] },
];
