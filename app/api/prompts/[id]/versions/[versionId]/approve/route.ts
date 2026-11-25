import { database } from "@/lib/atomic";
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
  const db=database(), now=Date.now();
  await db.batch([
    db.prepare('UPDATE "PromptVersion" SET status=?, "archivedAt"=? WHERE "promptTemplateId"=? AND status=?').bind('archived',now,id,'approved'),
    db.prepare('UPDATE "PromptVersion" SET status=?, "changeSummary"=?, "approvedBy"=?, "approvedAt"=?, "archivedAt"=NULL WHERE id=?').bind('approved',summary,'local-operator',now,versionId),
    db.prepare('UPDATE "PromptTemplate" SET "currentApprovedVersionId"=?, status=?, "archivedAt"=NULL,"updatedAt"=? WHERE id=?').bind(versionId,'approved',now,id)
  ]);
  const approved=await prisma.promptVersion.findUniqueOrThrow({where:{id:versionId}});
  return NextResponse.json({ version: approved });
}
