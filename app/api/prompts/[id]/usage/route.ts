import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt } from "@/lib/prompts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId(); const template = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!template || !canAccessPrompt(template, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ usage: await prisma.article.findMany({ where: { clientId: clientId ?? undefined, promptTemplateId: id }, select: { id: true, postTitle: true, templateType: true, generationTimestamp: true, generationProvider: true, generationModel: true }, orderBy: { generationTimestamp: "desc" } }) });
}
