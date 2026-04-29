import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(parsed.data.token),
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.updateMany({
    where: { email: row.email },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.deleteMany({ where: { email: row.email } });
  return NextResponse.json({ ok: true });
}
