import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "30", 10), 200);
  const logs = await prisma.scrapeLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
