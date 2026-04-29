import { z } from "zod";
import {
  normalizeExerciseTypes,
  normalizeFitnessGoals,
} from "./normalize-profile-enums";

export const profileSchema = z.object({
  age: z.number().int().min(13).max(120).optional(),
  gender: z.enum(["female", "male", "non_binary", "prefer_not"]).optional(),
  heightCm: z.number().positive().max(300).optional(),
  weightKg: z.number().positive().max(500).optional(),
  occupationType: z
    .enum(["sedentary", "mixed", "physical"])
    .optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  fitnessGoals: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (!Array.isArray(val)) return [];
    return normalizeFitnessGoals(val.map(String));
  }, z.array(z.enum(["weight_loss", "muscle_gain", "general_fitness", "endurance", "flexibility"])).optional()),
  targetActivityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  targetWeightKg: z.number().positive().max(500).optional(),
  weeklyActivityDays: z.number().int().min(0).max(7).optional(),
  exerciseTypes: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (!Array.isArray(val)) return [];
    return normalizeExerciseTypes(val.map(String));
  }, z.array(z.enum(["cardio", "strength", "flexibility", "sports"])).optional()),
  sessionDurationBand: z.enum(["15-30", "30-60", "60+"]).optional(),
  fitnessLevelSelf: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  exerciseEnvironment: z.enum(["home", "gym", "outdoors"]).optional(),
  exerciseTimeOfDay: z.enum(["morning", "afternoon", "evening"]).optional(),
  enduranceMinutes: z.number().int().min(0).max(300).optional(),
  pushupsMax: z.number().int().min(0).max(500).optional(),
  squatsMax: z.number().int().min(0).max(500).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
