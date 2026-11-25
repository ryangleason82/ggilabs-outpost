import { NextRequest, NextResponse } from "next/server";
import { selectedClientWhere } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import { pushResourceDraftToWordPress } from "@/lib/wordpress";
import { serviceDetailFromArticle } from "@/lib/content";
import { renderServiceDetail, serviceDetailConfigFromProfile } from "@/lib/service-detail-render";
import { validateServiceDetailForPublish } from "@/lib/service-detail-technical-seo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientWhere = await selectedClientWhere();
  const article = await prisma.article.findFirst({
    where: { id, ...clientWhere },
    include: { client: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!article.client) {
    return NextResponse.json(
      { error: "Article is not assigned to a client." },
      { status: 400 },
    );
  }

  if (!["approved", "wordpress_draft", "scheduled"].includes(article.status)) {
    return NextResponse.json(
      { error: "Article must be approved before publishing to WordPress." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({})) as { action?: string; scheduledAt?: string };
  const publishAction = body.action === "publish" || body.action === "schedule" ? body.action : "draft";
  const scheduledAt = publishAction === "schedule" ? new Date(String(body.scheduledAt ?? "")) : null;
  if (publishAction === "schedule" && (!scheduledAt || !Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now() + 60_000)) {
    return NextResponse.json({ error: "Choose a valid scheduled time at least one minute in the future." }, { status: 422 });
  }
  const requestedWordPressStatus = publishAction === "publish" ? "publish" : publishAction === "schedule" ? "future" : "draft";

  try {
    const profile = await prisma.siteProfile.findUnique({ where: { clientId: article.client.id } });
    const serviceConfig = serviceDetailConfigFromProfile(profile);
    let technicalSeo;
    if (article.templateType === "service_detail") {
      const record = serviceDetailFromArticle(article);
      if (record.content_format === "html") {
        technicalSeo = validateServiceDetailForPublish(record, renderServiceDetail(record, serviceConfig), serviceConfig);
        if (technicalSeo.errors.length) return NextResponse.json({ error: "Technical SEO validation failed", technicalSeo }, { status: 422 });
      }
    }
    const { postId, previewUrl, publishedUrl, featuredMediaId, wordpressPostType, wordpressRestBase, wordpressStatus, action, heroMedia, supportingMedia } =
      await pushResourceDraftToWordPress(article, article.client, serviceConfig, { status: requestedWordPressStatus, scheduledAt: scheduledAt ?? undefined });

    const localStatus = wordpressStatus === "future" ? "scheduled" : wordpressStatus === "publish" ? "published" : "wordpress_draft";

    const updated = await prisma.article.update({
      where: { id },
      data: {
        status: localStatus,
        wpPostId: String(postId),
        wpPostType: wordpressPostType,
        wpRestBase: wordpressRestBase,
        postStatus: wordpressStatus,
        wpFeaturedMediaId: featuredMediaId ? String(featuredMediaId) : null,
        wpHeroMediaId: heroMedia?.attachmentId ? String(heroMedia.attachmentId) : article.wpHeroMediaId,
        wpHeroMediaUrl: heroMedia?.url ?? article.wpHeroMediaUrl,
        wpHeroSourceUrl: heroMedia ? serviceDetailFromArticle(article).hero_image_url : article.wpHeroSourceUrl,
        wpSupportingMediaId: supportingMedia?.attachmentId ? String(supportingMedia.attachmentId) : article.wpSupportingMediaId,
        wpSupportingMediaUrl: supportingMedia?.url ?? article.wpSupportingMediaUrl,
        wpSupportingSourceUrl: supportingMedia ? serviceDetailFromArticle(article).supporting_image_url : article.wpSupportingSourceUrl,
        publishedUrl: publishedUrl ?? previewUrl,
        publishedAt: wordpressStatus === "publish" ? new Date() : article.publishedAt,
        scheduledAt: wordpressStatus === "future" ? scheduledAt : null,
        reviewNotes: `WordPress ${wordpressPostType} ${action} (${wordpressStatus}): ${previewUrl}`,
      },
    });

    if (article.templateType === "service_detail" && publishedUrl && profile && wordpressStatus === "publish") {
      let inventory: Array<Record<string, unknown>> = [];
      try { const parsed = JSON.parse(profile.internalLinksJson); if (Array.isArray(parsed)) inventory = parsed; } catch {}
      const record = serviceDetailFromArticle(article);
      const entry = { title: article.postTitle, anchor: article.postTitle, url: publishedUrl, content_type: "service_detail", service_hub: record.service_hub, targetPageId: postId };
      const withoutCurrent = inventory.filter((item) => Number(item.targetPageId) !== postId && item.url !== publishedUrl);
      await prisma.siteProfile.update({ where: { id: profile.id }, data: { internalLinksJson: JSON.stringify([...withoutCurrent, entry]) } });
    }

    return NextResponse.json({ article: updated, postId, previewUrl, publishedUrl, wordpressPostType, wordpressRestBase, wordpressStatus, action, publishAction, scheduledAt, technicalSeo });
  } catch (error) {
    await prisma.article.update({
      where: { id },
      data: { reviewNotes: `WordPress publish failed: ${String(error)}` },
    });

    return NextResponse.json(
      { error: "WordPress publish failed", detail: String(error) },
      { status: 500 },
    );
  }
}
