import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { profileSchema } from "@/lib/validation/profile";
import {
  buildAnonymizedAiPayload,
  snapshotMetricsFromProfile,
} from "@/lib/health/normalize-ai";

export async function GET(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const includeAi = url.searchParams.get("aiPayload") === "1";

  let profile = await prisma.healthProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile) {
    profile = await prisma.healthProfile.create({
      data: { userId: uid },
    });
  }
  let privacy = await prisma.privacySettings.findUnique({
    where: { userId: uid },
  });
  if (!privacy) {
    privacy = await prisma.privacySettings.create({
      data: { userId: uid },
    });
  }

  const metrics = snapshotMetricsFromProfile(profile);

  const userRow = await prisma.user.findUnique({
    where: { id: uid },
    select: { twoFactorEnabled: true },
  });

  const response: Record<string, unknown> = {
    profile,
    privacy,
    snapshot: metrics,
    twoFactorEnabled: userRow?.twoFactorEnabled ?? false,
  };

  if (includeAi && privacy.shareAnalyticsWithAI) {
    response.ai_payload = buildAnonymizedAiPayload({
      internalUserId: uid,
      profile,
    });
  }

  return NextResponse.json(response);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const dietaryPreferences = JSON.stringify(data.dietaryPreferences ?? []);
  const dietaryRestrictions = JSON.stringify(data.dietaryRestrictions ?? []);
  const fitnessGoals = JSON.stringify(data.fitnessGoals ?? []);
  const exerciseTypes = JSON.stringify(data.exerciseTypes ?? []);

  const profile = await prisma.healthProfile.upsert({
    where: { userId: uid },
    create: {
      userId: uid,
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      occupationType: data.occupationType,
      activityLevel: data.activityLevel,
      dietaryPreferences,
      dietaryRestrictions,
      fitnessGoals,
      targetActivityLevel: data.targetActivityLevel,
      targetWeightKg: data.targetWeightKg,
      weeklyActivityDays: data.weeklyActivityDays,
      exerciseTypes,
      sessionDurationBand: data.sessionDurationBand,
      fitnessLevelSelf: data.fitnessLevelSelf,
      exerciseEnvironment: data.exerciseEnvironment,
      exerciseTimeOfDay: data.exerciseTimeOfDay,
      enduranceMinutes: data.enduranceMinutes,
      pushupsMax: data.pushupsMax,
      squatsMax: data.squatsMax,
    },
    update: {
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      occupationType: data.occupationType,
      activityLevel: data.activityLevel,
      dietaryPreferences,
      dietaryRestrictions,
      fitnessGoals,
      targetActivityLevel: data.targetActivityLevel,
      targetWeightKg: data.targetWeightKg,
      weeklyActivityDays: data.weeklyActivityDays,
      exerciseTypes,
      sessionDurationBand: data.sessionDurationBand,
      fitnessLevelSelf: data.fitnessLevelSelf,
      exerciseEnvironment: data.exerciseEnvironment,
      exerciseTimeOfDay: data.exerciseTimeOfDay,
      enduranceMinutes: data.enduranceMinutes,
      pushupsMax: data.pushupsMax,
      squatsMax: data.squatsMax,
    },
  });

  const metrics = snapshotMetricsFromProfile(profile);
  let wellnessScore: number | undefined;
  let bmiVal: number | undefined;
  if (metrics.wellness) {
    wellnessScore = metrics.wellness.score;
    bmiVal = metrics.bmi;
    const recordedAt = new Date();
    recordedAt.setMilliseconds(0);
    try {
      await prisma.metricSnapshot.create({
        data: {
          userId: uid,
          recordedAt,
          weightKg: profile.weightKg ?? undefined,
          heightCm: profile.heightCm ?? undefined,
          bmi: bmiVal,
          wellnessScore,
          raw: JSON.stringify({ source: "profile_update" }),
        },
      });
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      ) {
        throw e;
      }
    }
  }

  return NextResponse.json({ profile, snapshot: metrics });
}
