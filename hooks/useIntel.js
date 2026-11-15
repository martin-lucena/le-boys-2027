// GISSNINGARNA OM RESMÅLET.
// Vad: hämtar alla gissningar från tabellen guesses i Supabase, håller dem uppdaterade i realtid
// och sparar nya gissningar.
// Var: rutan "Vart ska vi?" och listan Gissningar, på väntsidan och under Agenda-fliken.
// Används av: app/LeBoysApp.jsx, som skickar resultatet vidare som "intel".

import { useEffect, useState } from 'react';
import { isLocalDev, GUESSES_TABLE } from '../lib/config';
import { BOYS } from '../lib/constants';
import { LOCAL_GUESSES_KEY, readJSON, writeJSON } from '../utils/storage';
import { supabase } from '../lib/supabase';

/* ---------- Destinationsgissningar (tabellen guesses) ---------- */
// Ger tillbaka: guesses (listan), status (läget för anslutningen) och saveGuess (spara en gissning).
export function useIntel() {
  // guesses = alla gissningar som är hämtade.
  const [guesses, setGuesses] = useState([]);
  // status = hur anslutningen mår.
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'live' | 'offline' | 'local'

  // Hämtar alla gissningar från databasen, äldst först, och sparar dem i guesses.
  const load = async () => {
    const g = await supabase.from(GUESSES_TABLE).select('id,author,city,reason,created_at').order('created_at', { ascending: true });
    if (g.error) throw g.error;
    setGuesses((g.data || []).filter((x) => BOYS.includes(x.author)));
  };

  // Körs en gång när appen startar. I lokalt testläge läses gissningarna bara från webbläsaren.
  // Annars: hämta listan, och prenumerera på ändringar i tabellen så att listan hämtas om
  // så fort någon annan gissar. Funktionen som returneras stänger prenumerationen.
  useEffect(() => {
    if (isLocalDev()) {
      const saved = readJSON(LOCAL_GUESSES_KEY);
      setGuesses(Array.isArray(saved) ? saved.filter((x) => BOYS.includes(x.author)) : []);
      setStatus('local');
      return undefined;
    }
    let alive = true;
    const refresh = () => load().then(() => { if (alive) setStatus('live'); }, () => { if (alive) setStatus('offline'); });
    refresh();
    const channel = supabase
      .channel('intel_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: GUESSES_TABLE }, refresh)
      .subscribe((st) => {
        if (!alive) return;
        if (st === 'SUBSCRIBED') refresh();
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('offline');
      });
    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  // En gissning per person: sparas om ifall man ändrar sig.
  // Körs när man trycker Lås in gissning. SPARAR TILL SUPABASE (tabellen guesses), en rad per person:
  // finns redan en gissning från samma person skrivs den över. I lokalt testläge sparas den bara i webbläsaren.
  const saveGuess = async (guess) => {
    if (isLocalDev()) {
      const next = guesses.filter((g) => g.author !== guess.author).concat({ ...guess, created_at: new Date().toISOString() });
      writeJSON(LOCAL_GUESSES_KEY, next);
      setGuesses(next);
      return;
    }
    const { error } = await supabase.from(GUESSES_TABLE).upsert(guess, { onConflict: 'author' });
    if (error) throw error;
    await load();
  };

  return { guesses, status, saveGuess };
}
