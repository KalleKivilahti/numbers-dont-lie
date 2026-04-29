import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  consentDataProcessing: z.boolean().optional(),
  consentAIInsights: z.boolean().optional(),
  shareAnalyticsWithAI: z.boolean().optional(),
  profilePublic: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const privacy = await prisma.privacySettings.upsert({
    where: { userId: uid },
    create: {
      userId: uid,
      ...parsed.data,
    },
    update: parsed.data,
  });

  const entries = Object.entries(parsed.data).filter(
    ([k, v]) => k.startsWith("consent") && typeof v === "boolean"
  );
  for (const [consentType, granted] of entries) {
    await prisma.userConsent.create({
      data: {
        userId: uid,
        consentType,
        granted: granted as boolean,
      },
    });
  }

  return NextResponse.json({ privacy });
}
