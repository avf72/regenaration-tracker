import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { error } = await supabase.from("test_results").insert({
    round: body.round,
    hits: body.hits,
    targets: body.targets,
    misses: body.misses,
    false_alarms: body.falseAlarms,
    avg_reaction_ms: body.avg ?? null,
    accuracy: body.accuracy,
    symbol_speed_ms: body.symbolSpeedMs,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
