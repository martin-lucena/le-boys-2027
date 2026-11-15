# Hur appen fungerar

En kort översikt av flödet från inloggning till att något sparas i Supabase. Som exempel följer vi en röst på kvällens lagkapten.

## Flödet i korthet

```
Sidan laddas → Inloggning → Rätt vy väljs → Man trycker på något → mut(...) → Supabase → Allas telefoner uppdateras
```

## Steg för steg

### 1. Sidan laddas

| Fil | Vad den gör |
|---|---|
| `app/page.tsx` | Startsidan. Visar bara komponenten `LeBoysApp`. |
| `app/LeBoysApp.jsx` | Roten i appen. Hämtar all data och bestämmer vilken vy som visas. |
| `hooks/useSharedData.js` | Läser in den delade datan (röster, böter, uppdrag med mera) och håller den synkad. |
| `hooks/useIntel.js` | Läser in gissningarna om resmålet. |
| `utils/storage.js` | Läser det som sparades i webbläsaren förra gången, så att appen startar direkt. |

`LeBoysApp` kollar först i webbläsarens minne om någon redan är inloggad. Samtidigt hämtar `useSharedData` det senaste läget från Supabase.

### 2. Inloggning

| Fil | Vad den gör |
|---|---|
| `components/Login.jsx` | Visar namnen och lösenordsrutan. |
| `lib/config.js` | Innehåller kontona (`ACCOUNTS`) som lösenordet jämförs med. |

Stämmer lösenordet anropar `Login` funktionen `onLogin` med namnet. `LeBoysApp` sparar namnet i webbläsaren, så att man slipper logga in igen nästa gång. Inloggningen sköts helt i appen, inte av Supabase.

### 3. Rätt vy väljs

| Fil | Vad den gör |
|---|---|
| `lib/constants.js` | `hasFullAccess` och `isAdmin` avgör vad personen får se. |
| `lib/config.js` | `RELEASE_MODE` styr om deltagarna får se hela appen. |
| `components/Classified.jsx` | Väntsidan för deltagarna före resan. |
| `components/Shell.jsx` | Hela appen: sidhuvud, flikrad och Mer-meny. |

- Martin och Malte får alltid `Shell`.
- Övriga får `Classified` så länge `RELEASE_MODE` är `false`, och `Shell` när den är `true`.

`Shell` håller reda på vilken flik som är öppen och visar rätt komponent, till exempel `components/Captain.jsx`. Varje flik får med sig tre saker: `data` (all delad data), `mut` (funktionen som ändrar data) och `user` (den inloggade).

### 4. Man trycker på något

| Fil | Vad den gör |
|---|---|
| `components/Captain.jsx` | Visar kandidaterna och knappen "Lås in röst". |

När man trycker "Lås in röst" körs funktionen `submit`. Den bygger en röst och lämnar över den till `mut`:

```js
mut((d) => { if (!d.votes[night].some((v) => v.voter === user)) d.votes[night].push(vote); });
```

Alla flikar gör på samma sätt: de ändrar aldrig data själva, utan beskriver ändringen i en funktion som de ger till `mut`.

### 5. mut sparar ändringen

| Fil | Vad den gör |
|---|---|
| `hooks/useSharedData.js` | Innehåller `mut` och all logik för synken. |
| `lib/supabase.js` | Kopplingen till Supabase och listan `SHARED_KEYS` över vilka delar som delas. |
| `utils/storage.js` | Sparar en kopia i webbläsaren. |

`mut` gör två saker:

1. **Direkt på skärmen.** Ändringen görs på den egna telefonen på en gång, så appen känns snabb. En kopia sparas också i webbläsaren.
2. **Till Supabase.** Ändringen läggs i en kö och skickas till tabellen `app_state`. Där finns en rad per del av datan, till exempel `votes`, och varje rad har ett versionsnummer.

Ändringen skrivs bara om versionsnumret är detsamma som när raden senast lästes. Har någon annan hunnit rösta under tiden stämmer inte numret. Då hämtas den färska raden, ändringen görs en gång till på den, och ett nytt försök skickas. Så försvinner ingen röst för att två personer tryckte samtidigt.

Därför börjar ändringen ovan med kontrollen "om personen inte redan har röstat": funktionen kan köras mer än en gång.

Finns inget nät ligger ändringen kvar i kön och skickas när anslutningen är tillbaka.

### 6. Allas telefoner uppdateras

| Fil | Vad den gör |
|---|---|
| `hooks/useSharedData.js` | Lyssnar på ändringar i `app_state` och tar emot dem. |

Supabase säger till alla öppna telefoner när en rad ändras. `useSharedData` tar emot den nya raden, uppdaterar `data`, och alla komponenter som visar den datan ritas om av sig själva. Rösten syns alltså hos de andra utan att de behöver ladda om.

## Bra att veta

- **Gissningarna går en egen väg.** De ligger i tabellen `guesses` och sköts av `hooks/useIntel.js`, inte av `mut`.
- **Allt delas inte.** Beat-mönstret i Låtstudion och roulettens visningsläge sparas bara i den egna webbläsaren. Bara det som står i `SHARED_KEYS` skickas till Supabase.
- **Lokalt testläge.** När appen körs på den egna datorn (`npm run dev`) skickas ingenting till Supabase. Allt stannar i webbläsaren.
- **Poängen sparas inte.** Totaltabellen räknas om från grunden varje gång den visas, av `lib/scoring.js`.
- **Behörigheter sköts i appen.** `isAdmin` i `lib/constants.js` avgör vad som visas och får göras. Databasen själv gör ingen skillnad på personer.
