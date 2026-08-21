import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { assemblePromptVersions, canAccessPrompt } from "@/lib/prompts";

export async function GET() {
  const clientId = await getSelectedClientId();
  return NextResponse.json({ compositions: await prisma.promptComposition.findMany({ where: { OR: [{ clientId }, { clientId: null }] }, include: { items: { orderBy: { position: "asc" }, include: { promptTemplate: true, promptVersion: true } } }, orderBy: { updatedAt: "desc" } }) });
}

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId(); const body = await req.json() as { name?: string; templateType?: string; versionIds?: string[]; roles?: string[] };
  const versionIds = body.versionIds ?? [];
  try {
    await assemblePromptVersions(versionIds, clientId);
    const versions = await prisma.promptVersion.findMany({ where: { id: { in: versionIds } }, include: { promptTemplate: true } });
    if (versions.some((version) => !canAccessPrompt(version.promptTemplate, clientId))) throw new Error("Unauthorized component.");
    const composition = await prisma.promptComposition.create({ data: { name: String(body.name ?? "Prompt composition"), templateType: String(body.templateType ?? "spoke"), clientId, status: "approved", items: { create: versionIds.map((versionId, position) => { const version = versions.find((item) => item.id === versionId)!; return { promptTemplateId: version.promptTemplateId, promptVersionId: versionId, position, role: body.roles?.[position] ?? "custom", isRequired: true }; }) } }, include: { items: true } });
    return NextResponse.json({ composition }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 422 }); }
}
