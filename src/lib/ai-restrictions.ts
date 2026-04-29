/**
 * Lightweight post-check on AI text vs stated dietary restrictions (assignment rubric).
 * Not medical advice — heuristic keyword screening only.
 */
const KEYWORDS: Record<string, string[]> = {
  gluten_free: ["gluten", "wheat bread", "rye", "barley", "pasta", "couscous"],
  dairy_free: ["dairy", "milk", "cheese", "yogurt", "butter", "cream"],
  vegan: ["beef", "pork", "chicken", "fish", "egg", "yogurt", "cheese", "milk"],
  vegetarian: ["beef", "pork", "chicken", "fish", "salmon", "tuna"],
  nut_free: ["peanut", "almond", "cashew", "walnut", "hazelnut"],
};

function normalizeLabel(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "_");
}

export function validateHealthRecommendation(
  text: string,
  restrictionLabels: string[]
): { ok: boolean; flagged?: string[] } {
  const lower = text.toLowerCase();
  const flagged: string[] = [];

  for (const raw of restrictionLabels) {
    const key = normalizeLabel(raw);
    const words = KEYWORDS[key] ?? [];
    for (const w of words) {
      if (lower.includes(w)) {
        flagged.push(`${raw}: suspected "${w}"`);
      }
    }
  }

  return flagged.length === 0 ? { ok: true } : { ok: false, flagged };
}
