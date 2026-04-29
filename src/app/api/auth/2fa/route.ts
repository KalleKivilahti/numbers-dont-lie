import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Secret, TOTP } from "otpauth";
import { secretFromBase32Input, validateTotpToken } from "@/lib/totp-utils";

/** Single schema so validation errors explain missing code/secret instead of "Unknown action". */
const twoFaBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({
    action: z.literal("enable"),
    code: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(6, "Enter the 6-digit code from your authenticator app").max(8)),
    secret: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(16, "Secret missing — click Generate secret again")),
  }),
  z.object({
    action: z.literal("disable"),
    code: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(6).max(8)),
  }),
]);

export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = twoFaBodySchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      {
        error: "Invalid request",
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      },
      { status: 400 }
    );
  }

  const body = parsed.data;

  if (body.action === "setup") {
    const secret = new Secret({ size: 20 });
    const email = session.user?.email ?? uid;
    const totp = new TOTP({
      issuer: "NumbersDontLie",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });
    return NextResponse.json({
      secret: secret.base32,
      otpauthUrl: totp.toString(),
    });
  }

  if (body.action === "enable") {
    const { code, secret } = body;
    let canonical: string;
    try {
      canonical = secretFromBase32Input(secret).base32;
    } catch {
      return NextResponse.json(
        { error: "Invalid secret — paste the Base32 key without extra characters." },
        { status: 400 }
      );
    }
    if (!validateTotpToken(canonical, code)) {
      return NextResponse.json(
        {
          error:
            "Invalid code. Use the current 6-digit code (no spaces). In Microsoft Authenticator, add the account as “Other” with Time-based type; ensure phone time is automatic.",
        },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: uid },
      data: { twoFactorEnabled: true, twoFactorSecret: canonical },
    });
    return NextResponse.json({ ok: true });
  }

  const { code } = body;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }
  if (!validateTotpToken(user.twoFactorSecret, code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: uid },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  return NextResponse.json({ ok: true });
}
