import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Plus, ArrowLeft, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getMarketplace } from "@/lib/marketplaces";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IdeaCard } from "@/components/ideas/idea-card";
import { ScraperTriggerButton } from "@/components/scraper-trigger-button";
import { CATEGORY_LABELS, formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getMarketplace(slug);
  if (!meta) notFound();

  const [topSellers, subcategories, recentMomentum] = await Promise.all([
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
    prisma.idea.count({
      where: {
        marketplaceFit: { has: slug },
        discoveredAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    }),
  ]);

  const gaps = subcategories
    .map((sc) => ({
      category: sc.category,
      avgPriority: Math.round(sc._avg.priorityScore ?? 0),
      ideaCount: sc._count._all,
    }))
    .sort((a, b) => b.avgPriority - a.avgPriority)
    .slice(0, 5);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href="/marketplaces"><ArrowLeft className="w-4 h-4" />All marketplaces</Link>
      </Button>

      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{meta.icon}</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
              <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-3">{meta.description}</p>
          <a
            href={meta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary mt-2"
          >
            Open marketplace <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={meta.tier === 1 ? "default" : "secondary"}>Tier {meta.tier}</Badge>
          <span className="text-xs text-muted-foreground">{topSellers.length} tracked · {recentMomentum} new in 7d</span>
          {meta.scraperKey && <ScraperTriggerButton scraperName={meta.scraperKey} label={`Run ${meta.name} scraper`} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Underserved sub-categories (high demand × thin supply)</h3>
          </div>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gap data yet.</p>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.category} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div>
                    <div className="text-sm font-medium">{CATEGORY_LABELS[g.category] ?? g.category}</div>
                    <div className="text-xs text-muted-foreground">{g.ideaCount} tracked ideas</div>
                  </div>
                  <Badge variant="warning" className="ml-2">avg priority {g.avgPriority}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Sub-category breakdown</h3>
          <div className="space-y-1.5">
            {subcategories.slice(0, 12).map((sc) => (
              <div key={sc.category} className="flex items-center justify-between text-sm">
                <span className="truncate">{CATEGORY_LABELS[sc.category] ?? sc.category}</span>
                <span className="text-muted-foreground text-xs">{sc._count._all}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Top sellers (priority-ranked)</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/ideas?marketplace=${slug}`}>View as ideas list <Plus className="w-3 h-3" /></Link>
        </Button>
      </div>

      {topSellers.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No tracked sellers for this marketplace yet — trigger the scraper to populate.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topSellers.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
        </div>
      )}
    </div>
  );
}
