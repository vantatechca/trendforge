import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : Array.isArray(v) ? v.join("|") : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;

  const ideas = await prisma.idea.findMany({
    where,
    orderBy: { priorityScore: "desc" },
    take: 1000,
  });

  const cols = [
    "title", "category", "subcategory", "status", "priority_score", "confidence_score",
    "niches", "marketplace_fit", "estimated_price_range", "estimated_monthly_rev",
    "effort_to_build", "time_to_build", "google_trends_direction",
    "reddit_mention_count", "reddit_question_count", "etsy_competitor_count", "etsy_avg_price",
    "discovery_source", "discovered_at",
  ];

  const rows: string[] = [cols.join(",")];
  for (const i of ideas) {
    rows.push([
      csvEscape(i.title),
      csvEscape(i.category),
      csvEscape(i.subcategory),
      csvEscape(i.status),
      csvEscape(i.priorityScore),
      csvEscape(i.confidenceScore),
      csvEscape(i.niches),
      csvEscape(i.marketplaceFit),
      csvEscape(i.estimatedPriceRange),
      csvEscape(i.estimatedMonthlyRev),
      csvEscape(i.effortToBuild),
      csvEscape(i.timeToBuild),
      csvEscape(i.googleTrendsDirection),
      csvEscape(i.redditMentionCount),
      csvEscape(i.redditQuestionCount),
      csvEscape(i.etsyCompetitorCount),
      csvEscape(i.etsyAvgPrice),
      csvEscape(i.discoverySource),
      csvEscape(i.discoveredAt.toISOString()),
    ].join(","));
  }

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trendforge-ideas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
