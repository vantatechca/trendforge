import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IdeaCard } from "@/components/ideas/idea-card";
import { IdeasFilters } from "@/components/ideas/ideas-filters";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "launched", label: "Launched" },
  { value: "declined", label: "Declined" },
];

type SP = Promise<{
  status?: string;
  category?: string;
  niche?: string;
  marketplace?: string;
  search?: string;
  sort?: string;
}>;

export default async function IdeasPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const category = sp.category;
  const niche = sp.niche;
  const marketplace = sp.marketplace;
  const search = sp.search;
  const sort = sp.sort ?? "priority";

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (niche) where.niches = { has: niche };
  if (marketplace && marketplace !== "all") where.marketplaceFit = { has: marketplace };
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

  const [ideas, statusCounts, allNicheRows] = await Promise.all([
    prisma.idea.findMany({ where, orderBy, take: 60 }),
    Promise.all(
      STATUS_TABS.map(async (t) => ({
        value: t.value,
        count: t.value === "all" ? await prisma.idea.count() : await prisma.idea.count({ where: { status: t.value } }),
      })),
    ),
    prisma.tag.findMany(),
  ]);

  const nicheList = allNicheRows.map((t) => t.slug);
  const countMap = new Map(statusCounts.map((s) => [s.value, s.count]));

  function tabHref(value: string) {
    const next = new URLSearchParams();
    if (value !== "all") next.set("status", value);
    if (category && category !== "all") next.set("category", category);
    if (niche) next.set("niche", niche);
    if (marketplace && marketplace !== "all") next.set("marketplace", marketplace);
    if (search) next.set("search", search);
    if (sort && sort !== "priority") next.set("sort", sort);
    const qs = next.toString();
    return qs ? `/ideas?${qs}` : "/ideas";
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All ideas</h1>
          <p className="text-sm text-muted-foreground mt-1">{ideas.length} of {countMap.get("all") ?? 0} matching your filters</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/ideas/export${status !== "all" ? `?status=${status}` : ""}`}>
            <Download className="w-3.5 h-3.5" />Export CSV
          </a>
        </Button>
      </div>

      <Tabs value={status} className="mb-5">
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger value={t.value} key={t.value} asChild>
              <Link href={tabHref(t.value)}>
                {t.label} <span className="ml-1.5 text-xs opacity-60">{countMap.get(t.value) ?? 0}</span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-5">
        <IdeasFilters niches={nicheList} />
      </div>

      {ideas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No ideas match. Try clearing filters or trigger a scraper.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
        </div>
      )}
    </div>
  );
}
