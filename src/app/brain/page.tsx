import Link from "next/link";
import { MessageSquarePlus, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainChat } from "@/components/brain/brain-chat";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Promise<{ c?: string }>;

export default async function BrainPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const conversationId = sp.c;

  const [conversations, currentMessages] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { _count: { select: { messages: true } } },
    }),
    conversationId
      ? prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const initialMessages = currentMessages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

  return (
    <div className="flex h-screen">
      <aside className="w-[260px] border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/brain"><MessageSquarePlus className="w-4 h-4" />New chat</Link>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/brain?c=${c.id}`}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                c.id === conversationId
                  ? "bg-primary/15 text-primary"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span className="truncate text-xs">{c.title ?? "Untitled"}</span>
              </div>
              <div className="text-[10px] opacity-60 ml-4">
                {c._count.messages} msgs · {timeAgo(c.updatedAt)}
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-lg font-semibold">Brain Chat</h1>
          <p className="text-xs text-muted-foreground">
            The brain has access to your golden rules, recent learnings, and pipeline state.
          </p>
        </div>
        <div className="flex-1 px-6 py-4 min-h-0">
          <Card className="p-4 h-full">
            <BrainChat
              conversationId={conversationId}
              initialMessages={initialMessages}
            />
          </Card>
        </div>
      </main>
    </div>
  );
}
