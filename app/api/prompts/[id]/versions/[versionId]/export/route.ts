import { NextRequest } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt, exportPromptMarkdown } from "@/lib/prompts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params; const clientId = await getSelectedClientId();
  const version = await prisma.promptVersion.findFirst({ where: { id: versionId, promptTemplateId: id }, include: { promptTemplate: { include: { client: { select: { name: true } } } } } });
  if (!version || !canAccessPrompt(version.promptTemplate, clientId)) return new Response("Not found", { status: 404 });
  const filename = `${version.promptTemplate.slug}-v${version.versionNumber}.md`;
  return new Response(exportPromptMarkdown(version.promptTemplate, version, version.promptTemplate.client?.name ?? ""), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
}
