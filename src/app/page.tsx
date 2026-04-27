import Link from "next/link";
import {
  Lightbulb,
  Clock,
  CheckCircle2,
  Activity,
  Rocket,
  Flame,
  Brain,
  ArrowRight,
  Sparkles,
  Play,
} from "lucide-react";
import { ScraperTriggerButton } from "@/components/scraper-trigger-button";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ideas/stat-card";
import { IdeaCard } from "@/components/ideas/idea-card";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadDashboardData() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);
  const [
    totalIdeas, pendingIdeas, approvedIdeas, inProgressIdeas, launchedIdeas,
    todaysDiscoveries, recentMemories, recentScrapes, allNiches,
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.idea.count({ where: { status: "pending" } }),
    prisma.idea.count({ where: { status: "approved" } }),
    prisma.idea.count({ where: { status: "in_progress" } }),
    prisma.idea.count({ where: { status: "launched" } }),
    prisma.idea.findMany({
      orderBy: { priorityScore: "desc" },
      take: 12,
    }),
    prisma.brainMemory.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.scrapeLog.count({ where: { startedAt: { gte: since24 } } }),
    prisma.idea.findMany({ select: { niches: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const i of allNiches) for (const n of i.niches) counts.set(n, (counts.get(n) ?? 0) + 1);
  const topTrending = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return {
    stats: { totalIdeas, pendingIdeas, approvedIdeas, inProgressIdeas, launchedIdeas, topTrending, recentScrapes },
    todaysDiscoveries,
    recentMemories,
  };
}

export default async function DashboardPage() {
  const { stats, todaysDiscoveries, recentMemories } = await loadDashboardData();
  const pulseRate = Math.max(0.1, Math.round((stats.recentScrapes / 24) * 10) / 10);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Today&apos;s opportunity surface across all niches.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketplaces"><Rocket className="w-4 h-4" />Marketplaces</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/brain"><Brain className="w-4 h-4" />Ask the brain</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-7">
        <StatCard label="Total ideas" value={stats.totalIdeas} icon={Lightbulb} />
        <StatCard label="Pending" value={stats.pendingIdeas} icon={Clock} variant="warning" />
        <StatCard label="Approved" value={stats.approvedIdeas} icon={CheckCircle2} variant="success" />
        <StatCard label="In progress" value={stats.inProgressIdeas} icon={Activity} variant="info" />
        <StatCard label="Launched" value={stats.launchedIdeas} icon={Rocket} variant="success" />
        <StatCard label="Top niche" value={stats.topTrending} icon={Flame} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Today&apos;s Discoveries</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ideas">View all <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todaysDiscoveries.length === 0 && (
              <Card className="col-span-2 p-6 text-center text-sm text-muted-foreground">No ideas yet — run a scraper to populate.</Card>
            )}
            {todaysDiscoveries.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Brain Activity</h3>
              <Link href="/brain"><Sparkles className="w-4 h-4 text-primary" /></Link>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold">{pulseRate}</span>
              <span className="text-xs text-muted-foreground">scrapes / hr (24h)</span>
            </div>
            <div className="text-xs text-muted-foreground">{stats.recentScrapes} runs in last 24h</div>
            <div className="flex items-center gap-1.5 mt-3 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              <span className="text-muted-foreground">Brain online · niche-agnostic mode</span>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent learnings</h3>
            <div className="space-y-2.5">
              {recentMemories.map((m) => (
                <div key={m.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge
                      variant={
                        m.memoryType === "golden_rule"
                          ? "warning"
                          : m.memoryType === "general_rule"
                            ? "info"
                            : "secondary"
                      }
                      className="text-[9px]"
                    >
                      {m.memoryType.replace("_", " ")}
                    </Badge>
                    <span className="text-muted-foreground/70">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{m.content}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Quick actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <Link href="/ideas?status=pending"><Clock className="w-3.5 h-3.5" />Review pending ({stats.pendingIdeas})</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <Link href="/marketplaces"><Rocket className="w-3.5 h-3.5" />Shop the marketplaces</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <Link href="/trends"><Flame className="w-3.5 h-3.5" />See trending niches</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full justify-start">
                <Link href="/settings"><Activity className="w-3.5 h-3.5" />Tune the brain</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Play className="w-3.5 h-3.5" />Trigger a scraper</h3>
            <div className="grid grid-cols-2 gap-2">
              <ScraperTriggerButton scraperName="reddit_scraper" label="Reddit" className="w-full" />
              <ScraperTriggerButton scraperName="hn_scraper" label="Hacker News" className="w-full" />
              <ScraperTriggerButton scraperName="rss_aggregator" label="RSS feeds" className="w-full" />
              <ScraperTriggerButton scraperName="etsy_scraper" label="Etsy" className="w-full" />
              <ScraperTriggerButton scraperName="web_researcher" label="Web search" className="w-full" />
              <ScraperTriggerButton scraperName="google_trends" label="Trends" className="w-full" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Workers must be running: <code className="bg-muted px-1 rounded">bash scripts/run-workers.sh</code></p>
          </Card>
        </div>
      </div>
    </div>
  );
}
