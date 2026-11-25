import { NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { servicePageForClient } from "@/lib/service-page-data";
import { contentHash, parseJson, validateServicePage, type ServicePageSeo } from "@/lib/service-pages";
import { getWordPressPage, pushServicePageToWordPress } from "@/lib/wordpress";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const page = await servicePageForClient(id, await getSelectedClientId());
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const revision = page.revisions.find((item) => item.id === page.currentRevisionId) ?? page.revisions[0];
  if (!revision) return NextResponse.json({ error: "No revision to publish" }, { status: 400 });
  const seo = parseJson<ServicePageSeo>(revision.seoJson, {} as ServicePageSeo); const validation = validateServicePage(revision.html, seo);
  if (validation.status === "fail") return NextResponse.json({ error: "Fix validation failures before publishing.", validation }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { force?: boolean; status?: "draft" | "publish" };
  const profile = await prisma.siteProfile.findUnique({ where: { clientId: page.clientId } }); const restBase = profile?.wordpressRestBase || "pages";
  if (page.wordpressPostId && !body.force) {
    const remote = await getWordPressPage(page.client, Number(page.wordpressPostId), restBase); const remoteHash = contentHash(remote.content?.raw ?? remote.content?.rendered ?? "");
    if ((page.lastWordpressModified && remote.modified_gmt && page.lastWordpressModified !== remote.modified_gmt) || (page.lastPublishedHash && remoteHash !== page.lastPublishedHash)) return NextResponse.json({ error: "This page has been modified in WordPress since Outpost last published it.", code: "WORDPRESS_CHANGED", remote: { modifiedGmt: remote.modified_gmt, url: remote.link } }, { status: 409 });
  }
  try {
    const result = await pushServicePageToWordPress({ title: page.title, slug: seo.slug, html: revision.html, status: body.status ?? seo.wordpressStatus ?? "draft", parentPageId: seo.parentPageId, parentSlug: seo.parentSlug, featuredImageUrl: seo.featuredImage, featuredImageAlt: seo.featuredImageAlt, seoTitle: seo.title, metaDescription: seo.metaDescription, primaryKeyword: seo.primaryKeyword, restBase }, page.client, page.wordpressPostId ? Number(page.wordpressPostId) : undefined);
    await prisma.servicePage.update({ where: { id }, data: { wordpressPostId: String(result.postId), wordpressUrl: result.url, wordpressStatus: result.status, lastWordpressModified: result.modifiedGmt, lastPublishedHash: contentHash(revision.html), lastPublishedAt: new Date(), status: result.status === "publish" ? "published" : "wordpress_draft" } });
    return NextResponse.json({ ...result, action: page.wordpressPostId ? "updated" : "created" });
  } catch (error) { return NextResponse.json({ error: "WordPress publish failed", detail: String(error) }, { status: 500 }); }
}
