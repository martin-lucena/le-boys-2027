// LÅTSTUDION.
// Vad: gruppen skriver resans låt tillsammans, del för del (intro, verser, refräng, outro), och kan
// spela ett trumbeat att sjunga till.
// Var: under Mer-menyn.
// Används av: components/Shell.jsx.
// Låttexten och tempot delas mellan alla. Beat-mönstret (vilka rutor som är tända) sparas bara på den egna telefonen.

import { useEffect, useRef, useState } from 'react';
import { Play, Square, X, Copy } from 'lucide-react';
import { PLAYER, BLOCKS, STEPS, DEFAULT_PATTERN, BEAT_ROWS } from '../lib/constants';
import { cx, uid, clone } from '../utils/helpers';
import { PRESS, GLOW_GOLD, DISPLAY } from '../utils/styles';
import { Sound } from '../utils/sound';
import { Card, Pop, SectionTitle } from './ui';

/* ---------- Flik 3: Låtstudion ---------- */
// BeatMachine: trummaskinen. Används bara av Studio längst ner.
// Props: data = delad data (data.bpm och data.pattern), mut = funktionen som ändrar data.
function BeatMachine({ data, mut }) {
  // playing = spelas beatet just nu? step = vilket av de 16 stegen som just spelas (-1 = inget).
  // noAudio = sant om webbläsaren inte tillåter ljud.
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [noAudio, setNoAudio] = useState(false);
  // live håller senaste tempo och mönster, så att ändringar hörs direkt medan beatet spelar.
  const live = useRef({ bpm: data.bpm, pattern: data.pattern });
  live.current = { bpm: data.bpm, pattern: data.pattern };
  // timer = klockan som driver beatet. touts = väntande små timers som tänder rätt ruta på skärmen.
  const timer = useRef(null);
  const touts = useRef([]);

  // Stänger av klockan och alla väntande timers.
  const clear = () => {
    clearInterval(timer.current);
    timer.current = null;
    touts.current.forEach(clearTimeout);
    touts.current = [];
  };
  // stop körs när man trycker på stoppknappen. start körs när man trycker på play.
  const stop = () => { clear(); setPlaying(false); setStep(-1); };
  const start = () => {
    const c = Sound.ac();
    if (!c) { setNoAudio(true); return; }
    let next = c.currentTime + 0.08;
    let s = 0;
    // SÅ HÅLLER BEATET TAKTEN: var 25:e millisekund kollar koden om nästa slag ligger inom de närmaste
    // 0,12 sekunderna. I så fall bokas ljudet in i förväg på exakt rätt tidpunkt i ljudmotorns egen
    // klocka. Det ger jämn takt även om telefonen hackar till. Ett steg är en sextondel:
    // 60 / bpm / 4 sekunder. Efter steg 16 börjar det om på steg 1.
    timer.current = setInterval(() => {
      while (next < c.currentTime + 0.12) {
        const p = live.current.pattern;
        if (p.kick[s]) Sound.kick(next);
        if (p.snare[s]) Sound.snare(next);
        if (p.hat[s]) Sound.hat(next);
        const cs = s;
        touts.current.push(setTimeout(() => setStep(cs), Math.max(0, (next - c.currentTime) * 1000)));
        if (touts.current.length > 64) touts.current.splice(0, 32);
        next += 60 / live.current.bpm / 4;
        s = (s + 1) % STEPS;
      }
    }, 25);
    setPlaying(true);
  };
  // Körs när man lämnar Låtstudion: stänger av beatet så att det inte fortsätter i bakgrunden.
  useEffect(() => clear, []);

  // Körs när man trycker på en ruta: tänder eller släcker den och spelar ljudet som smakprov.
  const toggle = (row, i) => {
    // Ändrar data.pattern. Den delen synkas INTE till Supabase utan sparas bara i den här webbläsaren.
    mut((d) => { d.pattern[row][i] = d.pattern[row][i] ? 0 : 1; });
    if (!playing) Sound[row]();
  };
  const beat = step >= 0 ? Math.floor(step / 4) : -1;

  return (
    <Card className={playing ? GLOW_GOLD : ''}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={playing ? stop : start}
          aria-label={playing ? 'Stoppa beatet' : 'Spela beatet'}
          className={cx(PRESS, 'w-16 h-16 rounded-full flex items-center justify-center shrink-0 text-slate-950', playing ? 'bg-red-400' : cx('bg-amber-400', GLOW_GOLD))}
        >
          {playing ? <Square className="w-6 h-6 fill-current" aria-hidden="true" /> : <Play className="w-7 h-7 fill-current" aria-hidden="true" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <label htmlFor="beat-bpm" className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">Tempo</label>
            <span className="font-black text-3xl leading-none tabular-nums text-amber-400">
              {data.bpm}<span className="text-sm text-slate-400 ml-1">BPM</span>
            </span>
          </div>
          <input
            id="beat-bpm"
            type="range"
            min={90}
            max={140}
            step={1}
            value={data.bpm}
            // SPARAR TILL SUPABASE: data.bpm, tempot. Körs när man drar i reglaget och ändras hos alla.
            onChange={(e) => mut((d) => { d.bpm = Number(e.target.value); })}
            className="w-full mt-3 accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 tabular-nums mt-1"><span>90</span><span>115</span><span>140</span></div>
        </div>
      </div>
      <div className="flex gap-1.5 mt-4" aria-hidden="true">
        {[0, 1, 2, 3].map((b) => (
          <span key={b} className={cx('flex-1 h-1.5 rounded-full transition-colors duration-75', beat === b ? 'bg-emerald-400' : 'bg-slate-800')} />
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {BEAT_ROWS.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-12 text-[11px] uppercase tracking-wider text-slate-400 font-semibold shrink-0">{r.label}</span>
            <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5">
              {data.pattern[r.id].map((on, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(r.id, i)}
                  aria-label={`${r.label} steg ${i + 1}`}
                  aria-pressed={!!on}
                  className={cx('h-8 rounded transition-all duration-75', on ? r.on : i % 4 === 0 ? 'bg-slate-700' : 'bg-slate-800', step === i && 'scale-110 brightness-150 ring-1 ring-white')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-slate-400">
          {noAudio ? 'Webbläsaren släpper inte fram ljud här.' : 'Tryck på rutorna för att bygga om beatet. Sjung eller rappa i takt.'}
        </p>
        {/* Grundbeat: återställer data.pattern till standardmönstret. Sparas bara lokalt, inte i Supabase. */}
        <button type="button" onClick={() => mut((d) => { d.pattern = clone(DEFAULT_PATTERN); })} className="text-xs text-slate-400 hover:text-slate-100 underline shrink-0 ml-3">
          Grundbeat
        </button>
      </div>
    </Card>
  );
}

// SongBlock: en del av låten (till exempel Vers 1) med sina rader och ett fält för en ny rad.
// Props: block = delen ({ id, label }), lines = raderna i den, user = den inloggade,
// mut = funktionen som ändrar data.
function SongBlock({ block, lines, user, mut }) {
  const [text, setText] = useState('');
  // Körs när man trycker Lägg till.
  const add = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    // SPARAR TILL SUPABASE: data.song. En ny rad läggs sist i den här delen av låten.
    mut((d) => { d.song[block.id].push({ id: uid(), author: user, text: t }); });
    Sound.pop(lines.length * 2);
    setText('');
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className={cx(DISPLAY, 'text-xl')}>{block.label}</h3>
        <span className="text-xs text-slate-400 tabular-nums">{lines.length} {lines.length === 1 ? 'rad' : 'rader'}</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Tomt än. Första raden sätter tonen.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <Pop as="li" key={l.id} className={cx('flex items-start gap-2 rounded-lg bg-slate-950 border-l-4 px-2.5 py-2', PLAYER[l.author].border)}>
              <span className="flex-1 min-w-0 break-words">{l.text}</span>
              <span className={cx('text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 text-slate-950', PLAYER[l.author].bg)}>{l.author}</span>
              {l.author === user && (
                <button
                  type="button"
                  // SPARAR TILL SUPABASE: data.song. Tar bort raden. Knappen visas bara på ens egna rader.
                  onClick={() => { Sound.tap(); mut((d) => { d.song[block.id] = d.song[block.id].filter((x) => x.id !== l.id); }); }}
                  aria-label="Ta bort din rad"
                  className="text-slate-400 hover:text-red-400 shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </Pop>
          ))}
        </ol>
      )}
      <form onSubmit={add} className="flex gap-2 mt-3">
        <label htmlFor={`line-${block.id}`} className="sr-only">Ny rad i {block.label}</label>
        <input
          id={`line-${block.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder={`Ny rad från ${user}`}
          className="flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
        />
        <button type="submit" disabled={!text.trim()} className={cx(PRESS, 'rounded-xl px-4 font-bold', text.trim() ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400')}>
          Lägg till
        </button>
      </form>
    </Card>
  );
}

// Studio: hela fliken. Rubrik med kopieringsknapp, trummaskinen och en SongBlock per del av låten.
// Props: data och mut = delad data och funktionen som ändrar den, user = den inloggade.
export function Studio({ data, mut, user }) {
  // copied = kvittot som visas i knappen en kort stund efter kopiering.
  const [copied, setCopied] = useState('');
  const total = BLOCKS.reduce((s, b) => s + data.song[b.id].length, 0);
  // Körs när man trycker Kopiera texten: lägger hela låten i urklipp, med vem som skrev varje rad.
  const copy = () => {
    const txt = BLOCKS.map((b) => `[${b.label}]\n${data.song[b.id].map((l) => `${l.text}  (${l.author})`).join('\n')}`).join('\n\n');
    try {
      navigator.clipboard.writeText(txt).then(() => setCopied('Kopierad'), () => setCopied('Gick inte att kopiera'));
    } catch (e) { setCopied('Gick inte att kopiera'); }
    setTimeout(() => setCopied(''), 2200);
  };
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        kicker="Låtstudion"
        title="Resans låt"
        right={(
          <button type="button" onClick={copy} disabled={!total} className={cx(PRESS, 'flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold', total ? 'text-slate-100 hover:border-amber-400' : 'text-slate-500')}>
            <Copy className="w-3.5 h-3.5" aria-hidden="true" /> {copied || 'Kopiera texten'}
          </button>
        )}
      />
      <BeatMachine data={data} mut={mut} />
      {BLOCKS.map((b) => <SongBlock key={b.id} block={b} lines={data.song[b.id]} user={user} mut={mut} />)}
    </div>
  );
}
