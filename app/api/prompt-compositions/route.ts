import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { assemblePromptVersions, canAccessPrompt } from "@/lib/prompts";
import { database, insertStatement } from "@/lib/atomic";

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
    const id=crypto.randomUUID(),now=Date.now();
    await database().batch([
      insertStatement('PromptComposition',{id,createdAt:now,updatedAt:now,createdBy:'local-operator',name:String(body.name??'Prompt composition'),templateType:String(body.templateType??'spoke'),clientId,status:'approved'}),
      ...versionIds.map((versionId,position)=>insertStatement('PromptCompositionItem',{id:crypto.randomUUID(),compositionId:id,promptTemplateId:versions.find(v=>v.id===versionId)!.promptTemplateId,promptVersionId:versionId,position,role:body.roles?.[position]??'custom',isRequired:true}))
    ]);
    const composition=await prisma.promptComposition.findUniqueOrThrow({where:{id},include:{items:true}});
    return NextResponse.json({ composition }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 422 }); }
}
