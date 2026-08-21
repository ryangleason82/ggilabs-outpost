import { NextRequest, NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { hashPrompt, parsePromptMarkdown, safePromptSlug } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const clientId = await getSelectedClientId(); const form = await req.formData(); const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".md") || file.size > 2_000_000) return NextResponse.json({ error: "Upload a Markdown file smaller than 2 MB." }, { status: 422 });
  const parsed = parsePromptMarkdown(await file.text());
  if (!parsed.markdown) return NextResponse.json({ error: "Markdown content is empty." }, { status: 422 });
  if (form.get("mode") === "preview") return NextResponse.json({ metadata: parsed.metadata, markdown: parsed.markdown });
  const name = String(form.get("name") || parsed.metadata.name || file.name.replace(/\.md$/i, "")).trim();
  const slug = safePromptSlug(String(form.get("slug") || parsed.metadata.slug || name));
  const scope = String(form.get("scope") || parsed.metadata.scope || "client");
  if (!["global", "workspace", "industry", "client"].includes(scope)) return NextResponse.json({ error: "Invalid prompt scope." }, { status: 422 });
  if (scope === "client" && !clientId) return NextResponse.json({ error: "Select a client first." }, { status: 400 });
  const duplicate = await prisma.promptTemplate.findFirst({ where: { slug, scope, clientId: scope === "client" ? clientId : null } });
  if (duplicate) return NextResponse.json({ error: "A prompt with this slug already exists in the selected scope." }, { status: 409 });
  try {
    const template = await prisma.$transaction(async (tx) => {
      const created = await tx.promptTemplate.create({ data: { name, slug, description: String(form.get("description") || parsed.metadata.description || ""), templateType: String(form.get("templateType") || parsed.metadata.template_type || "spoke"), industry: String(form.get("industry") || parsed.metadata.industry || "") || null, scope, clientId: scope === "client" ? clientId : null, importMetadata: JSON.stringify(parsed.metadata) } });
      await tx.promptVersion.create({ data: { promptTemplateId: created.id, versionNumber: 1, markdownContent: parsed.markdown, changeSummary: "Imported Markdown", contentHash: hashPrompt(parsed.markdown) } });
      return created;
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Import failed.", detail: String(error) }, { status: 409 }); }
}
