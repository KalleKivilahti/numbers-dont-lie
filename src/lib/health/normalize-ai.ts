import {
  computeBmi,
  bmiCategory,
} from "@/lib/health/bmi";
import { computeWellnessScore } from "@/lib/health/wellness-score";

export type AiUserMetrics = {
  user_metrics: {
    anonymous_id: string;
    current_state: {
      weight_kg?: number;
      height_cm?: number;
      bmi?: number;
      activity_level?: string;
    };
    target_state: {
      weight_kg?: number;
      activity_level?: string;
    };
    preferences: string[];
    restrictions: string[];
    fitness_goals: string[];
    habits: {
      weekly_activity_days?: number;
      exercise_types?: string[];
      session_duration_band?: string;
      fitness_level_self?: string;
      environment?: string;
      time_of_day?: string;
    };
    completeness: number;
  };
};

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function buildAnonymizedAiPayload(input: {
  internalUserId: string;
  profile: {
    weightKg?: number | null;
    heightCm?: number | null;
    activityLevel?: string | null;
    targetWeightKg?: number | null;
    targetActivityLevel?: string | null;
    dietaryPreferences?: string | null;
    dietaryRestrictions?: string | null;
    fitnessGoals?: string | null;
    weeklyActivityDays?: number | null;
    exerciseTypes?: string | null;
    sessionDurationBand?: string | null;
    fitnessLevelSelf?: string | null;
    exerciseEnvironment?: string | null;
    exerciseTimeOfDay?: string | null;
    enduranceMinutes?: number | null;
    pushupsMax?: number | null;
    squatsMax?: number | null;
  };
}): AiUserMetrics {
  const p = input.profile;
  const prefs = parseJsonArray(p.dietaryPreferences ?? "[]");
  const restrictions = parseJsonArray(p.dietaryRestrictions ?? "[]");
  const goals = parseJsonArray(p.fitnessGoals ?? "[]");
  const exerciseTypes = parseJsonArray(p.exerciseTypes ?? "[]");

  let completeness = 0;
  const fields = [
    p.weightKg,
    p.heightCm,
    p.activityLevel,
    p.targetWeightKg,
    prefs.length,
    restrictions.length,
    goals.length,
    p.weeklyActivityDays,
  ];
  completeness = Math.round(
    (fields.filter((x) => x !== undefined && x !== null && x !== "").length /
      fields.length) *
      100
  );

  const heightCm = p.heightCm ?? undefined;
  const weightKg = p.weightKg ?? undefined;
  let bmi: number | undefined;
  if (heightCm && weightKg) {
    bmi = computeBmi(weightKg, heightCm);
  }

  const anonId = `usr_${Buffer.from(input.internalUserId).toString("base64url").slice(0, 24)}`;

  return {
    user_metrics: {
      anonymous_id: anonId,
      current_state: {
        weight_kg: weightKg,
        height_cm: heightCm,
        bmi,
        activity_level: p.activityLevel ?? undefined,
      },
      target_state: {
        weight_kg: p.targetWeightKg ?? undefined,
        activity_level: p.targetActivityLevel ?? undefined,
      },
      preferences: prefs.map((x) => x.toLowerCase().replace(/\s+/g, "_")),
      restrictions: restrictions.map((x) => x.toLowerCase().replace(/\s+/g, "_")),
      fitness_goals: goals,
      habits: {
        weekly_activity_days: p.weeklyActivityDays ?? undefined,
        exercise_types: exerciseTypes,
        session_duration_band: p.sessionDurationBand ?? undefined,
        fitness_level_self: p.fitnessLevelSelf ?? undefined,
        environment: p.exerciseEnvironment ?? undefined,
        time_of_day: p.exerciseTimeOfDay ?? undefined,
      },
      completeness,
    },
  };
}

export function snapshotMetricsFromProfile(profile: {
  weightKg?: number | null;
  heightCm?: number | null;
  activityLevel?: string | null;
  targetWeightKg?: number | null;
  fitnessGoals?: string | null;
  weeklyActivityDays?: number | null;
  enduranceMinutes?: number | null;
}) {
  const heightCm = profile.heightCm ?? undefined;
  const weightKg = profile.weightKg ?? undefined;
  if (!heightCm || !weightKg) {
    return { bmi: 0, wellness: null as null | ReturnType<typeof computeWellnessScore> };
  }
  const bmi = computeBmi(weightKg, heightCm);
  const fitnessGoals = parseJsonArray(profile.fitnessGoals ?? "[]");
  const wellness = computeWellnessScore({
    bmi,
    activityLevel: profile.activityLevel,
    currentWeight: weightKg,
    targetWeight: profile.targetWeightKg,
    fitnessGoals,
    weeklyActivityDays: profile.weeklyActivityDays,
    enduranceMinutes: profile.enduranceMinutes,
  });
  return { bmi, wellness };
}

export { computeBmi, bmiCategory };
