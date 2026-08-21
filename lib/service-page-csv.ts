import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { slugify, validateServicePage, type ServicePageSeo, type ServicePageValidation } from "@/lib/service-pages";

export const SERVICE_PAGE_CSV_HEADERS = ["client","page_type","page_title","slug","parent_slug","service_name","target_location","primary_keyword","secondary_keywords","seo_title","meta_description","featured_image_url","featured_image_alt","cta_url","wordpress_status","html_content"] as const;
export type ServicePageCsvRow = Record<(typeof SERVICE_PAGE_CSV_HEADERS)[number], string>;
export type ServicePageCsvIssue = { row: number; field?: string; severity: "error" | "warning"; message: string };
export type ParsedServicePageCsvRow = { rowNumber: number; data: ServicePageCsvRow; secondaryKeywords: string[]; seo: ServicePageSeo; validation: ServicePageValidation; sections: Array<{ id: string; label: string }>; internalLinks: Array<{ anchor: string; url: string }>; images: Array<{ src: string; alt: string }> };
const REQUIRED = ["client","page_type","page_title","slug","service_name","primary_keyword","seo_title","meta_description","html_content"] as const;
const textOnly = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function parseServicePageCsv(csv: string) {
  const issues: ServicePageCsvIssue[] = []; let records: Record<string, string>[];
  try { records = parse(csv, { columns: (headers: string[]) => headers.map((header) => header.trim().replace(/^\uFEFF/, "")), bom: true, skip_empty_lines: true, relax_column_count: false }) as Record<string, string>[]; }
  catch (error) { return { rows: [] as ParsedServicePageCsvRow[], issues: [{ row: 0, severity: "error" as const, message: `CSV could not be parsed: ${String(error)}` }] }; }
  if (!records.length) return { rows: [], issues: [{ row: 0, severity: "error" as const, message: "The CSV contains no service-page rows." }] };
  const headers = Object.keys(records[0]); for (const header of SERVICE_PAGE_CSV_HEADERS) if (!headers.includes(header)) issues.push({ row: 1, field: header, severity: "error", message: `Missing expected column: ${header}` });
  const seen = new Map<string, number>(); const rows: ParsedServicePageCsvRow[] = records.map((record, index) => {
    const rowNumber = index + 2; const data = Object.fromEntries(SERVICE_PAGE_CSV_HEADERS.map((header) => [header, header === "html_content" ? String(record[header] ?? "") : String(record[header] ?? "").trim()])) as ServicePageCsvRow;
    data.slug = slugify(data.slug); data.wordpress_status = data.wordpress_status.toLowerCase() || "draft";
    for (const field of REQUIRED) if (!data[field]) issues.push({ row: rowNumber, field, severity: "error", message: `Missing required field: ${field}` });
    if (!data.slug) issues.push({ row: rowNumber, field: "slug", severity: "error", message: "Slug is empty after normalization." });
    if (seen.has(data.slug)) issues.push({ row: rowNumber, field: "slug", severity: "error", message: `Duplicate slug; first used on row ${seen.get(data.slug)}.` }); else seen.set(data.slug, rowNumber);
    if (!["draft","publish","pending","private"].includes(data.wordpress_status)) issues.push({ row: rowNumber, field: "wordpress_status", severity: "error", message: "wordpress_status must be draft, publish, pending, or private." });
    if (data.page_type !== "service_page") issues.push({ row: rowNumber, field: "page_type", severity: "warning", message: `Page type “${data.page_type}” is stored for extensibility; this workflow is optimized for service_page.` });
    const secondaryKeywords = data.secondary_keywords.split("|").map((keyword) => keyword.trim()).filter(Boolean);
    const seo: ServicePageSeo = { title: data.seo_title, metaDescription: data.meta_description, primaryKeyword: data.primary_keyword, secondaryKeywords, slug: data.slug, parentSlug: slugify(data.parent_slug), featuredImage: data.featured_image_url || undefined, featuredImageAlt: data.featured_image_alt || undefined, ctaUrl: data.cta_url || undefined, wordpressStatus: data.wordpress_status as ServicePageSeo["wordpressStatus"] };
    const validation = validateServicePage(data.html_content, seo);
    if (!secondaryKeywords.length) validation.checks.push({ id: "secondary-keywords", label: "Secondary keywords", severity: "warning", message: "No secondary keywords were supplied." });
    if (!data.page_title) validation.checks.push({ id: "page-title", label: "Page title", severity: "fail", message: "Page title is required." });
    validation.status = validation.checks.some((check) => check.severity === "fail") ? "fail" : validation.checks.some((check) => check.severity === "warning") ? "warning" : "pass";
    const internalLinks = [...data.html_content.matchAll(/<a\b[^>]*href=["'](\/(?!\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({ anchor: textOnly(match[2]), url: match[1] })).filter((link) => link.anchor);
    const images = [...data.html_content.matchAll(/<img\b([^>]*)>/gi)].map((match) => ({ src: match[1].match(/\ssrc=["']([^"']*)["']/i)?.[1] ?? "", alt: match[1].match(/\salt=["']([^"']*)["']/i)?.[1] ?? "" }));
    const sections = [...data.html_content.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)].map((match, sectionIndex) => { const id = match[1].match(/\sid=["']([^"']+)["']/i)?.[1] ?? `section-${sectionIndex + 1}`; const heading = textOnly(match[2].match(/<h[2-3]\b[^>]*>([\s\S]*?)<\/h[2-3]>/i)?.[1]); return { id, label: heading || id.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) }; });
    return { rowNumber, data, secondaryKeywords, seo, validation, sections, internalLinks, images };
  });
  return { rows, issues };
}

export function exportServicePageCsv(rows: ServicePageCsvRow[]) { return stringify(rows, { header: true, columns: [...SERVICE_PAGE_CSV_HEADERS], record_delimiter: "windows" }); }
