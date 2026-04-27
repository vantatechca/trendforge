import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = await prisma.monitoredSource.findMany({
    orderBy: [{ enabled: "desc" }, { type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const source = await prisma.monitoredSource.create({
    data: {
      name: body.name,
      type: body.type,
      url: body.url,
      enabled: body.enabled ?? true,
      frequencyHours: body.frequencyHours ?? 6,
      metadata: body.metadata ?? null,
    },
  });
  return NextResponse.json({ source });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const k of ["name", "type", "url", "enabled", "frequencyHours", "metadata"]) {
    if (k in body) data[k] = body[k];
  }
  const source = await prisma.monitoredSource.update({ where: { id: body.id }, data });
  return NextResponse.json({ source });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.monitoredSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
