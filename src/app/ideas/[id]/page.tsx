import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { IdeaDetail } from "@/components/ideas/idea-detail";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) notFound();
  return <IdeaDetail idea={idea} />;
}
