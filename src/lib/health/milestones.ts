/**
 * Milestone rubric examples:
 * Weight: every 5% toward goal (between start weight and target).
 * Activity: each additional active day vs baseline (first snapshot period).
 */

export function weightGoalProgress(params: {
  currentKg: number;
  targetKg: number | null | undefined;
  startKg: number | null | undefined;
}): {
  percentTowardGoal: number | null;
  milestonesReached: number[];
} {
  const { currentKg, targetKg, startKg } = params;
  if (targetKg == null || startKg == null) {
    return { percentTowardGoal: null, milestonesReached: [] };
  }
  const totalMove = Math.abs(startKg - targetKg);
  if (totalMove < 1e-6) {
    return { percentTowardGoal: 100, milestonesReached: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100] };
  }
  const moved = Math.abs(startKg - currentKg);
  const pct = Math.min(100, (moved / totalMove) * 100);
  const milestonesReached: number[] = [];
  for (let m = 5; m <= 100; m += 5) {
    if (pct >= m - 0.01) milestonesReached.push(m);
  }
  return {
    percentTowardGoal: Math.round(pct * 10) / 10,
    milestonesReached,
  };
}

export function activityDayMilestone(params: {
  currentWeeklyDays: number | null | undefined;
  baselineDays: number | null | undefined;
}): { extraDays: number; notes: string } {
  const cur = params.currentWeeklyDays ?? 0;
  const base = params.baselineDays ?? 0;
  const extra = Math.max(0, cur - base);
  return {
    extraDays: extra,
    notes:
      extra > 0
        ? `Activity milestone: +${extra} day(s)/week vs your recorded baseline.`
        : "Increase weekly active days to unlock streak-style milestones.",
  };
}
