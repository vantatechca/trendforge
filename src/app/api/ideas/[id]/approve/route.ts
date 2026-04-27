import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const notes: string = body.notes ?? "";

  const idea = await prisma.idea.update({
    where: { id },
    data: {
      status: "approved",
      approvalNotes: notes || null,
      statusChangedAt: new Date(),
    },
  });

  await prisma.brainMemory.create({
    data: {
      memoryType: "conversation_insight",
      content: `Operator APPROVED "${idea.title}" (category: ${idea.category}, niches: ${idea.niches.join(", ")}). ${notes ? `Notes: ${notes}.` : ""} Up-weight similar ideas in this category and niche set going forward.`,
      importance: 75,
      source: "ui",
      relatedIdeaId: idea.id,
    },
  });

  return NextResponse.json({ idea });
}
