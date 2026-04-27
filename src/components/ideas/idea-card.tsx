import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Users, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber, formatScore, CATEGORY_LABELS, MARKETPLACE_LABELS } from "@/lib/utils";

export type IdeaCardData = {
  id: string;
  title: string;
  summary: string;
  category: string;
  niches: string[];
  marketplaceFit: string[];
  status: string;
  priorityScore: number;
  confidenceScore: number;
  googleTrendsDirection?: string | null;
  redditMentionCount?: number;
  effortToBuild?: string | null;
  estimatedPriceRange?: string | null;
  estimatedMonthlyRev?: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "warning" | "info" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  in_progress: "info",
  launched: "success",
  declined: "destructive",
};

export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const score = formatScore(idea.priorityScore);
  const trendIcon =
    idea.googleTrendsDirection === "rising" ? (
      <TrendingUp className="w-3 h-3 text-success" />
    ) : idea.googleTrendsDirection === "declining" ? (
      <TrendingDown className="w-3 h-3 text-destructive" />
    ) : (
      <Minus className="w-3 h-3 text-muted-foreground" />
    );

  return (
    <Link href={`/ideas/${idea.id}`} className="block h-full group">
      <Card className="h-full p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {CATEGORY_LABELS[idea.category] ?? idea.category}
          </Badge>
          <Badge variant={STATUS_VARIANT[idea.status] ?? "secondary"} className="text-[10px] capitalize">
            {idea.status.replace("_", " ")}
          </Badge>
        </div>

        <h3 className="font-semibold text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
          {idea.title}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{idea.summary}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          {idea.niches.slice(0, 3).map((n) => (
            <span
              key={n}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {n}
            </span>
          ))}
          {idea.niches.length > 3 && (
            <span className="text-[10px] text-muted-foreground/70">+{idea.niches.length - 3}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] mt-auto pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Sparkles className={cn("w-3 h-3", score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-muted-foreground")} />
            <span className="font-semibold">{score}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {trendIcon}
            <Users className="w-3 h-3 ml-1" />
            <span>{formatNumber(idea.redditMentionCount)}</span>
          </div>
          {idea.effortToBuild && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="capitalize">{idea.effortToBuild}</span>
            </div>
          )}
        </div>

        {idea.marketplaceFit.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {idea.marketplaceFit.slice(0, 3).map((m) => (
              <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {MARKETPLACE_LABELS[m] ?? m}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
