"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, MARKETPLACE_LABELS } from "@/lib/utils";

const CATEGORY_OPTIONS = ["all", ...Object.keys(CATEGORY_LABELS)];
const MARKETPLACE_OPTIONS = ["all", ...Object.keys(MARKETPLACE_LABELS)];
const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "date", label: "Date discovered" },
  { value: "reddit", label: "Reddit mentions" },
  { value: "etsy_count", label: "Etsy competitors (asc)" },
  { value: "price", label: "Etsy price (desc)" },
];

export function IdeasFilters({ niches }: { niches: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [searchValue, setSearchValue] = useState(sp.get("search") ?? "");

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.push(qs ? `/ideas?${qs}` : "/ideas");
    },
    [sp, router],
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchValue !== (sp.get("search") ?? "")) updateParam("search", searchValue);
    }, 350);
    return () => clearTimeout(t);
  }, [searchValue, sp, updateParam]);

  const activeNiche = sp.get("niche") ?? "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search idea titles…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select
          value={sp.get("category") ?? "all"}
          onValueChange={(v) => updateParam("category", v)}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? "All categories" : (CATEGORY_LABELS[c] ?? c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sp.get("marketplace") ?? "all"}
          onValueChange={(v) => updateParam("marketplace", v)}
        >
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marketplace fit" /></SelectTrigger>
          <SelectContent>
            {MARKETPLACE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m === "all" ? "All marketplaces" : (MARKETPLACE_LABELS[m] ?? m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sp.get("sort") ?? "priority"}
          onValueChange={(v) => updateParam("sort", v)}
        >
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={activeNiche === "" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => updateParam("niche", "")}
        >
          All niches
        </Badge>
        {niches.map((n) => (
          <Badge
            key={n}
            variant={activeNiche === n ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => updateParam("niche", n === activeNiche ? "" : n)}
          >
            {n}
          </Badge>
        ))}
      </div>
    </div>
  );
}
