import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateTotpToken } from "@/lib/totp-utils";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string().min(1),
});

/** Validates TOTP so JWT can gain sensitiveStepUpAt via session update (OAuth step-up). */
export async function POST(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled for this account." },
      { status: 400 }
    );
  }

  if (!validateTotpToken(user.twoFactorSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
