import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

type Stats = {
  totalIdeas: number;
  pendingIdeas: number;
  approvedIdeas: number;
  declinedIdeas: number;
  inProgressIdeas: number;
  launchedIdeas: number;
  todayDiscoveries: number;
  weekDiscoveries: number;
  totalMemories: number;
  goldenRules: number;
  recentScrapes: number;
  topTrendingNiche: string | null;
};

type ScrapeLog = {
  id: string;
  source: string;
  status: string;
  startedAt: string;
  itemsFound: number;
  itemsKept: number;
};

export function AnalyticsPanel({ stats, recentScrapes }: { stats: Stats; recentScrapes: ScrapeLog[] }) {
  const approvalRate =
    stats.approvedIdeas + stats.declinedIdeas === 0
      ? 0
      : Math.round((stats.approvedIdeas / (stats.approvedIdeas + stats.declinedIdeas)) * 100);

  const pipeline = [
    { label: "Pending", count: stats.pendingIdeas, color: "bg-warning" },
    { label: "Approved", count: stats.approvedIdeas, color: "bg-success" },
    { label: "In progress", count: stats.inProgressIdeas, color: "bg-info" },
    { label: "Launched", count: stats.launchedIdeas, color: "bg-success" },
    { label: "Declined", count: stats.declinedIdeas, color: "bg-destructive" },
  ];
  const totalForBars = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="Total ideas" value={stats.totalIdeas} />
        <StatBlock label="Approval rate" value={`${approvalRate}%`} />
        <StatBlock label="Today" value={stats.todayDiscoveries} />
        <StatBlock label="7-day" value={stats.weekDiscoveries} />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Pipeline</h3>
        <div className="space-y-2.5">
          {pipeline.map((p) => (
            <div key={p.label}>
              <div className="flex justify-between text-xs mb-1">
                <span>{p.label}</span>
                <span className="font-medium">{p.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${p.color}`} style={{ width: `${(p.count / totalForBars) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Brain memory</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Total memories</span><span className="font-semibold">{stats.totalMemories}</span></div>
            <div className="flex justify-between text-sm"><span>Golden rules</span><span className="font-semibold">{stats.goldenRules}</span></div>
            <div className="flex justify-between text-sm"><span>Top trending niche</span><span className="font-semibold">{stats.topTrendingNiche ?? "—"}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Recent scrapes (24h: {stats.recentScrapes})</h3>
          {recentScrapes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No scrape runs yet — start the workers and trigger one.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentScrapes.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <Badge variant={s.status === "ok" ? "success" : s.status === "running" ? "info" : "destructive"} className="text-[9px] capitalize">{s.status}</Badge>
                  <span className="font-medium truncate flex-1">{s.source}</span>
                  <span className="text-muted-foreground">{s.itemsKept}/{s.itemsFound}</span>
                  <span className="text-muted-foreground/70">{timeAgo(s.startedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
