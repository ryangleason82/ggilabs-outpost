import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params; const clientId = await getSelectedClientId();
  const body = await req.json() as { changeSummary?: string };
  const summary = String(body.changeSummary ?? "").trim();
  if (!summary) return NextResponse.json({ error: "A change summary is required for approval." }, { status: 422 });
  const version = await prisma.promptVersion.findFirst({ where: { id: versionId, promptTemplateId: id }, include: { promptTemplate: true } });
  if (!version || version.status !== "draft" || !canAccessPrompt(version.promptTemplate, clientId)) return NextResponse.json({ error: "Draft not found or unauthorized." }, { status: 404 });
  const approved = await prisma.$transaction(async (tx) => {
    await tx.promptVersion.updateMany({ where: { promptTemplateId: id, status: "approved" }, data: { status: "archived", archivedAt: new Date() } });
    const next = await tx.promptVersion.update({ where: { id: versionId }, data: { status: "approved", changeSummary: summary, approvedBy: "local-operator", approvedAt: new Date(), archivedAt: null } });
    await tx.promptTemplate.update({ where: { id }, data: { currentApprovedVersionId: versionId, status: "approved", archivedAt: null } });
    return next;
  });
  return NextResponse.json({ version: approved });
}
