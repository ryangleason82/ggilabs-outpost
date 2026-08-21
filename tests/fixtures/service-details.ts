import { SERVICE_DETAIL_FIELDS, type ServiceDetailPayload } from "@/lib/templates";

export function serviceDetailFixture(serviceName = "Managed IT Services", location = "National"): ServiceDetailPayload {
  const values = Object.fromEntries(SERVICE_DETAIL_FIELDS.map((field) => [field, `${field} value`])) as ServiceDetailPayload;
  return {
    ...values,
    post_title: `${serviceName} Overview`, post_name: serviceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    post_status: "draft", post_type: "service", template_type: "service_detail" as const, service_hub: "roofing",
    html_content: "", content_format: "structured", secondary_keywords: "",
    featured_image_url: "", featured_image_alt: "", cta_url: "",
    hero_image_url: "", hero_image_filename: "", hero_image_alt: "", hero_image_caption: "",
    supporting_image_url: "", supporting_image_filename: "", supporting_image_alt: "", supporting_image_caption: "", supporting_image_section: "",
    canonical_url: "", robots: "", related_services_json: "", commercial_callout_heading: "", commercial_callout_body: "", commercial_callout_url: "", commercial_callout_link_text: "",
    primary_keyword: serviceName.toLowerCase(), service_name: serviceName, location_name: location,
    intro_body: "<p>Clear introduction with <strong>safe formatting</strong>.</p>",
    signs_list: "<ul><li>One use case</li><li>Another need</li></ul>",
    service_overview_body: "<p>Service overview.</p>", process_steps: "<ol><li>Start</li><li>Finish</li></ol>",
    decision_body: "<p>Decision guidance.</p>",
    decision_table: '<table style="border-collapse: collapse; width: 100%"><tbody><tr><td style="padding: 8px">Option</td></tr></tbody></table>',
    trust_body: "<p>General trust information.</p>", local_body: "<p>Availability details.</p>",
    faq_1_answer: "<p>Answer one.</p>", faq_2_answer: "<p>Answer two.</p>",
    faq_3_answer: "<p>Answer three.</p>", faq_4_answer: "<p>Answer four.</p>",
    cta_body: "<p>Take the next step.</p>", hero_primary_cta_url: "https://example.com/contact",
    hero_secondary_cta_text: "", hero_secondary_cta_url: "", cta_button_url: "https://example.com/contact",
    related_hub_url: "https://example.com/services", related_resource_url: "", related_resource_anchor: "",
    meta_title: `${serviceName} Overview`, meta_description: `Learn how ${serviceName} works and decide whether it fits your needs.`,
  };
}

export const unrelatedServiceFixtures = [
  serviceDetailFixture("Managed IT Services", "National"),
  serviceDetailFixture("Bookkeeping Cleanup", "Online"),
  serviceDetailFixture("Physical Therapy Evaluation", "Chicago"),
];
