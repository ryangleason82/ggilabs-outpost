import { isHtmlServiceDetail, type ServiceDetailPayload } from "@/lib/templates";
import { renderServiceDetail, type RenderedImage, type ServiceDetailSeoConfig } from "@/lib/service-detail-render";

function paragraph(html: string) {
  return html.trim() ? `<!-- wp:html -->\n${html}\n<!-- /wp:html -->` : "";
}
function heading(value: string, level: 1 | 2 | 3 = 2) {
  if (!value.trim()) return "";
  return `<!-- wp:heading {"level":${level}} -->\n<h${level}>${value}</h${level}>\n<!-- /wp:heading -->`;
}
function button(text: string, url: string) {
  if (!text || !url) return "";
  return `<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${url}">${text}</a></div><!-- /wp:button --></div><!-- /wp:buttons -->`;
}

export function serviceDetailToWordPressBlocks(record: ServiceDetailPayload) {
  const sections = [
    [record.intro_heading, record.intro_body],
    [record.signs_heading, [record.signs_intro, record.signs_list].filter(Boolean).join("\n")],
    [record.service_overview_heading, record.service_overview_body],
    [record.process_heading, [record.process_intro, record.process_steps].filter(Boolean).join("\n")],
    [record.decision_heading, [record.decision_body, record.decision_table].filter(Boolean).join("\n")],
    [record.trust_heading, record.trust_body],
    [record.local_heading, record.local_body],
  ];
  const faqs = [1, 2, 3, 4].map((number) => {
    const question = record[`faq_${number}_question` as keyof ServiceDetailPayload];
    const answer = record[`faq_${number}_answer` as keyof ServiceDetailPayload];
    return [heading(String(question ?? ""), 3), paragraph(String(answer ?? ""))].filter(Boolean).join("\n");
  }).join("\n");
  return [
    record.hero_eyebrow ? paragraph(`<p>${record.hero_eyebrow}</p>`) : "",
    heading(record.hero_heading, 1), paragraph(`<p>${record.hero_subheading}</p>`),
    button(record.hero_primary_cta_text, record.hero_primary_cta_url),
    button(record.hero_secondary_cta_text, record.hero_secondary_cta_url),
    ...sections.map(([title, body]) => [heading(title), paragraph(body)].filter(Boolean).join("\n")),
    heading("Frequently Asked Questions"), faqs,
    heading(record.cta_heading), paragraph(record.cta_body),
    button(record.cta_button_text, record.cta_button_url),
  ].filter(Boolean).join("\n\n");
}

export function serviceDetailWordPressPayload(record: ServiceDetailPayload, config: ServiceDetailSeoConfig = {}, media: { hero?: RenderedImage; supporting?: RenderedImage } = {}) {
  const rendered = isHtmlServiceDetail(record) ? renderServiceDetail(record, config, media) : null;
  return {
    title: record.post_title,
    slug: record.post_name,
    status: record.post_status,
    content: rendered?.bodyHtml ?? serviceDetailToWordPressBlocks(record),
    seo: { title: record.meta_title, description: record.meta_description, focusKeyword: record.primary_keyword },
    rendered,
  };
}
