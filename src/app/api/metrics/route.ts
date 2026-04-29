import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeBmi } from "@/lib/health/bmi";
import { computeWellnessScore } from "@/lib/health/wellness-score";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  weightKg: z.number().positive(),
  recordedAt: z.string().datetime().optional(),
});

function parseGoals(s: string | null | undefined): string[] {
  try {
    const v = JSON.parse(s ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = consumeRateLimit(rateLimitKey(req, uid, "metrics-post"), 45, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: uid } });
  if (!profile?.heightCm) {
    return NextResponse.json(
      { error: "Set height on your profile before logging weight." },
      { status: 400 }
    );
  }

  const recordedAt = new Date(parsed.data.recordedAt ?? Date.now());
  recordedAt.setMilliseconds(0);

  const weightKg = parsed.data.weightKg;
  const bmi = computeBmi(weightKg, profile.heightCm);
  const fitnessGoals = parseGoals(profile.fitnessGoals ?? undefined);
  const wellness = computeWellnessScore({
    bmi,
    activityLevel: profile.activityLevel,
    currentWeight: weightKg,
    targetWeight: profile.targetWeightKg,
    fitnessGoals,
    weeklyActivityDays: profile.weeklyActivityDays,
    enduranceMinutes: profile.enduranceMinutes,
  });

  try {
    const snap = await prisma.metricSnapshot.create({
      data: {
        userId: uid,
        recordedAt,
        weightKg,
        heightCm: profile.heightCm,
        bmi,
        wellnessScore: wellness.score,
        raw: JSON.stringify({ manual: true }),
      },
    });

    return NextResponse.json({ snapshot: snap, wellness });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Duplicate weight entry for this timestamp (same calendar second). Change time slightly or wait one second.",
        },
        { status: 409 }
      );
    }
    throw e;
  }
}
