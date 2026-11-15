// KEEPALIVE-ROUTEN.
// Vad: håller Supabase-projektet vaket. Ett gratisprojekt pausas efter ungefär en veckas
//      inaktivitet, och då slutar appen fungera tills någon startar det igen för hand.
// Hur: Vercel anropar adressen /api/keepalive en gång om dagen (se vercel.json i projektets rot).
//      Varje anrop gör en liten läsning i databasen, och det räknas som aktivitet.
// Var: syns inte i appen. Körs på servern hos Vercel, aldrig i telefonens webbläsare.
// Viktigt: routen får bara LÄSA, aldrig skriva, och den skickar aldrig tillbaka någon data
//          ur databasen. Ta inte bort den före resan.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_TABLE } from '@/lib/config';

// Säger åt Next.js att köra koden på nytt vid varje anrop. Utan den här raden kan svaret
// räknas ut en gång vid bygget och sedan återanvändas, och då når inget anrop databasen.
export const dynamic = 'force-dynamic';

// GET körs när någon (i praktiken Vercels cron-jobb) hämtar /api/keepalive.
export async function GET() {
  try {
    // En egen koppling som bara finns under det här anropet. persistSession: false eftersom
    // appen har egen inloggning och inte använder Supabases (samma val som i lib/supabase.js).
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

    // Minsta möjliga läsning: bara kolumnen key från en enda rad i tabellen app_state.
    // Svaret används inte till något, vi bryr oss bara om ifall läsningen gick bra.
    const { error } = await supabase.from(SUPABASE_TABLE).select('key').limit(1);

    // Supabase kastar inget fel utan lämnar det i "error". Vi kastar det själva så att
    // alla fel hamnar på samma ställe, i catch nedan.
    if (error) throw error;

    // Läsningen lyckades. Svaret innehåller bara ok och klockslaget, ingen data ur databasen.
    return Response.json({ ok: true, at: new Date().toISOString() });
  } catch {
    // Något gick fel (databasen pausad, nätverksfel eller liknande). Status 500 gör att
    // körningen syns som misslyckad i Vercels logg. Felmeddelandet skickas inte vidare.
    return Response.json({ ok: false }, { status: 500 });
  }
}
