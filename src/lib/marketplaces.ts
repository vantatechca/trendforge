export type MarketplaceMeta = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  url: string;
  scraperKey?: string;
  tier: 1 | 2 | 3;
  primaryCategories: string[];
};

export const MARKETPLACES: MarketplaceMeta[] = [
  {
    slug: "etsy",
    name: "Etsy",
    tagline: "Where most digital-product top sellers live",
    description: "Best-sellers ribbon and review counts make Etsy the gold standard for validating digital product demand. We scrape category search pages and best-seller listings.",
    icon: "🛒",
    url: "https://etsy.com",
    scraperKey: "etsy_scraper",
    tier: 1,
    primaryCategories: ["printable", "notion_template", "canva_kit", "preset_pack", "spreadsheet", "ebook"],
  },
  {
    slug: "gumroad",
    name: "Gumroad",
    tagline: "Creator-economy direct sales",
    description: "Gumroad Discover surfaces what indie creators are actually selling. Strong signal for AI products, courses, and Notion templates.",
    icon: "🟢",
    url: "https://gumroad.com/discover",
    scraperKey: "gumroad_scraper",
    tier: 1,
    primaryCategories: ["course", "notion_template", "ai_product", "ebook", "swipe_file", "dataset"],
  },
  {
    slug: "whop",
    name: "Whop",
    tagline: "Communities, memberships, recurring revenue",
    description: "Whop Discover is the canonical view of what's working in paid community + digital bundles.",
    icon: "💎",
    url: "https://whop.com/discover",
    scraperKey: "whop_scraper",
    tier: 1,
    primaryCategories: ["membership", "course", "ai_product", "newsletter"],
  },
  {
    slug: "creative_market",
    name: "Creative Market",
    tagline: "Premium templates, fonts, graphics",
    description: "Top-sellers sections reveal what designers are paying for. Strong signal for Figma kits and graphic packs.",
    icon: "🎨",
    url: "https://creativemarket.com",
    scraperKey: "creative_market_scraper",
    tier: 1,
    primaryCategories: ["figma_kit", "canva_kit", "preset_pack", "stock_assets"],
  },
  {
    slug: "envato",
    name: "Envato",
    tagline: "ThemeForest, CodeCanyon, GraphicRiver",
    description: "Top-rated and weekly bestsellers across the Envato family.",
    icon: "🌿",
    url: "https://envato.com",
    scraperKey: "envato_scraper",
    tier: 1,
    primaryCategories: ["code_product", "figma_kit", "stock_assets"],
  },
  {
    slug: "appsumo",
    name: "AppSumo",
    tagline: "Lifetime deals & social proof",
    description: "What's trending in lifetime deals tells you what audiences are paying for and what's getting featured.",
    icon: "🍋",
    url: "https://appsumo.com",
    scraperKey: "appsumo_scraper",
    tier: 1,
    primaryCategories: ["app", "code_product", "ai_product"],
  },
  {
    slug: "product_hunt",
    name: "Product Hunt",
    tagline: "Daily digital launches",
    description: "Daily and weekly leaders, especially in digital products and AI tools.",
    icon: "🐱",
    url: "https://producthunt.com",
    scraperKey: "producthunt_scraper",
    tier: 1,
    primaryCategories: ["app", "ai_product", "code_product"],
  },
  {
    slug: "notion_marketplace",
    name: "Notion Marketplace",
    tagline: "Featured + paid template trends",
    description: "Official Notion template marketplace shows what Notion users are actively paying for.",
    icon: "🟣",
    url: "https://notion.so/templates",
    scraperKey: "notion_marketplace_scraper",
    tier: 1,
    primaryCategories: ["notion_template"],
  },
  {
    slug: "skool",
    name: "Skool",
    tagline: "Top communities by member count",
    description: "Most-popular Skool communities with paid tiers — strong signal for community + course models.",
    icon: "🎓",
    url: "https://skool.com",
    scraperKey: "skool_scraper",
    tier: 2,
    primaryCategories: ["membership", "course"],
  },
  {
    slug: "gpt_store",
    name: "GPT Store",
    tagline: "Top GPTs by category",
    description: "OpenAI GPT Store — what AI products are getting traction and which use cases users actually return to.",
    icon: "🤖",
    url: "https://chat.openai.com/gpts",
    scraperKey: "gpt_store_scraper",
    tier: 2,
    primaryCategories: ["ai_product"],
  },
];

export function getMarketplace(slug: string) {
  return MARKETPLACES.find((m) => m.slug === slug);
}
