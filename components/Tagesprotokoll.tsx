"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  id: string;
  date: string;
  screen_time_before_sleep_min: number | null;
  sleep_time: string | null;
  subjective_energy: number | null;
  training_day: boolean;
  training_type: string | null;
  notes: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function Tagesprotokoll() {
  const [date, setDate] = useState(today());
  const [screenTimeMin, setScreenTimeMin] = useState<string>("");
  const [sleepTime, setSleepTime] = useState<string>("");
  const [subjectiveEnergy, setSubjectiveEnergy] = useState<number>(5);
  const [trainingDay, setTrainingDay] = useState(false);
  const [trainingType, setTrainingType] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/daily-log")
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.reverse());
        setLoadingHistory(false);
      });
  }, [saved]);

  useEffect(() => {
    const existing = history.find((e) => e.date === date);
    if (existing) {
      setScreenTimeMin(existing.screen_time_before_sleep_min?.toString() ?? "");
      setSleepTime(existing.sleep_time ?? "");
      setSubjectiveEnergy(existing.subjective_energy ?? 5);
      setTrainingDay(existing.training_day);
      setTrainingType(existing.training_type ?? "");
      setNotes(existing.notes ?? "");
    } else {
      setScreenTimeMin("");
      setSleepTime("");
      setSubjectiveEnergy(5);
      setTrainingDay(false);
      setTrainingType("");
      setNotes("");
    }
  }, [date, history]);

  async function handleDelete(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeleting(id);
    await fetch("/api/daily-log", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    setSaved((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/daily-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        screenTimeMin: screenTimeMin ? Number(screenTimeMin) : null,
        sleepTime: sleepTime || null,
        subjectiveEnergy,
        trainingDay,
        trainingType: trainingType || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    setSaved((v) => !v);
  }

  const energyColors = ["", "bg-red-500", "bg-red-400", "bg-orange-400", "bg-orange-300", "bg-yellow-400", "bg-yellow-300", "bg-lime-400", "bg-green-400", "bg-green-500", "bg-green-600"];

  return (
    <main className="w-[min(1180px,calc(100%-32px))] mx-auto py-7">
      <section className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase text-green-700 mb-1">Maturaarbeit</p>
          <h1 className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-none tracking-tight">Tagesprotokoll</h1>
        </div>
      </section>

      <div className="grid grid-cols-[1fr_1fr] gap-4 max-[860px]:grid-cols-1">
        {/* Formular */}
        <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">Datum</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold"
            />
          </div>

          <Field label="Bildschirmzeit vor Schlaf (Min.)">
            <input
              type="number"
              min={0}
              max={300}
              value={screenTimeMin}
              onChange={(e) => setScreenTimeMin(e.target.value)}
              placeholder="z.B. 45"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            />
          </Field>

          <Field label="Schlafenszeit">
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
            />
          </Field>

          <Field label={`Subjektive Energie: ${subjectiveEnergy}/10`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={subjectiveEnergy}
                onChange={(e) => setSubjectiveEnergy(Number(e.target.value))}
                className="flex-1 accent-green-700"
              />
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm ${energyColors[subjectiveEnergy]}`}>
                {subjectiveEnergy}
              </span>
            </div>
          </Field>

          <Field label="Trainingstag">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={trainingDay}
                onChange={(e) => setTrainingDay(e.target.checked)}
                className="w-5 h-5 accent-green-700"
              />
              <span className="text-sm font-bold text-gray-600">Ja, Trainingstag</span>
            </label>
            {trainingDay && (
              <input
                type="text"
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value)}
                placeholder="Art des Trainings (z.B. Fussball, Kraft)"
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
              />
            )}
          </Field>

          <Field label="Besonderheiten / Notizen">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Krankheit, Stress, besondere Ereignisse…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold resize-none"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[46px] rounded-lg bg-green-700 text-white font-black hover:bg-green-900 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Eintrag speichern"}
          </button>
        </form>

        {/* Verlauf */}
        <section className="border border-gray-200 rounded-lg bg-white/90 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500">Letzte Einträge</span>
            <strong className="text-green-900 text-sm">{history.length} Tage</strong>
          </div>
          {loadingHistory ? (
            <p className="text-sm text-gray-400 font-bold">Lade…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 font-bold">Noch keine Einträge.</p>
          ) : (
            <div className="grid gap-2.5 max-h-[520px] overflow-y-auto">
              {history.map((e) => (
                <div key={e.id} className="relative group border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
                  <button
                    onClick={() => setDate(e.date)}
                    className="text-left w-full p-3 pr-10"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong className="text-sm text-[#14211f]">{e.date}</strong>
                      {e.subjective_energy != null && (
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs ${energyColors[e.subjective_energy]}`}>
                          {e.subjective_energy}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-bold flex gap-3 flex-wrap">
                      {e.screen_time_before_sleep_min != null && <span>📱 {e.screen_time_before_sleep_min} Min.</span>}
                      {e.sleep_time && <span>🌙 {e.sleep_time}</span>}
                      {e.training_day && <span>⚽ {e.training_type || "Training"}</span>}
                      {e.notes && <span className="truncate max-w-[180px]">📝 {e.notes}</span>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={deleting === e.id}
                    title="Eintrag löschen"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-gray-500">{label}</span>
      {children}
    </div>
  );
}
