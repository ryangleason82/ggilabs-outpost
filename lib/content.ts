import type { Article } from "@prisma/client";
import { isHtmlServiceDetail, parseTemplatePayload, type ServiceDetailPayload } from "@/lib/templates";

export function serviceDetailCompatibility(payload: ServiceDetailPayload) {
  if (isHtmlServiceDetail(payload)) {
    return {
      postTitle: payload.post_title, postName: payload.post_name,
      postStatus: payload.post_status || "draft", postType: payload.post_type || "service",
      templateType: "service_detail", templatePayload: JSON.stringify({ ...payload, content_format: "html" }),
      primaryKeyword: payload.primary_keyword, serviceName: payload.service_name || null,
      locationName: payload.location_name || null, heroEyebrow: null,
      heroHeading: payload.post_title, heroSubheading: "", introSummary: "",
      section1Heading: "", section1Body: "", section2Heading: "", section2Body: "",
      section3Heading: "", section3Body: "", faq1Question: "", faq1Answer: "",
      faq2Question: "", faq2Answer: "", faq3Question: "", faq3Answer: "",
      ctaHeading: "", ctaBody: "", ctaButtonText: "", ctaButtonUrl: payload.cta_url || "",
      relatedHubUrl: "", relatedHubAnchor: "", metaTitle: payload.meta_title,
      metaDescription: payload.meta_description,
    };
  }
  return {
    postTitle: payload.post_title, postName: payload.post_name,
    postStatus: payload.post_status, postType: payload.post_type,
    templateType: payload.template_type, templatePayload: JSON.stringify({ ...payload, content_format: "structured" }),
    primaryKeyword: payload.primary_keyword, serviceName: payload.service_name,
    locationName: payload.location_name, heroEyebrow: payload.hero_eyebrow || null,
    heroHeading: payload.hero_heading, heroSubheading: payload.hero_subheading,
    introSummary: payload.intro_body, section1Heading: payload.signs_heading,
    section1Body: payload.signs_list, section2Heading: payload.service_overview_heading,
    section2Body: payload.service_overview_body, section3Heading: payload.process_heading,
    section3Body: payload.process_steps, faq1Question: payload.faq_1_question,
    faq1Answer: payload.faq_1_answer, faq2Question: payload.faq_2_question,
    faq2Answer: payload.faq_2_answer, faq3Question: payload.faq_3_question,
    faq3Answer: payload.faq_3_answer, ctaHeading: payload.cta_heading,
    ctaBody: payload.cta_body, ctaButtonText: payload.cta_button_text,
    ctaButtonUrl: payload.cta_button_url, relatedHubUrl: payload.related_hub_url,
    relatedHubAnchor: payload.related_hub_anchor, metaTitle: payload.meta_title,
    metaDescription: payload.meta_description,
  };
}

export function articleForApi(article: Article) {
  const payload = parseTemplatePayload(article.templatePayload);
  return payload ? { ...article, ...payload } : article;
}

export function serviceDetailFromArticle(article: Article) {
  const payload = parseTemplatePayload(article.templatePayload);
  if (!payload || payload.template_type !== "service_detail") {
    throw new Error("Service-detail payload is missing or invalid.");
  }
  return payload;
}
