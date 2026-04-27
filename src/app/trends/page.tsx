import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, Flame, MessageSquare, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdeaCard } from "@/components/ideas/idea-card";
import { NicheBarChart, CategoryBarChart } from "@/components/trends/trends-charts";
import { CATEGORY_LABELS, MARKETPLACE_LABELS, formatScore, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);

  const [
    rising, declining, recentIdeas, redditPulse, marketplaceCounts, allIdeas, recentScrapes,
  ] = await Promise.all([
    prisma.idea.findMany({ where: { googleTrendsDirection: "rising" }, orderBy: { priorityScore: "desc" }, take: 8 }),
    prisma.idea.findMany({ where: { googleTrendsDirection: "declining" }, orderBy: { priorityScore: "desc" }, take: 5 }),
    prisma.idea.findMany({ orderBy: { discoveredAt: "desc" }, take: 10 }),
    prisma.idea.findMany({ where: { discoverySource: "reddit" }, orderBy: { redditMentionCount: "desc" }, take: 6 }),
    prisma.idea.findMany({ select: { marketplaceFit: true } }),
    prisma.idea.findMany({ select: { category: true, niches: true } }),
    prisma.scrapeLog.count({ where: { startedAt: { gte: since24 } } }),
  ]);

  const pulseRate = Math.max(0.1, Math.round((recentScrapes / 24) * 10) / 10);

  const nicheCounts = new Map<string, number>();
  for (const i of allIdeas) for (const n of i.niches) nicheCounts.set(n, (nicheCounts.get(n) ?? 0) + 1);
  const nicheChartData = Array.from(nicheCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const categoryCounts = new Map<string, number>();
  for (const i of allIdeas) categoryCounts.set(i.category, (categoryCounts.get(i.category) ?? 0) + 1);
  const categoryChartData = Array.from(categoryCounts.entries())
    .map(([cat, count]) => ({ name: CATEGORY_LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count);

  const mktCounts = new Map<string, number>();
  for (const i of marketplaceCounts) for (const m of i.marketplaceFit) mktCounts.set(m, (mktCounts.get(m) ?? 0) + 1);
  const mktTop = Array.from(mktCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Trends &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What&apos;s rising, what&apos;s saturated, where the brain is finding the most opportunity.
        </p>
      </div>

      <Card className="p-5 mb-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-6 h-6 text-primary" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Research pulse</div>
              <div className="text-2xl font-bold">{pulseRate} <span className="text-sm font-normal text-muted-foreground">scrapes / hr</span></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{recentScrapes} runs in last 24h · niche-agnostic mode</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-warning" />
            <h2 className="text-base font-semibold">Rising stars</h2>
            <Badge variant="secondary" className="text-[10px]">{rising.length}</Badge>
          </div>
          {rising.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rising trends in current data — trigger Google Trends scraper.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {rising.map((i) => <IdeaCard key={i.id} idea={i} />)}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <h2 className="text-base font-semibold">Declining</h2>
          </div>
          {declining.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing trending down.</p>
          ) : (
            <div className="space-y-2">
              {declining.map((i) => (
                <Link key={i.id} href={`/ideas/${i.id}`} className="block p-3 rounded-md border border-destructive/20 hover:bg-destructive/5">
                  <div className="text-sm font-medium line-clamp-1">{i.title}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="destructive" className="text-[9px]">priority {formatScore(i.priorityScore)}</Badge>
                    <span>{CATEGORY_LABELS[i.category] ?? i.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-info" />
            <h2 className="text-base font-semibold">Reddit pulse</h2>
            <Badge variant="secondary" className="text-[10px]">{redditPulse.length}</Badge>
          </div>
          <div className="space-y-2">
            {redditPulse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Reddit-sourced ideas yet — trigger the Reddit scraper.</p>
            ) : (
              redditPulse.map((i) => (
                <Link key={i.id} href={`/ideas/${i.id}`} className="block p-3 rounded-md border border-border hover:bg-accent/40">
                  <div className="text-sm font-medium line-clamp-1">{i.title}</div>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{i.redditMentionCount} mentions</span>
                    <span>· {i.redditQuestionCount} questions</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Marketplace pulse</h2>
          </div>
          <div className="space-y-2">
            {mktTop.map(([mkt, count]) => (
              <Link key={mkt} href={`/marketplaces/${mkt}`} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent/40">
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="text-[10px]">{MARKETPLACE_LABELS[mkt] ?? mkt}</Badge>
                </div>
                <span className="text-sm text-muted-foreground">{count} ideas</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h2 className="text-base font-semibold mb-3">Recent discoveries</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {recentIdeas.slice(0, 10).map((i) => (
            <Link key={i.id} href={`/ideas/${i.id}`} className="block p-3 rounded-md border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors">
              <div className="text-xs font-medium line-clamp-2 mb-1">{i.title}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[9px]">{formatScore(i.priorityScore)}</Badge>
                <span>{timeAgo(i.discoveredAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Niche heatmap</h2>
          <NicheBarChart data={nicheChartData} />
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Category breakdown</h2>
          <CategoryBarChart data={categoryChartData} />
        </Card>
      </div>
    </div>
  );
}
