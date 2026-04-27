import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      _count: { select: { messages: true } },
      relatedIdea: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const convo = await prisma.conversation.create({
    data: {
      title: body.title ?? "New conversation",
      relatedIdeaId: body.relatedIdeaId ?? null,
    },
  });
  return NextResponse.json({ conversation: convo });
}
