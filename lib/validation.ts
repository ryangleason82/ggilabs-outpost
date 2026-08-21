import {
  SERVICE_DETAIL_FIELDS,
  SERVICE_DETAIL_HTML_FIELDS,
  SERVICE_DETAIL_OPTIONAL_FIELDS,
  SERVICE_DETAIL_URL_FIELDS,
  type ServiceDetailPayload,
} from "@/lib/templates";
import { containsUnsafeHtml, sanitizeHtml, stripHtml } from "@/lib/sanitize";
import { validateServicePage } from "@/lib/service-pages";
import { isServiceHubSlug } from "@/lib/service-hubs";

export type FieldIssue = { row: number; field: string; message: string };
export type ValidationResult = {
  valid: boolean;
  data: ServiceDetailPayload;
  errors: FieldIssue[];
  warnings: FieldIssue[];
};

function hasHeader(headers: string[], field: string) {
  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = [field];
  if (field === "trust_heading") candidates.push("why_sangiuliano_heading");
  if (field === "trust_body") candidates.push("why_sangiuliano_body");
  return headers.some((header) => candidates.some((candidate) => normalized(header) === normalized(candidate)));
}

export function validateServiceDetail(
  input: ServiceDetailPayload,
  row = 1,
  headers?: string[],
): ValidationResult {
  const data = { ...input };
  const errors: FieldIssue[] = [];
  const warnings: FieldIssue[] = [];
  const error = (field: string, message: string) => errors.push({ row, field, message });
  const warning = (field: string, message: string) => warnings.push({ row, field, message });

  const htmlModel = Boolean(data.html_content?.trim()) || Boolean(headers && hasHeader(headers, "html_content"));
  if (htmlModel) {
    data.post_status ||= "draft"; data.post_type ||= "service"; data.template_type = "service_detail"; data.content_format = "html";
    const required = ["post_title", "post_name", "post_status", "post_type", "template_type", "service_hub", "primary_keyword", "service_name", "meta_title", "meta_description", "html_content"] as const;
    for (const field of required) {
      if (headers && !hasHeader(headers, field)) error(field, "Required CSV header is missing.");
      else if (!String(data[field] ?? "").trim()) error(field, "Required field is blank.");
    }
    if (data.template_type !== "service_detail") error("template_type", "Must equal service_detail.");
    if (data.post_type !== "service") error("post_type", "Must equal service.");
    if (!isServiceHubSlug(data.service_hub)) error("service_hub", "Must be a lowercase, hyphenated WordPress Service Hub term slug.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.post_name)) error("post_name", "Must contain only lowercase letters, numbers, and hyphens.");
    if (!["draft", "publish", "pending", "private"].includes(data.post_status)) error("post_status", "Must be draft, publish, pending, or private.");
    const htmlValidation = validateServicePage(data.html_content ?? "", { title: data.meta_title, metaDescription: data.meta_description, primaryKeyword: data.primary_keyword, secondaryKeywords: (data.secondary_keywords ?? "").split("|").map((value) => value.trim()).filter(Boolean), slug: data.post_name, featuredImage: data.featured_image_url, featuredImageAlt: data.featured_image_alt, ctaUrl: data.cta_url, wordpressStatus: data.post_status as "draft" | "publish" | "pending" | "private" });
    const globalCssChecks = new Set(["responsive", "focus", "contrast"]);
    for (const check of htmlValidation.checks) {
      if (globalCssChecks.has(check.id)) continue;
      if (check.severity === "fail") error("html_content", `${check.label}: ${check.message}`);
      if (check.severity === "warning") warning("html_content", `${check.label}: ${check.message}`);
    }
    const httpsFields = ["hero_image_url", "supporting_image_url", "canonical_url", "commercial_callout_url"] as const;
    for (const field of httpsFields) {
      const value = data[field]; if (!value) continue;
      try { if (new URL(value).protocol !== "https:") throw new Error(); } catch { error(field, "Must be an absolute HTTPS URL."); }
    }
    for (const prefix of ["hero", "supporting"] as const) {
      const url = data[`${prefix}_image_url`]; const alt = data[`${prefix}_image_alt`]; const filename = data[`${prefix}_image_filename`];
      if (url && !alt?.trim()) error(`${prefix}_image_alt`, "Alt text is required when an image URL is provided.");
      if (filename && !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:jpe?g|png|webp|gif))?$/i.test(filename)) error(`${prefix}_image_filename`, "Use a lowercase, hyphenated image filename.");
    }
    if (data.supporting_image_section && !/^[a-z][a-z0-9_-]*$/i.test(data.supporting_image_section)) error("supporting_image_section", "Use a section ID such as service_overview.");
    if (data.related_services_json) { try { const parsed = JSON.parse(data.related_services_json); if (!Array.isArray(parsed)) throw new Error(); } catch { error("related_services_json", "Must be a JSON array of related-service objects."); } }
    if (data.canonical_url?.trim()) warning("canonical_url", "Ignored for service-detail pages; WordPress supplies the authoritative permalink after publishing.");
    if (/<style\b/i.test(data.html_content ?? "")) warning("html_content", "Inline styles will be removed before preview and WordPress publishing.");
    if (/(?:Ã¢|Ãƒ|ï¿½|â€™|â€œ|â€)/i.test(data.html_content ?? "")) warning("html_content", "Possible mojibake or broken character encoding detected.");
    if (data.meta_title.length > 60) warning("meta_title", "Longer than 60 characters.");
    if (data.meta_description.length > 160) warning("meta_description", "Longer than 160 characters.");
    return { valid: errors.length === 0, data, errors, warnings };
  }

  data.content_format = "structured";

  for (const field of SERVICE_DETAIL_FIELDS) {
    if (headers && !SERVICE_DETAIL_OPTIONAL_FIELDS.has(field) && !hasHeader(headers, field)) {
      error(field, "Required CSV header is missing.");
      continue;
    }
    if (!SERVICE_DETAIL_OPTIONAL_FIELDS.has(field)) {
      const value = data[field] ?? "";
      if (SERVICE_DETAIL_HTML_FIELDS.has(field) ? !stripHtml(value) : !value.trim()) {
        error(field, "Required field is blank.");
      }
    }
  }
  if (data.template_type !== "service_detail") error("template_type", "Must equal service_detail.");
  if (!isServiceHubSlug(data.service_hub)) error("service_hub", "Must be a lowercase, hyphenated WordPress Service Hub term slug.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.post_name)) {
    error("post_name", "Must contain only lowercase letters, numbers, and hyphens.");
  }
  if (data.post_status !== "draft") error("post_status", "Only draft is supported for imports.");
  for (const field of SERVICE_DETAIL_URL_FIELDS) {
    const value = data[field];
    if (!value) continue;
    try {
      if (new URL(value).protocol !== "https:") throw new Error();
    } catch {
      error(field, "Must be an absolute HTTPS URL.");
    }
  }
  for (const field of SERVICE_DETAIL_HTML_FIELDS) {
    const value = String(data[field] ?? "");
    if (containsUnsafeHtml(value)) error(field, "Contains blocked HTML or an unsafe URL.");
    (data as Record<string, string>)[field] = sanitizeHtml(value);
  }
  if (data.meta_title.length > 60) warning("meta_title", "Longer than 60 characters.");
  if (data.meta_description.length > 160) error("meta_description", "Longer than 160 characters.");
  return { valid: errors.length === 0, data, errors, warnings };
}
