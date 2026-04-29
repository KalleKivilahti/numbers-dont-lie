import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, randomUrlToken } from "@/lib/tokens";
import { signAccessToken } from "@/lib/jwt-access";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * Rotates refresh token and returns a new HS256 access JWT (API clients).
 * NextAuth browser sessions remain cookie-based.
 */
export async function POST(req: Request) {
  const rl = consumeRateLimit(rateLimitKey(req, undefined, "refresh-post"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const body = await req.json().catch(() => ({}));
  const refresh = body.refreshToken as string | undefined;
  if (!refresh) {
    return NextResponse.json({ error: "refreshToken required" }, { status: 400 });
  }
  const row = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: hashToken(refresh),
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }
  await prisma.refreshToken.delete({ where: { id: row.id } });
  const newRaw = randomUrlToken(48);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.refreshToken.create({
    data: {
      userId: row.userId,
      tokenHash: hashToken(newRaw),
      expiresAt,
    },
  });

  const { accessToken, expiresIn } = await signAccessToken(row.userId);

  return NextResponse.json({
    accessToken,
    expiresIn,
    refreshToken: newRaw,
    refreshExpiresAt: expiresAt.toISOString(),
    tokenType: "Bearer",
  });
}
