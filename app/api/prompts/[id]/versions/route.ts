import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt, hashPrompt } from "@/lib/prompts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const template = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!template || !canAccessPrompt(template, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ versions: await prisma.promptVersion.findMany({ where: { promptTemplateId: id }, orderBy: { versionNumber: "desc" } }) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const template = await prisma.promptTemplate.findUnique({ where: { id }, include: { versions: { orderBy: { versionNumber: "desc" } } } });
  if (!template || !canAccessPrompt(template, clientId) || template.status === "archived") return NextResponse.json({ error: "Not found or archived" }, { status: 404 });
  const body = await req.json() as { markdownContent?: string; changeSummary?: string };
  const markdown = String(body.markdownContent ?? "").trim();
  if (!markdown) return NextResponse.json({ error: "Markdown content is required." }, { status: 422 });
  const latest = template.versions[0];
  const version = latest?.status === "draft"
    ? await prisma.promptVersion.update({ where: { id: latest.id }, data: { markdownContent: markdown, changeSummary: String(body.changeSummary ?? ""), contentHash: hashPrompt(markdown) } })
    : await prisma.promptVersion.create({ data: { promptTemplateId: id, versionNumber: (latest?.versionNumber ?? 0) + 1, markdownContent: markdown, changeSummary: String(body.changeSummary ?? ""), contentHash: hashPrompt(markdown) } });
  return NextResponse.json({ version });
}
