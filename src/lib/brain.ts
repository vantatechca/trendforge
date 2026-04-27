import { prisma } from "./prisma";

export type BrainContextOptions = {
  relatedIdeaId?: string;
  recentMessageLimit?: number;
};

export async function buildBrainSystemPrompt(opts: BrainContextOptions = {}): Promise<string> {
  const [goldenRules, generalRules, preferences, conversationInsights, idea, totalIdeas, pendingIdeas, approvedIdeas] = await Promise.all([
    prisma.brainMemory.findMany({
      where: { memoryType: "golden_rule", active: true },
      orderBy: { importance: "desc" },
    }),
    prisma.brainMemory.findMany({
      where: { memoryType: "general_rule", active: true },
      orderBy: { importance: "desc" },
    }),
    prisma.brainMemory.findMany({
      where: { memoryType: "preference", active: true },
      orderBy: { importance: "desc" },
    }),
    prisma.brainMemory.findMany({
      where: { memoryType: "conversation_insight", active: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    opts.relatedIdeaId
      ? prisma.idea.findUnique({ where: { id: opts.relatedIdeaId } })
      : Promise.resolve(null),
    prisma.idea.count(),
    prisma.idea.count({ where: { status: "pending" } }),
    prisma.idea.count({ where: { status: "approved" } }),
  ]);

  const lines: string[] = [];
  lines.push(
    `You are TrendForge, a research-and-analysis brain helping a digital-product operator find, evaluate, and rank opportunities across all niches. The operator runs 600+ Shopify stores and is pivoting toward digital products with high recurring revenue.`,
  );
  lines.push("");
  lines.push("## How you think");
  lines.push(`- Be specific. Use real numbers, real product names, real marketplaces.`);
  lines.push(`- Be honest about saturation, margin, and effort. Push back on weak ideas.`);
  lines.push(`- Surface differentiation angles — niche narrowing, format swap, price tier, audience.`);
  lines.push(`- Prefer recurring revenue (membership, subscription) over one-time low-ticket.`);
  lines.push(`- Multi-niche replicability is a strong positive signal.`);
  lines.push("");

  if (goldenRules.length) {
    lines.push("## Golden rules (immutable filters)");
    goldenRules.forEach((r, i) => lines.push(`${i + 1}. ${r.content}`));
    lines.push("");
  }
  if (generalRules.length) {
    lines.push("## General rules (soft preferences)");
    generalRules.forEach((r, i) => lines.push(`${i + 1}. ${r.content}`));
    lines.push("");
  }
  if (preferences.length) {
    lines.push("## Operator preferences");
    preferences.forEach((r) => lines.push(`- ${r.content}`));
    lines.push("");
  }
  if (conversationInsights.length) {
    lines.push("## Recent learnings (from approve/decline feedback)");
    conversationInsights.forEach((r) => lines.push(`- ${r.content}`));
    lines.push("");
  }
  lines.push(`## Pipeline state`);
  lines.push(`- Total ideas tracked: ${totalIdeas}`);
  lines.push(`- Pending review: ${pendingIdeas}`);
  lines.push(`- Approved: ${approvedIdeas}`);
  lines.push("");

  if (idea) {
    lines.push("## Idea in focus");
    lines.push(`Title: ${idea.title}`);
    lines.push(`Category: ${idea.category} (${idea.subcategory ?? "—"})`);
    lines.push(`Niches: ${idea.niches.join(", ")}`);
    lines.push(`Marketplace fit: ${idea.marketplaceFit.join(", ")}`);
    lines.push(`Status: ${idea.status}`);
    lines.push(`Priority score: ${idea.priorityScore}, confidence: ${idea.confidenceScore}`);
    lines.push(`Effort: ${idea.effortToBuild ?? "?"} (${idea.timeToBuild ?? "?"})`);
    lines.push(`Estimated price: ${idea.estimatedPriceRange ?? "?"}, monthly rev: ${idea.estimatedMonthlyRev ?? "?"}`);
    lines.push(`Summary: ${idea.summary}`);
    if (idea.detailedAnalysis) lines.push(`Analysis: ${idea.detailedAnalysis}`);
    if (idea.competitorAnalysis) lines.push(`Competitor analysis: ${idea.competitorAnalysis}`);
    if (idea.differentiationNotes) lines.push(`Differentiation: ${idea.differentiationNotes}`);
    lines.push("");
  }

  lines.push("## Output format");
  lines.push(`- Use markdown headings, lists, and bold for scanability.`);
  lines.push(`- Cite real marketplaces and creators by name when relevant.`);
  lines.push(`- When ranking ideas, give a score 0-100 and explain the trade-offs.`);
  lines.push(`- When proposing builds, include: format, price, time-to-build, distribution channel, expected month-1 revenue.`);

  return lines.join("\n");
}
