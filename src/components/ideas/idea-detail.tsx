"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Sparkles, TrendingUp, TrendingDown, Minus,
  ExternalLink, MessageSquare, FileText, Link2, Brain, Activity,
  Heart, Eye, ShoppingCart, AlertCircle, ArrowRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { cn, formatNumber, formatScore, timeAgo, CATEGORY_LABELS, MARKETPLACE_LABELS } from "@/lib/utils";
import { MarkdownView } from "@/lib/markdown";
import { BrainChat } from "@/components/brain/brain-chat";

type Idea = {
  id: string;
  title: string;
  summary: string;
  detailedAnalysis: string | null;
  category: string;
  subcategory: string | null;
  niches: string[];
  marketplaceFit: string[];
  productFormat: string | null;
  status: string;
  priorityScore: number;
  confidenceScore: number;
  googleTrendsScore: number | null;
  googleTrendsDirection: string | null;
  redditMentionCount: number;
  redditQuestionCount: number;
  youtubeVideoCount: number;
  youtubeAvgViews: number;
  tiktokHashtagCount: number;
  pinterestPinCount: number;
  forumMentionCount: number;
  searchVolumeMonthly: number | null;
  etsyCompetitorCount: number;
  etsyAvgPrice: number | null;
  etsyAvgReviews: number | null;
  etsyTopSellers: unknown;
  gumroadCompetitorCount: number;
  gumroadAvgPrice: number | null;
  whopCompetitorCount: number;
  creativeMarketCount: number;
  appSumoLtdExists: boolean;
  existingProducts: unknown;
  competitorAnalysis: string | null;
  differentiationNotes: string | null;
  estimatedPriceRange: string | null;
  estimatedMonthlyRev: string | null;
  effortToBuild: string | null;
  timeToBuild: string | null;
  sourceLinks: unknown;
  discoverySource: string | null;
  operatorNotes: string[];
  declineReason: string | null;
  approvalNotes: string | null;
  discoveredAt: Date;
  lastDataRefresh: Date | null;
  statusChangedAt: Date | null;
};

type ExistingProduct = {
  title: string;
  marketplace: string;
  price?: number;
  sales_estimate?: number;
  reviews?: number;
  rating?: number;
  url: string;
};

type SourceLink = { type: string; title: string; url: string; snippet?: string };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "info" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  in_progress: "info",
  launched: "success",
  declined: "destructive",
};

function trendIcon(dir: string | null) {
  if (dir === "rising") return <TrendingUp className="w-4 h-4 text-success" />;
  if (dir === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function generateTrendSeries(seedScore: number, direction: string | null): { month: string; value: number }[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const start = direction === "rising" ? Math.max(20, seedScore - 30) : direction === "declining" ? Math.min(95, seedScore + 25) : seedScore;
  const end = seedScore;
  return months.map((m, i) => {
    const t = i / 11;
    const base = start + (end - start) * t;
    const noise = Math.sin(i * 1.3) * 6 + (Math.random() * 6 - 3);
    return { month: m, value: Math.max(5, Math.min(100, Math.round(base + noise))) };
  });
}

export function IdeaDetail({ idea }: { idea: Idea }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [status, setStatus] = useState(idea.status);
  const [quickNote, setQuickNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const score = formatScore(idea.priorityScore);
  const confidence = formatScore(idea.confidenceScore);
  const trends = generateTrendSeries(idea.googleTrendsScore ?? score, idea.googleTrendsDirection);
  const existingProducts = (idea.existingProducts as ExistingProduct[]) ?? [];
  const sourceLinks = (idea.sourceLinks as SourceLink[]) ?? [];
  const groupedSources = sourceLinks.reduce<Record<string, SourceLink[]>>((acc, s) => {
    (acc[s.type] ||= []).push(s);
    return acc;
  }, {});

  async function approve() {
    setBusy(true);
    try {
      const r = await fetch(`/api/ideas/${idea.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: approveNotes }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Approved. Brain learning saved.");
      setStatus("approved");
      setApproveOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(`Approve failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!declineReason.trim()) {
      toast.error("Decline reason is required — the brain learns from it.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/ideas/${idea.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast.success("Declined. High-importance memory saved.");
      setStatus("declined");
      setDeclineOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(`Decline failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setStatus(next);
      toast.success(`Status: ${next.replace("_", " ")}`);
      router.refresh();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addQuickNote() {
    if (!quickNote.trim()) return;
    setBusy(true);
    try {
      const next = [...idea.operatorNotes, `${new Date().toISOString()} :: ${quickNote.trim()}`];
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorNotes: next }),
      });
      setQuickNote("");
      toast.success("Note added");
      router.refresh();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="mb-7">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Badge variant="outline" className="text-[10px] uppercase">{CATEGORY_LABELS[idea.category] ?? idea.category}</Badge>
            {idea.subcategory && <span>· {idea.subcategory}</span>}
            <span>· discovered {timeAgo(idea.discoveredAt)}</span>
            {idea.discoverySource && <span>· via {idea.discoverySource}</span>}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight mb-2">{idea.title}</h1>
              <p className="text-muted-foreground max-w-3xl">{idea.summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="capitalize">{status.replace("_", " ")}</Badge>
              {status === "pending" && (
                <>
                  <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                    <DialogTrigger asChild>
                      <Button variant="success" size="sm"><CheckCircle2 className="w-4 h-4" />Approve</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve this idea</DialogTitle>
                        <DialogDescription>Optional: leave a note about why. The brain learns from it.</DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="e.g. Strong recurring revenue angle, low effort, multi-niche."
                        value={approveNotes}
                        onChange={(e) => setApproveNotes(e.target.value)}
                        className="min-h-[96px]"
                      />
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={approve} disabled={busy} variant="success">Approve</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><XCircle className="w-4 h-4" />Decline</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Decline this idea</DialogTitle>
                        <DialogDescription>Required: tell the brain why. This becomes a high-importance memory.</DialogDescription>
                      </DialogHeader>
                      <Textarea
                        placeholder="e.g. Too saturated. Margins too thin at this ASP. Requires regulated certification."
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        className="min-h-[96px]"
                        required
                      />
                      <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={decline} disabled={busy || !declineReason.trim()} variant="destructive">Decline</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {idea.niches.map((n) => (
              <Badge key={n} variant="secondary" className="capitalize">{n}</Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase mb-1.5">Priority</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{score}</span>
              <Sparkles className={cn("w-4 h-4", score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-muted-foreground")} />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase mb-1.5">Confidence</div>
            <div className="text-2xl font-bold">{confidence}%</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase mb-1.5">Trend</div>
            <div className="flex items-center gap-2">
              {trendIcon(idea.googleTrendsDirection)}
              <span className="text-base font-semibold capitalize">{idea.googleTrendsDirection ?? "—"}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase mb-1.5">Effort</div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold capitalize">{idea.effortToBuild ?? "—"}</span>
              {idea.timeToBuild && <span className="text-xs text-muted-foreground">· {idea.timeToBuild}</span>}
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview"><FileText className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="market"><Activity className="w-3.5 h-3.5 mr-1" />Market data</TabsTrigger>
            <TabsTrigger value="competitors"><ShoppingCart className="w-3.5 h-3.5 mr-1" />Competitors</TabsTrigger>
            <TabsTrigger value="evidence"><Link2 className="w-3.5 h-3.5 mr-1" />Evidence</TabsTrigger>
            <TabsTrigger value="discussion"><Brain className="w-3.5 h-3.5 mr-1" />Discussion</TabsTrigger>
            <TabsTrigger value="notes"><MessageSquare className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-3">Brain analysis</h2>
                {idea.detailedAnalysis ? (
                  <MarkdownView md={idea.detailedAnalysis} className="text-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground">No analysis yet.</p>
                )}
                {idea.differentiationNotes && (
                  <div className="mt-5 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" />Differentiation
                    </div>
                    <p className="text-sm">{idea.differentiationNotes}</p>
                  </div>
                )}
                {idea.competitorAnalysis && (
                  <div className="mt-3 p-4 rounded-lg bg-muted/50">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Competitor read</div>
                    <p className="text-sm">{idea.competitorAnalysis}</p>
                  </div>
                )}
              </Card>

              <div className="space-y-3">
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Estimated price</div>
                  <div className="text-base font-semibold mb-3">{idea.estimatedPriceRange ?? "—"}</div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Estimated monthly rev</div>
                  <div className="text-base font-semibold">{idea.estimatedMonthlyRev ?? "—"}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Format</div>
                  <div className="text-sm font-medium mb-3">{idea.productFormat ?? "—"}</div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Marketplaces</div>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.marketplaceFit.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {idea.marketplaceFit.map((m) => (
                      <Badge key={m} variant="info">{MARKETPLACE_LABELS[m] ?? m}</Badge>
                    ))}
                  </div>
                </Card>
                {idea.approvalNotes && (
                  <Card className="p-4 border-success/30 bg-success/5">
                    <div className="text-xs uppercase text-success mb-1">Approval notes</div>
                    <p className="text-sm">{idea.approvalNotes}</p>
                  </Card>
                )}
                {idea.declineReason && (
                  <Card className="p-4 border-destructive/30 bg-destructive/5">
                    <div className="text-xs uppercase text-destructive mb-1">Decline reason</div>
                    <p className="text-sm">{idea.declineReason}</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="market" className="mt-5">
            <Card className="p-5 mb-5">
              <h2 className="text-lg font-semibold mb-3">12-month interest trend</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <RTooltip
                    contentStyle={{ background: "#222", border: "1px solid #333", borderRadius: 8 }}
                    formatter={((v: unknown) => [`${v}`, "Interest"]) as never}
                  />
                  <Area type="monotone" dataKey="value" stroke="oklch(0.72 0.18 60)" fill="oklch(0.72 0.18 60 / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Google Trends" value={idea.googleTrendsScore ?? 0} icon={TrendingUp} />
              <MetricCard label="Reddit mentions" value={idea.redditMentionCount} hint={`${idea.redditQuestionCount} questions`} icon={MessageSquare} />
              <MetricCard label="YouTube videos" value={formatNumber(idea.youtubeVideoCount)} hint={`${formatNumber(idea.youtubeAvgViews)} avg views`} icon={Eye} />
              <MetricCard label="TikTok hashtag" value={formatNumber(idea.tiktokHashtagCount)} icon={Sparkles} />
              <MetricCard label="Pinterest pins" value={formatNumber(idea.pinterestPinCount)} icon={Heart} />
              <MetricCard label="Search volume / mo" value={formatNumber(idea.searchVolumeMonthly)} icon={Activity} />
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="mt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <CompetitorStat label="Etsy" count={idea.etsyCompetitorCount} avgPrice={idea.etsyAvgPrice} avgReviews={idea.etsyAvgReviews} />
              <CompetitorStat label="Gumroad" count={idea.gumroadCompetitorCount} avgPrice={idea.gumroadAvgPrice} />
              <CompetitorStat label="Whop" count={idea.whopCompetitorCount} />
              <CompetitorStat label="Creative Market" count={idea.creativeMarketCount} />
            </div>

            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">Existing products</h3>
              {existingProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No competitor products catalogued yet.</p>
              ) : (
                <div className="space-y-2">
                  {existingProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent/40">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.title}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge variant="info" className="text-[10px]">{p.marketplace}</Badge>
                          {p.price !== undefined && <span>${p.price.toFixed(2)}</span>}
                          {p.reviews !== undefined && <span>{p.reviews} reviews</span>}
                          {p.rating !== undefined && <span>{p.rating.toFixed(1)}★</span>}
                        </div>
                      </div>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="w-4 h-4" /></a>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {idea.differentiationNotes && (
              <Card className="p-5 mt-5 bg-primary/5 border-primary/20">
                <h3 className="text-sm font-semibold mb-2">Gap / differentiation read</h3>
                <p className="text-sm">{idea.differentiationNotes}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="mt-5">
            {Object.keys(groupedSources).length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">No source links yet. Trigger a scraper to populate.</Card>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedSources).map(([type, links]) => (
                  <Card key={type} className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="info" className="capitalize">{type}</Badge>
                      <span className="text-xs text-muted-foreground">{links.length} {links.length === 1 ? "source" : "sources"}</span>
                    </div>
                    <div className="space-y-2">
                      {links.map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-md border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{l.title}</div>
                              {l.snippet && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.snippet}</p>}
                              <div className="text-[10px] text-muted-foreground/70 mt-1 truncate">{l.url}</div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discussion" className="mt-5">
            <Card className="p-4 h-[600px]">
              <BrainChat
                relatedIdeaId={idea.id}
                placeholder={`Ask about "${idea.title}"…`}
                suggestions={[
                  "What's the strongest differentiation angle here?",
                  "How would you price and bundle this?",
                  "Who are the top creators already serving this market?",
                  "What's the 14-day launch plan?",
                ]}
              />
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-5">
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-3">Operator notes</h3>
              {idea.operatorNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No notes yet. Add one below.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {idea.operatorNotes.map((note, i) => {
                    const m = note.match(/^([^:]+) :: (.*)$/);
                    const ts = m ? m[1] : null;
                    const text = m ? m[2] : note;
                    return (
                      <div key={i} className="p-3 rounded-md border-l-2 border-info bg-info/5">
                        <p className="text-sm">{text}</p>
                        {ts && <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(ts)}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Add a note…"
                  onKeyDown={(e) => { if (e.key === "Enter") void addQuickNote(); }}
                />
                <Button onClick={addQuickNote} disabled={busy || !quickNote.trim()}>Add</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-0 left-64 right-0 border-t border-border bg-card/95 backdrop-blur px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3">
          <Select value={status} onValueChange={changeStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="launched">Launched</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Quick note (Enter to save)"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addQuickNote(); }}
            className="flex-1"
          />
          <Button variant="outline" onClick={() => setActiveTab("discussion")}>
            <Brain className="w-4 h-4" />Deep dive
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className="text-xl font-bold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

function CompetitorStat({ label, count, avgPrice, avgReviews }: { label: string; count: number; avgPrice?: number | null; avgReviews?: number | null }) {
  const heat =
    count >= 50 ? "text-destructive" : count >= 20 ? "text-warning" : count >= 5 ? "text-info" : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        {label}
        {count >= 50 && <AlertCircle className="w-3 h-3 text-destructive" />}
      </div>
      <div className={cn("text-2xl font-bold", heat)}>{count}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">competitors</div>
      {avgPrice !== null && avgPrice !== undefined && <div className="text-xs text-muted-foreground mt-1">avg ${avgPrice.toFixed(2)}</div>}
      {avgReviews !== null && avgReviews !== undefined && <div className="text-xs text-muted-foreground">{avgReviews} avg reviews</div>}
    </Card>
  );
}
