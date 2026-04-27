import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function formatPercent(n: number | null | undefined, fractionDigits = 0): string {
  if (n === null || n === undefined) return "—";
  // Defensive: works for both 0-1 and 0-100 stored values
  const v = n > 1 ? n : n * 100;
  return `${v.toFixed(fractionDigits)}%`;
}

export function formatScore(n: number | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function priorityBucket(score: number): {
  label: string;
  variant: "high" | "med" | "low";
} {
  const v = score > 1 ? score : score * 100;
  if (v >= 75) return { label: "High", variant: "high" };
  if (v >= 50) return { label: "Medium", variant: "med" };
  return { label: "Low", variant: "low" };
}

export const CATEGORY_LABELS: Record<string, string> = {
  ebook: "Ebook",
  course: "Course",
  notion_template: "Notion Template",
  template: "Template",
  canva_kit: "Canva Kit",
  figma_kit: "Figma Kit",
  calculator: "Calculator",
  spreadsheet: "Spreadsheet",
  printable: "Printable",
  pod: "Print on Demand",
  preset_pack: "Preset Pack",
  swipe_file: "Swipe File",
  ai_product: "AI Product",
  app: "App / SaaS",
  membership: "Membership",
  newsletter: "Newsletter",
  dataset: "Dataset / Directory",
  stock_assets: "Stock Assets",
  code_product: "Code Product",
  three_d: "3D Models",
};

export const MARKETPLACE_LABELS: Record<string, string> = {
  etsy: "Etsy",
  gumroad: "Gumroad",
  whop: "Whop",
  creative_market: "Creative Market",
  envato: "Envato",
  appsumo: "AppSumo",
  notion_marketplace: "Notion Marketplace",
  product_hunt: "Product Hunt",
  gpt_store: "GPT Store",
  skool: "Skool",
  shopify: "Shopify",
  payhip: "Payhip",
  sellfy: "Sellfy",
  lemon_squeezy: "Lemon Squeezy",
};
