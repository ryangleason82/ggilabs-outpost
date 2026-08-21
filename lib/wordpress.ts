import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Article, Client } from "@prisma/client";
import { serviceDetailFromArticle } from "@/lib/content";
import { serviceDetailWordPressPayload } from "@/lib/service-detail";
import type { RenderedImage, ServiceDetailSeoConfig } from "@/lib/service-detail-render";
import { expectedServicePath, isServiceHubSlug } from "@/lib/service-hubs";

type WordPressClientConfig = Pick<
  Client,
  "name" | "wpUrl" | "wpUsername" | "wpAppPassword" | "wpResourceRestBase" | "wpServiceDetailRestBase" | "wpServiceDetailPostType"
>;

type WordPressType = {
  name?: string;
  slug?: string;
  rest_base?: string;
};

type WordPressTaxonomy = {
  name?: string;
  slug?: string;
  types?: string[];
  rest_base?: string;
  rest_namespace?: string;
};

export type WordPressResourceSummary = {
  id: number;
  date?: string;
  date_gmt?: string;
  modified?: string;
  slug?: string;
  status?: string;
  link?: string;
  title?: { rendered?: string };
  featured_media?: number;
  meta?: Record<string, unknown>;
  acf?: Record<string, unknown>;
};

function requireWordPressConfig(client: WordPressClientConfig) {
  if (!client.wpUrl || !client.wpUsername || !client.wpAppPassword) {
    throw new Error(
      `WordPress config is missing for ${client.name}. Set its URL, username, and application password in Clients.`,
    );
  }
}

function authHeader(client: WordPressClientConfig) {
  requireWordPressConfig(client);
  return `Basic ${Buffer.from(`${client.wpUsername}:${client.wpAppPassword}`).toString("base64")}`;
}

function wpUrl(client: WordPressClientConfig) {
  return client.wpUrl.replace(/\/$/, "");
}

function wpApiEndpoint(client: WordPressClientConfig, path: string) {
  requireWordPressConfig(client);
  return `${wpUrl(client)}/wp-json/wp/v2/${path.replace(/^\//, "")}`;
}

function wpJsonEndpoint(client: WordPressClientConfig, path: string) {
  requireWordPressConfig(client);
  return `${wpUrl(client)}/wp-json/${path.replace(/^\//, "")}`;
}

function resourceEndpoint(client: WordPressClientConfig, restBase: string, path = "") {
  return wpApiEndpoint(client, `${restBase}${path}`);
}

function normalizeTypeName(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function resolveResourceRestBase(client: WordPressClientConfig) {
  const configuredBase = client.wpResourceRestBase.replace(/^\/|\/$/g, "");
  const res = await fetch(wpApiEndpoint(client, "types"), {
    headers: {
      Authorization: authHeader(client),
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

function resourceFields(article: Article) {
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

async function resolveServiceDetailTarget(client: WordPressClientConfig) {
  const configuredRestBase = client.wpServiceDetailRestBase.replace(/^\/|\/$/g, "") || "service-detail-page";
  const configuredPostType = client.wpServiceDetailPostType.trim() || "service-detail-page";
  const res = await fetch(wpApiEndpoint(client, "types"), { headers: { Authorization: authHeader(client) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Could not validate the Service Detail publishing target through /wp-json/wp/v2/types: ${text}`);
  const types = JSON.parse(text) as Record<string, WordPressType>;
  const match = Object.entries(types).find(([key, type]) => (key === configuredPostType || type.slug === configuredPostType) && (type.rest_base ?? type.slug ?? key) === configuredRestBase);
  if (!match) {
    const available = Object.entries(types).map(([key, type]) => `${type.name ?? key}: post type ${type.slug ?? key}, REST base ${type.rest_base ?? type.slug ?? key}`).join(", ");
    throw new Error(`Configured Service Detail target is not exposed through WordPress REST: post type “${configuredPostType}”, REST base “${configuredRestBase}”. Available types: ${available || "none"}.`);
  }
  return { restBase: configuredRestBase, wordpressPostType: configuredPostType };
}

async function resolveServiceHubTerm(client: WordPressClientConfig, slug: string, servicePostType: string) {
  if (!isServiceHubSlug(slug)) throw new Error(`Invalid service hub: ${slug || "missing"}.`);
  const taxonomyRes = await fetch(wpApiEndpoint(client, "taxonomies"), { headers: { Authorization: authHeader(client), "Cache-Control": "no-cache" } });
  const taxonomyText = await taxonomyRes.text();
  if (!taxonomyRes.ok) throw new Error(`Could not discover WordPress taxonomies through /wp-json/wp/v2/taxonomies: ${taxonomyText}`);
  const taxonomies = JSON.parse(taxonomyText) as Record<string, WordPressTaxonomy>;
  const normalized = (value = "") => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const taxonomy = Object.entries(taxonomies).find(([key, value]) => {
    const names = [key, value.slug, value.name, value.rest_base].map(normalized);
    return names.includes("servicehub") && (!value.types?.length || value.types.includes(servicePostType));
  });
  if (!taxonomy) throw new Error(`WordPress does not expose a Service Hubs taxonomy attached to ${servicePostType}. In ACF, enable Show in REST API and attach Service Hubs to the Service Detail post type.`);
  const [taxonomyKey, taxonomyConfig] = taxonomy;
  const restBase = taxonomyConfig.rest_base || taxonomyConfig.slug || taxonomyKey;
  const restNamespace = taxonomyConfig.rest_namespace || "wp/v2";
  if (restNamespace !== "wp/v2") throw new Error(`The Service Hubs taxonomy uses unsupported REST namespace ${restNamespace}; expected wp/v2.`);
  const res = await fetch(wpApiEndpoint(client, `${restBase}?slug=${encodeURIComponent(slug)}&context=edit&per_page=2`), { headers: { Authorization: authHeader(client), "Cache-Control": "no-cache" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`WordPress exposes Service Hubs but its term endpoint /wp-json/wp/v2/${restBase} failed: ${text}`);
  const terms = JSON.parse(text) as Array<{ id?: number; slug?: string }>;
  const termId = Number(terms.find((term) => term.slug === slug)?.id);
  if (!Number.isFinite(termId)) throw new Error(`WordPress Service Hubs term ${slug} does not exist.`);
  return { termId, restBase };
}

export async function validateWordPressPublishingTargets(client: WordPressClientConfig) {
  const [spokeRestBase, serviceDetail] = await Promise.all([
    resolveResourceRestBase(client),
    resolveServiceDetailTarget(client),
  ]);
  return {
    spoke: { restNamespace: "wp/v2", restBase: spokeRestBase },
    service_detail: { restNamespace: "wp/v2", ...serviceDetail },
  };
}

const RESOURCE_FIELD_NAMES = [
  "template_type", "primary_keyword", "service_name", "location_name",
  "hero_eyebrow", "hero_heading", "hero_subheading", "intro_summary",
  "section_1_heading", "section_1_body", "section_2_heading", "section_2_body",
  "section_3_heading", "section_3_body", "faq_1_question", "faq_1_answer",
  "faq_2_question", "faq_2_answer", "faq_3_question", "faq_3_answer",
  "cta_heading", "cta_body", "cta_button_text", "cta_button_url",
  "related_hub_url", "related_hub_anchor", "meta_title", "meta_description",
] as const;

type ResourceFields = ReturnType<typeof resourceFields>;

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlDecode(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number: string) =>
      String.fromCodePoint(Number.parseInt(number, 16)))
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function xmlString(value: unknown) {
  return `<value><string>${xmlEscape(value)}</string></value>`;
}

async function xmlRpc(
  client: WordPressClientConfig,
  methodName: string,
  params: string[],
) {
  requireWordPressConfig(client);
  const body = `<?xml version="1.0"?><methodCall><methodName>${methodName}</methodName><params>${params.map((param) => `<param>${param}</param>`).join("")}</params></methodCall>`;
  const res = await fetch(`${wpUrl(client)}/xmlrpc.php`, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body,
  });
  const text = await res.text();
  if (!res.ok || text.includes("<fault>")) {
    throw new Error(`WordPress custom-field request failed: ${text}`);
  }
  return text;
}

function customFieldsFromXml(xml: string) {
  const fields: Record<string, { id?: string; value: string }> = {};
  const section = xml.slice(xml.indexOf("<name>custom_fields</name>"));
  for (const match of section.matchAll(/<value><struct>([\s\S]*?)<\/struct><\/value>/g)) {
    const entry = match[1];
    const id = entry.match(/<name>id<\/name><value><string>([\s\S]*?)<\/string>/)?.[1];
    const key = entry.match(/<name>key<\/name><value><string>([\s\S]*?)<\/string>/)?.[1];
    const value = entry.match(/<name>value<\/name><value><string>([\s\S]*?)<\/string>/)?.[1];
    if (key !== undefined && value !== undefined) {
      fields[xmlDecode(key)] = { id: id ? xmlDecode(id) : undefined, value: xmlDecode(value) };
    }
  }
  return fields;
}

function assertResourceFields(
  expected: ResourceFields,
  actual: Record<string, { value: string }>,
) {
  const mismatches = RESOURCE_FIELD_NAMES.filter(
    (field) => String(actual[field]?.value ?? "") !== String(expected[field] ?? ""),
  );
  if (mismatches.length) {
    throw new Error(
      `WordPress did not persist Resource fields: ${mismatches.join(", ")}`,
    );
  }
}

async function writeAndVerifyCustomFields(
  postId: number,
  fields: ResourceFields,
  client: WordPressClientConfig,
) {
  const authParams = [
    "<value><int>1</int></value>",
    xmlString(client.wpUsername),
    xmlString(client.wpAppPassword),
  ];
  const beforeXml = await xmlRpc(client, "wp.getPost", [
    ...authParams,
    `<value><int>${postId}</int></value>`,
  ]);
  const existing = customFieldsFromXml(beforeXml);
  const customFieldsXml = RESOURCE_FIELD_NAMES.map((key) => {
    const id = existing[key]?.id;
    return `<value><struct>${id ? `<member><name>id</name>${xmlString(id)}</member>` : ""}<member><name>key</name>${xmlString(key)}</member><member><name>value</name>${xmlString(fields[key])}</member></struct></value>`;
  }).join("");
  await xmlRpc(client, "wp.editPost", [
    ...authParams,
    `<value><int>${postId}</int></value>`,
    `<value><struct><member><name>custom_fields</name><value><array><data>${customFieldsXml}</data></array></value></member></struct></value>`,
  ]);
  const verifyXml = await xmlRpc(client, "wp.getPost", [
    ...authParams,
    `<value><int>${postId}</int></value>`,
  ]);
  assertResourceFields(fields, customFieldsFromXml(verifyXml));
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

function featuredImageMetadata(article: Article, extension = "") {
  const service = (article.serviceName || article.postTitle).trim();
  const location = (article.locationName || "").trim();
  const alt = location && !/^(national|online)$/i.test(location) ? `${service} in ${location}` : service;
  const base = article.postName || article.postTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { alt, title: alt, filename: `${base}${extension}` };
}

async function updateWordPressMediaMetadata(client: WordPressClientConfig, mediaId: number, article: Article) {
  const metadata = featuredImageMetadata(article);
  const res = await fetch(wpApiEndpoint(client, `media/${mediaId}`), { method: "POST", headers: { Authorization: authHeader(client), "Content-Type": "application/json" }, body: JSON.stringify({ alt_text: metadata.alt, title: metadata.title, slug: article.postName }) });
  const text = await res.text(); if (!res.ok) throw new Error(`WordPress featured image metadata update failed: ${text}`);
}

async function uploadFeaturedImage(article: Article, client: WordPressClientConfig) {
  if (article.wpFeaturedMediaId && Number.isFinite(Number(article.wpFeaturedMediaId))) {
    const mediaId = Number(article.wpFeaturedMediaId); await updateWordPressMediaMetadata(client, mediaId, article); return mediaId;
  }
  if (!article.featuredImagePath) {
    return null;
  }

  const localPath = path.join(
    process.cwd(),
    "public",
    article.featuredImagePath.replace(/^\//, ""),
  );
  const bytes = await readFile(localPath);
  const filename = featuredImageMetadata(article, path.extname(localPath).toLowerCase()).filename;

  const res = await fetch(wpApiEndpoint(client, "media"), {
    method: "POST",
    headers: {
      Authorization: authHeader(client),
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

  await updateWordPressMediaMetadata(client, mediaId, article);

  return mediaId;
}

async function updateRankMathMeta(
  postId: number,
  article: Article,
  client: WordPressClientConfig,
  seo?: { canonicalUrl?: string },
) {
  const res = await fetch(wpJsonEndpoint(client, "rankmath/v1/updateMeta"), {
    method: "POST",
    headers: {
      Authorization: authHeader(client),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      objectType: "post",
      objectID: postId,
      meta: {
        ...rankMathMeta(article),
        ...(article.templateType === "service_detail"
          ? { rank_math_canonical_url: seo?.canonicalUrl ?? "", rank_math_schema_Service: "" }
          : seo?.canonicalUrl ? { rank_math_canonical_url: seo.canonicalUrl } : {}),
      },
    }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Rank Math metadata update failed: ${text}`);
  }
}

export async function repairResourceMetadataInWordPress(
  article: Article,
  client: WordPressClientConfig,
  postId: number,
) {
  if (!Number.isFinite(postId)) throw new Error("Invalid WordPress post ID.");
  await writeAndVerifyCustomFields(postId, resourceFields(article), client);
  await updateRankMathMeta(postId, article, client);
}

export async function pushResourceDraftToWordPress(
  article: Article,
  client: WordPressClientConfig,
  serviceConfig: ServiceDetailSeoConfig = {},
  publishOptions: { status?: "draft" | "publish" | "future"; scheduledAt?: Date } = {},
): Promise<{
  postId: number;
  previewUrl: string;
  publishedUrl: string | null;
  featuredMediaId: number | null;
  wordpressPostType: string;
  wordpressRestBase: string;
  wordpressStatus: string;
  action: "created" | "updated";
  heroMedia?: RenderedImage;
  supportingMedia?: RenderedImage;
}> {
  const target = article.templateType === "service_detail"
    ? await resolveServiceDetailTarget(client)
    : { restBase: await resolveResourceRestBase(client), wordpressPostType: "resource" };
  const serviceDetailRecord = article.templateType === "service_detail" ? serviceDetailFromArticle(article) : null;
  const serviceHubTerm = serviceDetailRecord ? await resolveServiceHubTerm(client, serviceDetailRecord.service_hub, target.wordpressPostType) : null;
  const heroMedia = serviceDetailRecord?.hero_image_url
    ? await ensureServiceDetailMedia(client, { url: serviceDetailRecord.hero_image_url, alt: serviceDetailRecord.hero_image_alt, caption: serviceDetailRecord.hero_image_caption }, article.wpHeroSourceUrl === serviceDetailRecord.hero_image_url ? article.wpHeroMediaId : null)
    : undefined;
  const supportingMedia = serviceDetailRecord?.supporting_image_url
    ? await ensureServiceDetailMedia(client, { url: serviceDetailRecord.supporting_image_url, alt: serviceDetailRecord.supporting_image_alt, caption: serviceDetailRecord.supporting_image_caption }, article.wpSupportingSourceUrl === serviceDetailRecord.supporting_image_url ? article.wpSupportingMediaId : null)
    : undefined;
  let serviceDetail = serviceDetailRecord ? serviceDetailWordPressPayload(serviceDetailRecord, serviceConfig, { hero: heroMedia, supporting: supportingMedia }) : null;
  let featuredMediaId = await uploadFeaturedImage(article, client) ?? (serviceConfig.setHeroAsFeaturedImage !== false ? heroMedia?.attachmentId : null) ?? (serviceDetailRecord?.featured_image_url ? await uploadHostedServicePageImage(client, serviceDetailRecord.featured_image_url, serviceDetailRecord.featured_image_alt) : null);
  const mappedFields = serviceDetail ? null : resourceFields(article);
  const existingPostId = article.wpPostId ? Number(article.wpPostId) : null;
  if (article.wpPostId && !Number.isFinite(existingPostId)) throw new Error("Stored WordPress post ID is invalid.");
  let preservedStatus: string | null = null;
  let currentPermalink: string | null = null;
  if (existingPostId) {
    const currentRes = await fetch(resourceEndpoint(client, target.restBase, `/${existingPostId}?context=edit`), { headers: { Authorization: authHeader(client), "Cache-Control": "no-cache" } });
    const currentText = await currentRes.text();
    if (!currentRes.ok) throw new Error(`Could not read the existing WordPress ${target.wordpressPostType} ${existingPostId} before updating: ${currentText}`);
    const currentPost = JSON.parse(currentText) as { status?: string; featured_media?: number; link?: string };
    preservedStatus = typeof currentPost.status === "string" ? currentPost.status : null;
    currentPermalink = typeof currentPost.link === "string" ? currentPost.link : null;
    if (!featuredMediaId && Number(currentPost.featured_media) > 0) { featuredMediaId = Number(currentPost.featured_media); await updateWordPressMediaMetadata(client, featuredMediaId, article); }
  }
  if (serviceDetailRecord && currentPermalink) serviceDetail = serviceDetailWordPressPayload(serviceDetailRecord, { ...serviceConfig, authoritativePermalink: currentPermalink }, { hero: heroMedia, supporting: supportingMedia });
  const wordpressStatus = publishOptions.status ?? preservedStatus ?? serviceDetail?.status ?? "draft";
  if (wordpressStatus === "future" && (!publishOptions.scheduledAt || publishOptions.scheduledAt.getTime() <= Date.now())) {
    throw new Error("A future WordPress post requires a scheduled time later than now.");
  }
  const res = await fetch(resourceEndpoint(client, target.restBase, existingPostId ? `/${existingPostId}` : ""), {
    method: "POST",
    headers: {
      Authorization: authHeader(client),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: serviceDetail?.title ?? article.postTitle,
      slug: serviceDetail?.slug ?? article.postName,
      status: wordpressStatus,
      ...(wordpressStatus === "future" && publishOptions.scheduledAt ? { date_gmt: publishOptions.scheduledAt.toISOString() } : {}),
      content: serviceDetail?.content ?? articleContent(article),
      meta: rankMathMeta(article),
      ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
      ...(serviceHubTerm ? { [serviceHubTerm.restBase]: [serviceHubTerm.termId] } : {}),
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
      `WordPress ${article.templateType} ${existingPostId ? "update" : "create"} failed at /wp-json/wp/v2/${target.restBase}${existingPostId ? `/${existingPostId}` : ""}: ${text}`,
    );
  }

  const postId = Number(post.id);
  if (!Number.isFinite(postId)) {
    throw new Error("WordPress did not return a valid resource ID.");
  }

  if (mappedFields) await writeAndVerifyCustomFields(postId, mappedFields, client);

  const returnedPermalink = typeof post.link === "string" ? post.link : currentPermalink;
  let authoritativePermalink = returnedPermalink;
  if (serviceDetailRecord) {
    try {
      const returned = returnedPermalink ? new URL(returnedPermalink) : null;
      if (!returned || returned.search || returned.pathname === "/") {
        authoritativePermalink = new URL(expectedServicePath(serviceDetailRecord.service_hub, serviceDetailRecord.post_name), serviceConfig.canonicalSiteUrl || wpUrl(client)).toString();
      }
    } catch {
      authoritativePermalink = new URL(expectedServicePath(serviceDetailRecord.service_hub, serviceDetailRecord.post_name), serviceConfig.canonicalSiteUrl || wpUrl(client)).toString();
    }
  }
  if (serviceDetailRecord && authoritativePermalink) {
    const finalServiceDetail = serviceDetailWordPressPayload(serviceDetailRecord, { ...serviceConfig, authoritativePermalink }, { hero: heroMedia, supporting: supportingMedia });
    if (finalServiceDetail.content !== serviceDetail?.content) {
      const finalRes = await fetch(resourceEndpoint(client, target.restBase, `/${postId}`), { method: "POST", headers: { Authorization: authHeader(client), "Content-Type": "application/json" }, body: JSON.stringify({ content: finalServiceDetail.content, ...(serviceHubTerm ? { [serviceHubTerm.restBase]: [serviceHubTerm.termId] } : {}) }) });
      const finalText = await finalRes.text();
      if (!finalRes.ok) throw new Error(`WordPress post was created, but final permalink-aware content update failed: ${finalText}`);
      try { post = { ...post, ...(JSON.parse(finalText) as Record<string, unknown>) }; } catch {}
    }
    serviceDetail = finalServiceDetail;
  }

  await updateRankMathMeta(postId, article, client, serviceDetail?.rendered ? { canonicalUrl: authoritativePermalink || undefined } : undefined);

  return {
    postId,
    previewUrl: `${wpUrl(client)}/?p=${postId}&preview=true`,
    publishedUrl: authoritativePermalink || null,
    featuredMediaId,
    wordpressPostType: target.wordpressPostType,
    wordpressRestBase: target.restBase,
    wordpressStatus: typeof post.status === "string" ? post.status : wordpressStatus,
    action: existingPostId ? "updated" : "created",
    heroMedia,
    supportingMedia,
  };
}

export async function fetchPublishedResourcesFromWordPress(
  client: WordPressClientConfig,
) {
  const resourceRestBase = await resolveResourceRestBase(client);
  const resources: WordPressResourceSummary[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      per_page: "100",
      page: String(page),
      status: "publish",
      orderby: "date",
      order: "desc",
    });
    const res = await fetch(resourceEndpoint(client, resourceRestBase, `?${params}`), {
      headers: {
        Authorization: authHeader(client),
      },
    });
    const text = await res.text();
    const pageResources = text ? (JSON.parse(text) as WordPressResourceSummary[]) : [];

    if (!res.ok) {
      throw new Error(
        `WordPress resources import failed at /wp-json/wp/v2/${resourceRestBase}: ${text}`,
      );
    }

    resources.push(...pageResources);
    totalPages = Number(res.headers.get("x-wp-totalpages") ?? "1");
    page += 1;
  } while (page <= totalPages);

  return resources;
}

export type ServicePagePublishPayload = {
  title: string; slug: string; html: string; status: "draft" | "publish" | "pending" | "private";
  parentPageId?: number; parentSlug?: string; featuredMediaId?: number; featuredImageUrl?: string; featuredImageAlt?: string; seoTitle: string;
  metaDescription: string; primaryKeyword: string; restBase?: string;
};

export async function resolveWordPressParentId(client: WordPressClientConfig, parentSlug: string, restBase = "pages") {
  const slug = parentSlug.replace(/^\/+|\/+$/g, ""); if (!slug) return null;
  const res = await fetch(resourceEndpoint(client, restBase, `?slug=${encodeURIComponent(slug)}&context=edit&per_page=2`), { headers: { Authorization: authHeader(client) } });
  const text = await res.text(); if (!res.ok) throw new Error(`WordPress parent lookup failed: ${text}`);
  const pages = JSON.parse(text) as Array<{ id?: number; slug?: string }>;
  return pages.length === 1 && Number.isFinite(Number(pages[0].id)) ? Number(pages[0].id) : null;
}

async function uploadHostedServicePageImage(client: WordPressClientConfig, imageUrl: string, alt = "") {
  const url = new URL(imageUrl); if (url.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) throw new Error("Featured image URL must be a public HTTPS URL.");
  const imageRes = await fetch(url, { redirect: "follow" }); if (!imageRes.ok) throw new Error(`Featured image download failed: ${imageRes.status}`);
  const contentType = imageRes.headers.get("content-type") ?? ""; if (!/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) throw new Error("Featured image URL did not return a supported image type.");
  const bytes = await imageRes.arrayBuffer(); if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("Featured image exceeds the 15 MB limit.");
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "service-page-image").replace(/[^a-z0-9._-]/gi, "-");
  const mediaRes = await fetch(wpApiEndpoint(client, "media"), { method: "POST", headers: { Authorization: authHeader(client), "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"` }, body: bytes });
  const mediaText = await mediaRes.text(); if (!mediaRes.ok) throw new Error(`WordPress featured image upload failed: ${mediaText}`); const media = JSON.parse(mediaText) as { id?: number }; const id = Number(media.id); if (!Number.isFinite(id)) throw new Error("WordPress did not return a featured media ID.");
  if (alt) { const altRes = await fetch(wpApiEndpoint(client, `media/${id}`), { method: "POST", headers: { Authorization: authHeader(client), "Content-Type": "application/json" }, body: JSON.stringify({ alt_text: alt }) }); if (!altRes.ok) throw new Error(`Featured image uploaded, but alt text update failed: ${await altRes.text()}`); }
  return id;
}

type ServiceImageInput = { url: string; alt?: string; caption?: string };

async function readWordPressMedia(client: WordPressClientConfig, mediaId: number): Promise<RenderedImage> {
  const res = await fetch(wpApiEndpoint(client, `media/${mediaId}?context=edit`), { headers: { Authorization: authHeader(client), "Cache-Control": "no-cache" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`WordPress media lookup failed: ${text}`);
  const media = JSON.parse(text) as { source_url?: string; alt_text?: string; caption?: { raw?: string; rendered?: string }; media_details?: { width?: number; height?: number; sizes?: Record<string, { source_url?: string; width?: number }> } };
  const variants = Object.values(media.media_details?.sizes ?? {}).filter((size) => size.source_url && size.width).sort((a, b) => Number(a.width) - Number(b.width));
  const srcset = variants.map((size) => `${size.source_url} ${size.width}w`).join(", ");
  return { attachmentId: mediaId, url: media.source_url || "", alt: media.alt_text || "", caption: media.caption?.raw || media.caption?.rendered, width: media.media_details?.width, height: media.media_details?.height, srcset: srcset || undefined, sizes: srcset ? "(max-width: 1200px) 100vw, 1200px" : undefined };
}

async function ensureServiceDetailMedia(client: WordPressClientConfig, image: ServiceImageInput, existingMediaId?: string | null): Promise<RenderedImage> {
  const existing = Number(existingMediaId);
  const id = existingMediaId && Number.isFinite(existing) ? existing : await uploadHostedServicePageImage(client, image.url, image.alt || "");
  const media = await readWordPressMedia(client, id);
  return { ...media, alt: image.alt || media.alt, caption: image.caption || media.caption, url: media.url || image.url };
}

export async function getWordPressPage(
  client: WordPressClientConfig,
  postId: number,
  restBase = "pages",
) {
  const res = await fetch(resourceEndpoint(client, restBase, `/${postId}?context=edit`), { headers: { Authorization: authHeader(client) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`WordPress page lookup failed: ${text}`);
  return JSON.parse(text) as { id: number; modified_gmt?: string; link?: string; status?: string; content?: { raw?: string; rendered?: string } };
}

export async function pushServicePageToWordPress(
  payload: ServicePagePublishPayload,
  client: WordPressClientConfig,
  postId?: number,
) {
  const restBase = (payload.restBase || "pages").replace(/^\/|\/$/g, "");
  const parentPageId = payload.parentPageId ?? (payload.parentSlug ? await resolveWordPressParentId(client, payload.parentSlug, restBase) : undefined);
  if (payload.parentSlug && !parentPageId) throw new Error(`WordPress parent page “${payload.parentSlug}” could not be resolved. The page was not published with an incorrect parent.`);
  const featuredMediaId = payload.featuredMediaId ?? (payload.featuredImageUrl ? await uploadHostedServicePageImage(client, payload.featuredImageUrl, payload.featuredImageAlt) : undefined);
  const res = await fetch(resourceEndpoint(client, restBase, postId ? `/${postId}` : ""), {
    method: "POST",
    headers: { Authorization: authHeader(client), "Content-Type": "application/json" },
    body: JSON.stringify({ title: payload.title, slug: payload.slug, content: payload.html, status: payload.status, ...(parentPageId ? { parent: parentPageId } : {}), ...(featuredMediaId ? { featured_media: featuredMediaId } : {}) }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WordPress page ${postId ? "update" : "create"} failed at /wp-json/wp/v2/${restBase}: ${text}`);
  const page = JSON.parse(text) as { id?: number; link?: string; modified_gmt?: string; status?: string };
  if (!Number.isFinite(Number(page.id))) throw new Error("WordPress did not return a valid page ID.");
  const rankMath = await fetch(wpJsonEndpoint(client, "rankmath/v1/updateMeta"), {
    method: "POST", headers: { Authorization: authHeader(client), "Content-Type": "application/json" },
    body: JSON.stringify({ objectType: "post", objectID: Number(page.id), meta: { rank_math_title: payload.seoTitle, rank_math_description: payload.metaDescription, rank_math_focus_keyword: payload.primaryKeyword, rank_math_pillar_content: "off" } }),
  });
  const rankMathText = await rankMath.text();
  if (!rankMath.ok) throw new Error(`WordPress page saved, but Rank Math metadata update failed: ${rankMathText}`);
  return { postId: Number(page.id), url: page.link ?? `${wpUrl(client)}/?p=${page.id}&preview=true`, modifiedGmt: page.modified_gmt ?? null, status: page.status ?? payload.status };
}
