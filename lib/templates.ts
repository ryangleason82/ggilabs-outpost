export const TEMPLATE_TYPES = ["spoke", "service_detail"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_REGISTRY = {
  spoke: { label: "Spoke", value: "spoke" },
  service_detail: { label: "Service Detail", value: "service_detail" },
} as const;

export const SERVICE_DETAIL_FIELDS = [
  "post_title", "post_name", "post_status", "post_type", "template_type",
  "service_hub", "primary_keyword", "service_name", "location_name", "secondary_keywords",
  "meta_title", "meta_description", "featured_image_url", "featured_image_alt",
  "cta_url", "html_content", "content_format", "hero_eyebrow",
  "hero_image_url", "hero_image_filename", "hero_image_alt", "hero_image_caption",
  "supporting_image_url", "supporting_image_filename", "supporting_image_alt",
  "supporting_image_caption", "supporting_image_section", "canonical_url", "robots",
  "related_services_json", "commercial_callout_heading", "commercial_callout_body",
  "commercial_callout_url", "commercial_callout_link_text",
  "hero_heading", "hero_subheading", "hero_primary_cta_text",
  "hero_primary_cta_url", "hero_secondary_cta_text", "hero_secondary_cta_url",
  "intro_heading", "intro_body", "signs_heading", "signs_intro", "signs_list",
  "service_overview_heading", "service_overview_body", "process_heading",
  "process_intro", "process_steps", "decision_heading", "decision_body",
  "decision_table", "trust_heading", "trust_body", "local_heading", "local_body",
  "faq_1_question", "faq_1_answer", "faq_2_question", "faq_2_answer",
  "faq_3_question", "faq_3_answer", "faq_4_question", "faq_4_answer",
  "cta_heading", "cta_body", "cta_button_text", "cta_button_url",
  "related_hub_url", "related_hub_anchor", "related_resource_url",
  "related_resource_anchor",
] as const;

export type ServiceDetailField = (typeof SERVICE_DETAIL_FIELDS)[number];
type HtmlServiceDetailFields = "secondary_keywords" | "featured_image_url" | "featured_image_alt" | "cta_url" | "html_content" | "content_format" | "hero_image_url" | "hero_image_filename" | "hero_image_alt" | "hero_image_caption" | "supporting_image_url" | "supporting_image_filename" | "supporting_image_alt" | "supporting_image_caption" | "supporting_image_section" | "canonical_url" | "robots" | "related_services_json" | "commercial_callout_heading" | "commercial_callout_body" | "commercial_callout_url" | "commercial_callout_link_text";
export type ServiceDetailPayload = {
  template_type: "service_detail";
} & Record<Exclude<ServiceDetailField, "template_type" | HtmlServiceDetailFields>, string> & Partial<Record<HtmlServiceDetailFields, string>>;

export function isHtmlServiceDetail(payload: ServiceDetailPayload | null | undefined) {
  return payload?.template_type === "service_detail" && Boolean(payload.html_content?.trim());
}

export const SERVICE_DETAIL_OPTIONAL_FIELDS = new Set<ServiceDetailField>([
  "secondary_keywords", "featured_image_url", "featured_image_alt", "cta_url",
  "html_content", "content_format",
  "hero_image_url", "hero_image_filename", "hero_image_alt", "hero_image_caption",
  "supporting_image_url", "supporting_image_filename", "supporting_image_alt",
  "supporting_image_caption", "supporting_image_section", "canonical_url", "robots",
  "related_services_json", "commercial_callout_heading", "commercial_callout_body",
  "commercial_callout_url", "commercial_callout_link_text",
  "hero_eyebrow", "hero_secondary_cta_text", "hero_secondary_cta_url",
  "signs_intro", "process_intro", "decision_table", "related_resource_url",
  "related_resource_anchor",
]);

export const SERVICE_DETAIL_HTML_FIELDS = new Set<ServiceDetailField>([
  "intro_body", "signs_intro", "signs_list", "service_overview_body",
  "process_intro", "process_steps", "decision_body", "decision_table",
  "trust_body", "local_body", "faq_1_answer", "faq_2_answer", "faq_3_answer",
  "faq_4_answer", "cta_body",
]);

export const SERVICE_DETAIL_URL_FIELDS = new Set<ServiceDetailField>([
  "hero_primary_cta_url", "hero_secondary_cta_url", "cta_button_url",
  "related_hub_url", "related_resource_url",
]);

export const SERVICE_DETAIL_EDIT_GROUPS = [
  { title: "SEO and publishing", fields: ["post_title", "post_name", "post_status", "post_type", "service_hub", "primary_keyword", "service_name", "location_name", "meta_title", "meta_description"] },
  { title: "Hero", fields: ["hero_eyebrow", "hero_heading", "hero_subheading", "hero_primary_cta_text", "hero_primary_cta_url", "hero_secondary_cta_text", "hero_secondary_cta_url"] },
  { title: "Introduction", fields: ["intro_heading", "intro_body"] },
  { title: "Signs, Needs, or Use Cases", fields: ["signs_heading", "signs_intro", "signs_list"] },
  { title: "Service overview", fields: ["service_overview_heading", "service_overview_body"] },
  { title: "Process", fields: ["process_heading", "process_intro", "process_steps"] },
  { title: "Decision tool", fields: ["decision_heading", "decision_body", "decision_table"] },
  { title: "Trust section", fields: ["trust_heading", "trust_body"] },
  { title: "Market, location, or availability", fields: ["local_heading", "local_body"] },
  { title: "FAQs", fields: ["faq_1_question", "faq_1_answer", "faq_2_question", "faq_2_answer", "faq_3_question", "faq_3_answer", "faq_4_question", "faq_4_answer"] },
  { title: "CTA", fields: ["cta_heading", "cta_body", "cta_button_text", "cta_button_url"] },
  { title: "Related content", fields: ["related_hub_url", "related_hub_anchor", "related_resource_url", "related_resource_anchor"] },
] satisfies { title: string; fields: ServiceDetailField[] }[];

export const SERVICE_DETAIL_HTML_EDIT_GROUPS = [
  { title: "Publishing and SEO", fields: ["post_title", "post_name", "post_status", "post_type", "template_type", "service_hub", "primary_keyword", "service_name", "location_name", "secondary_keywords", "meta_title", "meta_description", "canonical_url", "robots", "cta_url"] },
  { title: "Hero image", fields: ["hero_image_url", "hero_image_filename", "hero_image_alt", "hero_image_caption"] },
  { title: "Supporting image", fields: ["supporting_image_url", "supporting_image_filename", "supporting_image_alt", "supporting_image_caption", "supporting_image_section"] },
  { title: "Related services and callout", fields: ["related_services_json", "commercial_callout_heading", "commercial_callout_body", "commercial_callout_url", "commercial_callout_link_text"] },
  { title: "Canonical page HTML", fields: ["html_content"] },
] satisfies { title: string; fields: ServiceDetailField[] }[];

export function parseTemplatePayload(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as ServiceDetailPayload;
  } catch {
    return null;
  }
}
