import { createHash } from "node:crypto";

export type ServicePageInputs = {
  pageType?: string; serviceName: string; primaryKeyword: string; secondaryKeywords?: string;
  targetLocation?: string; pageTitle: string; slug: string; parentPageId?: number;
  primaryCtaText?: string; primaryCtaUrl?: string; intro?: string; painPoints?: string;
  benefits?: string; process?: string; differentiators?: string; proof?: string;
  relatedServices?: string; internalLinks?: string; faqs?: string; sourceMaterial?: string;
  images?: string; featuredImage?: string; specialInstructions?: string; wordpressStatus?: "draft" | "publish";
};

export type SiteProfileData = {
  businessName: string; domain: string; wordpressRestBase?: string;
  brand?: { primary?: string; accent?: string; background?: string; text?: string; radius?: string; container?: string; spacing?: string; headingFont?: string; bodyFont?: string };
  template?: { defaultCtaText?: string; defaultCtaUrl?: string; phone?: string };
  internalLinks?: Array<{ anchor: string; url: string; targetPageId?: number }>;
};

export type ServicePageSeo = { title: string; metaDescription: string; primaryKeyword: string; secondaryKeywords?: string[]; slug: string; parentSlug?: string; featuredImage?: string; featuredImageAlt?: string; ctaUrl?: string; parentPageId?: number; wordpressStatus: "draft" | "publish" | "pending" | "private" };
export type ValidationCheck = { id: string; label: string; severity: "pass" | "warning" | "fail"; message: string };
export type ServicePageValidation = { status: "pass" | "warning" | "fail"; checks: ValidationCheck[]; seoScore: number; accessibilityScore: number };

const esc = (value = "") => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const lines = (value = "") => value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const textOnly = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
const safeUrl = (value = "") => /^(https?:\/\/|\/|#|tel:|mailto:)/i.test(value) ? value : "#";
const list = (value: string | undefined) => lines(value).length ? `<ul>${lines(value).map((v) => `<li>${esc(v)}</li>`).join("")}</ul>` : "";
const section = (id: string, title: string, content: string) => content ? `<section id="${id}" class="outpost-section"><div class="outpost-container"><h2>${esc(title)}</h2>${content}</div></section>` : "";

export function defaultSiteProfile(name: string, domain: string): SiteProfileData {
  return { businessName: name, domain, wordpressRestBase: "pages", brand: { primary: "#17324d", accent: "#c25b31", background: "#ffffff", text: "#17202a", radius: "12px", container: "1120px", spacing: "72px", headingFont: "inherit", bodyFont: "inherit" }, template: { defaultCtaText: "Contact us", defaultCtaUrl: "/contact/" }, internalLinks: [] };
}

function parseFaqs(value = "") {
  return lines(value).map((line) => { const [q, ...rest] = line.split("|"); return { question: q?.trim(), answer: rest.join("|").trim() }; }).filter((x) => x.question && x.answer);
}

function parseLinks(value = "") {
  return lines(value).map((line) => { const [anchor, url] = line.split("|").map((v) => v.trim()); return { anchor, url }; }).filter((x) => x.anchor && x.url);
}

export function generateServicePage(inputs: ServicePageInputs, profile: SiteProfileData) {
  const brand = { ...defaultSiteProfile(profile.businessName, profile.domain).brand, ...profile.brand };
  const ctaText = inputs.primaryCtaText || profile.template?.defaultCtaText || "Contact us";
  const ctaUrl = safeUrl(inputs.primaryCtaUrl || profile.template?.defaultCtaUrl || "/contact/");
  const location = inputs.targetLocation ? ` in ${inputs.targetLocation}` : "";
  const links = [...parseLinks(inputs.internalLinks), ...(profile.internalLinks ?? [])].slice(0, 6);
  const faqs = parseFaqs(inputs.faqs);
  const wrapper = `outpost-${slugify(profile.businessName) || "client"}`;
  const css = `<style>
.outpost-page.${wrapper}{--op-primary:${brand.primary};--op-accent:${brand.accent};--op-bg:${brand.background};--op-text:${brand.text};color:var(--op-text);background:var(--op-bg);font-family:${brand.bodyFont};line-height:1.65}
.outpost-page.${wrapper} *{box-sizing:border-box}.outpost-page.${wrapper} .outpost-container{width:min(calc(100% - 40px),${brand.container});margin-inline:auto}
.outpost-page.${wrapper} .outpost-hero{padding:${brand.spacing} 0;background:var(--op-primary);color:#fff}.outpost-page.${wrapper} h1,.outpost-page.${wrapper} h2,.outpost-page.${wrapper} h3{font-family:${brand.headingFont};line-height:1.15}
.outpost-page.${wrapper} h1{font-size:clamp(2.25rem,6vw,4.5rem);max-width:16ch}.outpost-page.${wrapper} h2{font-size:clamp(1.65rem,4vw,2.6rem)}.outpost-page.${wrapper} .outpost-section{padding:${brand.spacing} 0}
.outpost-page.${wrapper} .outpost-section:nth-child(odd){background:#f5f7f9}.outpost-page.${wrapper} .outpost-button{display:inline-block;padding:.85rem 1.2rem;border-radius:${brand.radius};background:var(--op-accent);color:#fff;font-weight:700;text-decoration:none}
.outpost-page.${wrapper} a:focus-visible{outline:3px solid var(--op-accent);outline-offset:3px}.outpost-page.${wrapper} .outpost-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.outpost-page.${wrapper} details{padding:1rem;border:1px solid #d7dde3;border-radius:${brand.radius};margin:.75rem 0}
@media(max-width:720px){.outpost-page.${wrapper} .outpost-grid{grid-template-columns:1fr}.outpost-page.${wrapper} .outpost-hero,.outpost-page.${wrapper} .outpost-section{padding:48px 0}}
</style>`;
  const html = `${css}<div class="outpost-page ${wrapper}">
<section class="outpost-hero"><div class="outpost-container"><p>${esc(profile.businessName)}</p><h1>${esc(inputs.pageTitle)}</h1><p>${esc(inputs.intro || `${inputs.serviceName}${location} helps customers get dependable, professional support.`)}</p><a class="outpost-button" href="${esc(ctaUrl)}">${esc(ctaText)}</a></div></section>
${section("service-overview", `About ${inputs.serviceName}`, inputs.sourceMaterial ? `<p>${esc(inputs.sourceMaterial)}</p>` : `<p>Learn what to expect from ${esc(inputs.serviceName)}${esc(location)} and how ${esc(profile.businessName)} can help.</p>`)}
${section("customer-needs", `When you need ${inputs.serviceName}`, list(inputs.painPoints))}
${section("benefits", "Benefits", list(inputs.benefits))}
${section("process", "What to expect", list(inputs.process))}
${section("why-us", `Why choose ${profile.businessName}`, `${list(inputs.differentiators)}${inputs.proof ? `<p>${esc(inputs.proof)}</p>` : ""}`)}
${links.length ? section("related-services", "Helpful resources", `<ul>${links.map((link) => `<li><a href="${esc(safeUrl(link.url))}">${esc(link.anchor)}</a></li>`).join("")}</ul>`) : ""}
${faqs.length ? section("faqs", "Frequently asked questions", faqs.map((faq) => `<details><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`).join("")) : ""}
<section class="outpost-section"><div class="outpost-container"><h2>Ready to get started?</h2><p>Talk with ${esc(profile.businessName)} about ${esc(inputs.serviceName)}${esc(location)}.</p><a class="outpost-button" href="${esc(ctaUrl)}">${esc(ctaText)}</a></div></section>
</div>`;
  const seo: ServicePageSeo = { title: inputs.pageTitle.slice(0, 60), metaDescription: (inputs.intro || `${profile.businessName} provides ${inputs.serviceName}${location}. Contact our team to learn more and get started.`).slice(0, 160), primaryKeyword: inputs.primaryKeyword, slug: slugify(inputs.slug || inputs.pageTitle), featuredImage: inputs.featuredImage, parentPageId: inputs.parentPageId, wordpressStatus: inputs.wordpressStatus ?? "draft" };
  const sections = ["hero", "service-overview", "customer-needs", "benefits", "process", "why-us", "related-services", "faqs", "cta"];
  return { html, seo, sections, internalLinks: links, validation: validateServicePage(html, seo) };
}

export function sanitizeServicePageHtml(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => { const value = hex.slice(1); const expanded = value.length === 3 ? value.split("").map((part) => part + part).join("") : value; const channels = [0, 2, 4].map((index) => Number.parseInt(expanded.slice(index, index + 2), 16) / 255).map((channel) => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4); return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]; };
  const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export type ImportedServicePage = {
  html: string;
  metadata: Record<string, unknown>;
  inputs: ServicePageInputs & { importFilename?: string; templateVersion?: string; parent?: string; detectedInternalLinks?: Array<{ anchor: string; url: string }>; detectedImages?: Array<{ src: string; alt: string }> };
  seo: ServicePageSeo;
  sections: Array<{ id: string; label: string }>;
  validation: ServicePageValidation;
};

function metadataString(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (typeof metadata[key] === "string") return String(metadata[key]).trim();
  return "";
}

export function parseServicePagePackage(source: string, filename = "service-page.html"): ImportedServicePage {
  const header = source.match(/<!--\s*OUTPOST\s*([\s\S]*?)-->/i);
  let metadata: Record<string, unknown> = {};
  if (header?.[1]) {
    try { metadata = JSON.parse(header[1].trim()) as Record<string, unknown>; }
    catch { metadata = { metadata_parse_error: "The OUTPOST metadata header is not valid JSON." }; }
  }
  const html = source.replace(/<!--\s*OUTPOST\s*[\s\S]*?-->/i, "").trim();
  const h1 = textOnly(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const title = metadataString(metadata, "page_title", "pageTitle", "title") || h1 || filename.replace(/\.html?$/i, "").replace(/[-_]+/g, " ");
  const serviceName = metadataString(metadata, "service_name", "serviceName") || title;
  const primaryKeyword = metadataString(metadata, "primary_keyword", "primaryKeyword");
  const seoTitle = metadataString(metadata, "seo_title", "seoTitle") || title;
  const metaDescription = metadataString(metadata, "meta_description", "metaDescription");
  const slug = slugify(metadataString(metadata, "slug") || filename.replace(/\.html?$/i, "") || title);
  const featuredImage = metadataString(metadata, "featured_image", "featuredImage");
  const parentValue = metadata["parent_page_id"] ?? metadata["parentPageId"];
  const parentPageId = Number.isFinite(Number(parentValue)) && Number(parentValue) > 0 ? Number(parentValue) : undefined;
  const wordpressStatus = metadataString(metadata, "status", "wordpress_status") === "publish" ? "publish" : "draft";
  const internalLinks = [...html.matchAll(/<a\b[^>]*href=["'](\/(?!\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({ anchor: textOnly(match[2]), url: match[1] })).filter((link) => link.anchor);
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)].map((match) => ({ src: match[1].match(/\ssrc=["']([^"']*)["']/i)?.[1] ?? "", alt: match[1].match(/\salt=["']([^"']*)["']/i)?.[1] ?? "" }));
  const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)].map((match, index) => { const attrs = match[1]; const body = match[2]; const id = attrs.match(/\sid=["']([^"']+)["']/i)?.[1] || attrs.match(/\sclass=["'][^"']*?([a-z0-9]+(?:-[a-z0-9]+)+)[^"']*["']/i)?.[1] || `section-${index + 1}`; const heading = textOnly(body.match(/<h[2-3]\b[^>]*>([\s\S]*?)<\/h[2-3]>/i)?.[1]); return { id, label: heading || id.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }; });
  const seo: ServicePageSeo = { title: seoTitle, metaDescription, primaryKeyword, slug, featuredImage: featuredImage || undefined, parentPageId, wordpressStatus };
  const inputs: ImportedServicePage["inputs"] = { pageType: metadataString(metadata, "type") || "service_page", serviceName, pageTitle: title, primaryKeyword, secondaryKeywords: metadataString(metadata, "secondary_keywords", "secondaryKeywords"), slug, featuredImage: featuredImage || undefined, wordpressStatus, importFilename: filename, templateVersion: metadataString(metadata, "template_version", "templateVersion"), parent: metadataString(metadata, "parent", "wordpress_parent"), detectedInternalLinks: internalLinks, detectedImages: images };
  const validation = validateServicePage(html, seo);
  if (!header) validation.checks.push({ id: "metadata-header", label: "Outpost metadata header", severity: "warning", message: "No OUTPOST metadata header was found; available values were inferred from the HTML and filename." });
  if (metadata.metadata_parse_error) validation.checks.push({ id: "metadata-json", label: "Metadata JSON", severity: "warning", message: String(metadata.metadata_parse_error) });
  if (!serviceName) validation.checks.push({ id: "service-name", label: "Service name", severity: "warning", message: "Service name could not be detected." });
  validation.status = validation.checks.some((check) => check.severity === "fail") ? "fail" : validation.checks.some((check) => check.severity === "warning") ? "warning" : "pass";
  return { html, metadata, inputs, seo, sections, validation };
}

export function validateServicePage(html: string, seo: ServicePageSeo): ServicePageValidation {
  const checks: ValidationCheck[] = [];
  const add = (id: string, label: string, ok: boolean, message: string, level: "warning" | "fail" = "fail") => checks.push({ id, label, severity: ok ? "pass" : level, message });
  const h1s = html.match(/<h1\b/gi)?.length ?? 0;
  add("h1", "Exactly one H1", h1s === 1, `Found ${h1s} H1 elements.`);
  add("fragment", "WordPress fragment only", !/<\/?(?:html|head|body|title|meta)\b/i.test(html), "Document-level tags are not allowed.");
  add("scripts", "No scripts or font imports", !/<script\b|@import|fonts\.googleapis/i.test(html), "Scripts and external font imports are not allowed.");
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]);
  add("ids", "No duplicate IDs", new Set(ids).size === ids.length, "Duplicate element IDs were found.");
  const wrapperCandidates = html.match(/class=["']([^"']*)["']/i)?.[1].split(/\s+/).filter((name) => /^outpost-[a-z0-9-]+$/i.test(name)) ?? [];
  const wrapperClass = wrapperCandidates.find((name) => name === "outpost-page" || name === "outpost-service-page") ?? wrapperCandidates[0] ?? "";
  add("wrapper", "Scoped page wrapper", Boolean(wrapperClass), "An outpost-* page wrapper is required.");
  const style = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const unscoped = style.split("}").map((rule) => rule.split("{")[0]?.trim()).filter((s) => s && !s.startsWith("@") && s.split(",").some((x) => !wrapperClass || !x.trim().startsWith(`.${wrapperClass}`)));
  add("css-scope", "CSS is scoped", unscoped.length === 0, `Every normal selector must start with .${wrapperClass || "outpost-wrapper"}.`);
  add("responsive", "Mobile breakpoint", /@media/i.test(style), "Add a responsive breakpoint.", "warning");
  add("placeholders", "No placeholder copy", !/(\[(?:INSERT|CLIENT|CITY|SERVICE)\]|\+?XX%|lorem ipsum|TODO|TBD|replace this section|add testimonial here)/i.test(html), "Placeholder copy remains.");
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  add("images", "Images have alt text", images.every((tag) => /\salt=["'][^"']*["']/i.test(tag)), "Every image needs an alt attribute.");
  add("links", "Links have names", [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].every((m) => m[1].replace(/<[^>]+>/g, "").trim()), "Every link needs discernible text.");
  add("dangerous-html", "No active runtime content", !/<iframe\b|\son\w+\s*=|(?:href|src)=["']\s*javascript:/i.test(html), "Iframes, inline event handlers, and javascript: URLs are not allowed.");
  add("svg", "Decorative SVG accessibility", [...html.matchAll(/<svg\b[^>]*>/gi)].every((match) => /aria-hidden=["']true["']|aria-label=["'][^"']+["']|<title\b/i.test(match[0])), "SVGs need aria-hidden, an accessible label, or a title.", "warning");
  add("image-links", "Image-only links have names", [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].every((match) => !/<img\b/i.test(match[2]) || Boolean(match[2].replace(/<[^>]+>/g, "").trim()) || /aria-label=["'][^"']+["']/i.test(match[1]) || /<img\b[^>]*alt=["'][^"']+["']/i.test(match[2])), "Image-only links need accessible text.");
  add("aria-label", "ARIA labels are used on semantic elements", !/<(?:div|span|section|article)\b(?![^>]*\brole=["'][^"']+["'])[^>]*\baria-label=/i.test(html), "Generic elements with aria-label need an appropriate semantic role.", "warning");
  add("keyboard", "Custom controls are keyboard accessible", [...html.matchAll(/<(div|span)\b([^>]*)>/gi)].every((match) => !/role=["'](?:button|link)["']/i.test(match[2]) || /tabindex=["']0["']/i.test(match[2])), "Custom button/link roles need tabindex=0.");
  add("sections", "Semantic page sections", /<section\b/i.test(html), "No semantic section elements were detected.", "warning");
  add("focus", "Visible keyboard focus", /:focus-visible/i.test(style), "Add visible focus styling.", "warning");
  const colorPairs = [...style.matchAll(/\{([^}]*)\}/g)].map((match) => ({ foreground: match[1].match(/(?:^|;)\s*color\s*:\s*(#[0-9a-f]{3,6})\b/i)?.[1], background: match[1].match(/(?:^|;)\s*background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/i)?.[1] })).filter((pair): pair is { foreground: string; background: string } => Boolean(pair.foreground && pair.background));
  add("contrast", "Basic text contrast", colorPairs.length > 0 && colorPairs.every((pair) => contrastRatio(pair.foreground, pair.background) >= 4.5), colorPairs.length ? "A CSS text/background pair is below 4.5:1." : "No literal CSS text/background pairs could be evaluated; verify contrast visually.", "warning");
  add("seo-title", "SEO title length", seo.title.trim().length >= 20 && seo.title.length <= 60, "SEO title should be 20–60 characters.", "warning");
  add("meta", "Meta description length", seo.metaDescription.trim().length >= 70 && seo.metaDescription.length <= 160, "Meta description should be 70–160 characters.", "warning");
  add("keyword", "Primary keyword", Boolean(seo.primaryKeyword.trim()), "Primary keyword was not found in the package metadata.", "warning");
  add("slug", "Valid slug", Boolean(seo.slug) && seo.slug === slugify(seo.slug), "Use a lowercase, hyphenated slug.");
  add("internal-links", "Internal links present", /<a\b[^>]*href=["']\/(?!\/)/i.test(html), "Add at least one contextual internal link.", "warning");
  const status = checks.some((c) => c.severity === "fail") ? "fail" : checks.some((c) => c.severity === "warning") ? "warning" : "pass";
  const score = (category: string[]) => Math.round(100 * checks.filter((c) => category.includes(c.id) && c.severity === "pass").length / Math.max(1, checks.filter((c) => category.includes(c.id)).length));
  return { status, checks, seoScore: score(["h1", "seo-title", "meta", "keyword", "slug", "internal-links", "placeholders"]), accessibilityScore: score(["images", "links", "focus"]) };
}

export const contentHash = (html: string) => createHash("sha256").update(html).digest("hex");
export function parseJson<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T; } catch { return fallback; } }
