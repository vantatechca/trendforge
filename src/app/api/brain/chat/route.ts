import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { buildBrainSystemPrompt } from "@/lib/brain";
import { offlineBrainResponse } from "@/lib/brain-offline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatBody = {
  message: string;
  conversationId?: string;
  relatedIdeaId?: string;
};

export async function POST(req: NextRequest) {
  const { message, conversationId, relatedIdeaId } = (await req.json()) as ChatBody;

  if (!message || !message.trim()) {
    return new Response("message required", { status: 400 });
  }

  // Resolve / create conversation
  let convoId = conversationId;
  if (!convoId) {
    const convo = await prisma.conversation.create({
      data: {
        title: message.slice(0, 60),
        relatedIdeaId: relatedIdeaId ?? null,
      },
    });
    convoId = convo.id;
  }

  // Save user message FIRST so it persists even if Claude errors
  await prisma.message.create({
    data: { conversationId: convoId, role: "user", content: message },
  });

  // Pull last 10 messages for context, reverse exactly once
  const recent = await prisma.message.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const history = recent.reverse();

  const systemPrompt = await buildBrainSystemPrompt({ relatedIdeaId });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Offline mode: synthesize a useful response from DB + memory rules
    const offline = await offlineBrainResponse(message, relatedIdeaId);
    await prisma.message.create({
      data: { conversationId: convoId, role: "assistant", content: offline },
    });
    await prisma.conversation.update({
      where: { id: convoId },
      data: { updatedAt: new Date() },
    });
    // Stream offline response in chunks for the same UX as live mode
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        const chunkSize = 30;
        for (let i = 0; i < offline.length; i += chunkSize) {
          send({ type: "delta", text: offline.slice(i, i + chunkSize) });
          await new Promise((r) => setTimeout(r, 8));
        }
        send({ type: "done", conversationId: convoId });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const messages = history.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantBuffer = "";

      function send(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        const claudeStream = await client.messages.stream({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        });

        try {
          for await (const event of claudeStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              assistantBuffer += text;
              send({ type: "delta", text });
            }
          }
        } catch (innerErr) {
          send({ type: "error", error: String(innerErr) });
        } finally {
          // ALWAYS persist what we got
          if (assistantBuffer.trim()) {
            await prisma.message
              .create({
                data: {
                  conversationId: convoId!,
                  role: "assistant",
                  content: assistantBuffer,
                },
              })
              .catch(() => {});
          }
          await prisma.conversation
            .update({
              where: { id: convoId! },
              data: { updatedAt: new Date() },
            })
            .catch(() => {});
          send({ type: "done", conversationId: convoId });
          controller.close();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: "error", error: msg });
        send({ type: "done", conversationId: convoId });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
