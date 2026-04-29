import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashToken, randomUrlToken } from "@/lib/tokens";
import { signAccessToken } from "@/lib/jwt-access";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/** Issues refresh + access JWT pair for API-style clients (browser session unchanged). */
export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = consumeRateLimit(rateLimitKey(req, uid, "issue-refresh-post"), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const raw = randomUrlToken(48);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.refreshToken.create({
    data: {
      userId: uid,
      tokenHash: hashToken(raw),
      expiresAt,
    },
  });

  const { accessToken, expiresIn } = await signAccessToken(uid);

  return NextResponse.json({
    accessToken,
    expiresIn,
    refreshToken: raw,
    refreshExpiresAt: expiresAt.toISOString(),
    tokenType: "Bearer",
    note: "Use Authorization: Bearer accessToken for APIs; rotate refresh via POST /api/auth/refresh.",
  });
}
