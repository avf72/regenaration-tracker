"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

interface Phase { name: string; label: string; start_date: string | null; end_date: string | null; }
interface TestResult { created_at: string; avg_reaction_ms: number | null; accuracy: number; hits: number; targets: number; }
interface LogEntry { date: string; subjective_energy: number | null; screen_time_before_sleep_min: number | null; }

const PHASE_COLORS: Record<string, string> = { A1: "#276a9f", B: "#1f7a5a", A2: "#d85f45" };

function phaseForDate(date: string, phases: Phase[]): string | null {
  const d = date.slice(0, 10);
  for (const p of phases) {
    if (!p.start_date) continue;
    const after = d >= p.start_date;
    const before = !p.end_date || d <= p.end_date;
    if (after && before) return p.name;
  }
  return null;
}

export default function Dashboard() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPhase, setEditPhase] = useState<Phase | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, t, l] = await Promise.all([
      fetch("/api/phases").then((r) => r.json()),
      fetch("/api/results-all").then((r) => r.json()),
      fetch("/api/daily-log").then((r) => r.json()),
    ]);
    setPhases(p);
    setTests(t);
    setLogs(l);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function savePhase() {
    if (!editPhase) return;
    setSaving(true);
    await fetch("/api/phases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editPhase),
    });
    setSaving(false);
    setEditPhase(null);
    load();
  }

  const reactionData = tests
    .filter((t) => t.avg_reaction_ms != null)
    .map((t) => ({
      date: t.created_at.slice(0, 10),
      reaction: Math.round(t.avg_reaction_ms!),
      accuracy: t.accuracy,
      phase: phaseForDate(t.created_at, phases),
    }));

  const logData = logs.map((l) => ({
    date: l.date,
    energy: l.subjective_energy,
    screenTime: l.screen_time_before_sleep_min,
    phase: phaseForDate(l.date, phases),
  }));

  const phaseLines = phases
    .filter((p) => p.start_date)
    .map((p) => ({ x: p.start_date!, color: PHASE_COLORS[p.name] ?? "#999", label: p.label }));

  if (loading) {
    return (
      <main className="w-[min(1180px,calc(100%-32px))] mx-auto py-7">
        <p className="text-gray-500 font-bold">Lade Daten…</p>
      </main>
    );
  }

  return (
    <main className="w-[min(1180px,calc(100%-32px))] mx-auto py-7 flex flex-col gap-6">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase text-green-700 mb-1">Auswertung</p>
          <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-none tracking-tight">Dashboard</h1>
        </div>
      </section>

      {/* Phasen-Konfiguration */}
      <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-gray-500">Untersuchungsphasen</span>
          <span className="text-xs text-gray-400 font-bold">A1 → B → A2</span>
        </div>
        <div className="grid grid-cols-3 gap-4 max-[600px]:grid-cols-1">
          {phases.map((p) => (
            <div key={p.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: PHASE_COLORS[p.name] ?? "#999" }}>{p.name}</span>
                <strong className="text-sm text-[#14211f]">{p.label}</strong>
              </div>
              {editPhase?.name === p.name ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500">Start
                    <input type="date" value={editPhase.start_date ?? ""} onChange={(e) => setEditPhase({ ...editPhase, start_date: e.target.value || null })} className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm font-bold" />
                  </label>
                  <label className="text-xs font-bold text-gray-500">Ende
                    <input type="date" value={editPhase.end_date ?? ""} onChange={(e) => setEditPhase({ ...editPhase, end_date: e.target.value || null })} className="mt-1 w-full border border-gray-200 rounded px-2 py-1 text-sm font-bold" />
                  </label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={savePhase} disabled={saving} className="flex-1 bg-green-700 text-white text-xs font-black rounded py-1.5 hover:bg-green-900 disabled:opacity-50">{saving ? "…" : "Speichern"}</button>
                    <button onClick={() => setEditPhase(null)} className="flex-1 border border-gray-200 text-xs font-black rounded py-1.5">Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500 font-bold">Start: <span className="text-[#14211f]">{p.start_date ?? "—"}</span></span>
                  <span className="text-xs text-gray-500 font-bold">Ende: <span className="text-[#14211f]">{p.end_date ?? "—"}</span></span>
                  <button onClick={() => setEditPhase(p)} className="mt-2 text-xs font-black text-green-700 hover:underline text-left">Bearbeiten</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reaktionszeit-Chart */}
      <ChartCard title="Reaktionszeit" subtitle="Ø ms pro Runde">
        {reactionData.length === 0 ? (
          <Empty text="Noch keine Reaktionstest-Daten." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={reactionData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eee5" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700 }} unit=" ms" width={60} />
              <Tooltip formatter={(v: number) => [`${v} ms`, "Reaktionszeit"]} />
              {phaseLines.map((pl) => (
                <ReferenceLine key={pl.x} x={pl.x} stroke={pl.color} strokeDasharray="4 2" label={{ value: pl.label, fontSize: 10, fill: pl.color }} />
              ))}
              <Line type="monotone" dataKey="reaction" stroke="#1f7a5a" strokeWidth={2} dot={{ r: 4, fill: "#1f7a5a" }} name="Reaktionszeit" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Genauigkeit-Chart */}
      <ChartCard title="Genauigkeit" subtitle="% pro Runde">
        {reactionData.length === 0 ? (
          <Empty text="Noch keine Reaktionstest-Daten." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={reactionData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eee5" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fontWeight: 700 }} unit="%" domain={[0, 100]} width={48} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Genauigkeit"]} />
              {phaseLines.map((pl) => (
                <ReferenceLine key={pl.x} x={pl.x} stroke={pl.color} strokeDasharray="4 2" />
              ))}
              <Line type="monotone" dataKey="accuracy" stroke="#d4a017" strokeWidth={2} dot={{ r: 4, fill: "#d4a017" }} name="Genauigkeit" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Energie + Bildschirmzeit */}
      <ChartCard title="Tagesprotokoll" subtitle="Energie & Bildschirmzeit">
        {logData.length === 0 ? (
          <Empty text="Noch keine Tagesprotokoll-Einträge." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={logData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eee5" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis yAxisId="e" tick={{ fontSize: 11, fontWeight: 700 }} domain={[0, 10]} width={32} />
              <YAxis yAxisId="s" orientation="right" tick={{ fontSize: 11, fontWeight: 700 }} unit=" Min" width={52} />
              <Tooltip />
              <Legend />
              {phaseLines.map((pl) => (
                <ReferenceLine key={pl.x} x={pl.x} stroke={pl.color} strokeDasharray="4 2" yAxisId="e" />
              ))}
              <Line yAxisId="e" type="monotone" dataKey="energy" stroke="#1f7a5a" strokeWidth={2} dot={{ r: 4, fill: "#1f7a5a" }} name="Energie (1–10)" />
              <Line yAxisId="s" type="monotone" dataKey="screenTime" stroke="#d85f45" strokeWidth={2} dot={{ r: 4, fill: "#d85f45" }} name="Bildschirmzeit (Min.)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </main>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <strong className="text-sm text-[#14211f]">{title}</strong>
        <span className="text-xs text-gray-400 font-bold">{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-500 font-bold py-8 text-center">{text}</p>;
}
