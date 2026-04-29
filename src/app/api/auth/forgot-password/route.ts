import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken, randomUrlToken } from "@/lib/tokens";
import { isSmtpConfigured, sendPasswordResetEmail } from "@/lib/email";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const rl = consumeRateLimit(rateLimitKey(req, undefined, "forgot-password"), 8, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }
  const raw = randomUrlToken(32);
  await prisma.passwordResetToken.deleteMany({ where: { email } });
  await prisma.passwordResetToken.create({
    data: {
      email,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  const base =
    process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetUrl = `${base}/reset-password?token=${raw}`;
  await sendPasswordResetEmail(email, resetUrl);
  const emailDelivery = isSmtpConfigured() ? "smtp" : "console";
  return NextResponse.json({
    ok: true,
    emailDelivery,
    message:
      emailDelivery === "smtp"
        ? "If an account exists, a reset link was emailed."
        : "If an account exists, the reset link was printed in the server terminal (SMTP not configured).",
  });
}
