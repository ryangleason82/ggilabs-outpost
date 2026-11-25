import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt, promptLineDiff } from "@/lib/prompts";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const clientId = await getSelectedClientId();
  const template = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!template || !canAccessPrompt(template, clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [from, to] = await Promise.all([req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to")].map((versionId) =>
    versionId ? prisma.promptVersion.findFirst({ where: { id: versionId, promptTemplateId: id } }) : null));
  if (!from || !to) return NextResponse.json({ error: "Select two valid versions." }, { status: 422 });
  return NextResponse.json({ from, to, lines: promptLineDiff(from.markdownContent, to.markdownContent) });
}
