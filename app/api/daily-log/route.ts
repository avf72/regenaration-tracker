import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const { error } = await supabaseAdmin.from("daily_log").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { data, error } = await supabase
    .from("daily_log")
    .select("*")
    .order("date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { error } = await supabase.from("daily_log").upsert(
    {
      date: body.date,
      screen_time_before_sleep_min: body.screenTimeMin ?? null,
      sleep_time: body.sleepTime ?? null,
      subjective_energy: body.subjectiveEnergy ?? null,
      training_day: body.trainingDay ?? false,
      training_type: body.trainingType ?? null,
      notes: body.notes ?? null,
    },
    { onConflict: "date" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
