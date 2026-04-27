import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const NICHE_TAGS = [
  { name: "Finance", slug: "finance", color: "#22c55e" },
  { name: "Fitness", slug: "fitness", color: "#ef4444" },
  { name: "Productivity", slug: "productivity", color: "#3b82f6" },
  { name: "AI / ChatGPT", slug: "ai", color: "#a855f7" },
  { name: "Notion", slug: "notion", color: "#e2e8f0" },
  { name: "Marketing", slug: "marketing", color: "#f97316" },
  { name: "SEO", slug: "seo", color: "#06b6d4" },
  { name: "Design", slug: "design", color: "#ec4899" },
  { name: "Photography", slug: "photography", color: "#8b5cf6" },
  { name: "Wedding & Events", slug: "wedding", color: "#f43f5e" },
  { name: "Parenting", slug: "parenting", color: "#14b8a6" },
  { name: "Teachers", slug: "teachers", color: "#eab308" },
  { name: "Etsy Sellers", slug: "etsy", color: "#fb923c" },
  { name: "Career", slug: "career", color: "#0ea5e9" },
  { name: "Crafts", slug: "crafts", color: "#d946ef" },
];

const GOLDEN_RULES = [
  { content: "Never suggest products requiring licensed medical, legal, or financial advice without an explicit educational/disclaimer framing. If the topic flirts with regulated advice, position as informational only.", importance: 100 },
  { content: "Recurring revenue and bundle plays are always preferred over one-time low-ticket sales. When evaluating an idea, surface any subscription, membership, or community angle.", importance: 100 },
  { content: "Build effort must be ≤ 2 weeks for a v1 launch. Reject or downgrade ideas that require multi-month engineering before first-dollar revenue.", importance: 100 },
  { content: "Avoid markets with > 50 direct competitors unless there is a clear, articulable differentiation angle (price, format, niche-narrowing, audience).", importance: 100 },
  { content: "Reject ideas that require permits, licenses, or regulated certifications the operator doesn't already hold.", importance: 100 },
];

const GENERAL_RULES = [
  { content: "Prefer ideas with rising Google Trends in the last 90 days. Score them higher than flat or declining trends.", importance: 80 },
  { content: "Prefer ideas where Reddit question count > 20 in the last 30 days — that's evidence of real, voiced demand, not just speculation.", importance: 80 },
  { content: "Prefer ideas with Etsy avg price ≥ $15. Lower price ceilings squeeze margins below acceptable thresholds at the operator's volume.", importance: 75 },
  { content: "Prefer AI-augmentable products where AI can produce 80% of the value. The operator has Claude/GPT-5 workflow access — leverage it.", importance: 80 },
  { content: "Heavily weight Pinterest pin counts for visual product categories (printables, planners, wedding suites, POD designs).", importance: 70 },
  { content: "Prefer multi-niche replicability — one template/system that ports to 10 niches is worth far more than a single-niche play.", importance: 80 },
  { content: "Avoid hyper-saturated ChatGPT prompt-pack plays unless the angle is genuinely novel (specific profession, specific tool integration, specific format).", importance: 70 },
];

const SOURCES = [
  { name: "r/Entrepreneur", type: "subreddit", url: "https://www.reddit.com/r/Entrepreneur", frequencyHours: 4 },
  { name: "r/SideProject", type: "subreddit", url: "https://www.reddit.com/r/SideProject", frequencyHours: 4 },
  { name: "r/EtsySellers", type: "subreddit", url: "https://www.reddit.com/r/EtsySellers", frequencyHours: 6 },
  { name: "r/Notion", type: "subreddit", url: "https://www.reddit.com/r/Notion", frequencyHours: 6 },
  { name: "r/PrintOnDemand", type: "subreddit", url: "https://www.reddit.com/r/PrintOnDemand", frequencyHours: 6 },
  { name: "r/Indiehackers", type: "subreddit", url: "https://www.reddit.com/r/Indiehackers", frequencyHours: 6 },
  { name: "r/PassiveIncome", type: "subreddit", url: "https://www.reddit.com/r/PassiveIncome", frequencyHours: 8 },
  { name: "r/ChatGPT", type: "subreddit", url: "https://www.reddit.com/r/ChatGPT", frequencyHours: 8 },
  { name: "Etsy: Notion templates", type: "etsy_search", url: "https://www.etsy.com/search?q=notion+template", frequencyHours: 12 },
  { name: "Etsy: Wedding printables", type: "etsy_search", url: "https://www.etsy.com/search?q=wedding+printable", frequencyHours: 12 },
  { name: "Etsy: ChatGPT prompts", type: "etsy_search", url: "https://www.etsy.com/search?q=chatgpt+prompts", frequencyHours: 12 },
  { name: "Gumroad: Discover", type: "gumroad_discover", url: "https://gumroad.com/discover", frequencyHours: 12 },
  { name: "Whop: Discover", type: "whop_discover", url: "https://whop.com/discover", frequencyHours: 12 },
  { name: "Hacker News: front page", type: "rss", url: "https://news.ycombinator.com/rss", frequencyHours: 4 },
  { name: "ProductHunt: today", type: "rss", url: "https://www.producthunt.com/feed", frequencyHours: 6 },
  { name: "IndieHackers: milestones", type: "rss", url: "https://www.indiehackers.com/milestones.atom", frequencyHours: 8 },
  { name: "Google Trends: digital products", type: "google_trends", url: "google_trends:digital+products,notion+template,chatgpt+prompts,meal+planner,resume+template", frequencyHours: 24 },
  { name: "Web research bank", type: "web_search", url: "queries:top+selling+notion+templates+2026,best+etsy+printables+2026,trending+chatgpt+prompt+pack,figma+template+trending,course+platforms+revenue", frequencyHours: 12 },
];

type SeedIdea = {
  title: string;
  category: string;
  subcategory?: string;
  niches: string[];
  productFormat: string;
  marketplaceFit: string[];
  summary: string;
  detailedAnalysis: string;
  competitorAnalysis: string;
  differentiationNotes: string;
  estimatedPriceRange: string;
  estimatedMonthlyRev: string;
  effortToBuild: "low" | "medium" | "high";
  timeToBuild: string;
  status?: string;
  priorityScore: number;
  confidenceScore: number;
  googleTrendsScore?: number;
  googleTrendsDirection?: "rising" | "declining" | "stable";
  redditMentionCount?: number;
  redditQuestionCount?: number;
  youtubeVideoCount?: number;
  youtubeAvgViews?: number;
  tiktokHashtagCount?: number;
  pinterestPinCount?: number;
  forumMentionCount?: number;
  searchVolumeMonthly?: number;
  etsyCompetitorCount?: number;
  etsyAvgPrice?: number;
  etsyAvgReviews?: number;
  etsyTopSellers?: { title: string; shop: string; price: number; reviews: number; url: string }[];
  gumroadCompetitorCount?: number;
  gumroadAvgPrice?: number;
  whopCompetitorCount?: number;
  creativeMarketCount?: number;
  appSumoLtdExists?: boolean;
  existingProducts?: { title: string; marketplace: string; price: number; sales_estimate?: number; reviews?: number; rating?: number; url: string }[];
  sourceLinks?: { type: string; title: string; url: string; snippet?: string }[];
  discoverySource?: string;
};

const IDEAS: SeedIdea[] = [
  {
    title: "5-Minute Daily Macro Tracker for Carnivore & Keto",
    category: "spreadsheet",
    subcategory: "calculator",
    niches: ["fitness", "nutrition", "carnivore", "keto"],
    productFormat: "google-sheets",
    marketplaceFit: ["etsy", "gumroad", "shopify"],
    summary: "Pre-built Google Sheet that auto-calculates protein-to-fat ratios, daily totals, and 30-day trends for low-carb diet adherents. Drop in foods, get adherence score.",
    detailedAnalysis: "Carnivore and keto subreddits are full of people manually building their own trackers. Existing apps (MyFitnessPal, Cronometer) are bloated for these users — they don't care about carbs at all and want a brutally simple sheet. Conditional formatting + a tiny food database makes this build trivial. Strong recurring upsell: monthly meal-plan add-ons. Multi-niche replicable: vegan version, mediterranean version, athlete version.",
    competitorAnalysis: "5-7 macro tracker spreadsheets on Etsy, mostly aimed at general keto. None target carnivore specifically. Cronometer is the dominant app player but is an app, not a sheet.",
    differentiationNotes: "Brutally simple, single-tab, designed for people who don't want app friction. Lead with carnivore (hot subreddit), expand to 6 diet variations.",
    estimatedPriceRange: "$17-29 one-time, $9/mo updates",
    estimatedMonthlyRev: "$2.4k-4.8k",
    effortToBuild: "low",
    timeToBuild: "3-5 days",
    priorityScore: 84,
    confidenceScore: 76,
    googleTrendsScore: 78,
    googleTrendsDirection: "rising",
    redditMentionCount: 142,
    redditQuestionCount: 38,
    youtubeVideoCount: 220,
    youtubeAvgViews: 18000,
    tiktokHashtagCount: 4200,
    pinterestPinCount: 8900,
    forumMentionCount: 56,
    searchVolumeMonthly: 14000,
    etsyCompetitorCount: 12,
    etsyAvgPrice: 18.5,
    etsyAvgReviews: 84,
    etsyTopSellers: [
      { title: "Keto Macro Tracker Spreadsheet", shop: "PrintableLane", price: 14.99, reviews: 412, url: "https://etsy.com/listing/1" },
      { title: "Daily Macro Calculator", shop: "FitSheets", price: 22.0, reviews: 188, url: "https://etsy.com/listing/2" },
    ],
    gumroadCompetitorCount: 6,
    gumroadAvgPrice: 24,
    discoverySource: "reddit",
    sourceLinks: [
      { type: "reddit", title: "I built my own macro tracker because every app sucks", url: "https://reddit.com/r/carnivore/comments/abc1", snippet: "Spent 2 hours on a sheet that does what apps charge $10/mo for…" },
      { type: "etsy", title: "Top selling keto macro tracker", url: "https://etsy.com/listing/1", snippet: "412 reviews, $14.99" },
    ],
  },
  {
    title: "Notion Second Brain for AI Engineers",
    category: "notion_template",
    subcategory: "knowledge-management",
    niches: ["notion", "ai", "productivity", "career"],
    productFormat: "notion-template",
    marketplaceFit: ["gumroad", "notion_marketplace", "shopify"],
    summary: "PARA-style Notion template specifically organized around AI/ML workflows: prompt library, model registry, paper queue, eval logs, deployment runbook. Built for engineers shipping LLM features.",
    detailedAnalysis: "Generic Second Brain templates flood the market. AI-engineer-specific is a clear opening. Pre-fill with 30 starter prompts, model comparison rubric, paper-reading template. Cross-sell into a Discord membership ($19/mo) for prompt-of-the-week drops.",
    competitorAnalysis: "100+ generic Second Brain templates on Gumroad. Maybe 3 with an explicit AI/ML focus, all weak (just renamed pages).",
    differentiationNotes: "Real workflows from real LLM teams (eval logs, prompt versioning, A/B test rubric). Recurring revenue layer via Discord.",
    estimatedPriceRange: "$49 + $19/mo membership",
    estimatedMonthlyRev: "$3-6k bundled",
    effortToBuild: "medium",
    timeToBuild: "1-2 weeks",
    priorityScore: 89,
    confidenceScore: 82,
    googleTrendsScore: 92,
    googleTrendsDirection: "rising",
    redditMentionCount: 88,
    redditQuestionCount: 24,
    youtubeVideoCount: 110,
    youtubeAvgViews: 32000,
    tiktokHashtagCount: 1800,
    pinterestPinCount: 1200,
    forumMentionCount: 40,
    searchVolumeMonthly: 9500,
    gumroadCompetitorCount: 14,
    gumroadAvgPrice: 39,
    discoverySource: "web_search",
  },
  {
    title: "Wedding Seating Chart Generator (Drag-Drop Web App)",
    category: "app",
    subcategory: "tool",
    niches: ["wedding", "events", "design"],
    productFormat: "web-app",
    marketplaceFit: ["shopify", "appsumo"],
    summary: "Lightweight web app: import guest CSV, drag-and-drop seating, export PDF + place cards. One-time fee per wedding ($29) or studio license ($199/yr).",
    detailedAnalysis: "Brides spend hours wrestling with PowerPoint or Etsy templates. A focused web tool wins on UX. Studio license to wedding planners gives recurring revenue. POD layer (printed place cards) is upsell.",
    competitorAnalysis: "AllSeated, WeddingWire have planning suites — overkill and pricey. Etsy templates are static. Real opportunity in the middle.",
    differentiationNotes: "Beautiful drag-drop in <60s, AI suggestion for awkward family table groupings using a Claude prompt.",
    estimatedPriceRange: "$29 one-time / $199 yr (studio)",
    estimatedMonthlyRev: "$2-5k",
    effortToBuild: "high",
    timeToBuild: "2 weeks",
    priorityScore: 71,
    confidenceScore: 65,
    googleTrendsScore: 64,
    googleTrendsDirection: "stable",
    redditMentionCount: 40,
    redditQuestionCount: 15,
    pinterestPinCount: 24000,
    etsyCompetitorCount: 230,
    etsyAvgPrice: 12,
    discoverySource: "pinterest_trends",
  },
  {
    title: "ESL Phonics Printable Pack — Levels A1-A2",
    category: "printable",
    subcategory: "education",
    niches: ["teachers", "parenting", "education"],
    productFormat: "pdf",
    marketplaceFit: ["etsy", "gumroad", "shopify"],
    summary: "120 print-ready ESL phonics worksheets aligned to Cambridge A1-A2. Sold as a single zip; teachers print classroom packs for $8-15.",
    detailedAnalysis: "ESL teacher market is enormous, underserved by quality digital resources, and willing to pay. Pinterest distribution is strong. Replicable to A2-B1, B1-B2, business English variants.",
    competitorAnalysis: "TeachersPayTeachers has thousands but quality varies wildly. Premium Etsy shops sell similar packs for $15-25.",
    differentiationNotes: "Modern visual design (most look 2005), aligned to a specific recognized framework (Cambridge), classroom-licensable.",
    estimatedPriceRange: "$22 / $39 bundle",
    estimatedMonthlyRev: "$1.5-3k",
    effortToBuild: "medium",
    timeToBuild: "1-2 weeks",
    priorityScore: 76,
    confidenceScore: 71,
    googleTrendsScore: 72,
    googleTrendsDirection: "rising",
    redditMentionCount: 22,
    redditQuestionCount: 9,
    pinterestPinCount: 41000,
    etsyCompetitorCount: 38,
    etsyAvgPrice: 16,
    etsyAvgReviews: 92,
    discoverySource: "etsy",
  },
  {
    title: "Cold Email Swipe File for Indie SaaS Founders",
    category: "swipe_file",
    subcategory: "marketing",
    niches: ["marketing", "copywriting", "career"],
    productFormat: "pdf",
    marketplaceFit: ["gumroad", "shopify"],
    summary: "60+ cold email templates harvested from public success threads on IndieHackers and Twitter, organized by funnel stage. Includes Notion swipe board.",
    detailedAnalysis: "Indie SaaS founders have $0 marketing budget but ship paid leads. Templates that demonstrably worked (with revenue receipts attached) sell at premium prices. Notion board makes it feel premium vs a PDF.",
    competitorAnalysis: "5-10 cold email packs on Gumroad. Most are generic B2B sales, not founder-specific.",
    differentiationNotes: "Each template links to the public revenue post that proved it worked. No invented copy.",
    estimatedPriceRange: "$39 one-time",
    estimatedMonthlyRev: "$1.2-2.5k",
    effortToBuild: "low",
    timeToBuild: "5-7 days",
    priorityScore: 78,
    confidenceScore: 74,
    googleTrendsScore: 68,
    googleTrendsDirection: "rising",
    redditMentionCount: 64,
    redditQuestionCount: 31,
    forumMentionCount: 78,
    gumroadCompetitorCount: 9,
    gumroadAvgPrice: 32,
    discoverySource: "indiehackers",
  },
  {
    title: "GPT Prompt Pack: Court-Ready Document Drafts (Pro Se Litigants)",
    category: "ai_product",
    subcategory: "prompt-pack",
    niches: ["legal", "ai", "career"],
    productFormat: "gpt-pack",
    marketplaceFit: ["gumroad", "gpt_store"],
    summary: "200 prompts for self-represented (pro se) litigants drafting motions, discovery, settlement letters. Educational use only.",
    detailedAnalysis: "Pro se filings are a real market — millions of small claims and family-law cases each year. Existing tools are expensive ($79+/mo). A prompt pack with templated structures is genuinely useful.",
    competitorAnalysis: "Few direct competitors in pure prompt-pack form. Risk: legal-advice gray area.",
    differentiationNotes: "Heavy disclaimer-first framing — 'Drafting Aid Templates' not 'Legal Advice'. Multi-niche ports to small claims, eviction defense, child custody.",
    estimatedPriceRange: "$49-79",
    estimatedMonthlyRev: "$2-4k",
    effortToBuild: "low",
    timeToBuild: "1 week",
    status: "pending",
    priorityScore: 62,
    confidenceScore: 55,
    googleTrendsScore: 58,
    googleTrendsDirection: "stable",
    redditMentionCount: 35,
    redditQuestionCount: 18,
    discoverySource: "reddit",
  },
  {
    title: "Etsy Top-Sellers Database (Niche-Tagged, Updated Weekly)",
    category: "dataset",
    subcategory: "directory",
    niches: ["etsy", "ecommerce", "marketing"],
    productFormat: "csv",
    marketplaceFit: ["gumroad", "shopify", "whop"],
    summary: "10,000+ top-selling Etsy listings with shop, category, price, review count, niche tags. Refreshed weekly. CSV + filterable Airtable view.",
    detailedAnalysis: "Etsy sellers desperately want to know what's working before spending design time. Weekly refresh creates recurring revenue. Layered: free 100-row sample → $49 one-time → $29/mo refreshes.",
    competitorAnalysis: "EverBee, Alura — Etsy SaaS tools at $30-90/mo. A static-ish CSV at $29/mo is a clear lower-cost play.",
    differentiationNotes: "Niche tags (printables, digital download, POD, physical) plus AI-generated 'why this is selling' notes for each top entry.",
    estimatedPriceRange: "$49 / $29mo",
    estimatedMonthlyRev: "$4-8k",
    effortToBuild: "medium",
    timeToBuild: "2 weeks",
    priorityScore: 86,
    confidenceScore: 80,
    googleTrendsScore: 81,
    googleTrendsDirection: "rising",
    redditMentionCount: 51,
    redditQuestionCount: 20,
    forumMentionCount: 33,
    discoverySource: "web_search",
  },
  {
    title: "Lightroom Mobile Presets: Coastal Cafe Aesthetic",
    category: "preset_pack",
    subcategory: "photography",
    niches: ["photography", "design"],
    productFormat: "lightroom-preset",
    marketplaceFit: ["etsy", "gumroad", "creative_market"],
    summary: "10 Lightroom Mobile presets tuned for warm coastal restaurant photography — cream walls, woven textures, ocean skies. Trending micro-aesthetic on Pinterest.",
    detailedAnalysis: "Mobile preset market has cooled overall but trending micro-aesthetics (coastal, mediterranean kitchen) sell hard for 6-12 months. Replicable formula: identify trending aesthetic on Pinterest → ship preset pack within a week.",
    competitorAnalysis: "Saturated overall. Specific aesthetic = clear lane. No 'coastal cafe' specific pack found.",
    differentiationNotes: "Pinterest-first launch with 30 sample images. Recurring 'aesthetic of the month' membership at $12/mo.",
    estimatedPriceRange: "$24 / $12mo",
    estimatedMonthlyRev: "$1.5-3k",
    effortToBuild: "low",
    timeToBuild: "3 days",
    priorityScore: 72,
    confidenceScore: 68,
    googleTrendsScore: 60,
    googleTrendsDirection: "rising",
    pinterestPinCount: 28000,
    etsyCompetitorCount: 320,
    etsyAvgPrice: 14,
    discoverySource: "pinterest_trends",
  },
  {
    title: "SEO Checklist Notion Template for Local Service Businesses",
    category: "notion_template",
    subcategory: "marketing",
    niches: ["seo", "marketing", "notion"],
    productFormat: "notion-template",
    marketplaceFit: ["gumroad", "notion_marketplace"],
    summary: "Notion template with 80-item local SEO audit + tracking dashboard, designed for plumbers, dentists, lawyers, etc.",
    detailedAnalysis: "Generic SEO checklists abound. Local-service vertical wraps the same content in an immediately-usable form.",
    competitorAnalysis: "Many SEO templates, very few local-service-specific.",
    differentiationNotes: "Niche specificity. Bundle with done-for-you GMB optimization service ($299 add-on).",
    estimatedPriceRange: "$39",
    estimatedMonthlyRev: "$1-2k",
    effortToBuild: "low",
    timeToBuild: "4-5 days",
    priorityScore: 68,
    confidenceScore: 64,
    googleTrendsDirection: "stable",
    redditMentionCount: 19,
    redditQuestionCount: 7,
    discoverySource: "reddit",
  },
  {
    title: "POD T-Shirt Bundle: Niche Hobby Quotes (Knitting)",
    category: "pod",
    subcategory: "design",
    niches: ["crafts", "design"],
    productFormat: "png-set",
    marketplaceFit: ["etsy", "shopify"],
    summary: "30 print-ready t-shirt designs targeting knitters. Sold as a license bundle for POD sellers.",
    detailedAnalysis: "Niche-hobby POD (knitters, gardeners, beekeepers) outsells generic 'funny dad' designs. Knitting subreddit + IG hashtag growth is consistent.",
    competitorAnalysis: "Tons of POD bundles, very few niche-hobby-tagged.",
    differentiationNotes: "Sold as licensed bundle to other POD sellers, not direct B2C tees.",
    estimatedPriceRange: "$59 bundle",
    estimatedMonthlyRev: "$800-1500",
    effortToBuild: "low",
    timeToBuild: "1 week",
    priorityScore: 64,
    confidenceScore: 60,
    googleTrendsDirection: "stable",
    pinterestPinCount: 6800,
    etsyCompetitorCount: 410,
    etsyAvgPrice: 19,
    discoverySource: "etsy",
  },
  {
    title: "Mortgage Refi Break-Even Calculator (Embeddable Web Tool)",
    category: "calculator",
    subcategory: "finance",
    niches: ["finance"],
    productFormat: "web-app",
    marketplaceFit: ["gumroad", "shopify"],
    summary: "Beautiful embeddable mortgage refi calculator with charts. License to mortgage brokers and finance bloggers ($79/yr) for embed on their sites.",
    detailedAnalysis: "Mortgage brokers desperately want lead-gen tools on their websites. Most current calcs are ugly 2010-era widgets. Beautiful tool = high conversion = blogger licenses.",
    competitorAnalysis: "MortgageCalculator.org dominates organic. Embeddable product is a clear B2B SaaS-lite play.",
    differentiationNotes: "Multi-niche: replicate for HELOC, ARM vs fixed, rental property analysis at $79/yr each. Hard regulated-advice line — present as informational.",
    estimatedPriceRange: "$79/yr per site",
    estimatedMonthlyRev: "$2-5k",
    effortToBuild: "medium",
    timeToBuild: "2 weeks",
    priorityScore: 73,
    confidenceScore: 67,
    googleTrendsDirection: "rising",
    discoverySource: "web_search",
  },
  {
    title: "Course: Cold Email That Got Me $50k (Real Inbox Walkthrough)",
    category: "course",
    subcategory: "marketing",
    niches: ["marketing", "copywriting", "career"],
    productFormat: "video",
    marketplaceFit: ["gumroad", "shopify", "whop"],
    summary: "5-hour video course showing real-inbox cold email tactics from a creator who hit $50k MRR. Recurring community access at $39/mo.",
    detailedAnalysis: "Course + community model is the new default for high-ticket creator monetization. Whop integration makes the membership lift easy.",
    competitorAnalysis: "Saturated cold-email-course market. Differentiation = real inbox screenshots and revenue receipts.",
    differentiationNotes: "Recorded actual screen-share with real prospects, not theory. Whop community for ongoing iteration.",
    estimatedPriceRange: "$199 + $39/mo",
    estimatedMonthlyRev: "$5-10k mature",
    effortToBuild: "high",
    timeToBuild: "2 weeks (assuming source material exists)",
    priorityScore: 70,
    confidenceScore: 60,
    googleTrendsDirection: "stable",
    discoverySource: "whop_discover",
  },
  {
    title: "Daily Reset Printable Planner (Dopamine Detox Aesthetic)",
    category: "printable",
    subcategory: "productivity",
    niches: ["productivity", "wellness"],
    productFormat: "pdf",
    marketplaceFit: ["etsy", "gumroad"],
    summary: "Minimalist single-page daily planner with brutalist 'one focus today' philosophy. Print-and-fill or fillable PDF.",
    detailedAnalysis: "Aesthetic minimalism + dopamine-detox/digital-minimalism culture is a hot Pinterest niche. Easy to ship.",
    competitorAnalysis: "Etsy has 1000+ daily planners. Differentiation = aesthetic + framing.",
    differentiationNotes: "Tied to a specific cultural movement (digital minimalism). Replicable into 30-day resets, weekly resets, monthly resets.",
    estimatedPriceRange: "$9-14",
    estimatedMonthlyRev: "$600-1200",
    effortToBuild: "low",
    timeToBuild: "2 days",
    priorityScore: 65,
    confidenceScore: 62,
    googleTrendsDirection: "rising",
    pinterestPinCount: 38000,
    etsyCompetitorCount: 1100,
    etsyAvgPrice: 11,
    discoverySource: "pinterest_trends",
  },
  {
    title: "Indie SaaS Founder Membership (Whop)",
    category: "membership",
    subcategory: "community",
    niches: ["career", "ai", "marketing"],
    productFormat: "discord-community",
    marketplaceFit: ["whop", "skool"],
    summary: "Whop community for indie SaaS founders. Monthly office hours, async deal-flow channel, vetted introductions. $49/mo.",
    detailedAnalysis: "Whop is grabbing the creator-community share from Discord+Patreon. Curated communities with weekly value drops grow steady at $49-99/mo.",
    competitorAnalysis: "Skool dominates. Whop is hungry for premium communities. Operator can negotiate placement.",
    differentiationNotes: "Vetted membership (gate at first month) vs open Skool free-for-alls. Higher LTV.",
    estimatedPriceRange: "$49/mo",
    estimatedMonthlyRev: "$5-15k mature",
    effortToBuild: "medium",
    timeToBuild: "2 weeks (community + first 3 events booked)",
    priorityScore: 79,
    confidenceScore: 70,
    googleTrendsDirection: "rising",
    whopCompetitorCount: 22,
    discoverySource: "whop_discover",
  },
  {
    title: "Figma UI Kit: AI-Native Dashboard Components",
    category: "figma_kit",
    subcategory: "design",
    niches: ["design", "ai"],
    productFormat: "figma-file",
    marketplaceFit: ["creative_market", "gumroad"],
    summary: "350+ Figma components for AI-product dashboards: streaming responses, prompt history, model picker, eval cards, citation panels.",
    detailedAnalysis: "Every AI startup needs these patterns and is building them from scratch. A polished kit saves weeks. Creative Market top sellers in this category clear $10k/mo.",
    competitorAnalysis: "Generic dashboard kits abound. AI-specific is barely served — 2 weak entries.",
    differentiationNotes: "Real AI product patterns (streaming, citations, tool calls) not just dashboard charts.",
    estimatedPriceRange: "$79-129",
    estimatedMonthlyRev: "$3-7k",
    effortToBuild: "high",
    timeToBuild: "2 weeks",
    priorityScore: 81,
    confidenceScore: 73,
    googleTrendsDirection: "rising",
    creativeMarketCount: 15,
    discoverySource: "creative_market",
  },
  {
    title: "Wedding Vendor Directory (Major-City Bundle, by State)",
    category: "dataset",
    subcategory: "directory",
    niches: ["wedding", "events"],
    productFormat: "airtable",
    marketplaceFit: ["gumroad", "shopify"],
    summary: "Curated, scraped, and tagged directory of 5k+ wedding vendors per state. Sold by state ($79) or full US ($299).",
    detailedAnalysis: "Wedding planners and brides constantly hunt for vendors. Static directory is sellable; recurring update fee creates renewal income.",
    competitorAnalysis: "WeddingWire is the giant; but a focused state-by-state Airtable view at $79 is a clear price-conscious play.",
    differentiationNotes: "Multi-niche replicable: by state, by category (florists only, photographers only), by price tier.",
    estimatedPriceRange: "$79 state / $299 US",
    estimatedMonthlyRev: "$2-4k",
    effortToBuild: "medium",
    timeToBuild: "2 weeks (scraping + cleaning)",
    priorityScore: 75,
    confidenceScore: 68,
    googleTrendsDirection: "stable",
    discoverySource: "web_search",
  },
  {
    title: "Ebook: 30 Days to Your First Etsy Digital Product Sale",
    category: "ebook",
    subcategory: "education",
    niches: ["etsy", "ecommerce"],
    productFormat: "pdf",
    marketplaceFit: ["gumroad", "shopify"],
    summary: "100-page guide for new Etsy sellers. Daily action steps, niche selection framework, mockup how-to, listing copy templates.",
    detailedAnalysis: "Evergreen demand. Pinterest distribution. Bundle with template add-ons ($19) drives upsell.",
    competitorAnalysis: "Saturated category. Differentiation = framework + bundled templates.",
    differentiationNotes: "Includes 5 starter templates the reader can immediately list (so they get a 'win' inside the book). Bundle play.",
    estimatedPriceRange: "$29 / $79 bundle",
    estimatedMonthlyRev: "$1.5-3k",
    effortToBuild: "medium",
    timeToBuild: "1-2 weeks",
    priorityScore: 67,
    confidenceScore: 62,
    googleTrendsDirection: "stable",
    discoverySource: "etsy",
  },
  {
    title: "Canva Carousel Templates: Finance Creator Edition",
    category: "canva_kit",
    subcategory: "design",
    niches: ["design", "finance", "marketing"],
    productFormat: "canva-template",
    marketplaceFit: ["etsy", "creative_market", "gumroad"],
    summary: "60 Canva swipe-friendly carousel templates designed for finance creators on IG. Pre-filled with placeholder hooks.",
    detailedAnalysis: "Finance creators on IG have explosive growth and willingness to pay for templates that 'just work'. Canva > Figma for this audience.",
    competitorAnalysis: "Hundreds of generic carousel packs. Few finance-creator-specific with built-in hooks.",
    differentiationNotes: "Pre-written hooks based on top-performing finance posts (researched from Twitter/IG analytics).",
    estimatedPriceRange: "$39",
    estimatedMonthlyRev: "$1.5-3.5k",
    effortToBuild: "low",
    timeToBuild: "5-7 days",
    priorityScore: 74,
    confidenceScore: 70,
    googleTrendsDirection: "rising",
    pinterestPinCount: 14000,
    etsyCompetitorCount: 88,
    etsyAvgPrice: 22,
    discoverySource: "etsy",
  },
  {
    title: "Make.com Automation Templates: Etsy Order to Bookkeeping",
    category: "ai_product",
    subcategory: "automation",
    niches: ["etsy", "ai", "ecommerce"],
    productFormat: "make-template",
    marketplaceFit: ["gumroad", "whop"],
    summary: "Pre-built Make.com scenarios that ingest Etsy orders, categorize for taxes, append to Google Sheet, send weekly summary.",
    detailedAnalysis: "Etsy sellers + bookkeeping pain is real. Make.com lifetime templates sell strongly. Add Zapier and n8n variants for full coverage.",
    competitorAnalysis: "Few direct competitors. Make.com template marketplace is small but growing fast.",
    differentiationNotes: "Replicable: same template adapted for Shopify, Stripe, Gumroad ingest. Bundle as 'Seller OS Automations'.",
    estimatedPriceRange: "$59 / $129 bundle",
    estimatedMonthlyRev: "$1.2-2.5k",
    effortToBuild: "medium",
    timeToBuild: "1 week",
    priorityScore: 76,
    confidenceScore: 71,
    googleTrendsDirection: "rising",
    discoverySource: "reddit",
  },
  {
    title: "Notion Content Calendar for AI YouTubers",
    category: "notion_template",
    subcategory: "content",
    niches: ["notion", "ai", "marketing"],
    productFormat: "notion-template",
    marketplaceFit: ["gumroad", "notion_marketplace"],
    summary: "Notion content planning template specifically for AI/tech YouTubers. Includes paper-tracking, model-comparison, video-pillar planner, sponsorship pipeline.",
    detailedAnalysis: "AI YouTuber is the fastest-growing creator vertical. Specific tooling for their unique workflow (papers, model launches, demos).",
    competitorAnalysis: "Generic content calendars are saturated. AI-specific is open lane.",
    differentiationNotes: "Pre-loaded with 60 AI video ideas + paper queue from arXiv top categories.",
    estimatedPriceRange: "$49",
    estimatedMonthlyRev: "$1-2k",
    effortToBuild: "low",
    timeToBuild: "1 week",
    priorityScore: 72,
    confidenceScore: 67,
    googleTrendsDirection: "rising",
    discoverySource: "youtube",
  },
  {
    title: "Resume Template for Career-Switchers into Tech",
    category: "template",
    subcategory: "career",
    niches: ["career"],
    productFormat: "docx",
    marketplaceFit: ["etsy", "gumroad"],
    summary: "Resume template + cover letter pair for non-tech professionals switching into tech. Includes 30 'transferable skill' phrasings.",
    detailedAnalysis: "Tech-hiring slowed but career-switching content is up. Career-switcher framing is a clear segment.",
    competitorAnalysis: "Saturated resume template market. Niche framing wins.",
    differentiationNotes: "Bundled phrasings + actual examples from successful career-switchers.",
    estimatedPriceRange: "$19",
    estimatedMonthlyRev: "$800-1500",
    effortToBuild: "low",
    timeToBuild: "3 days",
    priorityScore: 60,
    confidenceScore: 58,
    googleTrendsDirection: "stable",
    etsyCompetitorCount: 720,
    etsyAvgPrice: 14,
    discoverySource: "etsy",
  },
  {
    title: "Chrome Extension: Etsy Listing Quality Score",
    category: "code_product",
    subcategory: "tool",
    niches: ["etsy", "ecommerce"],
    productFormat: "chrome-extension",
    marketplaceFit: ["chrome_store", "gumroad"],
    summary: "Chrome extension that sits on Etsy listings, scores SEO/title/photos against top sellers in same category. $9/mo subscription.",
    detailedAnalysis: "Etsy sellers will pay for tools that demonstrably improve listings. Subscription model is sticky.",
    competitorAnalysis: "EverBee/Alura already in this space at higher price. Lower-cost niche is open.",
    differentiationNotes: "Per-category benchmarking (compare your listing to top 10 in your exact subcategory).",
    estimatedPriceRange: "$9/mo",
    estimatedMonthlyRev: "$3-6k mature",
    effortToBuild: "high",
    timeToBuild: "2 weeks",
    priorityScore: 77,
    confidenceScore: 68,
    googleTrendsDirection: "stable",
    discoverySource: "reddit",
  },
  {
    title: "Spiritual Journal Printable for Burnt-Out Christians",
    category: "printable",
    subcategory: "wellness",
    niches: ["wellness"],
    productFormat: "pdf",
    marketplaceFit: ["etsy", "gumroad"],
    summary: "30-day spiritual journaling printable with daily prompt + reflection space. Targeted at exhausted parents/professionals.",
    detailedAnalysis: "Faith-niche printables outperform generic on Etsy. Specific psychographic ('burnt out') tightens.",
    competitorAnalysis: "Many generic faith journals. 'Burnt out' framing differentiates.",
    differentiationNotes: "Specific situational framing. Replicable into post-divorce, post-loss, new-mom variants.",
    estimatedPriceRange: "$14",
    estimatedMonthlyRev: "$700-1300",
    effortToBuild: "low",
    timeToBuild: "3 days",
    priorityScore: 63,
    confidenceScore: 58,
    googleTrendsDirection: "stable",
    pinterestPinCount: 19000,
    etsyCompetitorCount: 240,
    etsyAvgPrice: 8,
    discoverySource: "pinterest_trends",
  },
  {
    title: "Database: 5,000 Newsletter Operators by Niche (Beehiiv + Substack)",
    category: "dataset",
    subcategory: "directory",
    niches: ["marketing", "career"],
    productFormat: "csv",
    marketplaceFit: ["gumroad"],
    summary: "Scraped/compiled list of 5k+ paid newsletter operators across niches with subscriber counts, sponsorship rates, contact links.",
    detailedAnalysis: "Brands hunting for newsletter sponsorships have nowhere to look. A clean DB at $99 sells consistently to agencies.",
    competitorAnalysis: "Beehiiv Boosts and Sparkloop have lists internally — gated. A scraped public list is a clear lane.",
    differentiationNotes: "Niche-tagged (finance / parenting / dev / fitness etc.) for filterable usage.",
    estimatedPriceRange: "$99 / $49 mo refresh",
    estimatedMonthlyRev: "$2-4k",
    effortToBuild: "medium",
    timeToBuild: "2 weeks",
    priorityScore: 80,
    confidenceScore: 72,
    googleTrendsDirection: "rising",
    discoverySource: "web_search",
  },
  {
    title: "Notion Meal Planner with Auto Grocery List",
    category: "notion_template",
    subcategory: "wellness",
    niches: ["productivity", "notion", "wellness"],
    productFormat: "notion-template",
    marketplaceFit: ["etsy", "gumroad", "notion_marketplace"],
    summary: "Notion template: pick meals → grocery list auto-generates from linked-database ingredient join. Includes 60 starter recipes.",
    detailedAnalysis: "Meal planning is universal pain. Notion-native version vs apps wins for Notion-users segment. Recurring 'recipe pack of the month' upsell.",
    competitorAnalysis: "Many generic meal plan templates. Smart-database join (auto-grocery) is technically rare.",
    differentiationNotes: "Real database join (not just lookup). Proof-of-concept in template demo. Recipe-of-the-month upsell.",
    estimatedPriceRange: "$24 + $9/mo",
    estimatedMonthlyRev: "$2-4k bundle",
    effortToBuild: "medium",
    timeToBuild: "1-2 weeks",
    priorityScore: 82,
    confidenceScore: 75,
    googleTrendsDirection: "rising",
    pinterestPinCount: 22000,
    etsyCompetitorCount: 145,
    etsyAvgPrice: 19,
    discoverySource: "reddit",
  },
  {
    title: "Course: Build Your First Custom GPT in a Weekend",
    category: "course",
    subcategory: "education",
    niches: ["ai", "career"],
    productFormat: "video",
    marketplaceFit: ["gumroad", "shopify", "whop"],
    summary: "8-hour weekend course teaching non-developers to ship a custom GPT to the GPT Store. Cohort upsell ($199) for accountability.",
    detailedAnalysis: "GPT Store is hot, education for builders is hotter. Cohort model proven by Maven/Whop.",
    competitorAnalysis: "Several courses; few cohort-based with launch accountability.",
    differentiationNotes: "Each cohort ends with all students having a live GPT. 'Launch' framing > 'Learn' framing.",
    estimatedPriceRange: "$99 / $199 cohort",
    estimatedMonthlyRev: "$4-8k cohort",
    effortToBuild: "high",
    timeToBuild: "2 weeks",
    priorityScore: 78,
    confidenceScore: 70,
    googleTrendsDirection: "rising",
    discoverySource: "web_search",
  },
  {
    title: "Spreadsheet: Freelance Rate Calculator & Negotiation Worksheet",
    category: "spreadsheet",
    subcategory: "calculator",
    niches: ["career", "finance"],
    productFormat: "google-sheets",
    marketplaceFit: ["etsy", "gumroad"],
    summary: "Google Sheet that calculates true hourly rate (after taxes, time off, overhead). Includes negotiation script library.",
    detailedAnalysis: "Freelancers undercharge — a tool that reveals true rate is shareable. Bundle with negotiation scripts.",
    competitorAnalysis: "Many basic freelance rate calcs. Few bundled with negotiation scripts and tax math.",
    differentiationNotes: "Proper tax modeling per US state. Replicable into UK/EU variants.",
    estimatedPriceRange: "$19",
    estimatedMonthlyRev: "$700-1500",
    effortToBuild: "low",
    timeToBuild: "4 days",
    priorityScore: 66,
    confidenceScore: 62,
    googleTrendsDirection: "stable",
    discoverySource: "reddit",
  },
  {
    title: "Newsletter: Daily Etsy Trend Report (Paid Tier $9/mo)",
    category: "newsletter",
    subcategory: "intelligence",
    niches: ["etsy", "ecommerce", "marketing"],
    productFormat: "newsletter",
    marketplaceFit: ["beehiiv", "substack"],
    summary: "Daily 5-minute newsletter on what's rising on Etsy: trending listings, niche shifts, top-seller new products. Free + $9/mo paid tier.",
    detailedAnalysis: "Daily intelligence newsletters with paid tier model are growing. Etsy seller niche is large enough.",
    competitorAnalysis: "EverBee blog is closest. Daily cadence + paid tier = clear lane.",
    differentiationNotes: "Paid tier gets the data file, free tier gets editorial summary. Sponsorships layer on top.",
    estimatedPriceRange: "$9/mo paid tier",
    estimatedMonthlyRev: "$1-3k month 6+",
    effortToBuild: "medium",
    timeToBuild: "2 weeks (build first 30 issues + automation)",
    priorityScore: 71,
    confidenceScore: 64,
    googleTrendsDirection: "rising",
    discoverySource: "web_search",
  },
  {
    title: "Knitting Pattern Pack: Modern Brutalist Throws",
    category: "printable",
    subcategory: "crafts",
    niches: ["crafts"],
    productFormat: "pdf",
    marketplaceFit: ["etsy", "ravelry"],
    summary: "8 knitting patterns with modern minimalist aesthetic for throws/blankets. Sized adult + baby.",
    detailedAnalysis: "Knitting/crochet pattern micro-niche performs steadily. 'Modern brutalist' aesthetic is differentiated from cottagecore-saturated market.",
    competitorAnalysis: "Massive knitting pattern marketplace. Aesthetic differentiation works.",
    differentiationNotes: "Specific aesthetic + great photography. Pinterest-led distribution.",
    estimatedPriceRange: "$24 bundle",
    estimatedMonthlyRev: "$500-1000",
    effortToBuild: "medium",
    timeToBuild: "2 weeks",
    priorityScore: 58,
    confidenceScore: 55,
    googleTrendsDirection: "stable",
    pinterestPinCount: 31000,
    etsyCompetitorCount: 480,
    etsyAvgPrice: 9,
    discoverySource: "etsy",
  },
  {
    title: "Notion CRM for Freelance Photographers",
    category: "notion_template",
    subcategory: "business",
    niches: ["photography", "career", "notion"],
    productFormat: "notion-template",
    marketplaceFit: ["gumroad", "notion_marketplace"],
    summary: "Notion CRM template purpose-built for freelance photographers — leads, shoots, contracts, invoices, gallery delivery checklist.",
    detailedAnalysis: "Freelance photographers are a high-paying buyer segment for tooling. Photography-specific CRM is underserved.",
    competitorAnalysis: "Generic Notion CRMs are everywhere. Photography-specific CRM is rare.",
    differentiationNotes: "Real photographer workflow (gallery delivery, contracts, model releases). Multi-niche replicable into videographer, designer, dev contractor variants.",
    estimatedPriceRange: "$59",
    estimatedMonthlyRev: "$1.5-3k",
    effortToBuild: "medium",
    timeToBuild: "1-2 weeks",
    priorityScore: 73,
    confidenceScore: 68,
    googleTrendsDirection: "rising",
    discoverySource: "reddit",
  },
  {
    title: "AI Workflow Bundle: 50 n8n Templates for Solopreneurs",
    category: "ai_product",
    subcategory: "automation",
    niches: ["ai", "marketing", "career"],
    productFormat: "n8n-template",
    marketplaceFit: ["gumroad", "whop"],
    summary: "50 pre-built n8n workflows for solopreneurs: lead enrichment, content repurposing, invoice automation, social cross-posting, AI customer support.",
    detailedAnalysis: "n8n is exploding as Make.com alternative. Template marketplace is wide open. Bundle with monthly drop ($19/mo) is recurring.",
    competitorAnalysis: "Almost no organized n8n template businesses. Clear blue ocean.",
    differentiationNotes: "First-mover in n8n templates. Replicable with Zapier/Make versions of same packs.",
    estimatedPriceRange: "$79 + $19/mo",
    estimatedMonthlyRev: "$2.5-5k",
    effortToBuild: "medium",
    timeToBuild: "2 weeks",
    priorityScore: 85,
    confidenceScore: 76,
    googleTrendsDirection: "rising",
    discoverySource: "indiehackers",
  },
];

async function main() {
  console.log("==> Clearing existing seed data");
  await prisma.ideaTag.deleteMany();
  await prisma.idea.deleteMany();
  await prisma.brainMemory.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.scrapeLog.deleteMany();
  await prisma.monitoredSource.deleteMany();
  await prisma.tag.deleteMany();

  console.log("==> Seeding tags");
  const tags = await Promise.all(
    NICHE_TAGS.map((t) => prisma.tag.create({ data: t })),
  );
  const tagBySlug = new Map(tags.map((t) => [t.slug, t]));

  console.log("==> Seeding monitored sources");
  await Promise.all(
    SOURCES.map((s) => prisma.monitoredSource.create({ data: s })),
  );

  console.log("==> Seeding brain memories (golden + general rules)");
  for (const r of GOLDEN_RULES) {
    await prisma.brainMemory.create({
      data: { memoryType: "golden_rule", content: r.content, importance: r.importance, source: "seed" },
    });
  }
  for (const r of GENERAL_RULES) {
    await prisma.brainMemory.create({
      data: { memoryType: "general_rule", content: r.content, importance: r.importance, source: "seed" },
    });
  }
  // a few operator preferences as additional memories
  await prisma.brainMemory.create({
    data: { memoryType: "preference", content: "Operator runs 600+ Shopify stores and is pivoting toward digital products. Treat distribution channels like Etsy, Gumroad, Whop as primary, plus Shopify funnels and creator partnerships.", importance: 70, source: "seed" },
  });
  await prisma.brainMemory.create({
    data: { memoryType: "preference", content: "Operator will not do cold outreach. Products must sell on traffic alone (SEO, Pinterest, IG, marketplace native discovery).", importance: 75, source: "seed" },
  });
  await prisma.brainMemory.create({
    data: { memoryType: "preference", content: "Operator can scrape and compile data efficiently — database/directory products are a strong fit and should be surfaced when demand signals exist.", importance: 70, source: "seed" },
  });

  console.log("==> Seeding ideas");
  let inserted = 0;
  for (const idea of IDEAS) {
    const slug = `${slugify(idea.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const created = await prisma.idea.create({
      data: {
        title: idea.title,
        slug,
        summary: idea.summary,
        detailedAnalysis: idea.detailedAnalysis,
        category: idea.category,
        subcategory: idea.subcategory,
        niches: idea.niches,
        productFormat: idea.productFormat,
        marketplaceFit: idea.marketplaceFit,
        status: idea.status ?? "pending",
        priorityScore: idea.priorityScore,
        confidenceScore: idea.confidenceScore,
        googleTrendsScore: idea.googleTrendsScore ?? null,
        googleTrendsDirection: idea.googleTrendsDirection ?? null,
        redditMentionCount: idea.redditMentionCount ?? 0,
        redditQuestionCount: idea.redditQuestionCount ?? 0,
        youtubeVideoCount: idea.youtubeVideoCount ?? 0,
        youtubeAvgViews: idea.youtubeAvgViews ?? 0,
        tiktokHashtagCount: idea.tiktokHashtagCount ?? 0,
        pinterestPinCount: idea.pinterestPinCount ?? 0,
        forumMentionCount: idea.forumMentionCount ?? 0,
        searchVolumeMonthly: idea.searchVolumeMonthly ?? null,
        etsyCompetitorCount: idea.etsyCompetitorCount ?? 0,
        etsyAvgPrice: idea.etsyAvgPrice ?? null,
        etsyAvgReviews: idea.etsyAvgReviews ?? null,
        etsyTopSellers: idea.etsyTopSellers ?? undefined,
        gumroadCompetitorCount: idea.gumroadCompetitorCount ?? 0,
        gumroadAvgPrice: idea.gumroadAvgPrice ?? null,
        whopCompetitorCount: idea.whopCompetitorCount ?? 0,
        creativeMarketCount: idea.creativeMarketCount ?? 0,
        appSumoLtdExists: idea.appSumoLtdExists ?? false,
        existingProducts: (idea.existingProducts ?? []) as object,
        competitorAnalysis: idea.competitorAnalysis,
        differentiationNotes: idea.differentiationNotes,
        estimatedPriceRange: idea.estimatedPriceRange,
        estimatedMonthlyRev: idea.estimatedMonthlyRev,
        effortToBuild: idea.effortToBuild,
        timeToBuild: idea.timeToBuild,
        sourceLinks: (idea.sourceLinks ?? []) as object,
        discoverySource: idea.discoverySource,
        operatorNotes: [],
        lastDataRefresh: new Date(),
      },
    });

    // attach tags
    for (const niche of idea.niches) {
      const t = tagBySlug.get(niche);
      if (t) {
        await prisma.ideaTag.create({ data: { ideaId: created.id, tagId: t.id } });
      }
    }
    inserted++;
  }
  console.log(`==> Seeded ${inserted} ideas`);

  // a couple of approved + in_progress + launched + declined to populate the pipeline
  console.log("==> Diversifying pipeline statuses");
  const all = await prisma.idea.findMany({ orderBy: { priorityScore: "desc" } });
  if (all.length >= 8) {
    await prisma.idea.update({ where: { id: all[0].id }, data: { status: "approved", approvalNotes: "Approved during seed.", statusChangedAt: new Date() } });
    await prisma.idea.update({ where: { id: all[1].id }, data: { status: "approved", approvalNotes: "Approved during seed.", statusChangedAt: new Date() } });
    await prisma.idea.update({ where: { id: all[2].id }, data: { status: "in_progress", statusChangedAt: new Date() } });
    await prisma.idea.update({ where: { id: all[3].id }, data: { status: "launched", statusChangedAt: new Date() } });
    const last = all[all.length - 1];
    await prisma.idea.update({ where: { id: last.id }, data: { status: "declined", declineReason: "Too saturated, margins too thin at $9-14 ASP.", statusChangedAt: new Date() } });
    await prisma.brainMemory.create({
      data: {
        memoryType: "conversation_insight",
        content: `Operator declined "${last.title}" — Too saturated, margins too thin at $9-14 ASP. Down-weight similar single-niche printable plays in saturated categories with low ASP.`,
        importance: 90,
        source: "learned_from_decline",
        relatedIdeaId: last.id,
      },
    });
  }

  // Sample scrape logs
  console.log("==> Seeding sample scrape logs");
  const sources = ["reddit_scraper", "etsy_scraper", "web_researcher", "rss_aggregator", "google_trends"];
  for (const s of sources) {
    for (let i = 0; i < 3; i++) {
      const startedAt = new Date(Date.now() - (i * 6 + Math.random() * 2) * 3600 * 1000);
      const finishedAt = new Date(startedAt.getTime() + (30 + Math.random() * 60) * 1000);
      await prisma.scrapeLog.create({
        data: {
          source: s,
          startedAt,
          finishedAt,
          status: "ok",
          itemsFound: Math.floor(Math.random() * 80) + 10,
          itemsKept: Math.floor(Math.random() * 12),
          itemsRejected: Math.floor(Math.random() * 50),
        },
      });
    }
  }

  console.log("==> Seed complete.");
  console.log(`   Ideas: ${await prisma.idea.count()}`);
  console.log(`   Brain memories: ${await prisma.brainMemory.count()}`);
  console.log(`   Sources: ${await prisma.monitoredSource.count()}`);
  console.log(`   Tags: ${await prisma.tag.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
