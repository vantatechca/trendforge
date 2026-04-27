import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: { ideaTags: { include: { tag: true } } },
  });
  if (!idea) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ idea });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of [
    "title", "summary", "detailedAnalysis", "category", "subcategory", "productFormat",
    "status", "priorityScore", "confidenceScore", "competitorAnalysis", "differentiationNotes",
    "estimatedPriceRange", "estimatedMonthlyRev", "effortToBuild", "timeToBuild", "approvalNotes",
    "declineReason",
  ]) {
    if (k in body) data[k] = body[k];
  }
  if ("niches" in body) data.niches = body.niches;
  if ("marketplaceFit" in body) data.marketplaceFit = body.marketplaceFit;
  if ("operatorNotes" in body) data.operatorNotes = body.operatorNotes;
  if ("status" in body) data.statusChangedAt = new Date();

  const idea = await prisma.idea.update({ where: { id }, data });
  return NextResponse.json({ idea });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.ideaTag.deleteMany({ where: { ideaId: id } });
  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
