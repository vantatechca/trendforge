"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import { ScraperTriggerButton } from "@/components/scraper-trigger-button";

type Src = {
  id: string;
  name: string;
  type: string;
  url: string;
  enabled: boolean;
  frequencyHours: number;
  lastRunAt: string | null;
};

const TYPES = ["subreddit", "rss", "etsy_search", "gumroad_discover", "whop_discover", "google_trends", "web_search", "youtube", "pinterest_trends", "tiktok"];

export function SourcesPanel() {
  const [sources, setSources] = useState<Src[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", type: "subreddit", url: "", frequencyHours: 6 });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/settings/sources");
      const j = await r.json();
      setSources(j.sources);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleEnabled(s: Src) {
    await fetch("/api/settings/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    });
    setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
  }

  async function changeFrequency(s: Src, hours: number) {
    await fetch("/api/settings/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, frequencyHours: hours }),
    });
    setSources((prev) => prev.map((x) => (x.id === s.id ? { ...x, frequencyHours: hours } : x)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this source?")) return;
    await fetch(`/api/settings/sources?id=${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((x) => x.id !== id));
    toast.success("Source removed");
  }

  async function add() {
    if (!form.name || !form.url) { toast.error("Name and URL are required"); return; }
    setAdding(true);
    try {
      const r = await fetch("/api/settings/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      setSources((prev) => [...prev, j.source]);
      setForm({ name: "", type: "subreddit", url: "", frequencyHours: 6 });
      toast.success("Source added");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Add a source</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="r/SideHustle" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5">
            <label className="text-xs text-muted-foreground">URL or query</label>
            <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-muted-foreground">Hours</label>
            <Input type="number" value={form.frequencyHours} min={1} max={168} onChange={(e) => setForm((f) => ({ ...f, frequencyHours: parseInt(e.target.value || "6", 10) }))} />
          </div>
          <div className="md:col-span-1">
            <Button onClick={add} disabled={adding} className="w-full">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Monitored sources <span className="text-xs text-muted-foreground font-normal">({sources.length})</span></h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    <Badge variant="info" className="text-[10px]">{s.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{s.url}</span>
                    {s.url.startsWith("http") && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>every</span>
                  <Input
                    type="number"
                    value={s.frequencyHours}
                    onChange={(e) => changeFrequency(s, parseInt(e.target.value || "6", 10))}
                    className="w-16 h-7 text-xs"
                  />
                  <span>hr</span>
                  {s.lastRunAt && <span className="ml-2">last {timeAgo(s.lastRunAt)}</span>}
                </div>
                <ScraperTriggerButton sourceType={s.type} size="sm" label="Run" />
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
