import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const memoryType = sp.get("type");
  const where: Record<string, unknown> = {};
  if (memoryType) where.memoryType = memoryType;

  const memories = await prisma.brainMemory.findMany({
    where,
    orderBy: [{ memoryType: "asc" }, { importance: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const memory = await prisma.brainMemory.create({
    data: {
      memoryType: body.memoryType ?? "preference",
      content: body.content,
      importance: body.importance ?? 50,
      active: body.active ?? true,
      source: body.source ?? "ui",
      relatedIdeaId: body.relatedIdeaId ?? null,
    },
  });
  return NextResponse.json({ memory });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const k of ["memoryType", "content", "importance", "active", "source"]) {
    if (k in body) data[k] = body[k];
  }
  const memory = await prisma.brainMemory.update({ where: { id: body.id }, data });
  return NextResponse.json({ memory });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.brainMemory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
