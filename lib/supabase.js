// SUPABASE-KOPPLINGEN.
// Vad: skapar kopplingen till databasen och listar vilka delar av datan som delas mellan allas telefoner.
// Var: syns inte i appen.
// Används av: hooks/useSharedData.js och hooks/useIntel.js.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

/* ---------- Realtidssynk (Supabase) ----------
   Varje delad del av datan är en egen rad i tabellen app_state: { key, value (jsonb), version }.
   En ändring skrivs bara om radens version är oförändrad sedan vi senast läste den.
   Har någon annan hunnit före läses raden om och ändringen körs igen på den färska datan,
   så att två samtidiga röster, hype-klick eller låtrader aldrig skriver över varandra.
   Ej delat (stannar per enhet): beat-mönstret och listans visningsläge.
   Gissningarna ligger i en egen tabell (guesses), se useIntel nedan. */
// De delar av datan som synkas. Varje namn här är en rad i tabellen app_state.
// Det som inte står här (beat-mönstret och roulettens visningsläge) stannar på den egna telefonen.
export const SHARED_KEYS = ['hype', 'checkins', 'votes', 'song', 'bpm', 'wheel', 'scores', 'revealed', 'missions', 'fines', 'quotes', 'pubgolf', 'agenda', 'release', 'pubcourse', 'destination', 'trolled'];
// Själva kopplingen. persistSession: false eftersom appen har egen inloggning och inte använder Supabases.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
