import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "TrendForge — Digital Product Opportunity Engine",
  description: "Niche-agnostic AI research engine for discovering and ranking digital product opportunities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
