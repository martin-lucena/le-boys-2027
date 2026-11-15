@AGENTS.md
# Le boys på språng 2027

Event-app för en grabbresa torsdag–söndag med åtta deltagare. Byggd i Next.js med React, Tailwind CSS och Supabase, hostad på Vercel.

## Svara alltid på svenska

Användaren skriver på svenska och gränssnittet är på svenska. All text i appen, alla kodkommentarer och alla svar ska vara på svenska.

## Arbetsregler

- Ändra bara det som efterfrågas. Behåll design, färger, ljud, konfetti och logik i övrigt exakt som de är.
- Fråga innan du tar bort eller lägger till en funktion som inte efterfrågats. Användaren har tagit bort flera saker för att det blev för mycket (se "Borttaget" nedan).
- Kör `npm run build` efter ändringar och kontrollera att det bygger utan fel.
- Använd bara standardklasser i Tailwind (godtyckliga värden som `bg-[...]` finns redan och är okej). Ingen egen CSS-fil.
- Alla ikoner kommer från `lucide-react`. Ljud görs med Web Audio API i `utils/sound.js`, aldrig med ljudfiler.
- Mobil först. Testa att layouten håller på en smal telefon.
- Skriv tydliga kommentarer på svenska i all ny eller ändrad kod: vad filen, komponenten eller funktionen gör och varför. Användaren är inte van vid React och vill förstå koden.

## Personer och roller

Deltagare: Martin, Malte, Max, Dylan, Victor, Petter, William och Axel.

- **Admins (Reseledningen):** Martin och Malte (`admin: true` i `ACCOUNTS`).
- **Deltagare:** övriga sex.
- Varje person loggar in med sitt namn och ett personligt, skiftlägeskänsligt lösenord. Lösenorden står i `lib/config.js`. De får aldrig visas på skärmen eller skrivas ut i svar.

## Släpp hemsidan (release och RELEASE_MODE)

Före resan ser admins hela appen. Deltagarna ser bara väntsidan (`components/Classified.jsx`): nedräkning, Klassificerat-rutan, straffläggningen, gissa resmålet och listan med gissningar. Admin-fliken visas alltid bara för admins.

Hemsidan släpps för alla på ett av två sätt. `hasFullAccess(name, release)` i `lib/constants.js` ger full åtkomst om personen är admin, om `RELEASE_MODE` är `true` eller om `release.open` är `true`.

- **I appen (det vanliga sättet):** rutan "Släpp hemsidan" i Admin-fliken. "Lås upp för alla" kräver lösenordet `RELEASE_PASSWORD`, som finns i `lib/config.js`. Rätt lösenord sparar den delade nyckeln `release` som `{ open: true, by, at }`. "Lås igen" kräver samma lösenord. Fel lösenord ändrar ingenting.
- **I koden (reserv):** `RELEASE_MODE = true` i `lib/config.js` öppnar sidan oavsett knappen.

Lösenordet får aldrig visas på skärmen, skrivas ut i svar eller skrivas in i den här filen.

Deltagare som har väntsidan uppe när sidan släpps får avslöjandeskärmen (`components/Reveal.jsx`) med fanfar, konfetti och knappen "Gå in", direkt via synken och utan omladdning. Det styrs av `waited` i `app/LeBoysApp.jsx`.

## Struktur

```
app/LeBoysApp.jsx        Rot: inloggning, väntsida eller appskalet
components/
  Shell.jsx              Sidhuvud, flikrad och Mer-meny
  Login.jsx              Inloggning (namn + lösenord, skakar vid fel)
  Classified.jsx         Deltagarnas väntsida tills hemsidan släpps
  Reveal.jsx             Avslöjandeskärmen "Hemsidan är öppen!" när sidan släpps
  Agenda.jsx             Tidslinje tors–sön, hype per punkt, incheckning, admins redigering av agendan
  Captain.jsx            Lagkapten: hemlig röstning, avslöjas per kväll
  Missions.jsx           Hemliga uppdrag: eget uppdrag, tavla, flik, admin
  Standings.jsx          Totaltabellen
  PubGolf.jsx            Pub Golf: ställning, scorekort, bana, regler, admins redigering av banan
  Fines.jsx              Bötesrummet och admins godkännande
  Quotes.jsx             Kvällens citat
  Studio.jsx             Låtstudion med beat-maskin
  Roulette.jsx           Lag-Roulette: Fritt snurr och Pub Golf-lag
  AdminTab.jsx           Admin-fliken
  Penalty.jsx            Straffläggningen (canvas-spel)
  Guesses.jsx            Gissa resmålet
  ui.jsx                 Avatar, Card, Pop, SectionTitle, Segmented, FoldHeader, Countdown
hooks/
  useSharedData.js       Realtidssynk mot tabellen app_state
  useIntel.js            Gissningar mot tabellen guesses
  useNow.js              Klocka som tickar varje sekund
lib/
  config.js              RELEASE_MODE, RELEASE_PASSWORD, Supabase, avresedatum, konton, POINTS
  constants.js           Deltagare, färger, kvällar, låtblock, beat, dagarna och agendans startvärde (DAYS)
  agenda.js              Agendan som delad data: startvärde (freshAgenda), sortering, kontroll
  pubgolf.js             Pub Golf-lag, banans startvärde (PUB_HOLES), banan som delad data (freshCourse, normalizeCourse) och poängräkning
  missions.js            Aktiv uppdragsdag och godkända uppdrag
  scoring.js             computeTotals för totaltabellen
  supabase.js            Supabase-klient och SHARED_KEYS
utils/
  storage.js             Datamodell (freshData, normalizeData) och localStorage
  sound.js               Web Audio-ljud
  confetti.js            Konfetti i canvas
  helpers.js             cx, uid, clone, animate, itemDate, tidsformat
  styles.js              PRESS, GLOW_GOLD, GLOW_GREEN, STRIPE, DISPLAY
```

## Navigering

- Flikraden längst ner har bara fyra flikar plus Mer: **Agenda, Lagkapten, Uppdrag, Tabell, Mer**. Lägg inte till fler flikar i raden.
- Övriga sidor nås via Mer-menyn: Pub Golf, Bötesrummet, Citat, Låtstudion, Lag-Roulette och Admin (bara admins).
- Ny sida: lägg den i `TABS` i `components/Shell.jsx` utan `main: true`, med `hint`.

## Data och Supabase

All delad data ligger i tabellen `app_state`, en rad per del: `{ key, value (jsonb), version, updated_at }`. Synkas via `hooks/useSharedData.js`.

- `SHARED_KEYS`: `hype`, `checkins`, `votes`, `song`, `bpm`, `wheel`, `scores`, `revealed`, `missions`, `fines`, `quotes`, `pubgolf`, `agenda`, `release`, `pubcourse`.
- Ändra alltid data med `mut((d) => { ... })`. Den uppdaterar direkt lokalt och skriver sedan till databasen med versionskontroll: krockar två skrivningar läses raden om och ändringen körs igen. Funktionen till `mut` måste därför tåla att köras flera gånger mot färsk data.
- Ny delad data: lägg till fältet i `freshData` och `normalizeData` i `utils/storage.js` och nyckeln i `SHARED_KEYS`. Appen skapar raden själv, ingen SQL behövs.
- Gissningarna ligger i en egen tabell, `guesses` (`author` unik, `city`, `reason`). Kolumnen `country` används inte och skickas tom.
- Lokalt bara i webbläsaren: inloggning, aktiv flik, beat-mönstret och roulettens visningsläge.
- **Lokalt testläge:** på `localhost` och `127.0.0.1` läses och skrivs ingenting mot Supabase, allt stannar i localStorage. Admin-fliken visar vilket läge som gäller.
- Behörigheter sköts i appen, inte i databasen. Det är ett medvetet val: ingen i gänget kommer att skriva direkt till databasen.
- **Keepalive:** `app/api/keepalive/route.ts` läser en enda rad ur `app_state` så att Supabase-projektet inte pausas för inaktivitet. Vercel anropar `/api/keepalive` varje dag kl. 09:00 UTC via cron-jobbet i `vercel.json`. Routen får bara läsa, aldrig skriva, och svarar bara `{ ok, at }` utan data ur databasen. Ta inte bort routen eller `vercel.json` före resan. `vercel.json` kan inte innehålla kommentarer, så förklaringen står här och i routen.

## Bara admins kan

- Se Admin-fliken.
- Avslöja eller dölja lagkaptensresultat per kväll.
- Dela ut, ta bort, godkänna och underkänna uppdrag, och välja aktiv uppdragsdag.
- Godkänna eller avslå böter.
- Nollställa all data.
- Snurra och nollställa den officiella Pub Golf-lottningen.
- Ladda testdata, rensa lag och poäng, och rensa enskilda hål i Pub Golf.
- Redigera Pub Golf-banan (ändra, flytta, ta bort och lägga till hål) och återställa den till standard.
- Ta bort andras böter och citat (övriga kan bara ta bort sina egna).
- Redigera agendan (ändra, ta bort och lägga till programpunkter) och återställa den till standard.
- Låsa upp hemsidan för alla och låsa den igen (kräver dessutom lösenordet `RELEASE_PASSWORD`).

Kontrollera alltid med `isAdmin(user)` både när knappen visas och innan åtgärden utförs.

## Funktioner och regler

- **Agendan:** redigeras i appen och ligger i den delade datan `agenda` (`{ tors: [...], fre: [...], lor: [...], son: [...] }`), inte i koden. `DAYS` i `lib/constants.js` är bara startvärdet och ger dagarnas id och namn, som är fasta. Allt som visar agendan läser från `data.agenda`. Admins slår på redigeringsläget med "Redigera agenda" i Agenda-fliken och kan då ändra, ta bort (två tryck) och lägga till punkter. Punkterna sorteras alltid efter klockslag. Nedräkningen före resan (Agenda-fliken och väntsidan) går mot torsdagens första punkt, med `TRIP_TIME` som reserv om torsdagen är tom. När en punkt tas bort tas också dess hype och incheckningar bort. Ändrade punkter visar "Senast ändrad av ...". "Återställ agendan till standard" finns i Admin-fliken. Flikarna en punkt kan länka till kommer från `TABS` i `components/Shell.jsx`.
- **Lagkapten:** en röst per person och kväll (tors, fre, lör), motivering krävs, man kan inte rösta på sig själv. Ställning och motiveringar är dolda tills en admin avslöjar kvällen. Inte ens admins ser resultatet i förväg.
- **Uppdrag:** egen flik. Man ser bara sitt eget uppdrag, trycker "Klar!" med frivilligt bevis i text och får en tidsstämpel. Admin godkänner eller underkänner. Tavlan visar ordning och tid, aldrig uppdragstexterna.
- **Bötesrummet:** vem som helst anmäler en bot, den gäller först när en admin godkänt den. Inget ljud alls i Bötesrummet eller vid godkännande.
- **Pub Golf:** lagen lottas i rouletten i läget "Pub Golf-lag" (bara admins), fyra tvåmannalag. Slag = klunkar + straff − 1 om sidouppdraget klarades. Lägst vinner. Jämnt med par visas som `±0`, inte `E`.
- **Pub Golf-banan:** redigeras i appen och ligger i den delade datan `pubcourse`, en lista med hål i spelordning: `[{ id, pub, drink, par, side }]`. `PUB_HOLES` i `lib/pubgolf.js` är bara startvärdet (platshållarpubar). Allt som visar eller räknar på banan läser från `data.pubcourse`: scorekortet, ställningen, tabellen per hål, banans par, testdatan och totaltabellens Pub Golf-poäng. Admins slår på redigeringsläget med "Redigera banan" i rutan Banan i Pub Golf-fliken och kan då ändra pub, dryck, par (1–6) och sidouppdrag, flytta hål upp och ner, ta bort hål och lägga till hål. Banan har 1–18 hål. Hålets nummer är dess plats i listan, men resultaten i `data.pubgolf.scores` sparas per lag och hål-`id` (`scores[lag][hål-id]`), så de följer med när ett hål flyttas. Standardhålen har id `'0'`–`'8'` (samma nycklar som resultaten hade innan banan gick att redigera), nya hål får `uid()`. Ändra aldrig ett håls id. Ta bort kräver alltid bekräftelse, och har hålet registrerade resultat visas en varning om att de försvinner. Hålets resultat tas då bort ur `data.pubgolf.scores`. "Rensa lag och poäng", rouletten och "Nollställ all data" ändrar inte banan. "Återställ banan till standard" finns i Admin-fliken (två tryck).
- **Rouletten:** lägesväljaren har "Fritt snurr" till vänster (förvalt) och "Pub Golf-lag" till höger.
- **Straffläggning:** skjuts bara med knappen under planen, inte genom att trycka på planen. Bara nya personliga rekord sparas.
- **Gissningar:** bara stad och motivering. Listan visas på väntsidan och i Agenda-fliken, inte i Admin-fliken.
- **Hopfällbara rutor:** "Vart ska vi?" och Straffläggning har `FoldHeader` med pil, och statustexten ligger på egen rad under rubriken.

## Totaltabellen (POINTS i lib/config.js)

| Händelse | Poäng |
|---|---|
| Röst som lagkapten (bara avslöjade kvällar) | +2 |
| Godkänt uppdrag | +3 |
| Först klar med godkänt uppdrag den dagen | +2 |
| Straffläggning, plats 1 / 2 / 3 | +5 / +3 / +1 |
| Pub Golf, lagplats 1 / 2 / 3 / 4, till varje spelare | +6 / +4 / +2 / 0 |
| Godkänd bot | −1 |

Pub Golf räknas först när alla lag spelat alla hål, och testdata räknas aldrig.

## Nollställ all data (Admin-fliken)

Nollställer hype, incheckningar, röster, avslöjanden, uppdrag, böter, citat, Pub Golf (lag och resultat), låttext och roulette. **Behåller** gissningarna, straffläggningens topplista, agendan och Pub Golf-banan `pubcourse` (återställs bara med var sin egen knapp) och släppläget `release` (ändras bara i rutan "Släpp hemsidan").

## Borttaget på användarens begäran (lägg inte tillbaka)

- Decrypting Intel och Intel-centralen (tabellen `clues` används inte).
- Land i gissningarna.
- Spelarkort och den gemensamma hype-mätaren på väntsidan.
- Ljud i Bötesrummet.
- "Visa testlösenord" och demo-röster.

## Design

- Mörkt "VIP / Matchday"-tema: `slate-950`/`slate-900`-bakgrund, guld (`amber-400`) för handlingar, smaragd (`emerald-400`) för live och klart, rött (`red-400`) för fel och böter.
- Varje spelare har en egen färg i `PLAYER` (`lib/constants.js`).
- Rubriker med `DISPLAY`, knappar med `PRESS`, glöd med `GLOW_GOLD` och `GLOW_GREEN`.
- Fanfar och konfetti vid röstning, rekord, vinst och avslöjanden. Respektera `prefers-reduced-motion`.

## Kända begränsningar

- Lösenord, agendan och Supabase-nyckeln ligger i klientkoden och kan läsas av den som letar.
- Tider (uppdrag, böter, citat) kommer från telefonens klocka.
- Supabase gratisprojekt pausas efter ungefär en veckas inaktivitet.