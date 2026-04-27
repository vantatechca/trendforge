"use client";

import { useState } from "react";
import { Loader2, Play, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SCRAPER_TYPE_MAP: Record<string, string> = {
  subreddit: "reddit_scraper",
  rss: "rss_aggregator",
  etsy_search: "etsy_scraper",
  gumroad_discover: "gumroad_scraper",
  whop_discover: "whop_scraper",
  google_trends: "google_trends",
  web_search: "web_researcher",
  youtube: "youtube_scraper",
  pinterest_trends: "pinterest_trends",
  tiktok: "tiktok_creative_center",
};


export function ScraperTriggerButton({
  scraperName,
  sourceType,
  variant = "outline",
  size = "sm",
  label,
  className,
}: {
  scraperName?: string;
  sourceType?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const resolvedName = scraperName ?? (sourceType ? SCRAPER_TYPE_MAP[sourceType] : undefined);

  async function trigger() {
    if (!resolvedName) {
      toast.error("No scraper mapped for this source type");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scraper_name: resolvedName }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Trigger failed", {
          icon: <AlertTriangle className="w-4 h-4" />,
          description: data.detail ?? `Start workers: bash scripts/run-workers.sh`,
        });
        return;
      }
      toast.success(`${resolvedName} queued`, { description: `Task ${data.task_id?.slice(0, 8) ?? ""}…` });
      setTimeout(() => router.refresh(), 6000);
    } catch (e) {
      toast.error("Network error", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={trigger} variant={variant} size={size} disabled={busy} className={className}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
      {label ?? "Run scraper"}
    </Button>
  );
}
