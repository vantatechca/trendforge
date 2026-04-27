import { prisma } from "./prisma";
import { CATEGORY_LABELS, MARKETPLACE_LABELS, formatScore } from "./utils";

type Intent =
  | "summarize_today"
  | "rising"
  | "declining"
  | "underserved"
  | "rules"
  | "decisions"
  | "marketplace_etsy" | "marketplace_gumroad" | "marketplace_whop"
  | "category_focus"
  | "default";

function detectIntent(message: string): { intent: Intent; category?: string; marketplace?: string } {
  const m = message.toLowerCase();

  if (/\b(rules?|golden rule|preferences?|what do you know|memory|memories)\b/.test(m)) return { intent: "rules" };
  if (/\b(decisions?|approved|declined|feedback|learn|learnings?|learned)\b/.test(m)) return { intent: "decisions" };
  if (/\b(rising|trending|hot|trend up|on the rise|growing)\b/.test(m)) return { intent: "rising" };
  if (/\b(declining|falling|saturated|cooling|trending down)\b/.test(m)) return { intent: "declining" };
  if (/\b(underserved|gap|opportunity|opportunities|thin supply|low competition)\b/.test(m)) return { intent: "underserved" };
  if (/\b(today|recent|new|discoveries|summarize|summary|whats? new|what's new)\b/.test(m)) return { intent: "summarize_today" };

  if (/\betsy\b/.test(m)) return { intent: "marketplace_etsy", marketplace: "etsy" };
  if (/\bgumroad\b/.test(m)) return { intent: "marketplace_gumroad", marketplace: "gumroad" };
  if (/\bwhop\b/.test(m)) return { intent: "marketplace_whop", marketplace: "whop" };

  // Category mentions
  for (const [cat, label] of Object.entries(CATEGORY_LABELS)) {
    if (m.includes(label.toLowerCase()) || m.includes(cat.replace("_", " "))) {
      return { intent: "category_focus", category: cat };
    }
  }

  return { intent: "default" };
}

function ideaListMd(ideas: { title: string; id: string; category: string; priorityScore: number; niches: string[]; marketplaceFit: string[]; estimatedPriceRange: string | null }[], limit = 6): string {
  if (!ideas.length) return "_No ideas matched._";
  return ideas.slice(0, limit).map((i, idx) => {
    const score = formatScore(i.priorityScore);
    const cat = CATEGORY_LABELS[i.category] ?? i.category;
    const mkts = i.marketplaceFit.slice(0, 2).map((m) => MARKETPLACE_LABELS[m] ?? m).join(", ");
    const niches = i.niches.slice(0, 3).join(", ");
    return `${idx + 1}. **[${i.title}](/ideas/${i.id})** — *${cat}* · priority **${score}** · ${i.estimatedPriceRange ?? "—"}\n   ${niches ? `Niches: ${niches}.` : ""} ${mkts ? `Best fit: ${mkts}.` : ""}`;
  }).join("\n");
}

export async function offlineBrainResponse(message: string, relatedIdeaId?: string): Promise<string> {
  const det = detectIntent(message);
  const lines: string[] = [];

  // Idea-detail context: when discussing a specific idea, lead with structured analysis
  if (relatedIdeaId) {
    const idea = await prisma.idea.findUnique({ where: { id: relatedIdeaId } });
    if (idea) {
      lines.push(`## Brain analysis (offline mode — no LLM key)`);
      lines.push(`I'm pattern-matching against your rules and pipeline data. Set \`ANTHROPIC_API_KEY\` for full reasoning.\n`);
      lines.push(`### ${idea.title}`);
      const score = formatScore(idea.priorityScore);
      lines.push(`- **Priority:** ${score} / 100  ·  **Confidence:** ${formatScore(idea.confidenceScore)}%`);
      lines.push(`- **Category:** ${CATEGORY_LABELS[idea.category] ?? idea.category}${idea.subcategory ? ` (${idea.subcategory})` : ""}`);
      lines.push(`- **Niches:** ${idea.niches.join(", ") || "—"}`);
      lines.push(`- **Effort:** ${idea.effortToBuild ?? "—"} · ${idea.timeToBuild ?? "—"}`);
      lines.push(`- **Pricing:** ${idea.estimatedPriceRange ?? "—"} → ${idea.estimatedMonthlyRev ?? "no estimate"}`);
      if (idea.marketplaceFit.length) {
        lines.push(`- **Best marketplaces:** ${idea.marketplaceFit.map((m) => MARKETPLACE_LABELS[m] ?? m).join(", ")}`);
      }
      if (idea.differentiationNotes) {
        lines.push(`\n**Differentiation:** ${idea.differentiationNotes}`);
      }
      // Surface relevant rules
      const rules = await prisma.brainMemory.findMany({
        where: { active: true, memoryType: { in: ["golden_rule", "general_rule"] } },
        orderBy: { importance: "desc" },
        take: 5,
      });
      if (rules.length) {
        lines.push(`\n### Rules to check against`);
        for (const r of rules) lines.push(`- ${r.content}`);
      }
      lines.push(`\n_Want a deeper dive? Add an Anthropic key to enable streaming reasoning._`);
      return lines.join("\n");
    }
  }

  switch (det.intent) {
    case "summarize_today": {
      const recent = await prisma.idea.findMany({
        orderBy: { discoveredAt: "desc" },
        take: 8,
      });
      const top = await prisma.idea.findMany({
        orderBy: { priorityScore: "desc" },
        take: 5,
      });
      lines.push(`## Today's discoveries (offline mode)`);
      lines.push(`I have **${await prisma.idea.count()}** total ideas tracked. Here are the most recent ${recent.length}:\n`);
      lines.push(ideaListMd(recent, 8));
      lines.push(`\n## Top by priority`);
      lines.push(ideaListMd(top, 5));
      break;
    }
    case "rising": {
      const rising = await prisma.idea.findMany({
        where: { googleTrendsDirection: "rising" },
        orderBy: { priorityScore: "desc" },
        take: 8,
      });
      lines.push(`## Rising opportunities`);
      lines.push(`These have rising Google Trends direction in the last 90 days, ranked by priority:\n`);
      lines.push(ideaListMd(rising, 8));
      break;
    }
    case "declining": {
      const declining = await prisma.idea.findMany({
        where: { googleTrendsDirection: "declining" },
        orderBy: { priorityScore: "desc" },
        take: 6,
      });
      lines.push(`## Declining / saturated`);
      lines.push(`I'd avoid leaning into these — interest is cooling off.\n`);
      lines.push(ideaListMd(declining, 6));
      break;
    }
    case "underserved": {
      const candidates = await prisma.idea.findMany({
        where: { etsyCompetitorCount: { lt: 30 }, priorityScore: { gte: 70 } },
        orderBy: { priorityScore: "desc" },
        take: 6,
      });
      lines.push(`## Underserved high-priority ideas`);
      lines.push(`High composite priority and fewer than 30 Etsy competitors:\n`);
      lines.push(ideaListMd(candidates, 6));
      break;
    }
    case "rules": {
      const golden = await prisma.brainMemory.findMany({ where: { memoryType: "golden_rule", active: true }, orderBy: { importance: "desc" } });
      const general = await prisma.brainMemory.findMany({ where: { memoryType: "general_rule", active: true }, orderBy: { importance: "desc" } });
      const prefs = await prisma.brainMemory.findMany({ where: { memoryType: "preference", active: true }, orderBy: { importance: "desc" }, take: 5 });
      lines.push(`## Golden rules (immutable filters)`);
      golden.forEach((r) => lines.push(`- ${r.content}`));
      lines.push(`\n## General rules (soft preferences)`);
      general.forEach((r) => lines.push(`- ${r.content}`));
      if (prefs.length) {
        lines.push(`\n## Operator preferences`);
        prefs.forEach((r) => lines.push(`- ${r.content}`));
      }
      break;
    }
    case "decisions": {
      const decisions = await prisma.brainMemory.findMany({
        where: { memoryType: "conversation_insight", active: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
      lines.push(`## Recent approve/decline learnings`);
      if (!decisions.length) {
        lines.push(`_None yet. Approve or decline an idea to teach me._`);
      } else {
        decisions.forEach((d) => lines.push(`- ${d.content}`));
      }
      break;
    }
    case "marketplace_etsy":
    case "marketplace_gumroad":
    case "marketplace_whop": {
      const slug = det.marketplace!;
      const top = await prisma.idea.findMany({
        where: { marketplaceFit: { has: slug } },
        orderBy: { priorityScore: "desc" },
        take: 8,
      });
      lines.push(`## ${MARKETPLACE_LABELS[slug] ?? slug} highlights`);
      lines.push(`Top tracked ideas with strong fit:\n`);
      lines.push(ideaListMd(top, 8));
      break;
    }
    case "category_focus": {
      const cat = det.category!;
      const ideas = await prisma.idea.findMany({
        where: { category: cat },
        orderBy: { priorityScore: "desc" },
        take: 8,
      });
      lines.push(`## ${CATEGORY_LABELS[cat] ?? cat}`);
      lines.push(`Top in this category:\n`);
      lines.push(ideaListMd(ideas, 8));
      break;
    }
    default: {
      const stats = {
        total: await prisma.idea.count(),
        pending: await prisma.idea.count({ where: { status: "pending" } }),
        approved: await prisma.idea.count({ where: { status: "approved" } }),
      };
      const top = await prisma.idea.findMany({ orderBy: { priorityScore: "desc" }, take: 5 });
      lines.push(`## Brain offline mode`);
      lines.push(`I'm running without an LLM key. I can still query the pipeline directly. Try asking:\n`);
      lines.push(`- "summarize today's discoveries"`);
      lines.push(`- "show me rising trends"`);
      lines.push(`- "what's underserved"`);
      lines.push(`- "list my golden rules"`);
      lines.push(`- "show recent decisions"`);
      lines.push(`- "best ideas on Etsy"`);
      lines.push(`\n## Pipeline state`);
      lines.push(`- ${stats.total} ideas tracked · ${stats.pending} pending · ${stats.approved} approved`);
      lines.push(`\n## Top by priority`);
      lines.push(ideaListMd(top, 5));
      lines.push(`\n_Set \`ANTHROPIC_API_KEY\` in \`.env\` for streaming Claude responses._`);
    }
  }

  return lines.join("\n");
}
