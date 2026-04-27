"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MarkdownView } from "@/lib/markdown";

type Msg = { role: "user" | "assistant"; content: string };

export function BrainChat({
  conversationId,
  relatedIdeaId,
  initialMessages = [],
  suggestions,
  className,
  placeholder,
}: {
  conversationId?: string;
  relatedIdeaId?: string;
  initialMessages?: Msg[];
  suggestions?: string[];
  className?: string;
  placeholder?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [convoId, setConvoId] = useState<string | undefined>(conversationId);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: convoId, relatedIdeaId }),
      });
      if (!res.ok || !res.body) throw new Error("brain error");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const ln of lines) {
          if (!ln.startsWith("data:")) continue;
          try {
            const obj = JSON.parse(ln.slice(5).trim());
            if (obj.type === "delta") {
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + obj.text };
                return next;
              });
            } else if (obj.type === "done") {
              if (obj.conversationId) setConvoId(obj.conversationId);
            } else if (obj.type === "error") {
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: `⚠️ ${obj.error}` };
                return next;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "assistant", content: `⚠️ Error: ${err}` };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const empty = messages.length === 0;

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
            <Sparkles className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-lg font-semibold mb-1">Ask the brain</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md">
              The brain has access to your golden rules, learnings, and pipeline state. Try one of these.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {(suggestions ?? [
                "What are the top trending Notion templates this month?",
                "Find me underserved Etsy printable niches.",
                "Which dataset products should I ship in the next 30 days?",
                "Summarize today's discoveries and rank them.",
              ]).map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void send(s)}
                  className="text-left text-sm px-3 py-2 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            {messages.map((m, i) => {
              const mine = m.role === "user";
              return (
                <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <Card className={`max-w-[88%] p-3 ${mine ? "bg-primary/15 border-primary/20" : "bg-card"}`}>
                    {!mine && !m.content ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Thinking…
                      </div>
                    ) : !mine ? (
                      <MarkdownView md={m.content} className="text-sm" />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={placeholder ?? "Ask the brain anything…"}
          className="min-h-[44px] max-h-[160px] resize-none"
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
