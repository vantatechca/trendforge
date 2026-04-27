import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    totalIdeas,
    pendingIdeas,
    approvedIdeas,
    declinedIdeas,
    inProgressIdeas,
    launchedIdeas,
    todayDiscoveries,
    weekDiscoveries,
    totalMemories,
    goldenRules,
    recentScrapes,
    nicheCounts,
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.idea.count({ where: { status: "pending" } }),
    prisma.idea.count({ where: { status: "approved" } }),
    prisma.idea.count({ where: { status: "declined" } }),
    prisma.idea.count({ where: { status: "in_progress" } }),
    prisma.idea.count({ where: { status: "launched" } }),
    prisma.idea.count({ where: { discoveredAt: { gte: since24 } } }),
    prisma.idea.count({ where: { discoveredAt: { gte: since7d } } }),
    prisma.brainMemory.count({ where: { active: true } }),
    prisma.brainMemory.count({ where: { active: true, memoryType: "golden_rule" } }),
    prisma.scrapeLog.count({ where: { startedAt: { gte: since24 } } }),
    prisma.idea.findMany({ select: { niches: true } }),
  ]);

  // niche count
  const counts = new Map<string, number>();
  for (const i of nicheCounts) {
    for (const n of i.niches) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const topTrendingNiche =
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return NextResponse.json({
    totalIdeas,
    pendingIdeas,
    approvedIdeas,
    declinedIdeas,
    inProgressIdeas,
    launchedIdeas,
    todayDiscoveries,
    weekDiscoveries,
    totalMemories,
    goldenRules,
    recentScrapes,
    topTrendingNiche,
  });
}
