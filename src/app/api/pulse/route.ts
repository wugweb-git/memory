import { NextRequest, NextResponse } from "next/server";
import { postgres } from "@/lib/db/postgres";
import { getRequestUserId } from "@/lib/identity/request";
import { burnoutSignal } from "@/lib/pulse/fatigue";
import { pulseMomentum } from "@/lib/pulse/momentum";
import { badRequest, readJsonObject } from "@/lib/validation/http";

export const dynamic = "force-dynamic";

/** GET /api/pulse — recent check-ins + momentum vs the previous reading. */
export async function GET(req: NextRequest) {
  const userId = getRequestUserId(req);
  const checkins = await postgres.pulseCheckin.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const momentum = checkins.length >= 2
    ? pulseMomentum(checkins[0].energy - checkins[0].stress, checkins[1].energy - checkins[1].stress)
    : 0;
  return NextResponse.json({ checkins, momentum });
}

/** POST /api/pulse — record a wellbeing check-in (motivation/energy/stress/attention, 0–1). */
export async function POST(req: NextRequest) {
  const userId = getRequestUserId(req);
  const body = await readJsonObject(req);
  if (!body) return badRequest("JSON object body required");
  const clamp = (n: unknown) => Math.max(0, Math.min(1, Number(n) || 0));
  const motivation = clamp(body.motivation);
  const energy = clamp(body.energy);
  const stress = clamp(body.stress);
  const attention = clamp(body.attention);
  const rawRecovery = Number(body.recoveryHours ?? 8);
  const recoveryHours = Number.isFinite(rawRecovery) ? Math.max(0, Math.min(24, rawRecovery)) : 8;

  const { risk, flagged } = burnoutSignal(stress, energy, recoveryHours);

  const checkin = await postgres.pulseCheckin.create({
    data: { userId, motivation, energy, stress, attention, burnoutRisk: risk, flagged },
  });

  return NextResponse.json(checkin, { status: 201 });
}
