import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt, hashPrompt, renderPromptMarkdown } from "@/lib/prompts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params; const clientId = await getSelectedClientId();
  const version = await prisma.promptVersion.findFirst({ where: { id: versionId, promptTemplateId: id }, include: { promptTemplate: true } });
  if (!version || !canAccessPrompt(version.promptTemplate, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ version, previewHtml: renderPromptMarkdown(version.markdownContent) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params; const clientId = await getSelectedClientId();
  const version = await prisma.promptVersion.findFirst({ where: { id: versionId, promptTemplateId: id }, include: { promptTemplate: true } });
  if (!version || version.status !== "draft" || !canAccessPrompt(version.promptTemplate, clientId)) return NextResponse.json({ error: "Approved or archived versions are immutable." }, { status: 409 });
  const body = await req.json() as { markdownContent?: string; changeSummary?: string };
  const markdown = String(body.markdownContent ?? "").trim();
  if (!markdown) return NextResponse.json({ error: "Markdown content is required." }, { status: 422 });
  const updated = await prisma.promptVersion.update({ where: { id: versionId }, data: { markdownContent: markdown, changeSummary: String(body.changeSummary ?? ""), contentHash: hashPrompt(markdown) } });
  return NextResponse.json({ version: updated });
}
