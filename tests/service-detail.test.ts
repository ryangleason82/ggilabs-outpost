import test from "node:test";
import assert from "node:assert/strict";
import { parseCSVImport } from "@/lib/parser";
import { sanitizeHtml } from "@/lib/sanitize";
import { serviceDetailToWordPressBlocks, serviceDetailWordPressPayload } from "@/lib/service-detail";
import { pushResourceDraftToWordPress } from "@/lib/wordpress";
import { serviceDetailCompatibility } from "@/lib/content";
import type { Article, Client } from "@prisma/client";
import { SERVICE_DETAIL_FIELDS } from "@/lib/templates";
import { validateServiceDetail } from "@/lib/validation";
import { serviceDetailFixture, unrelatedServiceFixtures } from "./fixtures/service-details";

test("validates unrelated services and non-local availability", () => {
  for (const fixture of unrelatedServiceFixtures) {
    const result = validateServiceDetail(fixture);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  }
});

test("accepts blank optional fields and warns on long titles", () => {
  const fixture = serviceDetailFixture();
  fixture.hero_eyebrow = "";
  fixture.signs_intro = "";
  fixture.meta_title = "A".repeat(61);
  const result = validateServiceDetail(fixture);
  assert.equal(result.valid, true);
  assert.equal(result.warnings[0].field, "meta_title");
});

test("accepts dynamic WordPress service hub term slugs", () => {
  const fixture = serviceDetailFixture();
  fixture.service_hub = "vehicles";
  const result = validateServiceDetail(fixture);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
});

test("rejects invalid template, slug, URLs, missing FAQ, and long description", () => {
  const fixture = serviceDetailFixture();
  fixture.template_type = "spoke" as "service_detail";
  fixture.service_hub = "Unknown Hub";
  fixture.post_name = "Bad Slug";
  fixture.cta_button_url = "http://example.com";
  fixture.faq_4_answer = "";
  fixture.meta_description = "x".repeat(161);
  const fields = validateServiceDetail(fixture).errors.map((issue) => issue.field);
  assert.deepEqual(new Set(fields), new Set(["faq_4_answer", "template_type", "service_hub", "post_name", "cta_button_url", "meta_description"]));
});

test("sanitizes HTML while preserving lists, tables, and safe table styles", () => {
  const clean = sanitizeHtml('<script>alert(1)</script><ul><li onclick="x()">Safe</li></ul><table style="border-collapse: collapse; background-image: url(javascript:x)"><tr><td style="padding: 8px" onerror="x">Cell</td></tr></table>');
  assert.doesNotMatch(clean, /script|onclick|onerror|background-image|javascript/i);
  assert.match(clean, /<ul><li>Safe<\/li><\/ul>/);
  assert.match(clean, /style="padding: 8px"/);
});

test("CSV preserves UTF-8, quoted commas, line breaks, and trust aliases", () => {
  const fixture = serviceDetailFixture("Bookkeeping Cleanup", "Online");
  const headers = SERVICE_DETAIL_FIELDS.map((field) => field === "trust_heading" ? "why_sangiuliano_heading" : field === "trust_body" ? "why_sangiuliano_body" : field);
  fixture.intro_body = "<p>Résumé, cleanup\nwith detail</p>";
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const csv = `${headers.join(",")}\n${SERVICE_DETAIL_FIELDS.map((field) => quote(String(fixture[field] ?? ""))).join(",")}`;
  const parsed = parseCSVImport(csv)[0];
  assert.equal(parsed.templateType, "service_detail");
  assert.equal((parsed.data as typeof fixture).intro_body, fixture.intro_body);
  assert.equal((parsed.data as typeof fixture).trust_heading, fixture.trust_heading);
});

test("HTML service-detail CSV uses canonical html_content without legacy fields", () => {
  const headers = ["post_title","post_name","post_status","post_type","template_type","service_hub","primary_keyword","service_name","location_name","secondary_keywords","meta_title","meta_description","featured_image_url","featured_image_alt","cta_url","html_content"];
  const html = `<style>\n.outpost-service-page{color:#111;background:#fff}.outpost-service-page a:focus-visible{outline:2px solid #000}@media(max-width:700px){.outpost-service-page{padding:1rem}}\n</style>\n<div class="outpost-service-page"><section id="hero"><h1>Roof Repair in Bucks County, PA</h1><a href="/contact/">Request roof repair</a></section></div>`;
  const values = ["Roof Repair in Bucks County, PA","roof-repair-bucks-county-pa","draft","service","service_detail","roofing","Roof Repair Bucks County PA","Roof Repair","Bucks County, PA","roof leaks|storm damage","Roof Repair Bucks County PA | Sangiuliano","Professional roof repair in Bucks County for leaks, storm damage, and aging roofing systems. Request an inspection from our experienced local team.","","","/contact/",html];
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const parsed = parseCSVImport(`${headers.join(",")}\n${values.map(quote).join(",")}`)[0];
  assert.equal(parsed.templateType, "service_detail");
  const validated = validateServiceDetail(parsed.data as import("@/lib/templates").ServiceDetailPayload, parsed.rowNumber, parsed.headers);
  assert.equal(validated.valid, true, JSON.stringify(validated.errors));
  assert.doesNotMatch(JSON.stringify(validated.warnings), /Mobile breakpoint|Visible keyboard focus|Basic text contrast/);
  assert.equal(validated.data.content_format, "html");
  assert.equal(validated.data.html_content, html);
  assert.equal(validated.data.hero_heading, "");
  const publishing = serviceDetailWordPressPayload(validated.data);
  assert.doesNotMatch(publishing.content, /<style\b/i);
  assert.match(publishing.content, /sr-breadcrumbs/);
  assert.match(publishing.content, /Roof Repair in Bucks County, PA/);
  assert.equal(publishing.title, "Roof Repair in Bucks County, PA");
  assert.equal(publishing.seo.focusKeyword, "Roof Repair Bucks County PA");
});

test("publishing transformer is deterministic, ordered, and omits blank optionals", () => {
  const fixture = serviceDetailFixture("Physical Therapy Evaluation", "Chicago");
  fixture.hero_eyebrow = "";
  fixture.decision_table = "";
  const first = serviceDetailToWordPressBlocks(fixture);
  assert.equal(first, serviceDetailToWordPressBlocks(fixture));
  assert.ok(first.indexOf(fixture.intro_heading) < first.indexOf(fixture.signs_heading));
  assert.ok(first.indexOf(fixture.signs_heading) < first.indexOf(fixture.process_heading));
  assert.doesNotMatch(first, /decision_table value/);
  assert.match(first, /https:\/\/example.com\/contact/);
  const payload = serviceDetailWordPressPayload(fixture);
  assert.equal(payload.status, "draft");
  assert.equal(payload.slug, fixture.post_name);
  assert.equal(payload.seo.title, fixture.meta_title);
});

test("service-detail WordPress routing creates and updates the configured CPT endpoint", async () => {
  const fixture = serviceDetailFixture("Roof Repair", "Bucks County, PA");
  fixture.html_content = '<div class="outpost-service-page"><h1>Roof Repair</h1></div>'; fixture.content_format = "html";
  const baseArticle = { ...serviceDetailCompatibility(fixture), featuredImagePath: null, featuredImageFilename: null } as unknown as Article;
  const client = { name: "SanGiuliano Roofing", wpUrl: "https://roofing.example", wpUsername: "outpost", wpAppPassword: "app-password", wpResourceRestBase: "resources", wpServiceDetailRestBase: "service-detail-page", wpServiceDetailPostType: "service-detail-page" } as Client;
  const originalFetch = globalThis.fetch; const calls: Array<{ url: string; method: string; body?: Record<string, unknown> }> = []; let remoteStatus = "draft";
  globalThis.fetch = async (input, init) => { const url = String(input); const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : undefined; calls.push({ url, method: init?.method ?? "GET", body }); if (url.endsWith("/wp-json/wp/v2/types")) return Response.json({ "service-detail-page": { name: "Service Detail Pages", slug: "service-detail-page", rest_base: "service-detail-page" } }); if (url.endsWith("/wp-json/wp/v2/taxonomies")) return Response.json({ "service-hub": { name: "Service Hubs", slug: "service-hub", types: ["service-detail-page"], rest_base: "service-hub", rest_namespace: "wp/v2" } }); if (url.includes("/wp-json/wp/v2/service-hub?")) return Response.json([{ id: 9, slug: "roofing" }]); if (url.includes("rankmath/v1/updateMeta")) return Response.json({ success: true }); if (url.includes("/77?context=edit")) return Response.json({ id: 77, status: remoteStatus, link: "https://roofing.example/roofing/roof-repair/" }); return Response.json({ id: 77, status: body?.status ?? remoteStatus, link: "https://roofing.example/?post_type=service-detail-page&p=77" }); };
  try {
    const created = await pushResourceDraftToWordPress(baseArticle, client); assert.equal(created.action, "created"); assert.equal(created.wordpressRestBase, "service-detail-page"); assert.equal(created.publishedUrl, "https://roofing.example/roofing/roof-repair/"); const createCall = calls.find((call) => call.method === "POST" && call.url === "https://roofing.example/wp-json/wp/v2/service-detail-page"); assert.ok(createCall); assert.deepEqual(createCall.body?.["service-hub"], [9]);
    const rankMathCall = calls.find((call) => call.url.includes("rankmath/v1/updateMeta")); assert.equal((rankMathCall?.body?.meta as Record<string, unknown>)?.rank_math_canonical_url, "https://roofing.example/roofing/roof-repair/");
    for (const expectedStatus of ["draft", "publish"]) { remoteStatus = expectedStatus; calls.length = 0; const updated = await pushResourceDraftToWordPress({ ...baseArticle, wpPostId: "77" }, client); assert.equal(updated.action, "updated"); assert.equal(updated.wordpressStatus, expectedStatus); const updateCall = calls.find((call) => call.method === "POST" && call.url === "https://roofing.example/wp-json/wp/v2/service-detail-page/77"); assert.ok(updateCall); assert.equal(updateCall.body?.status, expectedStatus); }
  } finally { globalThis.fetch = originalFetch; }
});

test("service-detail publishing reports a REST configuration mismatch", async () => {
  const fixture = serviceDetailFixture(); fixture.html_content = '<div class="outpost-service-page"><h1>Service</h1></div>'; fixture.content_format = "html";
  const article = serviceDetailCompatibility(fixture) as unknown as Article; const client = { name: "Client", wpUrl: "https://example.com", wpUsername: "user", wpAppPassword: "password", wpResourceRestBase: "resources", wpServiceDetailRestBase: "service-detail-page", wpServiceDetailPostType: "service-detail-page" } as Client;
  const originalFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ page: { name: "Pages", slug: "page", rest_base: "pages" } });
  try { await assert.rejects(() => pushResourceDraftToWordPress(article, client), /not exposed through WordPress REST/); } finally { globalThis.fetch = originalFetch; }
});

test("WordPress scheduling sends future status and UTC publication date", async () => {
  const client = { name: "Client", wpUrl: "https://example.com", wpUsername: "user", wpAppPassword: "password", wpResourceRestBase: "resources", wpServiceDetailRestBase: "service-detail-page", wpServiceDetailPostType: "service-detail-page" } as Client;
  const article = serviceDetailCompatibility(serviceDetailFixture()) as unknown as Article;
  const scheduledAt = new Date("2030-01-15T16:30:00.000Z");
  const originalFetch = globalThis.fetch;
  let publishBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/wp-json/wp/v2/types")) return Response.json({ "service-detail-page": { slug: "service-detail-page", rest_base: "service-detail-page" } });
    if (url.endsWith("/wp-json/wp/v2/taxonomies")) return Response.json({ "service-hub": { slug: "service-hub", types: ["service-detail-page"], rest_base: "service-hub", rest_namespace: "wp/v2" } });
    if (url.includes("/service-hub?")) return Response.json([{ id: 9, slug: "roofing" }]);
    if (url.endsWith("/wp-json/wp/v2/service-detail-page")) { publishBody = JSON.parse(String(init?.body)); return Response.json({ id: 88, status: "future", link: "https://example.com/roofing/roof-repair/" }); }
    if (url.includes("rankmath/v1/updateMeta")) return Response.json({ success: true });
    return Response.json({ id: 88, status: "future", link: "https://example.com/roofing/roof-repair/" });
  };
  try {
    const result = await pushResourceDraftToWordPress(article, client, {}, { status: "future", scheduledAt });
    assert.equal(result.wordpressStatus, "future");
    assert.equal(publishBody?.status, "future");
    assert.equal(publishBody?.date_gmt, scheduledAt.toISOString());
  } finally { globalThis.fetch = originalFetch; }
});
