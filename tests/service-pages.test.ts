import assert from "node:assert/strict";
import test from "node:test";
import { defaultSiteProfile, generateServicePage, parseServicePagePackage, sanitizeServicePageHtml, validateServicePage } from "../lib/service-pages";
import { exportServicePageCsv, parseServicePageCsv, type ServicePageCsvRow } from "../lib/service-page-csv";

test("service page generator produces a scoped WordPress fragment", () => {
  const generated = generateServicePage({ serviceName: "Transmission Repair", pageTitle: "Transmission Repair in Nashville", primaryKeyword: "transmission repair nashville", slug: "transmission-repair", intro: "Professional transmission repair in Nashville with clear recommendations and dependable service.", internalLinks: "Transmission rebuilds | /services/transmission-rebuilds/", benefits: "Clear diagnosis\nReliable repairs", faqs: "How long does repair take? | Timing depends on the diagnosis." }, defaultSiteProfile("A-1 Nashville", "https://example.com"));
  assert.match(generated.html, /^<style>/);
  assert.match(generated.html, /class="outpost-page outpost-a-1-nashville"/);
  assert.doesNotMatch(generated.html, /<!doctype|<html|<head|<body|<meta/i);
  assert.notEqual(generated.validation.status, "fail");
});

test("validator blocks document tags, duplicate H1s, and placeholders", () => {
  const validation = validateServicePage("<html><h1>[CITY]</h1><h1>Two</h1></html>", { title: "Short", metaDescription: "Short", primaryKeyword: "repair", slug: "repair", wordpressStatus: "draft" });
  assert.equal(validation.status, "fail");
  assert.ok(validation.checks.some((check) => check.id === "fragment" && check.severity === "fail"));
  assert.ok(validation.checks.some((check) => check.id === "placeholders" && check.severity === "fail"));
});

test("manual HTML sanitizer removes active content", () => {
  const clean = sanitizeServicePageHtml('<div onclick="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">Link</a></div>');
  assert.doesNotMatch(clean, /onclick|script|javascript/i);
});

test("imports an HTML package and removes its metadata header from post content", () => {
  const source = `<!-- OUTPOST
  {"type":"service_page","service_name":"Transmission Repair","page_title":"Transmission Repair in Nashville","slug":"transmission-repair","primary_keyword":"transmission repair nashville","seo_title":"Transmission Repair Nashville TN | A-1","meta_description":"Professional transmission repair in Nashville with clear recommendations, dependable service, and an experienced local team.","template_version":"service-v1"}
  --><style>.outpost-page h1{color:#123}.outpost-page a:focus-visible{outline:2px solid #000}@media(max-width:700px){.outpost-page{padding:1rem}}</style><div class="outpost-page"><section id="hero"><h1>Transmission Repair in Nashville</h1><a href="/services/rebuilds/">Transmission rebuilds</a></section><section id="faq"><h2>Questions</h2></section></div>`;
  const imported = parseServicePagePackage(source, "transmission-repair.html");
  assert.equal(imported.inputs.serviceName, "Transmission Repair");
  assert.equal(imported.seo.slug, "transmission-repair");
  assert.equal(imported.inputs.templateVersion, "service-v1");
  assert.equal(imported.inputs.detectedInternalLinks?.length, 1);
  assert.deepEqual(imported.sections.map((section) => section.id), ["hero", "faq"]);
  assert.doesNotMatch(imported.html, /OUTPOST/);
  assert.notEqual(imported.validation.status, "fail");
});

test("infers review metadata when an imported page has no header", () => {
  const imported = parseServicePagePackage('<div class="outpost-page"><h1>Clutch Repair</h1></div>', "clutch-repair.html");
  assert.equal(imported.inputs.pageTitle, "Clutch Repair");
  assert.equal(imported.seo.slug, "clutch-repair");
  assert.ok(imported.validation.checks.some((check) => check.id === "metadata-header" && check.severity === "warning"));
});

test("service-page CSV round trip preserves canonical multiline HTML byte-for-byte", () => {
  const html = `<style>\n.outpost-service-page p { color: #123; }\n</style>\n<div class="outpost-service-page"><section id="hero"><h1>Repair, Rebuild & Service</h1><p>Quoted: "yes"</p><a href="/contact/">Contact</a></section></div>`;
  const row: ServicePageCsvRow = { client: "A-1 Nashville Transmission", page_type: "service_page", page_title: "Transmission Repair in Nashville", slug: "Transmission Repair/", parent_slug: "services", service_name: "Transmission Repair", target_location: "Nashville, TN", primary_keyword: "transmission repair nashville", secondary_keywords: "transmission shop nashville|transmission service nashville", seo_title: "Transmission Repair Nashville TN | A-1", meta_description: "A-1 Nashville Transmission provides professional diagnostics and transmission repair for Nashville drivers who need dependable local service.", featured_image_url: "", featured_image_alt: "", cta_url: "/contact/", wordpress_status: "", html_content: html };
  const reparsed = parseServicePageCsv(exportServicePageCsv([row]));
  assert.equal(reparsed.issues.filter((issue) => issue.severity === "error").length, 0);
  assert.equal(reparsed.rows[0].data.html_content, html);
  assert.equal(reparsed.rows[0].data.slug, "transmission-repair");
  assert.deepEqual(reparsed.rows[0].secondaryKeywords, ["transmission shop nashville", "transmission service nashville"]);
  assert.equal(reparsed.rows[0].seo.wordpressStatus, "draft");
});

test("service-page CSV reports missing required fields and duplicate slugs", () => {
  const base = { client: "Client", page_type: "service_page", page_title: "Page", slug: "same", parent_slug: "", service_name: "Service", target_location: "", primary_keyword: "", secondary_keywords: "", seo_title: "SEO title long enough to review", meta_description: "A sufficiently descriptive summary for validation that remains useful for search result review and prospective customers.", featured_image_url: "", featured_image_alt: "", cta_url: "", wordpress_status: "draft", html_content: '<div class="outpost-page"><h1>Page</h1></div>' } satisfies ServicePageCsvRow;
  const parsed = parseServicePageCsv(exportServicePageCsv([base, { ...base, primary_keyword: "keyword" }]));
  assert.ok(parsed.issues.some((issue) => issue.row === 2 && issue.field === "primary_keyword"));
  assert.ok(parsed.issues.some((issue) => issue.row === 3 && issue.message.includes("Duplicate slug")));
});
