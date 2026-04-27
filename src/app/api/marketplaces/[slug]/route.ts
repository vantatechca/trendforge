import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketplace } from "@/lib/marketplaces";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getMarketplace(slug);
  if (!meta) return NextResponse.json({ error: "unknown marketplace" }, { status: 404 });

  const [topSellers, subcategories, recent7d] = await Promise.all([
    prisma.idea.findMany({
      where: { marketplaceFit: { has: slug } },
      orderBy: { priorityScore: "desc" },
      take: 100,
    }),
    prisma.idea.groupBy({
      by: ["category"],
      where: { marketplaceFit: { has: slug } },
      _count: { _all: true },
      _avg: { priorityScore: true, etsyAvgPrice: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.idea.findMany({
      where: {
        marketplaceFit: { has: slug },
        discoveredAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      orderBy: { discoveredAt: "desc" },
    }),
  ]);

  // Crude gap heuristic: categories with high priority but few competitors counted
  const gaps = subcategories
    .filter((sc) => (sc._avg.priorityScore ?? 0) >= 70)
    .map((sc) => ({
      category: sc.category,
      avgPriority: Math.round(sc._avg.priorityScore ?? 0),
      ideaCount: sc._count._all,
    }))
    .sort((a, b) => b.avgPriority - a.avgPriority)
    .slice(0, 5);

  return NextResponse.json({
    marketplace: meta,
    topSellers,
    subcategories: subcategories.map((sc) => ({
      category: sc.category,
      count: sc._count._all,
      avgPriority: Math.round(sc._avg.priorityScore ?? 0),
      avgPrice: sc._avg.etsyAvgPrice ?? null,
    })),
    gaps,
    recentMomentum: recent7d.length,
  });
}
