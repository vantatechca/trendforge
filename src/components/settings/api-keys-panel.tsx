"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const KEYS = [
  { key: "ANTHROPIC_API_KEY", label: "Anthropic (Claude)", required: true, hint: "Required for Brain Chat" },
  { key: "OPENROUTER_API_KEY", label: "OpenRouter", required: false, hint: "Cheap model for idea extraction" },
  { key: "EMBEDDINGS_API_KEY", label: "OpenAI (embeddings)", required: false, hint: "Semantic dedup" },
  { key: "YOUTUBE_API_KEY", label: "YouTube Data API v3", required: false, hint: "Video count signals" },
  { key: "SERPER_API_KEY", label: "Serper.dev", required: false, hint: "Web research scraper" },
  { key: "SERPAPI_API_KEY", label: "SerpAPI", required: false, hint: "Web research fallback" },
  { key: "BRAVE_SEARCH_API_KEY", label: "Brave Search API", required: false, hint: "Web research fallback" },
  { key: "ETSY_API_KEY", label: "Etsy API", required: false, hint: "Optional — scraper uses BS4 fallback" },
  { key: "REDDIT_CLIENT_ID", label: "Reddit Client ID", required: false, hint: "Optional — JSON API used by default" },
  { key: "REDDIT_CLIENT_SECRET", label: "Reddit Client Secret", required: false, hint: "" },
];

export function ApiKeysPanel({ env }: { env: Record<string, boolean> }) {
  const [shown, setShown] = useState<Record<string, boolean>>({});

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">API keys</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Edit your <code className="text-foreground">.env</code> at the project root, then restart{" "}
          <code className="text-foreground">npm run dev</code>. This panel reflects which keys are currently set.
        </p>
      </div>
      <div className="space-y-2">
        {KEYS.map((k) => {
          const set = env[k.key] ?? false;
          const isShown = shown[k.key] ?? false;
          return (
            <div key={k.key} className="flex items-center gap-3 p-3 rounded-md border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{k.label}</span>
                  {k.required && <Badge variant="warning" className="text-[9px]">required</Badge>}
                  <Badge variant={set ? "success" : "secondary"} className="text-[9px]">{set ? "set" : "unset"}</Badge>
                </div>
                <code className="text-[10px] text-muted-foreground">{k.key}</code>
                {k.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{k.hint}</p>}
              </div>
              <Input
                type={isShown ? "text" : "password"}
                value={set ? "••••••••••••••••" : "(not set)"}
                readOnly
                className="max-w-[280px] font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShown((s) => ({ ...s, [k.key]: !isShown }))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="toggle visibility"
              >
                {isShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
