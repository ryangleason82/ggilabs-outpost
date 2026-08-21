import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { hashPrompt, promptAccessWhere, safePromptSlug } from "@/lib/prompts";

export async function GET(req: NextRequest) {
  const clientId = await getSelectedClientId();
  const q = req.nextUrl.searchParams;
  const templates = await prisma.promptTemplate.findMany({
    where: {
      AND: [promptAccessWhere(clientId), ...(q.get("search") ? [{ OR: [{ name: { contains: q.get("search")! } }, { slug: { contains: q.get("search")! } }] }] : [])],
      ...(q.get("template_type") ? { templateType: q.get("template_type")! } : {}),
      ...(q.get("scope") ? { scope: q.get("scope")! } : {}),
      ...(q.get("status") ? { status: q.get("status")! } : {}),
      ...(q.get("industry") ? { industry: q.get("industry")! } : {}),
      ...(q.get("missing_approved") === "true" ? { currentApprovedVersionId: null } : {}),
    },
    include: { client: { select: { name: true } }, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId();
  const body = await req.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const slug = safePromptSlug(String(body.slug ?? name));
  const markdownContent = String(body.markdownContent ?? "").trim();
  const scope = String(body.scope ?? "client");
  if (!name || !slug || !markdownContent) return NextResponse.json({ error: "Name, slug, and Markdown content are required." }, { status: 422 });
  if (!["global", "workspace", "industry", "client"].includes(scope)) return NextResponse.json({ error: "Invalid prompt scope." }, { status: 422 });
  if (scope === "client" && !clientId) return NextResponse.json({ error: "Select a client for a client-scoped prompt." }, { status: 400 });
  const duplicate = await prisma.promptTemplate.findFirst({ where: { slug, scope, clientId: scope === "client" ? clientId : null } });
  if (duplicate) return NextResponse.json({ error: "A prompt with this slug already exists in the selected scope." }, { status: 409 });
  try {
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.promptTemplate.create({ data: {
        name, slug, description: String(body.description ?? ""), templateType: String(body.templateType ?? "spoke"),
        industry: String(body.industry ?? "").trim() || null, scope, clientId: scope === "client" ? clientId : null,
        status: "draft", importMetadata: body.importMetadata ? JSON.stringify(body.importMetadata) : null,
      }});
      await tx.promptVersion.create({ data: { promptTemplateId: created.id, versionNumber: 1, markdownContent, changeSummary: String(body.changeSummary ?? "Initial draft"), contentHash: hashPrompt(markdownContent) } });
      return created;
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Could not create prompt.", detail: String(error) }, { status: 409 });
  }
}
