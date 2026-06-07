import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "@prisma/client";

const WP_URL = process.env.WP_URL?.replace(/\/$/, "");
const WP_USERNAME = process.env.WP_USERNAME;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;
const WP_RESOURCE_REST_BASE = process.env.WP_RESOURCE_REST_BASE ?? "resources";

type WordPressType = {
  name?: string;
  slug?: string;
  rest_base?: string;
};

function requireWordPressConfig() {
  if (!WP_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
    throw new Error(
      "WordPress config is missing. Set WP_URL, WP_USERNAME, and WP_APP_PASSWORD in .env.local.",
    );
  }
}

function authHeader() {
  requireWordPressConfig();
  return `Basic ${Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64")}`;
}

function wpApiEndpoint(path: string) {
  requireWordPressConfig();
  return `${WP_URL}/wp-json/wp/v2/${path.replace(/^\//, "")}`;
}

function wpJsonEndpoint(path: string) {
  requireWordPressConfig();
  return `${WP_URL}/wp-json/${path.replace(/^\//, "")}`;
}

function resourceEndpoint(restBase: string, path = "") {
  return wpApiEndpoint(`${restBase}${path}`);
}

function normalizeTypeName(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function resolveResourceRestBase() {
  const configuredBase = WP_RESOURCE_REST_BASE.replace(/^\/|\/$/g, "");
  const res = await fetch(wpApiEndpoint("types"), {
    headers: {
      Authorization: authHeader(),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return configuredBase;
  }

  const types = JSON.parse(text) as Record<string, WordPressType>;
  const availableTypes = Object.entries(types).map(([key, type]) => ({
    key,
    slug: type.slug ?? key,
    name: type.name ?? "",
    restBase: type.rest_base ?? type.slug ?? key,
  }));

  const configuredMatch = availableTypes.find(
    (type) => type.restBase === configuredBase || type.slug === configuredBase,
  );
  if (configuredMatch) {
    return configuredMatch.restBase;
  }

  const resourceMatch = availableTypes.find((type) => {
    const candidates = [
      type.key,
      type.slug,
      type.name,
      type.restBase,
    ].map(normalizeTypeName);

    return candidates.includes("resource") || candidates.includes("resources");
  });

  if (resourceMatch) {
    return resourceMatch.restBase;
  }

  const available = availableTypes
    .map((type) => `${type.name || type.slug} (${type.restBase})`)
    .join(", ");

  throw new Error(
    `Could not find a Resources post type exposed in the WordPress REST API. Available REST types: ${available || "none"}. Make sure the Resources custom post type has show_in_rest enabled.`,
  );
}

function articleContent(article: Article) {
  const sections = [1, 2, 3]
    .map((number) => {
      const heading = article[`section${number}Heading` as keyof Article];
      const body = article[`section${number}Body` as keyof Article];
      return `<h2>${heading}</h2>\n${body}`;
    })
    .join("\n\n");

  const faqs = [1, 2, 3]
    .map((number) => {
      const question = article[`faq${number}Question` as keyof Article];
      const answer = article[`faq${number}Answer` as keyof Article];
      return `<h3>${question}</h3>\n<p>${answer}</p>`;
    })
    .join("\n\n");

  return [
    `<p>${article.introSummary}</p>`,
    sections,
    "<h2>FAQs</h2>",
    faqs,
    `<h2>${article.ctaHeading}</h2>`,
    `<p>${article.ctaBody}</p>`,
  ].join("\n\n");
}

function acfFields(article: Article) {
  return {
    template_type: article.templateType,
    primary_keyword: article.primaryKeyword,
    service_name: article.serviceName ?? "",
    location_name: article.locationName ?? "",
    hero_eyebrow: article.heroEyebrow ?? "",
    hero_heading: article.heroHeading,
    hero_subheading: article.heroSubheading,
    intro_summary: article.introSummary,
    section_1_heading: article.section1Heading,
    section_1_body: article.section1Body,
    section_2_heading: article.section2Heading,
    section_2_body: article.section2Body,
    section_3_heading: article.section3Heading,
    section_3_body: article.section3Body,
    faq_1_question: article.faq1Question,
    faq_1_answer: article.faq1Answer,
    faq_2_question: article.faq2Question,
    faq_2_answer: article.faq2Answer,
    faq_3_question: article.faq3Question,
    faq_3_answer: article.faq3Answer,
    cta_heading: article.ctaHeading,
    cta_body: article.ctaBody,
    cta_button_text: article.ctaButtonText,
    cta_button_url: article.ctaButtonUrl,
    related_hub_url: article.relatedHubUrl,
    related_hub_anchor: article.relatedHubAnchor,
    meta_title: article.metaTitle,
    meta_description: article.metaDescription,
  };
}

function rankMathMeta(article: Article) {
  return {
    rank_math_title: article.metaTitle,
    rank_math_description: article.metaDescription,
    rank_math_focus_keyword: article.primaryKeyword,
    rank_math_pillar_content: "off",
  };
}

function mimeTypeForImage(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function uploadFeaturedImage(article: Article) {
  if (!article.featuredImagePath) {
    return null;
  }

  const localPath = path.join(
    process.cwd(),
    "public",
    article.featuredImagePath.replace(/^\//, ""),
  );
  const bytes = await readFile(localPath);
  const filename =
    article.featuredImageFilename ?? path.basename(article.featuredImagePath);

  const res = await fetch(wpApiEndpoint("media"), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": mimeTypeForImage(localPath),
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
    body: bytes,
  });

  const text = await res.text();
  const media = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    throw new Error(`WordPress featured image upload failed: ${text}`);
  }

  const mediaId = Number(media.id);
  if (!Number.isFinite(mediaId)) {
    throw new Error("WordPress did not return a valid media ID.");
  }

  return mediaId;
}

async function updateRankMathMeta(postId: number, article: Article) {
  const res = await fetch(wpJsonEndpoint("rankmath/v1/updateMeta"), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      objectType: "post",
      objectID: postId,
      meta: rankMathMeta(article),
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Rank Math metadata update failed: ${text}`);
  }
}

export async function pushResourceDraftToWordPress(article: Article): Promise<{
  postId: number;
  previewUrl: string;
  publishedUrl: string | null;
  featuredMediaId: number | null;
}> {
  const resourceRestBase = await resolveResourceRestBase();
  const featuredMediaId = await uploadFeaturedImage(article);
  const res = await fetch(resourceEndpoint(resourceRestBase), {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: article.postTitle,
      slug: article.postName,
      status: "draft",
      content: articleContent(article),
      acf: acfFields(article),
      meta: rankMathMeta(article),
      ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
    }),
  });

  const text = await res.text();
  let post: Record<string, unknown> = {};
  try {
    post = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    post = {};
  }

  if (!res.ok) {
    throw new Error(
      `WordPress resource draft failed at /wp-json/wp/v2/${resourceRestBase}: ${text}`,
    );
  }

  const postId = Number(post.id);
  if (!Number.isFinite(postId)) {
    throw new Error("WordPress did not return a valid resource ID.");
  }

  await updateRankMathMeta(postId, article);

  return {
    postId,
    previewUrl: `${WP_URL}/?p=${postId}&preview=true`,
    publishedUrl: typeof post.link === "string" ? post.link : null,
    featuredMediaId,
  };
}
