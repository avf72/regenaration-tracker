"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_SEQUENCES = 10;
const BLANK_MS = 250;

const SHAPES = [
  { id: "circle", label: "Kreis" },
  { id: "square", label: "Viereck" },
  { id: "triangle", label: "Dreieck" },
] as const;

type ShapeId = (typeof SHAPES)[number]["id"];

interface TargetResult {
  index: number;
  status: "pending" | "hit" | "miss";
  reaction: number | null;
}

interface HistoryItem {
  round: number;
  hits: number;
  targets: number;
  misses: number;
  falseAlarms: number;
  avg: number;
  accuracy: number;
}

type Phase = "ready" | "running" | "done";

function randomShape(): ShapeId {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)].id;
}

function avg(values: number[]): number {
  if (!values.length) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function fmtMs(value: number): string {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : "-- ms";
}

function accuracy(hits: number, misses: number, falseAlarms: number): number {
  const decisions = hits + misses + falseAlarms;
  if (!decisions) return 0;
  return Math.round((hits / decisions) * 100);
}

async function saveResult(data: HistoryItem & { symbolSpeedMs: number }) {
  await fetch("/api/results", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => null);
}

export default function ReactionTest() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [round, setRound] = useState(0);
  const [symbolSpeed, setSymbolSpeed] = useState(3000);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [targetCount, setTargetCount] = useState(0);
  const [reactions, setReactions] = useState<number[]>([]);
  const [targetResults, setTargetResults] = useState<TargetResult[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentShape, setCurrentShape] = useState<ShapeId | null>(null);
  const [blank, setBlank] = useState(false);
  const [btnState, setBtnState] = useState<"idle" | "success" | "error">("idle");
  const [saving, setSaving] = useState(false);

  const stateRef = useRef({
    phase: "ready" as Phase,
    sequence: [] as ShapeId[],
    symbolShownAt: 0,
    activeTarget: false,
    targetAnswered: false,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    targetCount: 0,
    reactions: [] as number[],
    targetResults: [] as TargetResult[],
  });
  const symbolTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blankTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimers = useCallback(() => {
    if (symbolTimer.current) clearTimeout(symbolTimer.current);
    if (blankTimer.current) clearTimeout(blankTimer.current);
  }, []);

  const syncReactState = useCallback(() => {
    const s = stateRef.current;
    setHits(s.hits);
    setMisses(s.misses);
    setFalseAlarms(s.falseAlarms);
    setTargetCount(s.targetCount);
    setReactions([...s.reactions]);
    setTargetResults([...s.targetResults]);
  }, []);

  const finishRound = useCallback(
    (speedMs: number) => {
      const s = stateRef.current;
      if (s.phase !== "running") return;

      if (s.activeTarget && !s.targetAnswered) {
        s.misses += 1;
        const last = s.targetResults[s.targetResults.length - 1];
        if (last?.status === "pending") last.status = "miss";
      }
      s.activeTarget = false;
      s.targetAnswered = false;
      s.phase = "done";
      stopTimers();
      setPhase("done");
      setBlank(false);

      const roundAvg = avg(s.reactions);
      const roundAccuracy = accuracy(s.hits, s.misses, s.falseAlarms);
      const item: HistoryItem = {
        round: round + 1,
        hits: s.hits,
        targets: s.targetCount,
        misses: s.misses,
        falseAlarms: s.falseAlarms,
        avg: roundAvg,
        accuracy: roundAccuracy,
      };
      setHistory((prev) => [item, ...prev].slice(0, 6));
      syncReactState();

      setSaving(true);
      saveResult({ ...item, symbolSpeedMs: speedMs }).finally(() => setSaving(false));
    },
    [round, stopTimers, syncReactState],
  );

  const scheduleTransition = useCallback(
    (speedMs: number) => {
      symbolTimer.current = setTimeout(() => {
        const s = stateRef.current;
        if (s.phase !== "running") return;

        if (s.activeTarget && !s.targetAnswered) {
          s.misses += 1;
          const last = s.targetResults[s.targetResults.length - 1];
          if (last?.status === "pending") last.status = "miss";
        }
        s.activeTarget = false;
        s.targetAnswered = false;

        setBlank(true);
        setCurrentShape(null);

        blankTimer.current = setTimeout(() => {
          if (s.targetCount >= TARGET_SEQUENCES) {
            finishRound(speedMs);
            return;
          }

          const next = randomShape();
          s.sequence.push(next);
          s.sequence = s.sequence.slice(-3);
          s.symbolShownAt = performance.now();

          const isTarget =
            s.sequence.length >= 3 && s.sequence[0] === s.sequence[2];
          s.activeTarget = isTarget;
          s.targetAnswered = false;

          if (isTarget) {
            s.targetCount += 1;
            s.targetResults.push({ index: s.targetCount, status: "pending", reaction: null });
          }

          setBlank(false);
          setCurrentShape(next);
          syncReactState();
          scheduleTransition(speedMs);
        }, BLANK_MS);
      }, speedMs);
    },
    [finishRound, syncReactState],
  );

  const startRound = useCallback(() => {
    stopTimers();
    const s = stateRef.current;
    s.phase = "running";
    s.sequence = [];
    s.symbolShownAt = 0;
    s.activeTarget = false;
    s.targetAnswered = false;
    s.hits = 0;
    s.misses = 0;
    s.falseAlarms = 0;
    s.targetCount = 0;
    s.reactions = [];
    s.targetResults = [];

    setRound((r) => r + 1);
    setPhase("running");
    setBlank(false);
    syncReactState();

    const next = randomShape();
    s.sequence.push(next);
    s.symbolShownAt = performance.now();
    setCurrentShape(next);
    scheduleTransition(symbolSpeed);
  }, [stopTimers, syncReactState, scheduleTransition, symbolSpeed]);

  const handleReaction = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "running") return;

    if (s.activeTarget && !s.targetAnswered) {
      const reaction = performance.now() - s.symbolShownAt;
      s.targetAnswered = true;
      s.hits += 1;
      s.reactions.push(reaction);
      const last = s.targetResults[s.targetResults.length - 1];
      if (last?.status === "pending") {
        last.status = "hit";
        last.reaction = reaction;
      }
      setBtnState("success");
      setTimeout(() => setBtnState("idle"), 140);
    } else {
      s.falseAlarms += 1;
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 140);
    }
    syncReactState();
  }, [syncReactState]);

  const resetAll = useCallback(() => {
    stopTimers();
    const s = stateRef.current;
    s.phase = "ready";
    s.sequence = [];
    s.symbolShownAt = 0;
    s.activeTarget = false;
    s.targetAnswered = false;
    s.hits = 0;
    s.misses = 0;
    s.falseAlarms = 0;
    s.targetCount = 0;
    s.reactions = [];
    s.targetResults = [];

    setPhase("ready");
    setRound(0);
    setBlank(false);
    setCurrentShape(null);
    setHistory([]);
    syncReactState();
  }, [stopTimers, syncReactState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleReaction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleReaction]);

  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  const phaseLabel = { ready: "Bereit", running: "Laeuft", done: "Auswertung" }[phase];
  const avgVal = avg(reactions);
  const lastReaction = reactions.length ? reactions[reactions.length - 1] : NaN;
  const acc = accuracy(hits, misses, falseAlarms);
  const isRunning = phase === "running";
  const isDone = phase === "done";

  const btnClass =
    btnState === "success"
      ? "bg-green-700"
      : btnState === "error"
        ? "bg-red-500"
        : "bg-[#14211f] hover:bg-[#203532]";

  return (
    <main className="w-[min(1180px,calc(100%-32px))] mx-auto py-7">
      {/* Topbar */}
      <section className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase text-green-700 mb-1">
            Konzentration und Reaktion
          </p>
          <h1 className="text-[clamp(2rem,5vw,4.2rem)] font-black leading-none tracking-tight">
            Symbol-Abstandstest
          </h1>
        </div>
        <div className="min-w-[112px] border border-gray-200 rounded-full bg-white/80 px-4 py-2.5 text-center font-extrabold text-green-900">
          {phaseLabel}
        </div>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-[290px_1fr] gap-4 max-[860px]:grid-cols-1">
        {/* Control Panel */}
        <aside className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-[18px] flex flex-col gap-[18px]">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-bold text-gray-500">Training</span>
            <strong className="text-green-900">Runde {round}</strong>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-2 border border-gray-200 rounded-lg bg-[#f8faf6] px-3 py-3 text-sm font-bold text-gray-500">
            <span>Zielsequenzen</span>
            <b className="text-[#14211f]">10</b>
          </div>

          <label className="grid grid-cols-[1fr_auto] gap-2 text-sm font-bold text-gray-500">
            <span>Symboltempo</span>
            <b className="text-[#14211f]">{symbolSpeed} ms</b>
            <input
              type="range"
              min={1500}
              max={5000}
              step={100}
              value={symbolSpeed}
              onChange={(e) => setSymbolSpeed(Number(e.target.value))}
              disabled={isRunning}
              className="col-span-2 accent-green-700"
            />
          </label>

          <button
            onClick={startRound}
            disabled={isRunning}
            className="min-h-[46px] rounded-lg bg-green-700 text-white font-black hover:bg-green-900 disabled:opacity-50 disabled:cursor-default"
          >
            {isDone ? "Naechste Runde" : "Training starten"}
          </button>

          <button
            onClick={handleReaction}
            disabled={!isRunning}
            className={`min-h-[82px] rounded-lg text-white font-black text-xl transition-colors ${btnClass} disabled:opacity-50 disabled:cursor-default`}
          >
            Druecken
          </button>

          <button
            onClick={resetAll}
            className="min-h-[46px] rounded-lg border border-gray-200 bg-[#f8faf6] text-[#14211f] font-black"
          >
            Verlauf loeschen
          </button>
        </aside>

        {/* Test Panel */}
        <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-[18px] min-h-[470px] flex flex-col gap-[18px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.78rem] font-extrabold uppercase text-green-700 mb-1">
                Aktuelles Symbol
              </p>
              <h2 className="text-[clamp(1.35rem,2vw,2.1rem)] font-black">
                {isRunning ? "Beobachte die Symbolfolge" : isDone ? "Runde abgeschlossen" : "Warte auf den Start"}
              </h2>
            </div>
            <div className="min-w-[82px] rounded-lg bg-[#14211f] text-white px-3 py-2.5 text-center">
              <span className="block text-[1.6rem] font-black leading-none">
                {isRunning ? TARGET_SEQUENCES - targetCount : "--"}
              </span>
              <small className="text-white/75 text-xs">Ziele</small>
            </div>
          </div>

          <div className="flex-1 grid gap-3 content-center items-center justify-items-center text-center">
            <div
              className="grid place-items-center rounded-full border border-green-200/40"
              style={{
                width: "min(340px, 78vw)",
                aspectRatio: "1",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.96) 0 56%, rgba(31,122,90,0.08) 57% 100%)",
              }}
            >
              <SymbolCard shape={currentShape} blank={blank} />
            </div>
            <p className="max-w-[660px] text-gray-500 font-bold leading-relaxed text-sm">
              {isRunning
                ? "Druecke nur, wenn das aktuelle Symbol identisch mit dem Symbol zwei Positionen vorher ist."
                : isDone
                  ? "Du siehst unten Treffer, verpasste Zielsequenzen, Fehlklicks und deine Reaktionszeiten."
                  : "Wenn die Folge Symbol, irgendein Symbol, dasselbe Symbol entsteht, drueckst du den Button. Die Reaktionszeit startet immer beim Erscheinen des neuen Symbols."}
            </p>
          </div>
        </section>

        {/* Stats Row */}
        <section className="col-span-full grid grid-cols-4 gap-3 max-[860px]:grid-cols-2">
          {[
            { label: "Treffer", value: isRunning ? "--" : `${hits}/${targetCount}` },
            { label: "Verpasst", value: isRunning ? "--" : misses },
            { label: "Fehlklicks", value: isRunning ? "--" : falseAlarms },
            { label: "Ø Reaktion", value: isRunning ? "-- ms" : fmtMs(avgVal) },
          ].map((s) => (
            <article key={s.label} className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-4">
              <span className="text-sm font-bold text-gray-500">{s.label}</span>
              <strong className="block mt-2 text-[clamp(1.35rem,3vw,2rem)] font-black leading-none">
                {s.value}
              </strong>
            </article>
          ))}
        </section>

        {/* Reaction Bars */}
        <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-[18px] min-h-[210px]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <span className="text-sm font-bold text-gray-500">Reaktionszeiten</span>
            <strong className="text-green-900 text-sm">
              {Number.isFinite(lastReaction) ? fmtMs(lastReaction) : "Noch keine"}
            </strong>
          </div>
          <ReactionBars targetResults={targetResults} reactions={reactions} isRunning={isRunning} />
        </section>

        {/* History */}
        <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-[18px] min-h-[210px]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <span className="text-sm font-bold text-gray-500">Rundenverlauf</span>
            <strong className="text-green-900 text-sm">
              {isDone ? `${acc}%` : "--%"}
            </strong>
          </div>
          {saving && <p className="text-xs text-gray-400 mb-2">Speichern…</p>}
          <HistoryList history={history} />
        </section>
      </div>
    </main>
  );
}

function SymbolCard({ shape, blank }: { shape: ShapeId | null; blank: boolean }) {
  return (
    <div
      className={`grid place-items-center rounded-lg border border-gray-200 shadow-xl ${blank ? "bg-[#f6f8f4] shadow-inner" : "bg-white"}`}
      style={{ width: "68%", aspectRatio: "1" }}
    >
      {!blank && shape ? <ShapeIcon shape={shape} /> : !blank && (
        <span className="text-[clamp(5rem,20vw,9rem)] font-black leading-none text-[#111614]">?</span>
      )}
    </div>
  );
}

function ShapeIcon({ shape }: { shape: ShapeId }) {
  const base = "bg-[#111614]";
  if (shape === "circle") return <div className={`${base} rounded-full`} style={{ width: "48%", height: "48%" }} />;
  if (shape === "square") return <div className={`${base} rounded-sm`} style={{ width: "48%", height: "48%" }} />;
  return (
    <div
      className={base}
      style={{ width: "48%", height: "48%", clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
    />
  );
}

function ReactionBars({ targetResults, reactions, isRunning }: { targetResults: TargetResult[]; reactions: number[]; isRunning: boolean }) {
  if (isRunning || !targetResults.length) {
    return (
      <p className="text-gray-500 font-bold text-sm">
        {isRunning ? "Die Auswertung erscheint nach der Runde." : "Das Diagramm erscheint nach der Runde."}
      </p>
    );
  }
  const max = Math.max(...reactions, 1000);
  return (
    <div className="grid gap-2.5">
      {targetResults.map((r) => {
        const missed = r.status === "miss";
        const width = r.status === "hit" ? Math.max(6, ((r.reaction ?? 0) / max) * 100) : 100;
        return (
          <div key={r.index} className={`grid items-center gap-2.5 text-sm font-bold ${missed ? "text-red-500" : "text-gray-500"}`} style={{ gridTemplateColumns: "74px 1fr 74px" }}>
            <span>Ziel {r.index}</span>
            <div className={`h-2.5 rounded-full overflow-hidden ${missed ? "bg-red-100" : "bg-[#e8eee5]"}`}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background: missed
                    ? "repeating-linear-gradient(45deg, rgba(216,95,69,0.86) 0 8px, rgba(216,95,69,0.28) 8px 16px)"
                    : "linear-gradient(90deg, #1f7a5a, #d4a017, #d85f45)",
                }}
              />
            </div>
            <strong>{r.status === "hit" ? fmtMs(r.reaction ?? NaN) : "verpasst"}</strong>
          </div>
        );
      })}
    </div>
  );
}

function HistoryList({ history }: { history: HistoryItem[] }) {
  if (!history.length) {
    return <p className="text-gray-500 font-bold text-sm">Noch keine abgeschlossene Runde.</p>;
  }
  return (
    <div className="grid gap-2.5">
      {history.map((item) => (
        <div key={item.round} className="grid gap-2 border-b border-gray-200 pb-2.5 text-gray-500 font-bold text-sm" style={{ gridTemplateColumns: "1fr auto" }}>
          <span>
            <strong className="text-[#14211f]">Runde {item.round}</strong>
            {" · "}
            {item.hits}/{item.targets} Treffer · {item.misses} verpasst · {item.falseAlarms} Fehlklicks
          </span>
          <strong className="text-[#14211f]">{fmtMs(item.avg)}</strong>
        </div>
      ))}
    </div>
  );
}
