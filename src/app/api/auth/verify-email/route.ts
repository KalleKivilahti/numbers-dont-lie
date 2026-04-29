import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }
  const row = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }
  await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: row.userId },
  });
  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
