import { bmiScore as scoreFromBmi } from "./bmi";

const ACTIVITY_SCORE: Record<string, number> = {
  sedentary: 35,
  light: 55,
  moderate: 75,
  active: 88,
  very_active: 95,
};

export function activityScoreFromLevel(level?: string | null): number {
  if (!level) return 50;
  return ACTIVITY_SCORE[level] ?? 55;
}

export function progressScore(params: {
  currentWeight?: number | null;
  targetWeight?: number | null;
  fitnessGoals?: string[];
}): number {
  const { currentWeight, targetWeight, fitnessGoals } = params;
  let score = 55;
  if (
    currentWeight != null &&
    targetWeight != null &&
    targetWeight > 0 &&
    currentWeight > 0
  ) {
    const diff = Math.abs(currentWeight - targetWeight);
    const pct = Math.min(1, diff / Math.max(currentWeight, targetWeight));
    score = Math.round(100 - pct * 70);
  }
  if (fitnessGoals?.length) score = Math.min(100, score + fitnessGoals.length * 5);
  return Math.max(15, Math.min(100, score));
}

export function habitsScore(params: {
  weeklyActivityDays?: number | null;
  enduranceMinutes?: number | null;
}): number {
  const days = params.weeklyActivityDays ?? 3;
  const endurance = params.enduranceMinutes ?? 15;
  const dayPart = Math.min(50, (days / 7) * 50);
  const endPart = Math.min(50, (Math.min(endurance, 60) / 60) * 50);
  return Math.round(dayPart + endPart);
}

/**
 * wellness = bmi*0.3 + activity*0.3 + progress*0.2 + habits*0.2
 */
export function computeWellnessScore(input: {
  bmi: number;
  activityLevel?: string | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  fitnessGoals?: string[];
  weeklyActivityDays?: number | null;
  enduranceMinutes?: number | null;
}): {
  score: number;
  breakdown: {
    bmi: number;
    activity: number;
    progress: number;
    habits: number;
  };
} {
  const bmi = scoreFromBmi(input.bmi);
  const activity = activityScoreFromLevel(input.activityLevel);
  const progress = progressScore({
    currentWeight: input.currentWeight,
    targetWeight: input.targetWeight,
    fitnessGoals: input.fitnessGoals,
  });
  const habits = habitsScore({
    weeklyActivityDays: input.weeklyActivityDays,
    enduranceMinutes: input.enduranceMinutes,
  });

  const score = Math.round(
    bmi * 0.3 + activity * 0.3 + progress * 0.2 + habits * 0.2
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: { bmi, activity, progress, habits },
  };
}
