import Link from "next/link";
import { Store, Activity, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MARKETPLACES } from "@/lib/marketplaces";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StopPropExternalLink } from "@/components/ui/external-link";
import { CATEGORY_LABELS, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketplacesPage() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);
  const enriched = await Promise.all(
    MARKETPLACES.map(async (m) => {
      const [trackedCount, recentCount, lastScrape, topCategory] = await Promise.all([
        prisma.idea.count({ where: { marketplaceFit: { has: m.slug } } }),
        prisma.idea.count({ where: { marketplaceFit: { has: m.slug }, discoveredAt: { gte: since24 } } }),
        m.scraperKey
          ? prisma.scrapeLog.findFirst({ where: { source: m.scraperKey }, orderBy: { startedAt: "desc" } })
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
        topCategory: topCategory[0]?.category ?? null,
      };
    }),
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Marketplaces</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Drill into top sellers per marketplace. This is where you shop the trends — see what's
          actually selling and find sub-categories with high demand and thin supply.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enriched.map((m) => (
          <Link key={m.slug} href={`/marketplaces/${m.slug}`} className="group">
            <Card className="p-5 h-full transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{m.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{m.name}</h3>
                      <Badge variant={m.tier === 1 ? "default" : "secondary"} className="text-[9px]">
                        Tier {m.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.tagline}</p>
                  </div>
                </div>
                <StopPropExternalLink href={m.url} size={14} />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.description}</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Tracked</div>
                  <div className="text-base font-semibold">{m.trackedCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">24h</div>
                  <div className="text-base font-semibold">{m.recentCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Top cat</div>
                  <div className="text-xs font-medium truncate">
                    {m.topCategory ? CATEGORY_LABELS[m.topCategory] ?? m.topCategory : "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {m.lastScrapedAt ? `last scraped ${timeAgo(m.lastScrapedAt)}` : "never scraped"}
                </span>
                <span className="flex items-center gap-1 group-hover:text-primary">
                  drill in <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
