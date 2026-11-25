import { NextResponse } from "next/server";
import { getSelectedClientId } from "@/lib/clients";
import { prisma } from "@/lib/prisma";
import {
  fetchPublishedResourcesFromWordPress,
  type WordPressResourceSummary,
} from "@/lib/wordpress";

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function textFromAcf(
  acf: Record<string, unknown> | undefined,
  key: string,
  fallback = "",
) {
  const value = acf?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textFromMeta(
  meta: Record<string, unknown> | undefined,
  key: string,
  fallback = "",
) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function publishedDate(post: WordPressResourceSummary) {
  const value = post.date_gmt || post.date || post.modified;
  if (!value) return new Date();
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
}

function importedArticleDefaults(
  post: WordPressResourceSummary,
  clientId: string,
) {
  const acf = post.acf;
  const meta = post.meta;
  const title = stripHtml(post.title?.rendered || post.slug || `Resource ${post.id}`);
  const primaryKeyword =
    textFromAcf(acf, "primary_keyword") ||
    textFromMeta(meta, "rank_math_focus_keyword") ||
    title;
  const metaTitle =
    textFromAcf(acf, "meta_title") ||
    textFromMeta(meta, "rank_math_title") ||
    title;
  const metaDescription =
    textFromAcf(acf, "meta_description") ||
    textFromMeta(meta, "rank_math_description") ||
    `Imported WordPress resource: ${title}`;

  return {
    clientId,
    status: "published",
    batchName: "WordPress import",
    publishedAt: publishedDate(post),
    publishedUrl: post.link ?? null,
    wpPostId: String(post.id),
    wpFeaturedMediaId: post.featured_media ? String(post.featured_media) : null,
    postTitle: title,
    postName: post.slug || `resource-${post.id}`,
    postStatus: post.status || "publish",
    postType: "resources",
    templateType: textFromAcf(acf, "template_type", "imported"),
    primaryKeyword,
    serviceName: textFromAcf(acf, "service_name") || null,
    locationName: textFromAcf(acf, "location_name") || null,
    heroEyebrow: textFromAcf(acf, "hero_eyebrow") || null,
    heroHeading: textFromAcf(acf, "hero_heading", title),
    heroSubheading: textFromAcf(acf, "hero_subheading", "Imported from WordPress."),
    introSummary: textFromAcf(acf, "intro_summary", "Imported from WordPress."),
    section1Heading: textFromAcf(acf, "section_1_heading", "Imported content"),
    section1Body: textFromAcf(
      acf,
      "section_1_body",
      "This article was imported from WordPress for tracking and reporting.",
    ),
    section2Heading: textFromAcf(acf, "section_2_heading", "WordPress source"),
    section2Body: textFromAcf(
      acf,
      "section_2_body",
      "Full article body was not imported during the light import.",
    ),
    section3Heading: textFromAcf(acf, "section_3_heading", "Search tracking"),
    section3Body: textFromAcf(
      acf,
      "section_3_body",
      "Use GSC sync to track clicks, impressions, ranking, and index status.",
    ),
    faq1Question: textFromAcf(acf, "faq_1_question", "Was this article imported?"),
    faq1Answer: textFromAcf(
      acf,
      "faq_1_answer",
      "Yes. This is a light import from WordPress.",
    ),
    faq2Question: textFromAcf(acf, "faq_2_question", "Can it sync GSC data?"),
    faq2Answer: textFromAcf(
      acf,
      "faq_2_answer",
      "Yes. Published URL tracking is available after GSC is configured.",
    ),
    faq3Question: textFromAcf(acf, "faq_3_question", "Was full content imported?"),
    faq3Answer: textFromAcf(
      acf,
      "faq_3_answer",
      "Only key tracking fields are guaranteed in the light import.",
    ),
    ctaHeading: textFromAcf(acf, "cta_heading", "Imported article"),
    ctaBody: textFromAcf(acf, "cta_body", "This article exists in WordPress."),
    ctaButtonText: textFromAcf(acf, "cta_button_text", "View Article"),
    ctaButtonUrl: textFromAcf(acf, "cta_button_url", post.link ?? "#"),
    relatedHubUrl: textFromAcf(acf, "related_hub_url", post.link ?? "#"),
    relatedHubAnchor: textFromAcf(acf, "related_hub_anchor", title),
    metaTitle,
    metaDescription,
  };
}

export async function POST() {
  const clientId = await getSelectedClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Select a client before importing WordPress resources." },
      { status: 400 },
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  try {
    const posts = await fetchPublishedResourcesFromWordPress(client);
    let created = 0;
    let updated = 0;

    for (const post of posts) {
      const defaults = importedArticleDefaults(post, clientId);
      const existing = await prisma.article.findFirst({
        where: {
          clientId,
          OR: [
            { wpPostId: String(post.id) },
            ...(post.link ? [{ publishedUrl: post.link }] : []),
          ],
        },
      });

      if (existing) {
        await prisma.article.update({
          where: { id: existing.id },
          data: {
            status: "published",
            publishedAt: defaults.publishedAt,
            publishedUrl: defaults.publishedUrl,
            wpPostId: defaults.wpPostId,
            wpFeaturedMediaId: defaults.wpFeaturedMediaId,
            postStatus: defaults.postStatus,
          },
        });
        updated += 1;
      } else {
        await prisma.article.create({ data: defaults });
        created += 1;
      }
    }

    return NextResponse.json({
      imported: posts.length,
      created,
      updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "WordPress import failed", detail: String(error) },
      { status: 500 },
    );
  }
}
