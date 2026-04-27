import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason: string = body.reason ?? "";
  if (!reason.trim()) {
    return NextResponse.json({ error: "decline reason required" }, { status: 400 });
  }

  const idea = await prisma.idea.update({
    where: { id },
    data: {
      status: "declined",
      declineReason: reason,
      statusChangedAt: new Date(),
    },
  });

  // Decline learning is HIGH importance — these correct the brain.
  await prisma.brainMemory.create({
    data: {
      memoryType: "conversation_insight",
      content: `Operator DECLINED "${idea.title}" (category: ${idea.category}, niches: ${idea.niches.join(", ")}). Reason: ${reason}. Down-weight similar ideas with this combination going forward.`,
      importance: 90,
      source: "learned_from_decline",
      relatedIdeaId: idea.id,
    },
  });

  return NextResponse.json({ idea });
}
