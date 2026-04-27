"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Memory = {
  id: string;
  memoryType: string;
  content: string;
  importance: number;
  active: boolean;
  source: string | null;
  createdAt: string;
};

const MEMORY_TYPES = ["golden_rule", "general_rule", "preference", "conversation_insight", "operator_note"];

export function RulesPanel() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ memoryType: "general_rule", content: "", importance: 70 });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/brain/memory");
      const j = await r.json();
      setMemories(j.memories);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save(updates: Partial<Memory> & { id: string }) {
    await fetch("/api/brain/memory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setMemories((prev) => prev.map((m) => (m.id === updates.id ? { ...m, ...updates } : m)));
  }

  async function remove(id: string) {
    if (!confirm("Delete this memory?")) return;
    await fetch(`/api/brain/memory?id=${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
    toast.success("Memory deleted");
  }

  async function add() {
    if (!form.content.trim()) { toast.error("Content required"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/brain/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "ui", active: true }),
      });
      const j = await r.json();
      setMemories((prev) => [...prev, j.memory]);
      setForm({ memoryType: "general_rule", content: "", importance: 70 });
      toast.success("Memory added");
    } finally { setBusy(false); }
  }

  const golden = memories.filter((m) => m.memoryType === "golden_rule");
  const general = memories.filter((m) => m.memoryType === "general_rule");
  const others = memories.filter((m) => m.memoryType !== "golden_rule" && m.memoryType !== "general_rule");

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Add a rule / memory</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={form.memoryType} onValueChange={(v) => setForm((f) => ({ ...f, memoryType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMORY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-7">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="State the rule, fact, or preference clearly." className="min-h-[60px]" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Importance: {form.importance}</label>
            <Slider value={[form.importance]} onValueChange={(v) => setForm((f) => ({ ...f, importance: v[0] }))} min={0} max={100} step={5} className="mt-2" />
          </div>
          <div className="md:col-span-1">
            <Button onClick={add} disabled={busy} className="w-full mt-5"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>

      <RuleList
        title="Golden rules"
        icon={<AlertTriangle className="w-4 h-4 text-warning" />}
        accent="border-warning/40 bg-warning/5"
        memories={golden}
        onSave={save}
        onRemove={remove}
        emptyHint="No golden rules — these are the immutable filters."
      />
      <RuleList
        title="General rules"
        icon={<ShieldCheck className="w-4 h-4 text-info" />}
        accent="border-info/40 bg-info/5"
        memories={general}
        onSave={save}
        onRemove={remove}
        emptyHint="No general rules — these are soft preferences."
      />
      <RuleList
        title="Other memories"
        icon={null}
        accent=""
        memories={others}
        onSave={save}
        onRemove={remove}
        emptyHint="No other memories yet."
      />

      {loading && <p className="text-xs text-muted-foreground text-center">Loading…</p>}
    </div>
  );
}

function RuleList({
  title, icon, accent, memories, onSave, onRemove, emptyHint,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  memories: Memory[];
  onSave: (u: Partial<Memory> & { id: string }) => void;
  onRemove: (id: string) => void;
  emptyHint: string;
}) {
  return (
    <Card className={`p-5 ${accent}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-[10px]">{memories.length}</Badge>
      </div>
      {memories.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <RuleRow key={m.id} memory={m} onSave={onSave} onRemove={onRemove} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RuleRow({
  memory, onSave, onRemove,
}: {
  memory: Memory;
  onSave: (u: Partial<Memory> & { id: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [content, setContent] = useState(memory.content);
  const [importance, setImportance] = useState(memory.importance);
  const [editing, setEditing] = useState(false);

  function save() {
    onSave({ id: memory.id, content, importance });
    setEditing(false);
    toast.success("Saved");
  }

  return (
    <div className="p-3 rounded-md border border-border bg-card">
      <div className="flex items-start gap-3">
        <Switch checked={memory.active} onCheckedChange={(v) => onSave({ id: memory.id, active: v })} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[60px] mb-2" />
          ) : (
            <p className="text-sm leading-relaxed cursor-pointer" onClick={() => setEditing(true)}>{memory.content}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 max-w-[200px] flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase">Importance</span>
              <Slider value={[importance]} onValueChange={(v) => { setImportance(v[0]); setEditing(true); }} min={0} max={100} step={5} className="flex-1" />
              <span className="text-xs font-medium w-7 text-right">{importance}</span>
            </div>
            {memory.source && <Badge variant="secondary" className="text-[9px]">{memory.source}</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {editing && <Button size="sm" onClick={save}>Save</Button>}
          <Button variant="ghost" size="icon" onClick={() => onRemove(memory.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
