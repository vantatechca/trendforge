import { prisma } from "@/lib/prisma";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SourcesPanel } from "@/components/settings/sources-panel";
import { RulesPanel } from "@/components/settings/rules-panel";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { AnalyticsPanel } from "@/components/settings/analytics-panel";

export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "EMBEDDINGS_API_KEY",
  "YOUTUBE_API_KEY", "SERPER_API_KEY", "SERPAPI_API_KEY", "BRAVE_SEARCH_API_KEY",
  "ETSY_API_KEY", "REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET",
];

export default async function SettingsPage() {
  const since24 = new Date(Date.now() - 24 * 3600 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [
    totalIdeas, pendingIdeas, approvedIdeas, declinedIdeas, inProgressIdeas, launchedIdeas,
    todayDiscoveries, weekDiscoveries, totalMemories, goldenRules, recentScrapesCount, recentScrapes, allNiches,
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.idea.count({ where: { status: "pending" } }),
    prisma.idea.count({ where: { status: "approved" } }),
    prisma.idea.count({ where: { status: "declined" } }),
    prisma.idea.count({ where: { status: "in_progress" } }),
    prisma.idea.count({ where: { status: "launched" } }),
    prisma.idea.count({ where: { discoveredAt: { gte: since24 } } }),
    prisma.idea.count({ where: { discoveredAt: { gte: since7 } } }),
    prisma.brainMemory.count({ where: { active: true } }),
    prisma.brainMemory.count({ where: { active: true, memoryType: "golden_rule" } }),
    prisma.scrapeLog.count({ where: { startedAt: { gte: since24 } } }),
    prisma.scrapeLog.findMany({ orderBy: { startedAt: "desc" }, take: 12 }),
    prisma.idea.findMany({ select: { niches: true } }),
  ]);

  const nicheCounts = new Map<string, number>();
  for (const i of allNiches) for (const n of i.niches) nicheCounts.set(n, (nicheCounts.get(n) ?? 0) + 1);
  const topTrendingNiche = Array.from(nicheCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const env: Record<string, boolean> = {};
  for (const k of ENV_KEYS) env[k] = !!process.env[k];

  const stats = {
    totalIdeas, pendingIdeas, approvedIdeas, declinedIdeas, inProgressIdeas, launchedIdeas,
    todayDiscoveries, weekDiscoveries, totalMemories, goldenRules, recentScrapes: recentScrapesCount, topTrendingNiche,
  };

  const scrapeJson = recentScrapes.map((s) => ({
    id: s.id,
    source: s.source,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    itemsFound: s.itemsFound,
    itemsKept: s.itemsKept,
  }));

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Tune what the brain watches, what it filters, and what it knows about you.</p>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="mt-4"><SourcesPanel /></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesPanel /></TabsContent>
        <TabsContent value="keys" className="mt-4"><ApiKeysPanel env={env} /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><AnalyticsPanel stats={stats} recentScrapes={scrapeJson} /></TabsContent>
      </Tabs>
    </div>
  );
}
