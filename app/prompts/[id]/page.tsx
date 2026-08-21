import Link from "next/link";
import { notFound } from "next/navigation";
import { PromptEditor } from "@/components/PromptEditor";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { canAccessPrompt } from "@/lib/prompts";

export default async function PromptDetailPage({params}:{params:Promise<{id:string}>}){const{id}=await params;const clientId=await getSelectedClientId();const template=await prisma.promptTemplate.findUnique({where:{id},include:{versions:{orderBy:{versionNumber:"desc"}},client:{select:{name:true}}}});if(!template||!canAccessPrompt(template,clientId))notFound();const serialized={...template,createdAt:template.createdAt.toISOString(),updatedAt:template.updatedAt.toISOString(),archivedAt:template.archivedAt?.toISOString()??null,lastUsedAt:template.lastUsedAt?.toISOString()??null,versions:template.versions.map(v=>({...v,createdAt:v.createdAt.toISOString(),approvedAt:v.approvedAt?.toISOString()??null,archivedAt:v.archivedAt?.toISOString()??null}))};return <div className="mx-auto max-w-7xl px-8 py-8"><Link href="/prompts" className="text-sm text-zinc-600 hover:underline">← Prompt Library</Link><div className="my-5 flex items-start justify-between"><div><h1 className="text-2xl font-semibold">{template.name}</h1><p className="text-sm text-zinc-600">{template.scope}{template.client?` · ${template.client.name}`:""} · {template.status} · {template.usageCount} uses</p></div></div><PromptEditor initialTemplate={serialized}/></div>}
