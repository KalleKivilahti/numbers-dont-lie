import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildAnonymizedAiPayload } from "@/lib/health/normalize-ai";
import { validateHealthRecommendation } from "@/lib/ai-restrictions";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/** App Router route handlers must run on Node (Prisma); avoids edge mis-detection in some deployments. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return "";
  }
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a supportive wellness coach. Give concise, actionable advice. Never diagnose disease. Explicitly reference the user's stated fitness_goals from the JSON when making recommendations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI unavailable: ${res.status} ${t}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = consumeRateLimit(rateLimitKey(req, uid, "ai-insights-post"), 25, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const privacy = await prisma.privacySettings.findUnique({
    where: { userId: uid },
  });
  if (!privacy?.consentAIInsights) {
    return NextResponse.json(
      {
        error:
          "Enable AI insights consent under Privacy settings to generate recommendations.",
      },
      { status: 403 }
    );
  }

  const profile = await prisma.healthProfile.findUnique({
    where: { userId: uid },
  });
  if (!profile) {
    return NextResponse.json({ error: "Complete your profile first." }, { status: 400 });
  }

  const restrictions = parseJsonArray(profile.dietaryRestrictions ?? "[]");
  const fitnessGoals = parseJsonArray(profile.fitnessGoals ?? "[]");

  const payload = buildAnonymizedAiPayload({
    internalUserId: uid,
    profile,
  });

  const prompt = `Given this anonymized wellness JSON, produce:
1) A short health status summary (3 sentences max).
2) Progress-oriented feedback (bullet list, max 4 items).
3) Three concrete recommendations tailored to goals and restrictions. Mention fitness_goals explicitly by name (e.g. weight_loss, muscle_gain).

JSON context:
${JSON.stringify(payload, null, 2)}
`;

  let summary = "";
  let detail = "";
  let priority: string | undefined = "medium";
  let modelUsed = "offline-heuristic";

  try {
    const text = await callOpenAI(prompt);
    if (text) {
      const validation = validateHealthRecommendation(text, restrictions);
      if (!validation.ok && validation.flagged?.length) {
        summary = `Recommendation filtered: automated review flagged possible conflicts with your dietary restrictions (${validation.flagged.slice(0, 3).join("; ")}). Focus on whole foods that fit your stated preferences and consult a professional for meal planning.`;
        detail = text;
        priority = "high";
      } else {
        summary = text;
        detail = text;
      }

      const goalHints = fitnessGoals.filter((g) =>
        summary.toLowerCase().includes(g.replace(/_/g, " "))
      );
      if (fitnessGoals.length && goalHints.length === 0) {
        summary = `${summary}\n\n(Goal alignment note: your tracked goals include ${fitnessGoals.join(", ")} — prioritize actions consistent with those.)`;
      }

      modelUsed = process.env.OPENAI_MODEL || "gpt-4o-mini";

      const insight = await prisma.wellnessInsight.create({
        data: {
          userId: uid,
          summary,
          detail,
          priority,
          modelUsed,
          promptKey: "wellness_v1",
          version: 1,
        },
      });

      return NextResponse.json({
        insight,
        ai_payload_shared: privacy.shareAnalyticsWithAI,
        source: "live_llm",
      });
    }
    throw new Error("no-key");
  } catch (e) {
    console.warn("[ai-insights]", e);

    const cached = await prisma.wellnessInsight.findFirst({
      where: {
        userId: uid,
        NOT: { modelUsed: "offline-heuristic" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (cached) {
      return NextResponse.json({
        insight: cached,
        source: "cached_llm",
        message:
          "AI service unavailable — returning your most recent stored LLM insight.",
      });
    }

    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
    summary = hasOpenAiKey
      ? "Could not reach OpenAI or got an empty reply — showing template guidance from your profile instead."
      : "OPENAI_API_KEY is not set — showing template guidance from your profile. Add it to .env and restart the server for personalized AI text.";
    detail = [
      `- Goals tracked: ${fitnessGoals.join(", ") || "general wellness"}`,
      `- Activity pattern: ${payload.user_metrics.current_state.activity_level ?? "unspecified"}`,
      `- Preferences: ${payload.user_metrics.preferences.slice(0, 5).join(", ") || "none listed"}`,
      "Increase movement gradually; align workouts with preferred time of day.",
      "Track weight weekly at the same time for clearer trends.",
    ].join("\n");
    priority = "low";
    modelUsed = "offline-heuristic";

    const insight = await prisma.wellnessInsight.create({
      data: {
        userId: uid,
        summary,
        detail,
        priority,
        modelUsed,
        promptKey: "wellness_v1",
        version: 1,
      },
    });

    return NextResponse.json({
      insight,
      ai_payload_shared: privacy.shareAnalyticsWithAI,
      source: "offline_heuristic",
    });
  }
}

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.wellnessInsight.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ insights: rows });
}
