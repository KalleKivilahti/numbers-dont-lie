import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: {
      healthProfile: true,
      metricSnapshots: { orderBy: { recordedAt: "desc" }, take: 500 },
      privacySettings: true,
      wellnessInsights: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return NextResponse.json({
    export_meta: {
      generatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    user: safeUser,
  });
}
