export type ExerciseType = "cardio" | "strength" | "flexibility" | "sports";

export type FitnessGoal =
  | "weight_loss"
  | "muscle_gain"
  | "general_fitness"
  | "endurance"
  | "flexibility";

function tokenKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

/** Maps user phrases / synonyms to canonical exercise types; drops unknown tokens. */
const EXERCISE_ALIASES: Record<string, ExerciseType> = {
  cardio: "cardio",
  aerobic: "cardio",
  aerobics: "cardio",
  running: "cardio",
  run: "cardio",
  jogging: "cardio",
  jog: "cardio",
  cycling: "cardio",
  cycle: "cardio",
  bike: "cardio",
  biking: "cardio",
  swimming: "cardio",
  swim: "cardio",
  walking: "cardio",
  walk: "cardio",
  elliptical: "cardio",
  rowing: "cardio",
  hiit: "cardio",

  strength: "strength",
  gym: "strength",
  weights: "strength",
  weight: "strength",
  weightlifting: "strength",
  weight_lifting: "strength",
  lifting: "strength",
  resistance: "strength",
  bodybuilding: "strength",
  powerlifting: "strength",
  crossfit: "strength",
  weight_training: "strength",
  functional_training: "strength",

  flexibility: "flexibility",
  yoga: "flexibility",
  pilates: "flexibility",
  stretching: "flexibility",
  stretch: "flexibility",
  mobility: "flexibility",

  sports: "sports",
  sport: "sports",
  team_sports: "sports",
  basketball: "sports",
  football: "sports",
  soccer: "sports",
  tennis: "sports",
  volleyball: "sports",
  hockey: "sports",
  rugby: "sports",
};

/** Maps user phrases to canonical fitness goals; drops unknown tokens. */
const GOAL_ALIASES: Record<string, FitnessGoal> = {
  weight_loss: "weight_loss",
  lose_weight: "weight_loss",
  loseweight: "weight_loss",
  fat_loss: "weight_loss",
  slimming: "weight_loss",
  cutting: "weight_loss",

  muscle_gain: "muscle_gain",
  bulk: "muscle_gain",
  bulking: "muscle_gain",
  hypertrophy: "muscle_gain",
  gain_muscle: "muscle_gain",

  general_fitness: "general_fitness",
  wellness: "general_fitness",
  health: "general_fitness",
  stay_healthy: "general_fitness",

  endurance: "endurance",
  stamina: "endurance",

  flexibility: "flexibility",
};

function mapExerciseToken(raw: string): ExerciseType | undefined {
  const key = tokenKey(raw);
  if (!key) return undefined;
  if (EXERCISE_ALIASES[key]) return EXERCISE_ALIASES[key];
  for (const word of key.split("_")) {
    if (word && EXERCISE_ALIASES[word]) return EXERCISE_ALIASES[word];
  }
  const collapsed = key.replace(/_/g, "");
  for (const [alias, val] of Object.entries(EXERCISE_ALIASES)) {
    if (alias.replace(/_/g, "") === collapsed) return val;
  }
  return undefined;
}

function mapGoalToken(raw: string): FitnessGoal | undefined {
  const key = tokenKey(raw);
  if (!key) return undefined;
  if (GOAL_ALIASES[key]) return GOAL_ALIASES[key];
  const spaced = raw.trim().toLowerCase().replace(/-/g, " ");
  const underscored = tokenKey(spaced);
  if (GOAL_ALIASES[underscored]) return GOAL_ALIASES[underscored];
  for (const word of underscored.split("_")) {
    if (word && GOAL_ALIASES[word]) return GOAL_ALIASES[word];
  }
  return undefined;
}

export function normalizeExerciseTypes(raw: string[]): ExerciseType[] {
  const out: ExerciseType[] = [];
  const seen = new Set<ExerciseType>();
  for (const part of raw) {
    for (const segment of part.split(",")) {
      const t = segment.trim();
      if (!t) continue;
      const mapped = mapExerciseToken(t);
      if (mapped && !seen.has(mapped)) {
        seen.add(mapped);
        out.push(mapped);
      }
    }
  }
  return out;
}

export function normalizeFitnessGoals(raw: string[]): FitnessGoal[] {
  const out: FitnessGoal[] = [];
  const seen = new Set<FitnessGoal>();
  for (const part of raw) {
    for (const segment of part.split(",")) {
      const t = segment.trim();
      if (!t) continue;
      const mapped = mapGoalToken(t);
      if (mapped && !seen.has(mapped)) {
        seen.add(mapped);
        out.push(mapped);
      }
    }
  }
  return out;
}
