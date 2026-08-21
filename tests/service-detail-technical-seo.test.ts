import test from "node:test";
import assert from "node:assert/strict";
import { serviceDetailFixture } from "./fixtures/service-details";
import { renderServiceDetail } from "@/lib/service-detail-render";
import { validateServiceDetailForPublish } from "@/lib/service-detail-technical-seo";

test("service-detail renderer emits clean markup, images, breadcrumbs, and matching schema", () => {
  const record = serviceDetailFixture();
  record.content_format = "html"; record.html_content = '<style>.bad{color:red}</style><div class="outpost-service-page"><h1>Roof Repair</h1><details><summary>How fast?</summary><p>Usually promptly.</p></details></div>';
  record.hero_image_url = "https://cdn.example.com/roof.jpg"; record.hero_image_alt = "Roof repair crew";
  record.supporting_image_url = "https://cdn.example.com/flashing.jpg"; record.supporting_image_alt = "New roof flashing";
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com", schemaEntityId: "https://example.com/#organization", globalStylesheetUrl: "https://example.com/assets/service-detail.css" });
  assert.doesNotMatch(rendered.bodyHtml, /<style|<script/i); assert.match(rendered.previewHtml, /<link rel="stylesheet" href="https:\/\/example\.com\/assets\/service-detail\.css">/); assert.match(rendered.previewHtml, /<style>/); assert.match(rendered.bodyHtml, /loading="eager" fetchpriority="high"/); assert.match(rendered.bodyHtml, /loading="lazy"/);
  assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/BreadcrumbList"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/Service"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/FAQPage"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/Question"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/Answer"/);
  const graph = rendered.schemaGraph?.["@graph"] as Array<Record<string, unknown>>; assert.ok(graph.some((node) => node["@type"] === "Service")); assert.equal((graph.find((node) => node["@type"] === "BreadcrumbList")?.itemListElement as unknown[]).length, rendered.breadcrumbs.length); assert.equal((graph.find((node) => node["@type"] === "FAQPage")?.mainEntity as unknown[]).length, 1);
});

test("technical SEO validator blocks structural defects and warns for optional configuration", () => {
  const record = serviceDetailFixture(); record.content_format = "html"; record.html_content = '<div class="outpost-service-page"><p>Broken Ã¢â‚¬â„¢ copy</p></div>';
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com" });
  const result = validateServiceDetailForPublish(record, rendered, { canonicalSiteUrl: "https://example.com" });
  assert.ok(result.errors.some((item) => item.id === "one-h1")); assert.ok(result.errors.some((item) => item.id === "mojibake")); assert.ok(result.warnings.some((item) => item.id === "provider")); assert.ok(result.warnings.some((item) => item.id === "global-styles"));
});

test("technical SEO accepts telephone CTA links", () => {
  const record = serviceDetailFixture();
  record.content_format = "html";
  record.html_content = '<div class="outpost-service-page"><h1>Service</h1></div>';
  record.cta_url = "tel:+16152568165";
  const config = { canonicalSiteUrl: "https://example.com", requireServiceHeroImage: false };
  const result = validateServiceDetailForPublish(record, renderServiceDetail(record, config), config);
  assert.ok(result.passes.some((item) => item.id === "cta-url"));
  assert.ok(!result.errors.some((item) => item.id === "cta-url"));
});

test("service-detail renderer marks up visible FAQ cards without JSON-LD scripts", () => {
  const record = serviceDetailFixture(); record.content_format = "html"; record.html_content = '<div class="outpost-service-page"><h1>Service</h1><section id="faq"><article class="sr-faq"><h3>What happens next?</h3><div class="sr-rich"><p>We inspect the roof.</p></div></article></section></div>';
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com" });
  assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/FAQPage"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/Question"/); assert.match(rendered.bodyHtml, /itemtype="https:\/\/schema\.org\/Answer"/); assert.doesNotMatch(rendered.bodyHtml, /<script/i); assert.equal(rendered.faqs.length, 1);
});

test("preview uses scoped source CSS when no global stylesheet URL is configured", () => {
  const record = serviceDetailFixture(); record.content_format = "html"; record.html_content = '<style>.sr-hero{background:#17324d;color:#fff}</style><div class="outpost-service-page"><section class="sr-hero"><span class="sr-eyebrow">Overline</span><h1>Service</h1></section></div>';
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com" });
  assert.match(rendered.previewHtml, /\.sr-hero\{background:#17324d;color:#fff\}/); assert.doesNotMatch(rendered.bodyHtml, /<style|background:#17324d/i);
  assert.ok(rendered.bodyHtml.indexOf("sr-hero") < rendered.bodyHtml.indexOf("sr-breadcrumbs")); assert.ok(rendered.bodyHtml.indexOf("sr-breadcrumbs") < rendered.bodyHtml.indexOf("sr-eyebrow")); assert.doesNotMatch(rendered.bodyHtml, /<ol|<li/i);
});

test("preview injects configured global CSS and ignores legacy article styles", () => {
  const record = serviceDetailFixture(); record.content_format = "html"; record.html_content = '<style>.legacy{color:red}</style><div class="outpost-service-page"><h1>Service</h1></div>';
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com", globalStylesheetCss: ".outpost-service-page{background:#fff}.sr-hero{background:#17324d}" });
  assert.match(rendered.previewHtml, /\.sr-hero\{background:#17324d\}/);
  assert.doesNotMatch(rendered.previewHtml, /\.legacy\{color:red\}/);
  assert.doesNotMatch(rendered.bodyHtml, /<style|background:#17324d/i);
  const validation = validateServiceDetailForPublish(record, rendered, { canonicalSiteUrl: "https://example.com", globalStylesheetCss: ".outpost-service-page{background:#fff}" });
  assert.ok(validation.passes.some((item) => item.id === "global-styles"));
});

test("service hub controls expected canonical, breadcrumb parent, and Service schema", () => {
  const record = serviceDetailFixture("Vinyl Siding", "Bucks and Montgomery Counties");
  record.service_hub = "siding"; record.post_name = "vinyl-siding-bucks-county-pa";
  record.html_content = '<div class="outpost-service-page"><section class="sr-hero"><span class="sr-eyebrow">Siding</span><h1>Vinyl Siding</h1></section></div>'; record.content_format = "html";
  const rendered = renderServiceDetail(record, { canonicalSiteUrl: "https://example.com", schemaEntityId: "https://example.com/#organization" });
  assert.equal(rendered.seo.canonicalUrl, "https://example.com/siding/vinyl-siding-bucks-county-pa/");
  assert.equal(rendered.breadcrumbs[1]?.name, "Siding"); assert.equal(rendered.breadcrumbs[1]?.url, "/siding/");
  const service = (rendered.schemaGraph?.["@graph"] as Array<Record<string, unknown>>).find((node) => node["@type"] === "Service");
  assert.equal(service?.url, rendered.seo.canonicalUrl); assert.equal(service?.["@id"], `${rendered.seo.canonicalUrl}#service`);
  assert.match(rendered.bodyHtml, /itemprop="serviceType" content="Vinyl Siding"/); assert.match(rendered.bodyHtml, /itemprop="description"/);
  assert.match(rendered.bodyHtml, /itemprop="areaServed" content="Bucks County, Pennsylvania"/); assert.match(rendered.bodyHtml, /itemprop="areaServed" content="Montgomery County, Pennsylvania"/);
  assert.doesNotMatch(rendered.bodyHtml, /\/services\//);
});
