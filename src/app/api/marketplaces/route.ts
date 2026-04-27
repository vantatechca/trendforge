import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETPLACES } from "@/lib/marketplaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);

  const enriched = await Promise.all(
    MARKETPLACES.map(async (m) => {
      const [trackedCount, recentCount, lastScrape, topCategoryRow] = await Promise.all([
        prisma.idea.count({ where: { marketplaceFit: { has: m.slug } } }),
        prisma.idea.count({
          where: {
            marketplaceFit: { has: m.slug },
            discoveredAt: { gte: since24 },
          },
        }),
        m.scraperKey
          ? prisma.scrapeLog.findFirst({
              where: { source: m.scraperKey },
              orderBy: { startedAt: "desc" },
            })
          : Promise.resolve(null),
        prisma.idea.groupBy({
          by: ["category"],
          where: { marketplaceFit: { has: m.slug } },
          _count: { _all: true },
          orderBy: { _count: { category: "desc" } },
          take: 1,
        }),
      ]);

      return {
        ...m,
        trackedCount,
        recentCount,
        lastScrapedAt: lastScrape?.startedAt ?? null,
        topCategory: topCategoryRow[0]?.category ?? null,
      };
    }),
  );

  return NextResponse.json({ marketplaces: enriched });
}
