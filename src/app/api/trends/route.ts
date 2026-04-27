import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);

  const [rising, declining, recentIdeas, allIdeas, marketplaceActivity, recentScrapes] = await Promise.all([
    prisma.idea.findMany({
      where: { googleTrendsDirection: "rising" },
      orderBy: { priorityScore: "desc" },
      take: 10,
    }),
    prisma.idea.findMany({
      where: { googleTrendsDirection: "declining" },
      orderBy: { priorityScore: "desc" },
      take: 10,
    }),
    prisma.idea.findMany({
      orderBy: { discoveredAt: "desc" },
      take: 10,
    }),
    prisma.idea.findMany({ select: { category: true, niches: true, marketplaceFit: true } }),
    prisma.idea.groupBy({
      by: ["discoverySource"],
      _count: { _all: true },
    }),
    prisma.scrapeLog.count({ where: { startedAt: { gte: since24 } } }),
  ]);

  const categoryCounts = new Map<string, number>();
  for (const i of allIdeas) categoryCounts.set(i.category, (categoryCounts.get(i.category) ?? 0) + 1);
  const topCategories = Array.from(categoryCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const nicheCounts = new Map<string, number>();
  for (const i of allIdeas) for (const n of i.niches) nicheCounts.set(n, (nicheCounts.get(n) ?? 0) + 1);
  const topNiches = Array.from(nicheCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // research pulse: scrapes per hour over last 24h
  const researchPulse = Math.round((recentScrapes / 24) * 10) / 10;

  return NextResponse.json({
    rising,
    declining,
    recentIdeas,
    topCategories,
    topNiches,
    marketplaceActivity,
    researchPulse,
  });
}
