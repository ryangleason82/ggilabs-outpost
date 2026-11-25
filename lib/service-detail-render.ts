import type { ServiceDetailPayload } from "@/lib/templates";
import { expectedServicePath, serviceHub } from "@/lib/service-hubs";

export type ServiceDetailSeoConfig = {
  businessName?: string; canonicalSiteUrl?: string; schemaEntityId?: string; schemaType?: string;
  providerUrl?: string; providerTelephone?: string; providerEmail?: string; providerStreetAddress?: string;
  providerAddressLocality?: string; providerAddressRegion?: string; providerPostalCode?: string; providerAddressCountry?: string;
  defaultHomeLabel?: string; defaultServiceHubLabel?: string; defaultServiceHubUrl?: string;
  requireServiceHeroImage?: boolean; requireServiceSupportingImage?: boolean;
  enableServiceSchema?: boolean; enableFaqSchema?: boolean; enableBreadcrumbSchema?: boolean;
  setHeroAsFeaturedImage?: boolean; globalStylesheetUrl?: string; globalStylesheetCss?: string;
  authoritativePermalink?: string;
  serviceAreas?: string[];
};
export type BreadcrumbItem = { name: string; url?: string; current?: boolean };
export type RenderedImage = { url: string; alt: string; caption?: string; width?: number; height?: number; srcset?: string; sizes?: string; attachmentId?: number };
export type ServiceDetailRenderResult = { bodyHtml: string; previewHtml: string; breadcrumbs: BreadcrumbItem[]; schemaGraph?: Record<string, unknown>; heroImage?: RenderedImage; supportingImage?: RenderedImage; faqs: Array<{ question: string; answer: string }>; seo: { title: string; description: string; canonicalUrl?: string } };

export const SERVICE_DETAIL_GLOBAL_CSS = `.outpost-service-page{color:var(--global-palette4,#35414a);line-height:1.65}.outpost-service-page img{display:block;max-width:100%;height:auto}.outpost-service-page .sr-breadcrumbs{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem;margin:0 0 1rem;font-size:.875rem;color:inherit}.outpost-service-page .sr-breadcrumbs a{color:inherit}.outpost-service-page .sr-breadcrumb-separator{opacity:.65}.outpost-service-page .sr-image{margin:1.5rem 0}.outpost-service-page .sr-image figcaption{font-size:.875rem;color:#667085}.outpost-service-page .sr-related-services{display:grid;gap:1rem}.outpost-service-page a:focus-visible{outline:3px solid currentColor;outline-offset:3px}`;
export function serviceDetailConfigFromProfile(profile?: { businessName?: string; domain?: string; templateJson?: string } | null): ServiceDetailSeoConfig {
  let template: Record<string, unknown> = {}; try { template = JSON.parse(profile?.templateJson || "{}"); } catch {}
  const text = (key: string) => typeof template[key] === "string" ? String(template[key]) : undefined; const flag = (key: string, fallback: boolean) => typeof template[key] === "boolean" ? Boolean(template[key]) : fallback;
  const rawHub = text("defaultServiceHubUrl") || text("serviceParentSlug"); const hub = rawHub && !/^https?:|^\//i.test(rawHub) ? `/${rawHub.replace(/^\/+|\/+$/g, "")}/` : rawHub;
  const serviceAreas = text("serviceAreas")?.split(/[|\n]/).map((value) => value.trim()).filter(Boolean);
  return { businessName: profile?.businessName, canonicalSiteUrl: text("canonicalSiteUrl") || profile?.domain, schemaEntityId: text("schemaEntityId"), schemaType: text("schemaType"), providerUrl: text("providerUrl"), providerTelephone: text("providerTelephone"), providerEmail: text("providerEmail"), providerStreetAddress: text("providerStreetAddress"), providerAddressLocality: text("providerAddressLocality"), providerAddressRegion: text("providerAddressRegion"), providerPostalCode: text("providerPostalCode"), providerAddressCountry: text("providerAddressCountry"), defaultHomeLabel: text("defaultHomeLabel") || "Home", defaultServiceHubLabel: text("defaultServiceHubLabel") || "Services", defaultServiceHubUrl: hub, requireServiceHeroImage: flag("requireServiceHeroImage", false), requireServiceSupportingImage: flag("requireServiceSupportingImage", false), enableServiceSchema: flag("enableServiceSchema", true), enableFaqSchema: flag("enableFaqSchema", true), enableBreadcrumbSchema: flag("enableBreadcrumbSchema", true), setHeroAsFeaturedImage: flag("setHeroAsFeaturedImage", true), globalStylesheetUrl: text("globalStylesheetUrl"), globalStylesheetCss: text("globalStylesheetCss"), serviceAreas };
}

function inferredServiceAreas(location = "") {
  const counties = location.match(/^(.+?)\s+and\s+(.+?)\s+Counties(?:,?\s*(PA|Pennsylvania))?$/i);
  if (counties) return [`${counties[1]} County, Pennsylvania`, `${counties[2]} County, Pennsylvania`];
  return location.trim() ? [location.trim()] : [];
}

const esc = (value = "") => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const strip = (value = "") => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const validUrl = (value = "") => { try { const url = new URL(value, "https://outpost.invalid"); return url.protocol === "https:" || (url.origin === "https://outpost.invalid" && value.startsWith("/")); } catch { return false; } };
const absolute = (value: string, site = "") => { try { return new URL(value, site || undefined).toString(); } catch { return ""; } };
function figure(kind: "hero" | "supporting", image?: RenderedImage) { if (!image?.url) return ""; return `<figure class="sr-image sr-${kind}-image" data-outpost-image="${kind}"><img src="${esc(image.url)}" alt="${esc(image.alt)}"${image.width ? ` width="${image.width}"` : ""}${image.height ? ` height="${image.height}"` : ""}${image.srcset ? ` srcset="${esc(image.srcset)}"` : ""}${image.sizes ? ` sizes="${esc(image.sizes)}"` : ""} loading="${kind === "hero" ? "eager" : "lazy"}"${kind === "hero" ? ' fetchpriority="high"' : ""}>${image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : ""}</figure>`; }
function visibleFaqs(html: string, record: ServiceDetailPayload) { const fromDetails = [...html.matchAll(/<details\b[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)].map((match) => ({ question: strip(match[1]), answer: strip(match[2]) })).filter((faq) => faq.question && faq.answer); if (fromDetails.length) return fromDetails; const fromCards = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bsr-faq\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)].map((match) => { const question = match[1].match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/i); return { question: strip(question?.[1] || ""), answer: strip(question ? match[1].slice((question.index || 0) + question[0].length) : "") }; }).filter((faq) => faq.question && faq.answer); if (fromCards.length) return fromCards; return [1,2,3,4].map((number) => ({ question: strip(String(record[`faq_${number}_question` as keyof ServiceDetailPayload] ?? "")), answer: strip(String(record[`faq_${number}_answer` as keyof ServiceDetailPayload] ?? "")) })).filter((faq) => faq.question && faq.answer); }
function relatedMarkup(record: ServiceDetailPayload) { let related: Array<{ title?: string; url?: string; description?: string; anchor?: string }> = []; try { const parsed = JSON.parse(record.related_services_json || "[]"); if (Array.isArray(parsed)) related = parsed; } catch {} const valid = related.filter((item) => item.url && validUrl(item.url)); if (!valid.length) return ""; return `<section class="sr-related-services" aria-labelledby="sr-related-heading"><h2 id="sr-related-heading">Related services</h2>${valid.map((item) => `<article><h3>${esc(item.title || item.anchor || "Related service")}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ""}<a href="${esc(item.url!)}">${esc(item.anchor || (item.title ? `Explore ${item.title}` : "View related service"))}</a></article>`).join("")}</section>`; }
function commercialMarkup(record: ServiceDetailPayload) { if (!record.commercial_callout_heading && !record.commercial_callout_body) return ""; const link = record.commercial_callout_url && validUrl(record.commercial_callout_url) ? `<a href="${esc(record.commercial_callout_url)}">${esc(record.commercial_callout_link_text || record.commercial_callout_heading || "View details")}</a>` : ""; return `<aside class="sr-commercial-callout">${record.commercial_callout_heading ? `<h2>${esc(record.commercial_callout_heading)}</h2>` : ""}${record.commercial_callout_body ? `<p>${esc(record.commercial_callout_body)}</p>` : ""}${link}</aside>`; }

function addFaqMicrodata(html: string) {
  if (/<details\b/i.test(html)) {
    let decorated = html.replace(/<details\b(?![^>]*\bitemscope\b)([^>]*)>/gi, '<details$1 itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">');
    decorated = decorated.replace(/<summary\b(?![^>]*\bitemprop\b)([^>]*)>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi, '<summary$1 itemprop="name">$2</summary><div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer"><div itemprop="text">$3</div></div></details>');
    return `<div class="sr-faq-schema" itemscope itemtype="https://schema.org/FAQPage">${decorated}</div>`;
  }
  let decorated = html.replace(/<article\b([^>]*class=["'][^"']*\bsr-faq\b[^"']*["'][^>]*)>([\s\S]*?)<\/article>/gi, (_match, attributes: string, content: string) => {
    const question = content.replace(/<h([2-4])\b(?![^>]*\bitemprop\b)([^>]*)>/i, '<h$1$2 itemprop="name">');
    const answer = question.replace(/<div\b([^>]*class=["'][^"']*\bsr-rich\b[^"']*["'][^>]*)>([\s\S]*?)<\/div>/i, '<div$1 itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer"><div itemprop="text">$2</div></div>');
    return `<article${attributes} itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">${answer}</article>`;
  });
  decorated = decorated.replace(/<section\b([^>]*id=["']faq["'][^>]*)>/i, '<section$1 itemscope itemtype="https://schema.org/FAQPage">');
  return decorated;
}

export function renderServiceDetail(record: ServiceDetailPayload, config: ServiceDetailSeoConfig = {}, media: { hero?: RenderedImage; supporting?: RenderedImage } = {}): ServiceDetailRenderResult {
  const source = String(record.html_content ?? ""); const sourceStyles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1].trim()).filter(Boolean); const clean = source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").trim();
  const site = (config.canonicalSiteUrl || "").replace(/\/$/, "");
  const configuredHub = serviceHub(record.service_hub);
  const expectedPath = expectedServicePath(record.service_hub, record.post_name);
  const canonicalUrl = config.authoritativePermalink && validUrl(config.authoritativePermalink)
    ? absolute(config.authoritativePermalink, site)
    : expectedPath && site ? absolute(expectedPath, site) : "";
  const breadcrumbs: BreadcrumbItem[] = [{ name: config.defaultHomeLabel || "Home", url: site ? `${site}/` : "/" }];
  const hubUrl = configuredHub?.path || ""; const hubName = configuredHub?.label || ""; if (hubUrl && validUrl(hubUrl)) breadcrumbs.push({ name: hubName, url: hubUrl }); breadcrumbs.push({ name: record.post_title, current: true });
  const breadcrumbHtml = `<nav class="sr-breadcrumbs" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">${breadcrumbs.map((item, index) => `${index ? '<span class="sr-breadcrumb-separator" aria-hidden="true">/</span>' : ""}<span class="sr-breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem"${item.current ? ' aria-current="page"' : ""}>${item.url && !item.current ? `<a itemprop="item" href="${esc(item.url)}"><span itemprop="name">${esc(item.name)}</span></a>` : `<span itemprop="name">${esc(item.name)}</span>`}<meta itemprop="position" content="${index + 1}"></span>`).join("")}</nav>`;
  const heroImage = media.hero ?? (record.hero_image_url ? { url: record.hero_image_url, alt: record.hero_image_alt || "", caption: record.hero_image_caption } : undefined);
  const supportingImage = media.supporting ?? (record.supporting_image_url ? { url: record.supporting_image_url, alt: record.supporting_image_alt || "", caption: record.supporting_image_caption } : undefined);
  const serviceAttributes = config.enableServiceSchema !== false && canonicalUrl && config.schemaEntityId ? ` itemscope itemtype="https://schema.org/Service" itemid="${esc(`${canonicalUrl}#service`)}"` : "";
  const providerAddress = config.providerStreetAddress || config.providerAddressLocality || config.providerAddressRegion || config.providerPostalCode ? `<span itemprop="address" itemscope itemtype="https://schema.org/PostalAddress"><meta itemprop="streetAddress" content="${esc(config.providerStreetAddress || "")}"><meta itemprop="addressLocality" content="${esc(config.providerAddressLocality || "")}"><meta itemprop="addressRegion" content="${esc(config.providerAddressRegion || "")}"><meta itemprop="postalCode" content="${esc(config.providerPostalCode || "")}"><meta itemprop="addressCountry" content="${esc(config.providerAddressCountry || "")}"></span>` : "";
  const providerEntity = serviceAttributes ? `<span itemprop="provider" itemscope itemtype="https://schema.org/${esc(config.schemaType || "Organization")}" itemid="${esc(config.schemaEntityId!)}"><meta itemprop="name" content="${esc(config.businessName || "")}">${config.providerUrl ? `<link itemprop="url" href="${esc(config.providerUrl)}">` : ""}${config.providerTelephone ? `<meta itemprop="telephone" content="${esc(config.providerTelephone)}">` : ""}${config.providerEmail ? `<meta itemprop="email" content="${esc(config.providerEmail)}">` : ""}${providerAddress}</span>` : "";
  const serviceAreas = config.serviceAreas?.length ? config.serviceAreas : inferredServiceAreas(record.location_name);
  const serviceMeta = serviceAttributes ? `<meta itemprop="name" content="${esc(record.service_name || record.post_title)}"><meta itemprop="serviceType" content="${esc(record.service_name || record.post_title)}"><meta itemprop="description" content="${esc(record.meta_description)}">${serviceAreas.map((area) => `<meta itemprop="areaServed" content="${esc(area)}">`).join("")}<link itemprop="url" href="${esc(canonicalUrl)}">${providerEntity}` : "";
  let body = clean; const open = body.match(/<div\b[^>]*class=["'][^"']*outpost-service-page[^"']*["'][^>]*>/i); if (open) { const enhancedOpen = serviceAttributes && !/\bitemscope\b/i.test(open[0]) ? open[0].replace(/>$/, `${serviceAttributes}>`) : open[0]; body = body.replace(open[0], `${enhancedOpen}${serviceMeta}${figure("hero", heroImage)}`); } else body = `<div class="outpost-service-page"${serviceAttributes}>${serviceMeta}${figure("hero", heroImage)}${body}</div>`;
  const heroEyebrow = /(<section\b[^>]*(?:id=["']hero["']|class=["'][^"']*\bsr-hero\b[^"']*["'])[^>]*>[\s\S]*?)(<span\b[^>]*class=["'][^"']*\bsr-eyebrow\b[^"']*["'][^>]*>)/i;
  if (heroEyebrow.test(body)) body = body.replace(heroEyebrow, `$1${breadcrumbHtml}$2`); else { const heroOpen = /(<section\b[^>]*(?:id=["']hero["']|class=["'][^"']*\bsr-hero\b[^"']*["'])[^>]*>)/i; body = heroOpen.test(body) ? body.replace(heroOpen, `$1${breadcrumbHtml}`) : body.replace(/(<div\b[^>]*class=["'][^"']*outpost-service-page[^"']*["'][^>]*>)/i, `$1${breadcrumbHtml}`); }
  const supporting = figure("supporting", supportingImage); if (supporting) { const section = record.supporting_image_section || "service_overview"; const expression = new RegExp(`(<section\\b[^>]*id=["']${section.replace(/_/g, "[-_]")}["'][^>]*>)`, "i"); body = expression.test(body) ? body.replace(expression, `$1${supporting}`) : body.replace(/<\/div>\s*$/i, `${supporting}</div>`); }
  const extras = `${relatedMarkup(record)}${commercialMarkup(record)}`; if (extras) body = body.replace(/<\/div>\s*$/i, `${extras}</div>`);
  const faqs = visibleFaqs(body, record); if (faqs.length && config.enableFaqSchema !== false) body = addFaqMicrodata(body); const graph: Record<string, unknown>[] = [];
  if (config.enableServiceSchema !== false && canonicalUrl && config.schemaEntityId) { graph.push({ "@type": config.schemaType || "Organization", "@id": config.schemaEntityId, name: config.businessName, ...(config.providerUrl ? { url: config.providerUrl } : {}), ...(config.providerTelephone ? { telephone: config.providerTelephone } : {}), ...(config.providerEmail ? { email: config.providerEmail } : {}) }); graph.push({ "@type": "Service", "@id": `${canonicalUrl}#service`, name: record.service_name || record.post_title, url: canonicalUrl, provider: { "@id": config.schemaEntityId } }); }
  if (config.enableBreadcrumbSchema !== false && canonicalUrl) graph.push({ "@type": "BreadcrumbList", "@id": `${canonicalUrl}#breadcrumb`, itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, ...(item.current ? { item: canonicalUrl } : item.url ? { item: absolute(item.url, site) } : {}) })) });
  if (config.enableFaqSchema !== false && faqs.length) graph.push({ "@type": "FAQPage", "@id": `${canonicalUrl}#faq`, mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });
  const schemaGraph = graph.length ? { "@context": "https://schema.org", "@graph": graph } : undefined;
  const stylesheetUrl = config.globalStylesheetUrl && validUrl(config.globalStylesheetUrl) ? absolute(config.globalStylesheetUrl, site) : "";
  const configuredCss = config.globalStylesheetCss?.trim() || "";
  const legacySourceCss = !stylesheetUrl && !configuredCss ? sourceStyles.join("\n") : "";
  const previewCss = `${legacySourceCss}\n${SERVICE_DETAIL_GLOBAL_CSS}\n${configuredCss}`.replace(/<\/style/gi, "<\\/style");
  const previewHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${site ? `<base href="${esc(`${site}/`)}">` : ""}${stylesheetUrl ? `<link rel="stylesheet" href="${esc(stylesheetUrl)}">` : ""}<style>${previewCss}</style></head><body>${body}</body></html>`;
  return { bodyHtml: body, previewHtml, breadcrumbs, schemaGraph, heroImage, supportingImage, faqs, seo: { title: record.meta_title, description: record.meta_description, canonicalUrl: canonicalUrl || undefined } };
}
