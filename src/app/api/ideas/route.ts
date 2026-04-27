import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const category = sp.get("category") || undefined;
  const niche = sp.get("niche") || undefined;
  const marketplace = sp.get("marketplace") || undefined;
  const search = sp.get("search") || undefined;
  const sort = sp.get("sort") || "priority";
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 200);
  const offset = parseInt(sp.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (niche) where.niches = { has: niche };
  if (marketplace) where.marketplaceFit = { has: marketplace };
  if (search) where.title = { contains: search, mode: "insensitive" };

  const orderBy =
    sort === "date"
      ? { discoveredAt: "desc" as const }
      : sort === "reddit"
        ? { redditMentionCount: "desc" as const }
        : sort === "etsy_count"
          ? { etsyCompetitorCount: "asc" as const }
          : sort === "price"
            ? { etsyAvgPrice: "desc" as const }
            : { priorityScore: "desc" as const };

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        ideaTags: { include: { tag: true } },
      },
    }),
    prisma.idea.count({ where }),
  ]);

  return NextResponse.json({ ideas, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const baseSlug = slugify(body.title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const idea = await prisma.idea.create({
    data: {
      title: body.title,
      slug,
      summary: body.summary ?? "",
      category: body.category ?? "ebook",
      subcategory: body.subcategory ?? null,
      niches: body.niches ?? [],
      productFormat: body.productFormat ?? null,
      marketplaceFit: body.marketplaceFit ?? [],
      status: body.status ?? "pending",
      priorityScore: body.priorityScore ?? 0,
      confidenceScore: body.confidenceScore ?? 0,
      detailedAnalysis: body.detailedAnalysis ?? null,
      competitorAnalysis: body.competitorAnalysis ?? null,
      differentiationNotes: body.differentiationNotes ?? null,
      estimatedPriceRange: body.estimatedPriceRange ?? null,
      estimatedMonthlyRev: body.estimatedMonthlyRev ?? null,
      effortToBuild: body.effortToBuild ?? null,
      timeToBuild: body.timeToBuild ?? null,
      sourceLinks: body.sourceLinks ?? [],
      discoverySource: body.discoverySource ?? "manual",
    },
  });
  return NextResponse.json({ idea });
}
