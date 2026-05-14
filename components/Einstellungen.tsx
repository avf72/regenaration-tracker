"use client";

import { useEffect, useState } from "react";

interface Phase {
  name: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
}

const PHASE_COLORS: Record<string, string> = {
  A1: "bg-blue-100 border-blue-300 text-blue-800",
  B:  "bg-green-100 border-green-300 text-green-800",
  A2: "bg-orange-100 border-orange-300 text-orange-800",
};

export default function Einstellungen() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/phases")
      .then((r) => r.json())
      .then((data) => { setPhases(data); setLoading(false); });
  }, []);

  function update(name: string, field: "start_date" | "end_date", value: string) {
    setPhases((prev) =>
      prev.map((p) => p.name === name ? { ...p, [field]: value || null } : p)
    );
  }

  async function save(phase: Phase) {
    setSaving(phase.name);
    await fetch("/api/phases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: phase.name, start_date: phase.start_date, end_date: phase.end_date }),
    });
    setSaving(null);
    setSaved(phase.name);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <main className="w-[min(860px,calc(100%-32px))] mx-auto py-7">
      <section className="mb-7">
        <p className="text-[0.78rem] font-extrabold uppercase text-green-700 mb-1">Maturaarbeit</p>
        <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-none tracking-tight">Einstellungen</h1>
      </section>

      <div className="border border-gray-200 rounded-xl bg-white/90 shadow-xl p-6">
        <h2 className="text-base font-black text-gray-800 mb-1">Phasen-Konfiguration</h2>
        <p className="text-xs font-bold text-gray-400 mb-6">
          Definiere für jede Phase den Start- und Endtermin. Die Einteilung wird im Dashboard für alle Auswertungen verwendet.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 font-bold">Lade…</p>
        ) : (
          <div className="grid gap-4">
            {phases.map((phase) => (
              <div
                key={phase.name}
                className={`border rounded-xl p-5 ${PHASE_COLORS[phase.name] ?? "bg-gray-50 border-gray-200 text-gray-800"}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-black">{phase.label || phase.name}</span>
                  <span className="text-xs font-extrabold uppercase opacity-60">Phase {phase.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 max-[540px]:grid-cols-1 mb-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-extrabold uppercase opacity-70">Startdatum</span>
                    <input
                      type="date"
                      value={phase.start_date ?? ""}
                      onChange={(e) => update(phase.name, "start_date", e.target.value)}
                      className="border border-current/20 bg-white/70 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-current/30"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-extrabold uppercase opacity-70">Enddatum</span>
                    <input
                      type="date"
                      value={phase.end_date ?? ""}
                      onChange={(e) => update(phase.name, "end_date", e.target.value)}
                      className="border border-current/20 bg-white/70 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-current/30"
                    />
                  </label>
                </div>

                <button
                  onClick={() => save(phase)}
                  disabled={saving === phase.name}
                  className="px-5 py-2 rounded-lg bg-white/80 border border-current/30 text-sm font-black hover:bg-white transition-colors disabled:opacity-50"
                >
                  {saving === phase.name ? "Speichern…" : saved === phase.name ? "✓ Gespeichert" : "Speichern"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
