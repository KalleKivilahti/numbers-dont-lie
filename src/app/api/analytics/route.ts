import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeBmi, bmiCategory } from "@/lib/health/bmi";
import { computeWellnessScore } from "@/lib/health/wellness-score";
import { differenceInDays } from "date-fns";
import {
  activityDayMilestone,
  weightGoalProgress,
} from "@/lib/health/milestones";

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.healthProfile.findUnique({ where: { userId: uid } });
  const snapshots = await prisma.metricSnapshot.findMany({
    where: { userId: uid },
    orderBy: { recordedAt: "asc" },
    take: 365,
  });

  if (!profile || !profile.weightKg || !profile.heightCm) {
    return NextResponse.json({
      status: "incomplete_profile",
      message: "Add height and weight to unlock analytics.",
      snapshots,
    });
  }

  const bmi = computeBmi(profile.weightKg, profile.heightCm);
  const category = bmiCategory(bmi);
  const fitnessGoals = parseJsonArray(profile.fitnessGoals ?? "[]");
  const wellness = computeWellnessScore({
    bmi,
    activityLevel: profile.activityLevel,
    currentWeight: profile.weightKg,
    targetWeight: profile.targetWeightKg,
    fitnessGoals,
    weeklyActivityDays: profile.weeklyActivityDays,
    enduranceMinutes: profile.enduranceMinutes,
  });

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  let weightDelta: number | null = null;
  if (first?.weightKg != null && last?.weightKg != null) {
    weightDelta = Math.round((last.weightKg - first.weightKg) * 10) / 10;
  }

  const streakDays =
    snapshots.length > 1
      ? differenceInDays(
          snapshots[snapshots.length - 1].recordedAt,
          snapshots[0].recordedAt
        )
      : 0;

  const startKg = snapshots[0]?.weightKg ?? profile.weightKg ?? undefined;
  const weightMilestones = weightGoalProgress({
    currentKg: profile.weightKg,
    targetKg: profile.targetWeightKg,
    startKg,
  });
  const activityMilestone = activityDayMilestone({
    currentWeeklyDays: profile.weeklyActivityDays,
    baselineDays: 2,
  });

  return NextResponse.json({
    bmi: { value: bmi, category },
    wellness,
    progress: {
      weightDelta,
      trackingSpanDays: streakDays,
      snapshotsCount: snapshots.length,
    },
    comparison: {
      currentWeightKg: profile.weightKg,
      targetWeightKg: profile.targetWeightKg,
      weeklyActivityDays: profile.weeklyActivityDays,
      activityLevel: profile.activityLevel,
      targetActivityLevel: profile.targetActivityLevel,
    },
    targetWeightKg: profile.targetWeightKg,
    milestones: {
      weightProgress: weightMilestones,
      activity: activityMilestone,
    },
    snapshots,
  });
}
