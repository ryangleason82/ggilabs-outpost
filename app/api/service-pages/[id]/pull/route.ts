import { NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { servicePageForClient, serializeServicePage } from "@/lib/service-page-data";
import { getWordPressPage } from "@/lib/wordpress";
import { parseJson, validateServicePage, type ServicePageSeo } from "@/lib/service-pages";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const page = await servicePageForClient(id, await getSelectedClientId());
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!page.wordpressPostId) return NextResponse.json({ error: "This page is not associated with WordPress." }, { status: 400 });
  const current = page.revisions.find((revision) => revision.id === page.currentRevisionId) ?? page.revisions[0];
  const profile = await prisma.siteProfile.findUnique({ where: { clientId: page.clientId } });
  const remote = await getWordPressPage(page.client, Number(page.wordpressPostId), profile?.wordpressRestBase || "pages");
  const html = remote.content?.raw ?? remote.content?.rendered ?? ""; const seo = parseJson<ServicePageSeo>(current.seoJson, {} as ServicePageSeo); const validation = validateServicePage(html, seo);
  const revision = await prisma.servicePageRevision.create({ data: { servicePageId: id, revisionNumber: page.revisions[0].revisionNumber + 1, inputsJson: current.inputsJson, html, seoJson: current.seoJson, validationJson: JSON.stringify(validation), sectionsJson: current.sectionsJson, source: "wordpress_pull" } });
  const updated = await prisma.servicePage.update({ where: { id }, data: { currentRevisionId: revision.id, lastWordpressModified: remote.modified_gmt ?? null, lastPublishedHash: null, status: validation.status === "fail" ? "validation_failed" : validation.status === "warning" ? "validation_warning" : "ready_for_review" }, include: { revisions: { orderBy: { revisionNumber: "desc" } }, client: true } });
  return NextResponse.json({ page: serializeServicePage(updated) });
}
