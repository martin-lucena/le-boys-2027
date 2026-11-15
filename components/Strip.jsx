// SKÄMTSIDAN "STRIPPKLUBBAR".
// Vad: ett skämt. Sidan ser ut som en vanlig sida i Mer-menyn, men visar i stället en helskärm
// med en stor text som studsar in snett, ett stort pulserande hjärta med personens bild inuti
// och ett "womp womp"-ljud. Första gången en person öppnar sidan sparas tiden i den delade datan
// trolled, och personen får POINTS.troll (minuspoäng) i totaltabellen. Gäller alla, även admins.
// Var: Mer-menyn, sidan "Strippklubbar".
// Används av: components/Shell.jsx.
// Bilderna och texterna står i TROLL i lib/config.js. Bilderna ligger i en publik bucket i Supabase.

import { useEffect, useRef, useState } from 'react';
import { POINTS, SUPABASE_URL, TROLL_BUCKET, TROLL } from '../lib/config';
import { cx } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';

// Bygger adressen till en bild i den publika bucketen. encodeURIComponent gör att filnamn med
// mellanslag eller å, ä och ö också fungerar.
const trollUrl = (file) => `${SUPABASE_URL}/storage/v1/object/public/${TROLL_BUCKET}/${encodeURIComponent(file)}`;

// Bakgrunden för hela skärmen: mörkt rosa uppe till vänster mot mörk indigo nere till höger.
const BACKGROUND = 'linear-gradient(135deg, #831843 0%, #4c0519 45%, #1e1b4b 100%)';

// Hjärtats form, ritad i ett rutnät där hjärtat ligger ungefär mellan x 98–302 och y 290–520: två
// bågar upptill och en spets nedtill. Samma form används tre gånger: som fyllning, som mask att
// beskära bilden med och som kant.
const HEART = 'M200 520 C 90 430, 70 340, 130 300 C 170 274, 200 300, 200 330 C 200 300, 230 274, 270 300 C 330 340, 310 430, 200 520 Z';
// Utsnittet av rutnätet runt hjärtat (x, y, bredd, höjd), precis så mycket större än hjärtat att
// kanten får plats. Används av alla lagren nedan, så att de hamnar exakt ovanpå varandra.
const HEART_BOX = '92 284 216 242';
// Masken som beskär bilden till hjärtformen: en liten SVG med hjärtat, inbakad i en adress
// (data-URI) så att den kan användas som CSS-mask. Bara det som ligger innanför hjärtat syns.
const HEART_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${HEART_BOX}"><path d="${HEART}"/></svg>`)}")`;
// Hjärtats bredd på skärmen. Det minsta av tre mått gäller: 75 procent av skärmens bredd, 340 px,
// och den bredd som gör hjärtat 45 procent av skärmens höjd (höjden är 242/216 av bredden, därför
// räknas höjden om till bredd). På så vis får hjärtat plats både på smala och på låga skärmar.
const HEART_WIDTH = 'min(75vw, 340px, calc(45dvh * 216 / 242))';
// Standardvärden för bilden när en person saknar focus eller zoom i TROLL (se lib/config.js).
const DEFAULT_FOCUS = '50% 30%';
const DEFAULT_ZOOM = 1;

// Sant om personen har bett om mindre rörelse i telefonens inställningar. Då hoppas animeringarna över.
const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Props: data = all delad data, mut = funktionen som ändrar den, user = den inloggade,
// goTab = byter flik (används av knappen "Okej, jag fattar").
export function StripTab({ data, mut, user, goTab }) {
  // Personens bild och text. Saknas personen i TROLL används en standardtext och ett tomt hjärta.
  const troll = TROLL[user] || {};
  const text = troll.text || 'Not on my watch!';
  // focus = vilken del av bilden som hamnar i mitten av hjärtat. zoom = förstoring. Båda är
  // valfria i TROLL. Ett zoom som inte är ett tal större än noll räknas som ingen förstoring.
  const focus = troll.focus || DEFAULT_FOCUS;
  const zoom = Number(troll.zoom) > 0 ? Number(troll.zoom) : DEFAULT_ZOOM;
  // first = är det här första gången personen öppnar sidan? Bestäms en enda gång, när sidan
  // öppnas, så att texten "−1 poäng" står kvar även efter att tiden har sparats här nedanför.
  const [first] = useState(() => !data.trolled[user]);
  // failedFile = filnamnet på den bild som inte gick att ladda (null om inget har gått fel). Då
  // visas bara det rosa hjärtat. Filnamnet sparas, inte bara ja eller nej, så att ett nytt filnamn
  // i lib/config.js får en ny chans i stället för att fortsätta räknas som trasigt.
  const [failedFile, setFailedFile] = useState(null);
  // ran = har ljudet redan spelats? React kör effekter två gånger i utvecklingsläge, och utan
  // den här spärren skulle ljudet då spelas dubbelt.
  const ran = useRef(false);
  // textRef pekar på den stora texten och heartRef på hjärtat, så att de kan animeras.
  const textRef = useRef(null);
  const heartRef = useRef(null);

  // Körs en gång när sidan öppnas: spelar ljudet och sparar första besöket.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    Sound.womp();
    // SPARAR TILL SUPABASE: data.trolled[namn] = tiden för första besöket. Raden skrivs bara om
    // den saknas, så funktionen tål att köras flera gånger och drar aldrig mer än ett minuspoäng.
    mut((d) => { if (!d.trolled[user]) d.trolled[user] = Date.now(); });
    // Ska bara köras när sidan öppnas, inte varje gång datan ändras.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Körs en gång när sidan öppnas: låter texten studsa in snett. Görs med webbläsarens inbyggda
  // animering (element.animate) eftersom appen inte har någon egen CSS-fil. Den som har bett
  // om mindre rörelse (prefers-reduced-motion) får texten direkt på plats.
  useEffect(() => {
    const el = textRef.current;
    if (!el || !el.animate || reducedMotion()) return;
    el.animate(
      [
        { transform: 'translateY(-120vh) rotate(-35deg) scale(0.4)', opacity: 0 },
        { transform: 'translateY(0) rotate(-2deg) scale(1.2)', opacity: 1, offset: 0.55 },
        { transform: 'translateY(-28px) rotate(-10deg) scale(0.94)', offset: 0.72 },
        { transform: 'translateY(0) rotate(-5deg) scale(1.04)', offset: 0.86 },
        { transform: 'translateY(0) rotate(-6deg) scale(1)' },
      ],
      { duration: 900, easing: 'ease-out' },
    );
  }, []);

  // Körs en gång när sidan öppnas: låter hjärtat pulsera lugnt, om och om igen. Stängs av med
  // prefers-reduced-motion. Animeringen stoppas när sidan stängs (return-funktionen).
  useEffect(() => {
    const el = heartRef.current;
    if (!el || !el.animate || reducedMotion()) return undefined;
    const pulse = el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }],
      { duration: 1800, easing: 'ease-in-out', iterations: Infinity },
    );
    return () => pulse.cancel();
  }, []);

  // Bilden visas bara om det finns ett filnamn och just den filen inte har misslyckats att ladda.
  const showImage = !!troll.file && failedFile !== troll.file;

  return (
    // Helskärmen: fixed och z-50 lägger den ovanpå sidhuvudet och flikraden. h-dvh är skärmens
    // verkliga höjd på iPhone, även när adressfältet visas eller göms. overflow-hidden gör att
    // sidan aldrig går att scrolla.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Strippklubbar"
      className="fixed inset-0 z-50 h-dvh w-full overflow-hidden bg-slate-950"
      style={{ backgroundImage: BACKGROUND }}
    >
      {/* Innehållet i en kolumn, uppifrån och ner: texten, hjärtat, och sist poängraden och knappen.
          justify-evenly fördelar det tomma utrymmet jämnt mellan och runt de tre delarna, och gap-4
          är det minsta mellanrummet. Kanterna flyttas in med env(safe-area-inset-*) så att inget
          hamnar bakom iPhonens kameraflik eller hemstreck. */}
      <div
        className="h-full flex flex-col items-center justify-evenly gap-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 1.5rem)',
          paddingRight: 'calc(env(safe-area-inset-right) + 1.5rem)',
        }}
      >
        {/* Den stora texten, ovanför hjärtat. Lutningen sätts med style (inte en Tailwind-klass)
            så att den är exakt samma som animeringens sista steg och texten inte hoppar när den
            landar. Textstorleken följer skärmens bredd (11 procent av bredden), men blir aldrig
            mindre än 2rem eller större än 3.75rem, så att texten krymper på smala skärmar.
            max-w-full och break-words gör att den aldrig blir bredare än skärmen. */}
        <p
          ref={textRef}
          style={{ transform: 'rotate(-6deg)', fontSize: 'clamp(2rem, 11vw, 3.75rem)' }}
          className={cx(DISPLAY, 'shrink-0 max-w-full text-center leading-none text-amber-400 break-words [text-shadow:0_4px_0_#020617,0_8px_28px_#000]')}
        >
          {text}
        </p>

        {/* Hjärtat. Rutan har bredden HEART_WIDTH och samma proportioner som utsnittet HEART_BOX
            (216 x 242). drop-shadow ger det mjuka röda skenet runt hjärtats form. I rutan ligger
            tre lager ovanpå varandra: det rosa hjärtat, bilden och kanten. */}
        <div
          ref={heartRef}
          aria-hidden="true"
          className="relative shrink-0"
          style={{ width: HEART_WIDTH, aspectRatio: '216 / 242', filter: 'drop-shadow(0 0 22px rgba(244, 63, 94, 0.75))' }}
        >
          {/* Lager 1: det rosa hjärtat. Syns ensamt när bild saknas, inte går att ladda eller
              inte har hunnit laddas, och ligger annars gömt bakom bilden. */}
          <svg viewBox={HEART_BOX} className="absolute inset-0 w-full h-full">
            <path d={HEART} fill="#e11d48" />
          </svg>
          {showImage && (
            // Lager 2: en ruta som maskas till hjärtformen med HEART_MASK, med personens bild inuti.
            // Masken ligger på rutan och inte på bilden, så att hjärtformen står still när bilden
            // förstoras. Den anges både med och utan Webkit-prefix eftersom äldre iPhone bara
            // förstår den med prefix. overflow-hidden klipper det av bilden som hamnar utanför.
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                WebkitMaskImage: HEART_MASK,
                maskImage: HEART_MASK,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
              }}
            >
              {/* En vanlig <img>, inte next/image, så att next.config.ts inte behöver känna till
                  Supabase-adressen. object-cover fyller rutan, objectPosition väljer vilken del av
                  bilden som syns (focus) och scale förstorar (zoom). transformOrigin gör att
                  förstoringen utgår från samma punkt, så att den delen stannar kvar i mitten.
                  Går bilden inte att ladda sparas filnamnet i failedFile och bilden tas bort. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trollUrl(troll.file)}
                alt=""
                onError={() => setFailedFile(troll.file)}
                className="w-full h-full object-cover"
                style={{ objectPosition: focus, transform: `scale(${zoom})`, transformOrigin: focus }}
              />
            </div>
          )}
          {/* Lager 3: den rosa-röda kanten, överst så att den ligger ovanpå bilden. */}
          <svg viewBox={HEART_BOX} className="absolute inset-0 w-full h-full">
            <path d={HEART} fill="none" stroke="#fb7185" strokeWidth="5" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Poängraden och knappen, nederst. */}
        <div className="shrink-0 w-full max-w-sm flex flex-col items-center gap-3">
          {/* Första gången dras ett poäng. Därefter visas bara bilden igen. */}
          <p className={cx('rounded-full border bg-slate-950/80 px-4 py-1.5 text-sm font-bold text-center', first ? 'border-red-400 text-red-400' : 'border-slate-700 text-slate-300')} role="status">
            {first ? `−${Math.abs(POINTS.troll)} poäng i totalen` : 'Du har redan fått ditt minuspoäng'}
          </p>
          <button type="button" onClick={() => goTab('agenda')} className={cx(PRESS, GLOW_GOLD, 'w-full rounded-2xl bg-amber-400 text-slate-950 font-black px-5 py-3.5')}>
            Okej, jag fattar
          </button>
        </div>
      </div>
    </div>
  );
}
