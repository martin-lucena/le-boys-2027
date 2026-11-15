// ÅTERKOMMANDE UTSEENDE.
// Vad: färdiga rader med Tailwind-klasser som används på många ställen, så att knappar och rubriker ser likadana ut.
// Var: PRESS = tryckkänsla på knappar, GLOW_GOLD och GLOW_GREEN = glöd runt rutor,
// STRIPE = randig bakgrund, DISPLAY = stora rubriker.
// Används av: alla komponenter.

// Återkommande klasskombinationer (standard Tailwind).
export const PRESS = 'transition duration-150 hover:-translate-y-0.5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
export const GLOW_GOLD = 'ring-1 ring-amber-400/60 shadow-[0_0_26px_rgba(251,191,36,0.28)]';
export const GLOW_GREEN = 'ring-1 ring-emerald-400/50 shadow-[0_0_24px_rgba(52,211,153,0.25)]';
export const STRIPE = 'bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0_10px,transparent_10px_20px)]';
export const DISPLAY = 'font-black uppercase tracking-tight leading-none';
