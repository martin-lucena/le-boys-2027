// REALTIDSSYNKEN: APPENS HJÄRTA.
// Vad: håller all delad data (röster, hype, uppdrag, böter och så vidare) och ser till att den är
// likadan på allas telefoner.
// Var: syns inte själv, men all data som komponenterna visar kommer härifrån.
// Används av: app/LeBoysApp.jsx, som skickar vidare resultatet som "shared" (data, mut och sync).
//
// SÅ FUNKAR DET, MED VANLIGA ORD:
// 1. Datan finns på tre ställen: på skärmen (data), i webbläsarens minne (localStorage) och i
//    Supabase (tabellen app_state, en rad per del, till exempel "votes" eller "fines").
// 2. Varje rad i databasen har ett versionsnummer som ökar med ett vid varje ändring.
// 3. När någon ändrar något (mut) syns det direkt på den egna skärmen. Sedan skickas ändringen
//    till databasen med villkoret "bara om versionen är samma som när jag senast läste".
// 4. Har någon annan hunnit ändra samma rad under tiden stämmer inte versionen. Då läses raden
//    om, ändringen görs en gång till på den färska datan och skickas igen.
//    Så försvinner aldrig någons röst för att två personer tryckte samtidigt.
// 5. Supabase säger till direkt när en rad ändras, så de andras ändringar dyker upp av sig själva.

import { useEffect, useRef, useState } from 'react';
import { SUPABASE_TABLE, isLocalDev } from '../lib/config';
import { clone } from '../utils/helpers';
import { KEY, freshData, writeJSON, normalizeData, loadData } from '../utils/storage';
import { SHARED_KEYS, supabase } from '../lib/supabase';

// Jämför två värden genom att göra om dem till text. Används för att se vilka delar som faktiskt ändrats.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Ger tillbaka: data (all data), mut (funktionen som ändrar data) och sync (anslutningens läge).
export function useSharedData() {
  // data = all appdata som visas på skärmen. Startar med det som sparades i webbläsaren förra gången.
  const [data, setData] = useState(loadData);
  // sync = läget för anslutningen. Visas i Admin-fliken.
  const [sync, setSync] = useState('connecting'); // 'connecting' | 'live' | 'offline'
  // dataRef pekar alltid på den senaste datan, så att funktioner som körs senare inte ser en gammal kopia.
  const dataRef = useRef(data);
  dataRef.current = data;
  // server = det senaste vi vet om databasen: värde och versionsnummer för varje rad.
  const server = useRef({}); // key -> { value, version }, senast kända läge i databasen
  // pending = kön av ändringar som väntar på att skickas. busy = sant medan en sändning pågår.
  const pending = useRef([]);
  const busy = useRef(false);

  // Körs varje gång data ändras: sparar en kopia i webbläsaren, så att appen fungerar utan nät
  // och startar snabbt nästa gång.
  useEffect(() => { writeJSON(KEY, data); }, [data]);

  // Tar emot rader från databasen. En rad används bara om den är nyare (högre version) än den vi
  // redan har. Då uppdateras både vår anteckning om databasens läge och det som visas på skärmen.
  const accept = (rows) => {
    const patch = {};
    (rows || []).forEach((r) => {
      if (!r || !SHARED_KEYS.includes(r.key)) return;
      const cur = server.current[r.key];
      if (cur && cur.version >= r.version) return;
      server.current[r.key] = { value: r.value, version: r.version };
      patch[r.key] = r.value;
    });
    if (Object.keys(patch).length) setData((d) => normalizeData({ ...d, ...patch }));
  };

  // Hämtar de angivna raderna från databasen och tar emot dem med accept.
  const pull = async (keys) => {
    const { data: rows, error } = await supabase.from(SUPABASE_TABLE).select('key,value,version').in('key', keys);
    if (error) throw error;
    accept(rows);
    return rows || [];
  };

  // Läser hela läget och skapar saknade rader (tomma) första gången appen körs mot databasen.
  const pullAll = async () => {
    const rows = await pull(SHARED_KEYS);
    const have = new Set(rows.map((r) => r.key));
    const fresh = freshData();
    const missing = SHARED_KEYS.filter((k) => !have.has(k) && fresh[k] !== undefined);
    if (missing.length) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(missing.map((k) => ({ key: k, value: fresh[k], version: 1 })), { onConflict: 'key', ignoreDuplicates: true });
      if (error) throw error;
      await pull(missing);
    }
  };

  // Kör alla väntande ändringar mot den senaste databasversionen och skriv de delar som ändrats.
  // HÄR SKRIVS ÄNDRINGARNA TILL SUPABASE. fns är en lista med ändringar (funktionerna som gavs till mut).
  const pushFns = async (fns) => {
    // Upp till åtta försök, ifall någon annan hinner före flera gånger i rad.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      // Utgå från databasens läge (eller tomt läge för rader som inte finns än), aldrig från den lokala
      // kopian, så att en ändring som redan visats lokalt inte räknas två gånger.
      const known = {};
      const fresh = freshData();
      SHARED_KEYS.forEach((k) => {
        if (server.current[k]) known[k] = server.current[k].value;
        else if (fresh[k] !== undefined) known[k] = fresh[k];
      });
      const base = normalizeData({ ...dataRef.current, ...known });
      // Steg 1: ta databasens senaste läge (base), gör en kopia (next) och kör alla väntande ändringar på kopian.
      const next = clone(base);
      fns.forEach((fn) => fn(next));
      // Steg 2: jämför före och efter för att se vilka delar som ändrades. Bara de skickas.
      const changed = SHARED_KEYS.filter((k) => next[k] !== undefined && !same(next[k], base[k]));
      if (!changed.length) return;

      let conflict = false;
      for (const k of changed) {
        const cur = server.current[k];
        // Steg 3: skriv raden. Finns den redan uppdateras den, men bara om versionen fortfarande är den vi
        // känner till (.eq('version', ...)). Finns den inte skapas den.
        const res = cur
          ? await supabase.from(SUPABASE_TABLE)
            .update({ value: next[k], version: cur.version + 1, updated_at: new Date().toISOString() })
            .eq('key', k).eq('version', cur.version)
            .select('key,value,version')
          : await supabase.from(SUPABASE_TABLE)
            .insert({ key: k, value: next[k], version: 1 })
            .select('key,value,version');
        // Felkoden 23505 betyder "raden finns redan", alltså att någon annan hann skapa den. Det räknas som
        // en krock, inte som ett fel.
        if (res.error && res.error.code !== '23505') throw res.error;
        // Steg 4: blev ingen rad skriven har någon annan ändrat den under tiden. Hämta den färska raden och
        // börja om från steg 1.
        if (res.error || !res.data || !res.data.length) { conflict = true; await pull([k]); break; }
        accept(res.data);
      }
      if (!conflict) return;
    }
  };

  // Skickar allt som ligger i kön, en omgång i taget. Går det fel (till exempel inget nät) läggs
  // ändringarna tillbaka i kön och sync blir 'offline'. De skickas igen när anslutningen är tillbaka.
  const flush = async () => {
    if (busy.current || isLocalDev()) return;
    busy.current = true;
    try {
      while (pending.current.length) {
        const fns = pending.current.splice(0);
        try {
          await pushFns(fns);
        } catch (e) {
          pending.current.unshift(...fns); // försök igen vid nästa anslutning
          throw e;
        }
      }
      setSync('live');
    } catch (e) {
      setSync('offline');
    } finally {
      busy.current = false;
    }
  };

  // Samma signatur som tidigare: ändringen syns direkt lokalt och skickas sedan till databasen.
  // mut ÄR FUNKTIONEN ALLA KOMPONENTER ANVÄNDER FÖR ATT ÄNDRA DATA.
  // Man skickar in en funktion som ändrar en kopia av datan, till exempel
  // mut((d) => { d.fines.push(nyBot); }). Två saker händer:
  // 1. Ändringen görs direkt på skärmen (setData).
  // 2. Ändringen läggs i kön och skickas till Supabase (flush).
  // Funktionen kan köras flera gånger (se steg 4 ovan). Därför börjar många ändringar med en kontroll
  // som "om personen inte redan har röstat".
  const mut = (fn) => {
    setData((d) => { const c = clone(d); fn(c); return c; });
    if (isLocalDev()) return; // lokalt testläge: stannar i localStorage
    pending.current.push(fn);
    flush();
  };

  // Körs en gång när appen startar och sätter upp synken:
  // - refresh hämtar hela läget från databasen och skickar det som eventuellt väntar i kön.
  // - channel prenumererar på ändringar, så att andras ändringar tas emot direkt.
  // - onFocus hämtar om allt när man kommer tillbaka till appen, eftersom telefonen kan ha tappat
  //   anslutningen medan appen låg i bakgrunden.
  // I lokalt testläge görs inget av detta.
  useEffect(() => {
    if (isLocalDev()) { setSync('local'); return undefined; }
    let alive = true;
    const refresh = () => pullAll().then(() => { if (alive) { setSync('live'); flush(); } }, () => { if (alive) setSync('offline'); });
    refresh();
    const channel = supabase
      .channel('app_state_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLE }, (payload) => {
        if (payload.new && payload.new.key) accept([payload.new]);
      })
      .subscribe((status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') refresh(); // hämta det som missats vid (åter)anslutning
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSync('offline');
      });
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onFocus);
    // Städning när appen stängs: sluta lyssna och stäng prenumerationen.
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, mut, sync };
}
