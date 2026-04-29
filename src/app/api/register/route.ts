import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken, randomUrlToken } from "@/lib/tokens";
import { isSmtpConfigured, sendVerificationEmail } from "@/lib/email";
import { consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const rl = consumeRateLimit(rateLimitKey(req, undefined, "register-post"), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many registration attempts", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name ?? email.split("@")[0],
        passwordHash,
        privacySettings: {
          create: {},
        },
      },
    });

    const raw = randomUrlToken(32);
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const base =
      process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verifyUrl = `${base}/api/auth/verify-email?token=${raw}`;
    await sendVerificationEmail(email, verifyUrl);

    const emailDelivery = isSmtpConfigured() ? "smtp" : "console";
    return NextResponse.json({
      ok: true,
      emailDelivery,
      message:
        emailDelivery === "smtp"
          ? "Account created. Check your inbox for a verification link."
          : "Account created. SMTP is not configured — the verification link was printed in the server terminal only.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
