export type BmiCategory =
  | "underweight"
  | "normal_weight"
  | "overweight"
  | "obese";

export function computeBmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  if (h <= 0) return 0;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal_weight";
  if (bmi < 30) return "overweight";
  return "obese";
}

/** Maps BMI to a 0–100 score (peak at normal range). */
export function bmiScore(bmi: number): number {
  if (bmi <= 0 || bmi > 60) return 20;
  // Normal range ~18.5–24.9 gets highest scores
  if (bmi >= 18.5 && bmi <= 24.9) return 100;
  if (bmi < 18.5) return Math.max(40, 60 + (bmi - 18.5) * 8);
  if (bmi < 30) return Math.max(35, 100 - (bmi - 24.9) * 12);
  return Math.max(15, 65 - (bmi - 30) * 5);
}
