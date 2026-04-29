import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeBmi } from "@/lib/health/bmi";
import { computeWellnessScore } from "@/lib/health/wellness-score";
import { subDays, subMonths } from "date-fns";

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") === "month" ? "month" : "week";
  const end = new Date();
  const start = period === "week" ? subDays(end, 7) : subMonths(end, 1);

  const profile = await prisma.healthProfile.findUnique({ where: { userId: uid } });
  const snapshots = await prisma.metricSnapshot.findMany({
    where: {
      userId: uid,
      recordedAt: { gte: start, lte: end },
    },
    orderBy: { recordedAt: "asc" },
  });

  const fitnessGoals = parseJsonArray(profile?.fitnessGoals ?? "[]");

  let weightChange: number | null = null;
  let wellnessFirst: number | null = null;
  let wellnessLast: number | null = null;
  if (snapshots.length >= 2) {
    const a = snapshots[0];
    const b = snapshots[snapshots.length - 1];
    if (a.weightKg != null && b.weightKg != null) {
      weightChange = Math.round((b.weightKg - a.weightKg) * 10) / 10;
    }
    wellnessFirst = a.wellnessScore ?? null;
    wellnessLast = b.wellnessScore ?? null;
  } else if (snapshots.length === 1) {
    wellnessFirst = snapshots[0].wellnessScore ?? null;
    wellnessLast = wellnessFirst;
  }

  const wellnessDelta =
    wellnessFirst != null && wellnessLast != null
      ? Math.round((wellnessLast - wellnessFirst) * 10) / 10
      : null;

  let headline = "";
  if (period === "week") {
    headline = `Weekly summary (${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)})`;
  } else {
    headline = `Monthly summary (${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)})`;
  }

  const bullets: string[] = [];
  bullets.push(
    `Logged activity pattern: ${profile?.weeklyActivityDays ?? "—"} active day(s)/week (profile).`
  );
  if (wellnessDelta != null) {
    bullets.push(`Wellness score change over period: ${wellnessDelta >= 0 ? "+" : ""}${wellnessDelta}.`);
  }
  if (weightChange != null) {
    bullets.push(`Weight change over period: ${weightChange >= 0 ? "+" : ""}${weightChange} kg.`);
  }
  if (fitnessGoals.length) {
    bullets.push(`Stated goals tracked: ${fitnessGoals.join(", ")}.`);
  }
  if (profile?.targetWeightKg != null && profile.weightKg != null) {
    bullets.push(
      `Distance to target weight: ${Math.round((profile.weightKg - profile.targetWeightKg) * 10) / 10} kg (signed: current − target).`
    );
  }

  let snapshotWellnessLine = "";
  if (profile?.heightCm && profile.weightKg) {
    const bmi = computeBmi(profile.weightKg, profile.heightCm);
    const w = computeWellnessScore({
      bmi,
      activityLevel: profile.activityLevel,
      currentWeight: profile.weightKg,
      targetWeight: profile.targetWeightKg,
      fitnessGoals,
      weeklyActivityDays: profile.weeklyActivityDays,
      enduranceMinutes: profile.enduranceMinutes,
    });
    snapshotWellnessLine = `Current computed wellness score (from latest profile): ${w.score}/100.`;
    bullets.push(snapshotWellnessLine);
  }

  return NextResponse.json({
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    headline,
    bullets,
    metrics: {
      snapshotCount: snapshots.length,
      weightChangeKg: weightChange,
      wellnessDelta,
      avgWeeklyActivityDaysProfile: profile?.weeklyActivityDays ?? null,
      fitnessGoals,
    },
  });
}
